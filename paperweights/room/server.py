#!/usr/bin/env python3
"""Live room: landing page, audience phones and votes, in front of the Rover site.

    python3 paperweights/room/server.py --port 8688

/            landing page for the facilitator
/audience    phones: get a sheet, vote when a game asks
/api/room/*  JSON used by the landing page, phones and game screens
/api/room/events  server-sent events: the room summary, or one phone's view with ?pid=
Everything else is the assembled Rover/Households/Sentences site.
"""
import argparse
import heapq
import itertools
import json
import random
import secrets
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import deck  # noqa: E402

BOT_TURNOUT = 0.85
BOT_DELAY = (1.0, 12.0)
HEARTBEAT = 20     # seconds between keep-alive comments on an idle event stream
COALESCE = 0.1     # a stream sends at most one update per this many seconds


class Room:
    def __init__(self):
        self.lock = threading.RLock()
        self.phones = {}            # pid -> seat
        self.seen = {}              # pid -> last time its stream or a request was seen
        self.changed = threading.Condition(self.lock)  # woken on every version bump
        self.bots = 5
        self.sentence_deck = 'mixed'
        self.votes = {}             # 'word' or team letter -> vote
        self.ids = itertools.count(1)
        self._version = 0
        self.activity = None
        self.timers = []            # heap of (due, vote id, key, seat)
        threading.Thread(target=self._bot_loop, daemon=True).start()

    @property
    def version(self):
        return self._version

    @version.setter
    def version(self, value):
        with self.changed:
            self._version = value
            self.changed.notify_all()

    # ---- seats -----------------------------------------------------------
    @property
    def size(self):
        return len(self.phones) + self.bots

    def bot_seats(self):
        taken = set(self.phones.values())
        free = (s for s in itertools.count(1) if s not in taken)
        return list(itertools.islice(free, self.bots))

    def word_bot_seats(self):
        taken = set(self.phones.values())
        return [s for s in range(1, len(deck.word_sheets(self.size, self.sentence_deck)) + 1)
                if s not in taken]

    def enter(self, activity):
        if activity != self.activity:
            self.activity = activity
            self.votes.clear()
            self.timers.clear()
            self.version += 1

    def join(self, pid):
        self.prune()
        if pid not in self.phones:
            pid = secrets.token_hex(6)
            taken = set(self.phones.values())
            self.phones[pid] = next(s for s in itertools.count(1) if s not in taken)
            self.version += 1
        self.seen[pid] = time.time()
        return pid

    def prune(self, idle=1800):
        """Phones silent for half an hour give their sheet back."""
        now = time.time()
        for pid in [p for p in self.phones if now - self.seen.get(p, now) > idle]:
            del self.phones[pid]
            self.version += 1

    def sheet(self, seat):
        words = deck.word_sheets(self.size, self.sentence_deck)
        return {'seat': seat, 'team': deck.team(seat),
                'words': words[seat - 1] if seat <= len(words) else [],
                'rover': deck.rover_squares(seat), 'hhTeam': deck.hh_team(seat), 'household': deck.household_rows(seat)}

    # ---- votes -----------------------------------------------------------
    def open(self, key, kind, cue=None, visible=None, exclude=()):
        vote = {'id': next(self.ids), 'key': key, 'kind': kind, 'cue': cue,
                'visible': visible or [], 'exclude': list(exclude), 'ballots': {}, 'opened': time.time()}
        self.votes[key] = vote
        self.version += 1
        now = time.time()
        seats = self.word_bot_seats() if kind == 'word' else self.bot_seats()
        for seat in seats:
            if deck.in_vote(seat, key) and (kind == 'word' or random.random() < BOT_TURNOUT):
                heapq.heappush(self.timers, (now + random.uniform(*BOT_DELAY), vote['id'], key, seat))
        return vote

    def close(self, key):
        if self.votes.pop(key, None):
            self.version += 1

    def choices(self, vote, seat):
        """What this seat's sheet lets it answer for the vote."""
        s = self.sheet(seat)
        if vote['kind'] == 'word':
            return [r[1] for r in s['words'] if r[0] == vote['cue']]
        if vote['kind'] == 'household':
            return [r['flip'] for r in s['household']
                    if r['key'] == vote['cue'] and r['flip'] not in vote['exclude']]
        shown = {(c['category'], c['value']) for c in vote['visible']}
        return ['avoid' if any((q['category'], q['value']) in shown for q in s['rover']) else 'go']

    def ballot(self, vote, seat, choice):
        if self.votes.get(vote['key']) is vote:
            vote['ballots'][seat] = choice
            self.version += 1

    def _bot_loop(self):
        while True:
            time.sleep(0.2)
            with self.lock:
                now = time.time()
                while self.timers and self.timers[0][0] <= now:
                    _, vid, key, seat = heapq.heappop(self.timers)
                    vote = self.votes.get(key)
                    if not vote or vote['id'] != vid:
                        continue
                    seats = self.word_bot_seats() if vote['kind'] == 'word' else self.bot_seats()
                    if seat not in seats:
                        continue
                    options = self.choices(vote, seat)
                    if options:
                        self.ballot(vote, seat, random.choice(options))

    def tally(self, vote):
        counts = {}
        for choice in vote['ballots'].values():
            if choice != '__no_word__' and choice not in vote['exclude']:
                counts[choice] = counts.get(choice, 0) + 1
        seats = (range(1, len(deck.word_sheets(self.size, self.sentence_deck)) + 1)
                 if vote['kind'] == 'word' else sorted(set(self.phones.values()) | set(self.bot_seats())))
        eligible = [s for s in seats if deck.in_vote(s, vote['key'])]
        coverage_key = (self.sentence_deck, tuple(eligible))
        if vote.get('_coverage_key') != coverage_key:
            vote['_matching'] = sum(bool(self.choices(vote, seat)) for seat in eligible)
            vote['_coverage_key'] = coverage_key
        matching = vote['_matching']
        total = sum(counts.values())
        return {'id': vote['id'], 'kind': vote['kind'], 'cue': vote['cue'], 'counts': counts,
                'total': total, 'eligible': len(eligible), 'matching': matching,
                'status': 'no-data' if not matching else 'waiting' if not total else 'voting'}

    def summary(self):
        return {'version': self.version, 'phones': len(self.phones), 'bots': self.bots, 'size': self.size,
                'sentenceDeck': self.sentence_deck,
                'votes': {k: self.tally(v) for k, v in self.votes.items()}}

    def me(self, pid):
        seat = self.phones.get(pid)
        if not seat:
            return None
        self.seen[pid] = time.time()
        team = deck.team(seat)
        # The newest open vote this seat answers: words, its room team or its Households team.
        mine = [v for k in ('word', team, 'H' + deck.hh_team(seat))
                if (v := self.votes.get(k))]
        vote = max(mine, key=lambda v: v['opened']) if mine else None
        active = None
        if vote:
            active = {'id': vote['id'], 'kind': vote['kind'], 'cue': vote['cue'], 'visible': vote['visible'],
                      'mine': vote['ballots'].get(seat), 'exclude': vote['exclude'],
                      'status': self.tally(vote)['status']}
        return {'version': self.version, 'sheetVersion': f'{self.sentence_deck}-{deck.bucket(self.size)}',
                'seat': seat, 'team': team, 'size': self.size, 'vote': active}


ROOM = Room()
SITE = None


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(SITE), **k)

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()

    def stream(self, pid=None):
        """Server-sent events: the room summary, or one phone's view, sent only when it changes."""
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.end_headers()
        seen, last = -1, None
        try:
            while True:
                with ROOM.changed:
                    woke = ROOM.changed.wait_for(lambda: ROOM.version != seen, timeout=HEARTBEAT)
                    seen = ROOM.version
                    if pid is None:
                        view = ROOM.summary()
                    else:
                        me = ROOM.me(pid)  # also keeps the seat alive while connected
                        # Room-wide counters change on every ballot; a phone only needs its own view.
                        view = me and {k: v for k, v in me.items() if k not in ('version', 'size')}
                if pid is not None and view is None:
                    self.wfile.write(b'event: gone\ndata: {}\n\n')  # unknown seat: the phone joins again
                    return
                data = json.dumps(view, separators=(',', ':'))
                if data != last:
                    self.wfile.write(f'data: {data}\n\n'.encode())
                    last = data
                elif not woke:
                    self.wfile.write(b': ping\n\n')
                self.wfile.flush()
                time.sleep(COALESCE)
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass

    def json(self, body, code=200):
        data = json.dumps(body, separators=(',', ':')).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def page(self, name):
        data = (HERE / name).read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        url = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(url.query, keep_blank_values=True).items()}
        activity = None
        if url.path in ('/', '/index.html'):
            activity = 'collaborative' if 'collaborative' in q else 'landing'
        elif url.path == '/paperweights/web/sentences.html':
            activity = 'sentences'
        elif url.path in ('/paperweights/web/', '/paperweights/web/index.html', '/paperweights/web/shared-map.html'):
            activity = q.get('scenario', 'rover')
        elif url.path in ('/households/', '/households/index.html', '/households/icons.html'):
            activity = 'icons'
        elif url.path.rstrip('/') in ('/omens', '/households/omens.html'):
            activity = 'omens'
        if activity is not None:
            with ROOM.lock:
                ROOM.enter(activity)
        if url.path in ('/', '/index.html') and 'collaborative' not in q:
            return self.page('landing.html')
        if url.path.rstrip('/') == '/audience':
            return self.page('audience.html')
        if url.path == '/api/room/events':
            return self.stream(q.get('pid'))
        if url.path.startswith('/api/room'):
            with ROOM.lock:
                return self.api_get(url.path[len('/api/room'):], q)
        if url.path == '/' or url.path == '/index.html':
            self.path = '/index.html'
        if url.path.rstrip('/') == '/omens':
            self.path = '/households/omens.html'
        return super().do_GET()

    def api_get(self, path, q):
        if path in ('', '/'):
            return self.json(ROOM.summary())
        if path == '/me':
            me = ROOM.me(q.get('pid'))
            return self.json(me) if me else self.json({'error': 'unknown'}, 404)
        if path == '/sheet':
            seat = ROOM.phones.get(q.get('pid'))
            return self.json(ROOM.sheet(seat)) if seat else self.json({'error': 'unknown'}, 404)
        if path == '/sentence-pack':
            chosen = 'prior' if q.get('deck') == 'prior' else 'mixed'
            if chosen != ROOM.sentence_deck:
                ROOM.sentence_deck = chosen
                ROOM.version += 1  # phones' sheets change with the deck
            pack = deck.word_pack(ROOM.size, ROOM.sentence_deck)
            reserve = len(set(ROOM.word_bot_seats()) - set(ROOM.bot_seats()))
            if reserve:
                pack['source'] += f' - {reserve} reserve word bots'
            return self.json(pack)
        self.json({'error': 'not found'}, 404)

    def do_POST(self):
        url = urlparse(self.path)
        if not url.path.startswith('/api/room'):
            return self.json({'error': 'not found'}, 404)
        n = int(self.headers.get('Content-Length') or 0)
        body = json.loads(self.rfile.read(n) or b'{}')
        path = url.path[len('/api/room'):]
        with ROOM.lock:
            if path == '/join':
                return self.json({'pid': ROOM.join(body.get('pid'))})
            if path == '/bots':
                ROOM.bots = max(0, min(200, int(body.get('n', 0))))
                ROOM.version += 1
                return self.json(ROOM.summary())
            if path == '/open':
                key = body.get('key')
                if (key not in ('word', *deck.TEAMS, *deck.HH_KEYS)
                        or body.get('kind') not in ('word', 'rover', 'household')
                        or (key in deck.HH_KEYS) != (body.get('kind') == 'household')):
                    return self.json({'error': 'bad vote'}, 400)
                if body.get('kind') == 'word' and body.get('deck') in ('mixed', 'prior'):
                    ROOM.sentence_deck = body['deck']
                vote = ROOM.open(key, body['kind'], body.get('cue'), body.get('visible'), body.get('exclude', ()))
                return self.json(ROOM.tally(vote))
            if path == '/clear':
                ROOM.phones.clear()
                ROOM.votes.clear()
                ROOM.version += 1
                return self.json(ROOM.summary())
            if path == '/close':
                ROOM.close(body.get('key'))
                return self.json({})
            if path == '/ballot':
                seat = ROOM.phones.get(body.get('pid'))
                vote = next((v for v in ROOM.votes.values() if v['id'] == body.get('id')), None)
                if not seat or not vote:
                    return self.json({'error': 'closed'})
                no_word = vote['kind'] == 'word' and body.get('choice') == '__no_word__'
                if not no_word and body.get('choice') not in ROOM.choices(vote, seat) and vote['kind'] != 'rover':
                    return self.json({'error': 'no match'})
                if vote['kind'] == 'rover' and body.get('choice') not in ('go', 'avoid'):
                    return self.json({'error': 'bad choice'})
                if not deck.in_vote(seat, vote['key']):
                    return self.json({'error': 'other team'})
                ROOM.ballot(vote, seat, body['choice'])
                return self.json({})
        self.json({'error': 'not found'}, 404)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, default=8688)
    ap.add_argument('--bind', default='0.0.0.0')
    ap.add_argument('--bots', type=int, default=5)
    a = ap.parse_args()
    from build_site import build
    SITE = build(HERE.parent / 'out' / 'room-site')
    ROOM.bots = a.bots
    print(f'http://{a.bind}:{a.port}/  (audience: /audience)', flush=True)
    ThreadingHTTPServer((a.bind, a.port), Handler).serve_forever()
