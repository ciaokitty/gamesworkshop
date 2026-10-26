"""Audience sheets for the live room: words, Rover squares to avoid, household data.

Sheet k is the same whoever holds it, a phone or a bot. Words come from the
RM4 mixed corpus (or the 15-sheet prior duplex) dealt for the room-size bucket.
Rover and household sides are seeded per seat, so they never change under a
player as people join.
"""
import importlib.util
import json
import random
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
BUCKETS = (12, 15, 20, 30, 50, 75, 100, 150, 200)
TEAMS = 'ABCD'
# Households: three teams (one per home), dealt round-robin like the room teams.
# Its votes use keys HA/HB/HC, so Rover keeps the four room teams.
HH_TEAMS = 'ABC'
HH_KEYS = tuple('H' + t for t in HH_TEAMS)

_spec = importlib.util.spec_from_file_location('mixed', ROOT / 'paperweights/robot-majority/mixed.py')
mixed = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(mixed)
PRIOR = json.loads((ROOT / 'paperweights/robot-majority/prior-duplex.json').read_text())
ANSWERS = json.loads((HERE / 'household-answers.json').read_text())
# Extended Households Part 1: three teams (one per village), sheets dealt by
# extended-households/audience.mjs. Its votes use keys EA/EB/EC, not the four room teams.
EXTENDED = json.loads((ROOT / 'extended-households/audience-sheets.json').read_text())
EXT_TEAMS = 'ABC'
EXT_KEYS = tuple('E' + t for t in EXT_TEAMS)
# Part 2 (one home): the whole room answers, from each seat's rows of the home's history.
HOME_KEY = 'EH'
FLIPS = ('harvest', 'cash', 'attendance', 'weather')

# Rover Risks: everyone knows most hazards; a few also fear a harmless square or
# miss one hazard. Stratified within each team (member j of a team gets PATTERN[j % 20])
# so even a small team has the intended mix. Checked against every PW6 screen in check_rover().
HAZARDS = [('battery', 'dead'), ('dust', 'storm'), ('ground', 'sand')]
PATTERN = [None, None, None, ('slope', 'steep'), None, None, ('ground', 'sand', 'dust', 'haze'), None, None,
           ('ground', 'soft'), None, None, ('dust', 'storm', 'slope', 'steep'), None, None, ('slope', 'tilted'),
           None, None, ('battery', 'dead', 'dust', 'haze'), None]

_word_cache = {}


def bucket(n):
    return next((b for b in BUCKETS if b >= n), BUCKETS[-1])


def word_sheets(n, deck='mixed'):
    """Complete word deal. Unoccupied word seats are held by reserve bots."""
    if deck == 'prior':
        return [[[a, b] for a, b in s] for s in PRIOR['sheets']]
    size = bucket(n)
    if size not in _word_cache:
        _word_cache[size] = [[list(r) for r in s] for s in mixed.pack(size)['sheets']]
    return _word_cache[size]


def word_pack(n, deck='mixed'):
    sheets = word_sheets(n, deck)
    if deck == 'prior':
        return {'id': PRIOR.get('id', 'prior'), 'size': len(sheets), 'sheets': sheets,
                'start': PRIOR.get('start'), 'starts': PRIOR.get('starts'), 'source': PRIOR.get('source', 'Prior duplex')}
    full = mixed.pack(bucket(n))
    return {'id': f'RM4-room-{bucket(n)}', 'size': len(sheets), 'sheets': sheets, 'start': full['start'],
            'starts': full['starts'], 'source': full['source']}


def member(seat):
    """Position of a seat within its team: seats 1-4 are members 0 of A-D, and so on."""
    return (seat - 1) // 4


def hh_member(seat):
    """Position of a seat within its Households team: seats 1-3 are members 0 of A-C."""
    return (seat - 1) // len(HH_TEAMS)


def rover_squares(seat):
    squares = list(HAZARDS)
    change = PATTERN[member(seat) % len(PATTERN)]
    if change and len(change) == 4:
        squares.remove(change[:2])
        squares.append(change[2:])
    elif change:
        squares.append(change)
    return [{'category': c, 'value': v} for c, v in squares]


def _flip_weights(key):
    v = ANSWERS[key]
    cat = key.split(':')[1]
    return {c: v.get(c, 0) for c in FLIPS if c != cat}


USEFUL = sorted(k for k in ANSWERS if sum(_flip_weights(k).values()) > 0)
LIVE = [k for k in USEFUL if ANSWERS[k]['occur'] > 0]
EXTRA = [k for k in USEFUL if ANSWERS[k]['occur'] == 0]
ROWS = 24


def household_rows(seat):
    """24 rows: color + card -> category to flip. Mostly the archive's best flip, some noise."""
    rng = random.Random(f'household-{seat}')
    j = hh_member(seat)
    keys = [k for k in LIVE if rng.random() < 0.85]
    keys += rng.sample(EXTRA, max(0, ROWS - len(keys)))
    keys = keys[:ROWS]
    rows = []
    for key in keys:
        w = _flip_weights(key)
        # About one member in seven holds a noisy row for any key, spread across the team.
        if (j + sum(map(ord, key))) % 7 == 3:
            answer = rng.choice([c for c in w if w[c] < max(w.values())] or list(w))
        else:
            x = rng.random() * sum(w.values())
            for answer, n in w.items():
                x -= n
                if x < 0:
                    break
        ctx, cat, value = key.split(':')
        rows.append({'key': key, 'context': ctx, 'category': cat, 'value': value, 'flip': answer})
    rows.sort(key=lambda r: (r['context'], FLIPS.index(r['category']), r['value']))
    return rows


def team(seat):
    return TEAMS[(seat - 1) % 4]


def hh_team(seat):
    return HH_TEAMS[(seat - 1) % len(HH_TEAMS)]


def ext_team(seat):
    return EXT_TEAMS[(seat - 1) % len(EXT_TEAMS)]


def extended_rows(seat):
    """About 20 rows of the team's own village: colour + face-up card -> the card to flip next."""
    rows = EXTENDED['seats'][(seat - 1) % len(EXTENDED['seats'])]
    return [{'key': key, 'flip': flip} for key, flip in rows]


def home_rows(seat):
    """About 30 rows of the Part 2 home: colour + face-up card -> the card to flip next."""
    rows = EXTENDED['home'][(seat - 1) % len(EXTENDED['home'])]
    return [{'key': key, 'flip': flip} for key, flip in rows]


def in_vote(seat, key):
    """Whether this seat answers a vote: everyone for words and the Part 2 home, its team otherwise."""
    if key in ('word', HOME_KEY):
        return True
    if key in HH_KEYS:
        return 'H' + hh_team(seat) == key
    if key in EXT_KEYS:
        return 'E' + ext_team(seat) == key
    return team(seat) == key


def check_rover():
    """Share voting AVOID on each PW6 screen, assuming everyone votes."""
    pack = json.loads((ROOT / 'paperweights/web/pack.json').read_text())
    seats = [rover_squares(s) for s in range(1, 2001)]
    out = []
    for t in pack['teams']:
        for r in t['rounds']:
            shown = {(c, r['targetCues'][c]['value']) for c in ('battery', 'slope', 'dust', 'ground')}
            avoid = sum(any((q['category'], q['value']) in shown for q in s) for s in seats) / len(seats)
            out.append((t['id'], r['index'], r['fatal'], round(avoid, 2)))
    return out


if __name__ == '__main__':
    res = check_rover()
    print('rover safe max avoid', max(a for *_, f, a in res if not f), 'hazard min avoid', min(a for *_, f, a in res if f))
    print('household useful keys', len(USEFUL), 'live', len(LIVE))
    print(household_rows(1)[:3])
    print('word sheet', word_sheets(12)[0][:3])
