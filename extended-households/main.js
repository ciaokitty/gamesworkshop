// Extended Households: title, Part 1 (three villages, three orgs) and Part 2 (one home).
// The model decides everything; this file only shows what is face up and plays the turns.
import * as M from './model.js';
import { Village } from './village.js';
import { svg, LEVEL } from './sprites.js';
import { TEAMS } from '../households/village-sprites.js';
import { contextMark, coin } from '../households/pixel-cards.js';
import { barLabel } from './cards.js';
import * as dialog from './dialog.js';
import { SFX, toggleSound, soundOn, silence } from './sfx.js';
import * as LED from './led.js';
import { simulatedVote, cueKey } from './audience-room.js';

const params = new URLSearchParams(location.search);
const seedParam = Number.parseInt(params.get('seed'), 10);
const seed = Number.isFinite(seedParam) ? seedParam : M.DEFAULT_SEED;
const wait = ms => new Promise(r => setTimeout(r, ms));

// Food is gold, Money teal, School coral; the Part 2 child wears the fourth colour.
const ORG_TEAM = { harvest: TEAMS[2], cash: TEAMS[1], school: TEAMS[0] };
const HOME_TEAM = TEAMS[3];
const portrait = id => svg(LEVEL.mascot[id][0], { team: ORG_TEAM[id], cls: 'mascot' });

// --- settings ---------------------------------------------------------------------------------
// Night only: there is no day/night option. Only Part 2 has sound and the sound button.
const theme = 'dark';
function applySettings() {
  document.querySelector('#btn-sound').textContent = soundOn() ? 'SOUND ON' : 'SOUND OFF';
}
function enter(part) {
  stage.dataset.part = part; // Part 1 restyles the top bar in its own palette
  silence(part !== 'p2');
}

// --- the stage: a fixed 1600 x 900 screen scaled to fit -----------------------------------
const stage = document.querySelector('#stage'), screen = document.querySelector('#screen');
function fit() {
  const s = Math.min(innerWidth / 1600, innerHeight / 900);
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
}
addEventListener('resize', fit);

let scenes = [];
function loop(now) { scenes.forEach(s => s.frame(now)); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

const game = { part: 'title', p1: null, p2: null };

// --- title: a plain landing page in the pixel font ----------------------------------------------
function title() {
  game.part = 'title';
  enter('title');
  dialog.close(true);
  scenes = [];
  document.querySelector('#part-label').textContent = '';
  screen.innerHTML = `<div class="title-screen">
    <h1>PAPERWEIGHTS</h1>
    <nav class="menu">
      <button type="button" data-go="1"><b>PART 1</b> FIELD REPORTS</button>
      <button type="button" data-go="2"><b>PART 2</b> ONE HOME</button>
    </nav>
  </div>`;
  const menu = screen.querySelector('.menu');
  menu.onclick = e => { const b = e.target.closest('[data-go]'); if (!b) return; SFX.select(); b.dataset.go === '1' ? part1() : part2(); };
  menu.querySelector('button').focus();
}

// --- Part 1: field reports, on one LED chart ----------------------------------------------------
// Three teams, one village each, four months. The chart in the middle scores each team's calls;
// the team boxes above it open that team's cards. Cards start face down except one
// free card; each team has three reveals in all. ASK AI reads a state-wide archive (it learned
// elsewhere); ASK AUDIENCE asks the team's phones, or a simulated room of 200 offline.
const live = await import('/paperweights/web/room-client.js').catch(() => null);
const liveRoom = live?.room ? live : null;
let sheets = null, led = null;
const loadSheets = () => sheets ? Promise.resolve(sheets)
  : fetch(new URL('audience-sheets.json', import.meta.url)).then(r => r.json()).then(s => (sheets = s));

function newTeam(id) {
  const world = M.PART1_WORLDS.find(w => M.WORLDS[w].ladder === id);
  const first = M.play(M.deckSeed(seed, world), world, [], M.PART1_MONTHS).current;
  return { id, world, team: M.WORLDS[world].team, actions: [], revealed: [[first.free]], reveals: 3, 
    done: false, ai: null, room: null, asked: 0, results: [], match: null };
}
const teamRun = t => M.play(M.deckSeed(seed, t.world), t.world, t.actions, M.PART1_MONTHS);
const voteKey = t => `E${t.team}`;
const BAND = { harvest: 0, cash: 1, school: 2 };
// Part 1's terminal palette at high contrast: one bright shade per team (yellow, cyan, pink).
const P1_COLOUR = { harvest: '#ffc93c', cash: '#3ff2e0', school: '#ff5c93' };
const LED_COLOUR = P1_COLOUR;
const resultOf = (stepped, intervened) => stepped ? (intervened ? 'saved' : 'slipped') : (intervened ? 'wasted' : 'steady');

function part1() {
  game.part = 'p1';
  enter('p1');
  dialog.close(true);
  if (!game.p1) game.p1 = Object.fromEntries(M.LADDER_IDS.map(id => [id, newTeam(id)]));
  document.querySelector('#part-label').textContent = 'PART 1 · FIELD REPORTS';
  const tick = v => `<span class="yt" style="top:${LED.rowOf(v) * LED.P}px">${signed(v)}</span>`;
  screen.innerHTML = `<div class="p1 ledscreen">
    <div class="team-row">${M.LADDER_IDS.map(id => `<button type="button" class="team-icon" data-team="${id}" style="--org:${P1_COLOUR[id]}"></button>`).join('')}</div>
    <div class="led">
      <canvas class="ledc" width="${LED.W}" height="${LED.H}"></canvas>
      ${[4, 2, 0, -2, -4].map(tick).join('')}
      ${Array.from({ length: M.PART1_MONTHS }, (_, m) => `<span class="mt" style="left:${LED.colOf(m) * LED.P}px;width:${LED.MONTH * LED.P}px">M${m + 1}</span>`).join('')}
      ${M.LADDER_IDS.map(id => `<span class="tl" data-team="${id}" style="color:${LED_COLOUR[id]}">${game.p1[id].team}</span>`).join('')}
    </div>
    <button type="button" class="to-p2"${M.LADDER_IDS.every(id => game.p1[id].done) ? '' : ' hidden'}>PART 2 ▶</button>
  </div>`;
  led = new LED.Led(screen.querySelector('canvas.ledc'));
  scenes = [led];
  renderPart1();
  screen.querySelector('.p1').onclick = e => {
    if (e.target.closest('.to-p2')) return part2();
    const b = e.target.closest('.team-icon'); if (b) openTeamModal(b.dataset.team);
  };
}

// The chart shows each team's decisions: right calls rise, wrong calls dip.
const decisionsOf = t => t.results.map(r => ({ right: r === 'steady' || r === 'saved' }));
const scoreOf = t => t.results.reduce((s, r) => s + (r === 'steady' || r === 'saved' ? 1 : -1), 0);
const signed = n => n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0';
const reveals = left => `<span class="qn${left ? '' : ' none'}">? ×${left}</span>`; // reveals or flips left

function renderPart1() {
  if (game.part !== 'p1') return;
  const lines = M.LADDER_IDS.map(id => LED.cellsFor(BAND[id], decisionsOf(game.p1[id]), LED_COLOUR[id]));
  led?.update(lines);
  // The letters at the line ends, kept apart when lines finish on the same rows.
  const tagY = {};
  let last = -Infinity;
  [...M.LADDER_IDS].sort((x, y) => lines[BAND[x]].end[1] - lines[BAND[y]].end[1] || BAND[x] - BAND[y])
    .forEach(id => { last = Math.max(last + 36, lines[BAND[id]].end[1] * LED.P - 12); tagY[id] = last; });
  for (const id of M.LADDER_IDS) {
    const t = game.p1[id], el = screen.querySelector(`.team-icon[data-team="${id}"]`);
    if (!el) continue;
    const decided = t.actions.length, tag = screen.querySelector(`.tl[data-team="${id}"]`);
    tag.style.left = `${decided ? lines[BAND[id]].end[0] * LED.P + 8 : -34}px`; tag.style.top = `${tagY[id]}px`;
    el.classList.toggle('done', t.done);
    el.innerHTML = `<span class="letter">${t.team}</span><span class="org">${M.ORGS[id].name}</span>
<span class="score">${signed(scoreOf(t))}</span><span class="meta">${t.done ? 'DONE' : reveals(t.reveals)}</span>`;
  }
  if (dialog.isOpen() && dialog.box()?.dataset.team) dialog.render(teamModalBody(dialog.box().dataset.team), false);
}

// --- the team modal: Rover-style month columns, sized for a projector -------------------------
// Every state is a word (STORM, TIGHT, MISSES DAYS); face-down cards are a plain "?".
const faceUp = (card, value) => `<i>${M.VALUE_LABELS[value]}</i>`;
const roomTop = t => {
  const r = t.room?.result;
  return r?.total ? Object.entries(r.counts).sort((a, b) => b[1] - a[1])[0][0] : null;
};

function teamModalBody(id) {
  const t = game.p1[id], run = teamRun(t), current = t.done ? null : t.actions.length, top = roomTop(t);
  const months = Array.from({ length: M.PART1_MONTHS }, (_, m) => m);
  const isMatch = (card, value) => t.match && t.match.card === card && t.match.value === value;
  const head = m => {
    const mo = run.months[m], ctx = mo && M.CONTEXTS[mo.context];
    const sw = mo ? `<span class="sw" style="--ctx:${ctx[theme]}" title="${m ? `Colour carried into month ${m + 1}: ${ctx.colorName}` : `Starting colour: ${ctx.colorName}`}"></span>` : '<span class="sw empty"></span>';
    return `<span class="mh${m === current ? ' now' : ''}">${sw}M${m + 1}</span>`;
  };
  const cell = (m, card) => {
    const mo = run.months[m];
    if (!mo) return `<span class="mc future"></span>`;
    if ((t.revealed[m] || []).includes(card)) {
      const v = mo.cards[card];
      return `<button type="button" class="mc up${isMatch(card, v) ? ' match' : ''}" data-pick="${card}:${v}" title="${M.CARD_LABELS[card]}: ${M.VALUE_LABELS[v]}">${faceUp(card, v)}</button>`;
    }
    if (m === current && t.reveals > 0) return `<button type="button" class="mc down can${card === top ? ' dot' : ''}" data-reveal="${card}" title="Reveal ${M.CARD_LABELS[card]}">?</button>`;
    return `<span class="mc down">?</span>`;
  };
  const grid = `<div class="tm-grid" style="--months:${M.PART1_MONTHS}">
    <span></span>${months.map(head).join('')}
    ${M.CARDS.map(card => `<span class="rl">${M.CARD_LABELS[card]}</span>${months.map(m => cell(m, card)).join('')}`).join('')}
  </div>`;
  if (t.done) return `${grid}<p class="tm-note">All ${M.PART1_MONTHS} months recorded. Tap a card to find it in other months.</p>`;
  // The AI and audience boxes appear only once asked; until then the cards use the full width.
  const side = aiPanel(t) + roomPanel(t);
  return `${grid}
    ${side ? `<div class="tm-side">${side}</div>` : ''}
    <div class="tm-actions">
      <span class="left" title="${t.reveals} reveal${t.reveals === 1 ? '' : 's'} left">${reveals(t.reveals)}</span>
      <button type="button" data-act="ai">ASK AI</button><button type="button" data-act="room">ASK AUDIENCE</button>
      <span class="grow"></span>
      <button type="button" data-act="skip">SKIP</button><button type="button" data-act="intervene" class="int">INTERVENE</button>
    </div>`;
}

const bars = list => `<div class="bars">${list.map(b => `<div class="bar"><span class="track"><span class="fill" style="width:${b.pct}%"></span><span class="blabel">${b.label}</span></span><span class="pct">${b.pct}%</span></div>`).join('')}</div>`;
// Skip, Intervene and the two strongest reveal suggestions; any other reveals share one bar.
function aiBars(list) {
  const act = list.filter(b => !b.label.startsWith('flip:')), flips = list.filter(b => b.label.startsWith('flip:')).sort((a, b) => b.pct - a.pct);
  const rest = flips.slice(2).reduce((s, b) => s + b.pct, 0);
  return [...act.map(b => ({ label: b.label === 'skip' ? 'SKIP' : 'INTERVENE', pct: b.pct })),
    ...flips.slice(0, 2).map(b => ({ label: `FLIP ${M.CARD_LABELS[b.label.slice(5)]}`, pct: b.pct })),
    ...(rest ? [{ label: 'OTHER FLIPS', pct: rest }] : [])];
}
function aiPanel(t) {
  if (!t.ai) return '';
  if (t.ai.matched === 0) return `<div class="panel"><b>AI</b><p class="hint">no state-wide records look like this</p></div>`;
  return `<div class="panel"><b>AI <span class="n">· ${t.ai.matched} records</span></b>${bars(aiBars(t.ai.bars))}</div>`;
}
function roomPanel(t) {
  if (!t.room) return '';
  const r = t.room.result, cue = `<span class="cue">${t.room.swatch}${M.VALUE_LABELS[t.room.value]}</span>`;
  if (!r || r.status === 'waiting') return `<div class="panel"><b>AUDIENCE</b>${cue}<p class="hint">waiting for votes…</p></div>`;
  if (r.status === 'no-data') return `<div class="panel"><b>AUDIENCE</b>${cue}<p class="hint">no card suggestion on Team ${t.team}'s sheets</p></div>`;
  // Which card to flip next, as the room's sheets suggest (cards already face up are excluded).
  const ranked = Object.entries(r.counts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  return `<div class="panel"><b>AUDIENCE <span class="n">· ${r.total} of ${r.eligible}${t.room.simulated ? ' · sim' : ''}</span></b>${cue}
    ${bars(ranked.map(([card, n]) => ({ label: `FLIP ${M.CARD_LABELS[card]}`, pct: Math.round(100 * n / r.total) })))}</div>`;
}

function openTeamModal(id) {
  const t = game.p1[id];
  if (!t) return;
  const box = dialog.open({ title: `<span class="tletter">${t.team}</span>${M.ORGS[id].name}<span class="sub">${M.WORLDS[t.world].name}</span>`, body: teamModalBody(id), cls: 'p1modal' });
  box.dataset.team = id;
  box.style.setProperty('--org', P1_COLOUR[id]);
  box.onclick = e => {
    const b = e.target.closest('button');
    if (!b || b.classList.contains('x')) return;
    if (b.dataset.pick) { const [card, value] = b.dataset.pick.split(':'); t.match = t.match?.card === card && t.match.value === value ? null : { card, value }; SFX.select(); return dialog.render(teamModalBody(id), false); }
    if (b.dataset.reveal) return reveal(id, b.dataset.reveal);
    if (b.dataset.act === 'ai') return askAi(id);
    if (b.dataset.act === 'room') return askRoom(id);
    if (b.dataset.act === 'skip' || b.dataset.act === 'intervene') decide(id, b.dataset.act === 'intervene');
  };
}

function clearAdvice(t) {
  t.ai = null;
  if (t.room && liveRoom) liveRoom.close(voteKey(t)).catch(() => {});
  t.room = null;
}

function reveal(id, card) {
  const t = game.p1[id], m = t.actions.length;
  if (t.done || t.reveals <= 0 || t.revealed[m].includes(card)) return;
  t.revealed[m].push(card); t.reveals--;
  clearAdvice(t);
  SFX.flip();
  renderPart1();
}

function askAi(id) {
  const t = game.p1[id], month = teamRun(t).current;
  t.ai = M.poll(M.deckSeed(seed, t.world), t.world, month, t.revealed[month.index], { ladders: [id], flips: t.reveals, archive: M.AI_ARCHIVE });
  SFX.ai();
  renderPart1();
}

// The cue is the latest card turned face up this month, with this month's colour.
async function askRoom(id) {
  const t = game.p1[id], month = teamRun(t).current, cards = t.revealed[month.index];
  const card = cards[cards.length - 1], value = month.cards[card], ctx = M.CONTEXTS[month.context];
  const key = cueKey(ctx.id, card, value), exclude = [...cards];
  const room = { key, card, value, exclude, swatch: `<span class="sw" style="--ctx:${ctx[theme]}" title="${ctx.colorName}"></span>`, result: null };
  t.room = room;
  SFX.note();
  if (liveRoom) {
    renderPart1();
    room.result = await liveRoom.open(voteKey(t), 'extended', { cue: key, exclude }).catch(() => null);
  } else {
    room.simulated = true;
    room.result = simulatedVote(await loadSheets(), t.team, key, { salt: `${t.team}:${month.index}:${key}:${++t.asked}`, exclude });
  }
  if (t.room === room) renderPart1();
}
liveRoom?.watch(summary => {
  const h = game.part === 'p2' && game.p2, v = h?.room && summary.votes[HOME_KEY];
  if (v && v.cue === h.room.key) { h.room.result = v; renderCouncil(); return; }
  if (game.part !== 'p1' || !game.p1) return;
  let changed = false;
  for (const id of M.LADDER_IDS) {
    const t = game.p1[id], v = t.room && summary.votes[voteKey(t)];
    if (v && v.cue === t.room.key) { t.room.result = v; changed = true; }
  }
  if (changed) renderPart1();
});

function decide(id, intervene) {
  const t = game.p1[id];
  if (t.done) return;
  const month = teamRun(t).current, m = month.index, stepped = month.step[id];
  t.actions.push(intervene ? [id] : []);
  t.revealed[m] = [...M.CARDS];
  t.results[m] = resultOf(stepped, intervene);
  clearAdvice(t);
  t.match = null;
  intervene ? SFX.coin() : SFX.skip();
  if (m + 1 >= M.PART1_MONTHS) t.done = true;
  else t.revealed[m + 1] = [teamRun(t).months[m + 1].free];
  dialog.close(true);
  renderPart1();
  if (stepped && !intervene) setTimeout(SFX.hit, 350);
  if (M.LADDER_IDS.every(l => game.p1[l].done)) screen.querySelector('.to-p2').hidden = false;
}

// --- Part 2: one home, on a Households lane ----------------------------------------------------
// The map is Households' village with a single lane; the council's dialog is Households' team
// dialog with five cards. As in Households, ladder levels show only on the cards, and the map
// shows only the walk: detours past support camps, and OUT when a ladder reaches the bottom.
// One INTERVENE protects all three ladders for the month and costs one of three coins.
// AUDIENCE asks the whole room's phones which card to flip (a simulated room of 200 offline),
// as often as the council likes.
let village = null;
const HOME_KEY = 'EH';
function newHome() {
  const first = M.play(seed, 'home', []).current;
  return { actions: [], revealed: [[first.free]], flips: 3, supports: 3, asked: 0, ai: null, room: null, fresh: null, status: 'playing', busy: false, lost: null };
}
const homeRun = () => M.play(seed, 'home', game.p2.actions);
const budget = h => `<span class="tokens" title="${h.flips} flips · ${h.supports} interventions left">
  <span>${reveals(h.flips)}</span><span>${[0, 1, 2].map(i => coin(i < h.supports)).join('')}</span></span>`;
function clearHomeAdvice(h) {
  h.ai = null;
  if (h.room && liveRoom) liveRoom.close(HOME_KEY).catch(() => {});
  h.room = null;
}
// The cue is the latest card turned face up this month, with this month's colour.
async function askHomeRoom() {
  const h = game.p2, month = homeRun().current, cards = h.revealed[month.index];
  const card = cards.at(-1), value = month.cards[card], ctx = M.CONTEXTS[month.context];
  const key = cueKey(ctx.id, card, value), exclude = [...cards];
  const room = { key, card, value, result: null };
  h.ai = null; h.room = room;
  SFX.note();
  if (liveRoom) {
    renderCouncil();
    room.result = await liveRoom.open(HOME_KEY, 'home', { cue: key, exclude }).catch(() => null);
  } else {
    room.simulated = true;
    room.result = simulatedVote(await loadSheets(), null, key, { salt: `home:${month.index}:${key}:${++h.asked}`, exclude, part: 'home' });
  }
  if (h.room === room) renderCouncil();
}

function part2() {
  game.part = 'p2';
  enter('p2');
  dialog.close(true);
  if (!game.p2) game.p2 = newHome();
  const h = game.p2;
  document.querySelector('#part-label').textContent = 'PART 2 · ONE HOME';
  screen.innerHTML = `<div class="p2"><canvas class="village" aria-label="The home on the left, six months of fields, the school on the right. Tap the map or press Space to open the council."></canvas></div>`;
  village = new Village(screen.querySelector('canvas.village'));
  scenes = [village];
  renderHome();
  screen.querySelector('.p2').onclick = () => openCouncil();
  if (!h.actions.length && !h.introduced) {
    h.introduced = true;
    const box = dialog.open({ title: 'ONE HOME', portrait: M.LADDER_IDS.map(portrait).join(''), cls: 'hh', body: `
      <p class="say">Three orgs, one family, six months.</p>
      <p class="goal">Keep HARVEST, CASH and SCHOOL off the bottom step.</p>
      <div class="legend"><span>${reveals(3)} FLIPS</span><span>${[1, 1, 1].map(coin).join('')} INTERVENTIONS</span></div>
      <div class="hh-actions"><span class="grow"></span><button type="button" data-act="go">LET'S GO ▶</button></div>` });
    box.onclick = e => { if (e.target.closest('[data-act="go"]')) { dialog.close(true); openCouncil(); } };
  }
}

function renderHome() {
  const h = game.p2;
  if (game.part !== 'p2' || !h) return;
  village?.sync({ legs: h.actions.map(a => a.length ? 'avoid' : 'go'), camps: Object.fromEntries(h.actions.map((a, m) => [m, a])),
    status: h.status, active: h.status === 'playing' && !h.busy ? h.actions.length : null });
}

// Households' team dialog: five cards (face down until flipped), the polls, then the actions.
function councilBody() {
  const h = game.p2, month = homeRun().current, m = month.index, revealed = h.revealed[m], ctx = M.CONTEXTS[month.context];
  const r = h.room?.result, top = r?.total ? Object.entries(r.counts).sort((a, b) => b[1] - a[1])[0][0] : null;
  const cards = M.CARDS.map(c => {
    const up = revealed.includes(c), v = month.cards[c];
    return `<div class="cardbox${up && c === revealed.at(-1) ? ' latest' : ''}${!up && c === top ? ' pick' : ''}" style="--context:${up ? ctx[theme] : 'var(--hline)'}">
      <div class="cardlabel"><span>${up ? contextMark(ctx.id) : ''}</span><span>${M.CARD_LABELS[c]}</span></div>
      <button type="button" class="hcard${up ? ' up' : ''}${c === h.fresh ? ' fresh' : ''}" data-card="${c}"${up || h.flips <= 0 ? ' disabled' : ''}
        aria-label="${up ? `${M.CARD_LABELS[c]}: ${M.VALUE_LABELS[v]}` : `Flip ${M.CARD_LABELS[c]}`}">${up ? `<i>${M.VALUE_LABELS[v]}</i>` : '?'}</button></div>`;
  }).join('');
  const rows = list => list.map(b => `<div class="poll-row"><span>${b.label}</span><div class="track"><div style="width:${b.pct}%"></div></div><span>${b.pct}%</span></div>`).join('');
  // Which card to flip next, as the room's sheets suggest (cards already face up are excluded).
  const roomPoll = () => {
    if (!r || r.status === 'waiting') return '<p class="room-call">ROOM: waiting for votes…</p>';
    if (r.status === 'no-data') return "<p class=\"room-call\">ROOM: no card suggestion on the room's sheets</p>";
    const ranked = Object.entries(r.counts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    return `<p class="room-head">ROOM · ${r.total} of ${r.eligible}${h.room.simulated ? ' · simulated' : ''}</p>${rows(ranked.map(([card, n]) => ({ label: `FLIP ${M.CARD_LABELS[card]}`, pct: Math.round(100 * n / r.total) })))}`;
  };
  const polls = h.ai ? rows(h.ai.bars.map(b => ({ label: barLabel(b.label), pct: b.pct }))) : h.room ? roomPoll() : '';
  const actions = `<button type="button" data-act="skip">SKIP</button><button type="button" data-act="intervene"${h.supports > 0 ? '' : ' disabled'}>INTERVENE</button>
      <span class="grow"></span><button type="button" data-act="room">AUDIENCE</button><button type="button" data-act="ai">AI</button>`;
  return `<div class="cards">${cards}</div><div class="polls">${polls}</div><div class="hh-actions">${actions}</div>`;
}
function renderCouncil() {
  const box = dialog.box();
  if (!box || box.dataset.council == null) return;
  dialog.render(councilBody(), false);
  box.querySelector('header .tokens')?.remove();
  box.querySelector('header h2').insertAdjacentHTML('beforeend', budget(game.p2));
}

function openCouncil() {
  const h = game.p2;
  if (!h || h.status !== 'playing' || h.busy || dialog.isOpen()) return;
  const m = h.actions.length;
  const box = dialog.open({ title: `ONE HOME · MONTH ${m + 1}`, body: '', cls: 'hh council' });
  box.dataset.council = m;
  renderCouncil();
  box.onclick = e => {
    const month = homeRun().current;
    const flip = e.target.closest('button.hcard:not(.up)');
    if (flip && !flip.disabled && h.flips > 0) { h.revealed[m].push(flip.dataset.card); h.flips--; clearHomeAdvice(h); h.fresh = flip.dataset.card; SFX.flip(); return renderCouncil(); }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'ai') { clearHomeAdvice(h); h.ai = M.poll(seed, 'home', month, h.revealed[m], { flips: h.flips, joint: true }); SFX.ai(); renderCouncil(); }
    if (act === 'room') askHomeRoom();
    if (act === 'skip') endMonth(false);
    if (act === 'intervene' && h.supports > 0) endMonth(true);
  };
}

// The dialog closes and the map shows the walk, as in Households.
async function endMonth(intervene) {
  const h = game.p2;
  if (h.busy) return;
  h.busy = true;
  const month = homeRun().current, m = month.index, supported = intervene ? [...M.LADDER_IDS] : [];
  h.actions.push(supported);
  if (intervene) h.supports--;
  clearHomeAdvice(h); h.fresh = null;
  h.revealed[m] = [...M.CARDS];
  dialog.close(true);
  supported.length ? SFX.powerup() : SFX.skip();
  const run = homeRun(), bottomed = M.LADDER_IDS.filter(id => run.levels[id] >= M.BOTTOM);
  h.status = bottomed.length ? 'lost' : m + 1 >= M.MONTHS ? 'won' : 'playing';
  h.lost = bottomed;
  renderHome();
  const view = village;
  await wait(200);
  while (game.part === 'p2' && village === view && !view.idle()) await wait(100);
  M.LADDER_IDS.some(id => month.step[id] && !supported.includes(id)) ? SFX.hit() : SFX.good();
  if (h.status === 'playing') h.revealed[m + 1] = [run.months[m + 1].free];
  h.busy = false;
  renderHome();
  if (h.status !== 'playing') setTimeout(ending, 700);
}

function ending() {
  const h = game.p2, run = homeRun(), won = h.status === 'won';
  const story = { harvest: 'The harvest failed, and the family is sliding into poverty.', cash: 'The family fell into heavy debt.', school: 'The child dropped out of school.' };
  won ? SFX.clear() : SFX.gentle();
  if (won) fireworks();
  const used = h.actions.filter(a => a.length).length;
  const body = `<p class="say">${won ? 'Six months, every ladder off the bottom step.' : `${h.lost.map(id => story[id]).join(' ')}`}</p>
    <div class="final">${M.LADDER_IDS.map(l => `<span${run.levels[l] >= M.BOTTOM ? ' class="bottom"' : ''}><b>${M.CARD_LABELS[l]}</b>${M.VALUE_LABELS[M.LADDERS[l][run.levels[l]]]}</span>`).join('')}</div>
    <p class="hint">${coin(true)} ${used} of 3 · ? ${3 - h.flips} of 3</p>
    <div class="actions"><span class="grow"></span>
      <button type="button" data-act="again" class="skip-btn">PLAY AGAIN</button><button type="button" data-act="menu" class="act-btn">MENU</button></div>`;
  const box = dialog.open({ title: won ? 'HOME SAFE!' : 'THE FAMILY NEEDS MORE HELP', portrait: svg(LEVEL.kid[HOME_TEAM.id][0], { team: HOME_TEAM, cls: 'mascot' }), body, wide: true, cls: `hh ${won ? 'won' : 'lost'}` });
  box.onclick = e => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'again') { game.p2 = null; part2(); }
    if (a === 'menu') { game.p1 = null; game.p2 = null; title(); }
  };
}

function fireworks() {
  const wrap = screen.querySelector('.p2');
  if (!wrap) return;
  for (let i = 0; i < 9; i++) {
    const f = document.createElement('div');
    f.className = 'firework';
    f.style.cssText = `left:${10 + (i * 37) % 80}%;top:${8 + (i * 23) % 40}%;animation-delay:${i * 0.25}s;--c:${['#ffd77a', '#ff6b6b', '#2ec4b6', '#ff70a6', '#a58ad0'][i % 5]}`;
    wrap.append(f);
    setTimeout(() => f.remove(), 3500 + i * 250);
  }
}

// --- controls ---------------------------------------------------------------------------------
document.querySelector('#btn-menu').onclick = () => { SFX.select(); title(); };
document.querySelector('#btn-sound').onclick = () => { toggleSound(); applySettings(); };
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea, select')) return;
  if (game.part === 'p2' && (e.key === ' ' || e.key === 'Enter') && !dialog.isOpen()) { e.preventDefault(); openCouncil(); }
  const team = game.part === 'p1' && M.LADDER_IDS.find(id => game.p1[id].team === e.key.toUpperCase());
  if (team) dialog.box()?.dataset.team === team ? dialog.close() : openTeamModal(team);
});

applySettings();
fit();
const start = params.get('part');
start === '1' ? part1() : start === '2' ? part2() : title();
