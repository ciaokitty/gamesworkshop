// Deals the Part 1 audience sheets and reports how a room of 200 votes on the default deck.
//   node extended-households/audience.mjs          (writes audience-sheets.json)
// Rerun after changing model.js or DEFAULT_SEED: the room server and the page both read the file.
//
// Part 1: each seat belongs to Team A, B or C (one org, one village) and holds rows of that
// village's own history: "colour + one face-up card -> the card worth flipping next". As in
// Households, the answer is the card whose value most reduced uncertainty about the team's
// ladder in that village's records. The AI learned elsewhere (model.js AI_ARCHIVE).
// Part 2: every seat also holds rows of the home's history, where the answer is the card that
// most reduced uncertainty about any ladder slipping (the whole room answers these).
import { writeFileSync } from 'node:fs';
import * as M from './model.js';
import { TEAMS, SEATS, ROOM, teamOf, memberOf, cueKey, hash, simulatedVote } from './audience-room.js';

const ROWS = 20, LIVE_ROWS = 16, NOISE = 7, MIN_GAIN = 0.005; // about one member in seven holds a noisy row per key
const HOME_ROWS = 30, HOME_LIVE = 26; // Part 2 has more live cues (six months, more paths), so more rows
const village = team => M.PART1_WORLDS[TEAMS.indexOf(team)];
const seedOf = worldId => M.deckSeed(M.DEFAULT_SEED, worldId);

const entropy = p => p <= 0 || p >= 1 ? 0 : -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
// ladder null: any ladder slipping (Part 2's single intervention protects all three).
const slips = (row, ladder) => ladder ? row.step[ladder] : Object.values(row.step).some(Boolean);
const slipRate = (rows, ladder) => rows.filter(r => slips(r, ladder)).length / rows.length;

// For each colour + card value in the village's records: how much each other card's value
// would have told you about the ladder slipping next month (expected information gain).
function localGains(worldId) {
  const ladder = M.WORLDS[worldId].ladder, pools = {};
  for (const row of M.archive(seedOf(worldId), worldId)) {
    for (const card of M.CARDS) (pools[cueKey(M.CONTEXTS[row.context].id, card, row.cards[card])] ||= []).push(row);
  }
  const out = {};
  for (const [key, pool] of Object.entries(pools)) {
    if (pool.length < 20) continue;
    const seenCard = key.split(':')[1], before = entropy(slipRate(pool, ladder)), gains = {};
    for (const card of M.CARDS) {
      if (card === seenCard) continue;
      const groups = {};
      for (const row of pool) (groups[row.cards[card]] ||= []).push(row);
      const after = Object.values(groups).reduce((s, g) => s + g.length / pool.length * entropy(slipRate(g, ladder)), 0);
      const g = before - after;
      if (g > MIN_GAIN) gains[card] = g;
    }
    if (Object.keys(gains).length) out[key] = gains;
  }
  return out;
}

// Cues the default deck can actually show: any card of any month, on every Skip/Intervene path
// (Part 2: at most three interventions, each holding all three ladders).
function liveKeys(worldId) {
  const ladder = M.WORLDS[worldId].ladder, months = ladder ? M.PART1_MONTHS : M.MONTHS, keys = new Set();
  for (let mask = 0; mask < 1 << months; mask++) {
    if (!ladder && [...mask.toString(2)].filter(b => b === '1').length > 3) continue;
    const actions = [];
    for (let m = 0; m < months; m++) {
      const mo = M.play(seedOf(worldId), worldId, actions, months).current;
      for (const card of M.CARDS) keys.add(cueKey(M.CONTEXTS[mo.context].id, card, mo.cards[card]));
      actions.push(mask >> m & 1 ? (ladder ? [ladder] : [...M.LADDER_IDS]) : []);
    }
  }
  return [...keys];
}

// Members holding a key split their answers by the gains, using a low-discrepancy sequence
// rather than coin flips, so the room's split is stable at every room size.
function answerFor(gains, j, key) {
  const cards = Object.keys(gains).sort(), total = cards.reduce((s, c) => s + gains[c], 0);
  const best = cards.reduce((a, c) => gains[c] > gains[a] ? c : a, cards[0]);
  if ((j + hash(key)) % NOISE === 3) { // a noisy row: some card other than the best one
    const others = M.CARDS.filter(c => c !== best && c !== key.split(':')[1]);
    return others[(j + hash(key + 'noise')) % others.length];
  }
  let u = ((j + 1) * 0.6180339887 + hash(key) / 4294967296) % 1;
  for (const c of cards) { u -= gains[c] / total; if (u < 0) return c; }
  return cards[cards.length - 1];
}

function deal() {
  const plan = Object.fromEntries(TEAMS.map(team => {
    const worldId = village(team), gains = localGains(worldId);
    const live = liveKeys(worldId).filter(k => gains[k]);
    const extra = Object.keys(gains).filter(k => !live.includes(k)).sort();
    return [team, { worldId, gains, live, extra }];
  }));
  const homeGains = localGains('home'), homeLive = liveKeys('home').filter(k => homeGains[k]);
  const homeExtra = Object.keys(homeGains).filter(k => !homeLive.includes(k)).sort();
  plan.home = { worldId: 'home', gains: homeGains, live: homeLive, extra: homeExtra };
  const rowsFor = (seat, j, { gains, live, extra }, rows = ROWS, liveRows = LIVE_ROWS) => {
    const keys = [];
    for (let i = 0; i < Math.min(liveRows, live.length); i++) keys.push(live[(j * liveRows + i) % live.length]);
    for (let i = 0; keys.length < rows && i < extra.length; i++) keys.push(extra[(hash(`${seat}`) + i * 7919) % extra.length]);
    return [...new Set(keys)].sort().map(key => [key, answerFor(gains[key], j, key)]);
  };
  const seats = [], home = [];
  for (let seat = 1; seat <= SEATS; seat++) {
    seats.push(rowsFor(seat, memberOf(seat), plan[teamOf(seat)]));
    home.push(rowsFor(seat, seat - 1, plan.home, HOME_ROWS, HOME_LIVE)); // Part 2: the whole room is one council
  }
  return { plan, sheets: { version: `XH3-${Object.values(M.DECK).join('-')}`, deck: M.DECK,
    teams: Object.fromEntries(TEAMS.map(t => [t, { village: plan[t].worldId, ladder: M.WORLDS[plan[t].worldId].ladder }])), seats, home } };
}

const { plan, sheets } = deal();
writeFileSync(new URL('audience-sheets.json', import.meta.url), JSON.stringify(sheets) + '\n');
console.log(`audience-sheets.json: ${SEATS} seats x ~${ROWS} rows per part, version ${sheets.version}`);

// --- the 200-person report on the default deck, playing each org correctly -------------------
// The room should point at a useful card: its top choice should carry at least half the
// information of the best card, judged on the village's own records.
let problems = 0;
for (const team of TEAMS) {
  const worldId = village(team), ladder = M.WORLDS[worldId].ladder, actions = [], gains = plan[team].gains;
  console.log(`\nTeam ${team} · ${M.WORLDS[worldId].name} · ${ladder}`);
  console.log('| Month | Colour | Cue (free card) | Matching / team | Room top flip | Local best flip | AI suggests |\n| --- | --- | --- | --- | --- | --- | --- |');
  for (let m = 0; m < M.PART1_MONTHS; m++) {
    const mo = M.play(seedOf(worldId), worldId, actions, M.PART1_MONTHS).current, ctx = M.CONTEXTS[mo.context];
    const key = cueKey(ctx.id, mo.free, mo.cards[mo.free]);
    const vote = simulatedVote(sheets, team, key, { size: ROOM, salt: `${team}:${m}:${key}`, exclude: [mo.free] });
    const top = Object.entries(vote.counts).sort((a, b) => b[1] - a[1])[0];
    const g = gains[key] || {}, best = Object.keys(g).sort((a, b) => g[b] - g[a])[0];
    const ai = M.poll(seedOf(worldId), worldId, mo, [mo.free], { ladders: [ladder], archive: M.AI_ARCHIVE, flips: 3 });
    const aiTop = ai.bars.filter(b => b.label.startsWith('flip:')).sort((a, b) => b.pct - a.pct)[0];
    const useful = top && best && (g[top[0]] || 0) >= 0.5 * g[best];
    if (best && !useful) { problems++; console.log('  ! the room does not point at a useful card here'); }
    console.log(`| ${m + 1} | ${ctx.colorName} | ${mo.free} ${mo.cards[mo.free]} | ${vote.matching} / ${vote.eligible} | ${top ? `${top[0]} ${Math.round(100 * top[1] / vote.total)}%` : '—'} | ${best || 'none helps'} | ${aiTop ? aiTop.label.slice(5) : '—'} |`);
    actions.push(mo.step[ladder] ? [ladder] : []);
  }
  const thin = plan[team].live.map(k => simulatedVote(sheets, team, k, { size: ROOM, salt: k }).matching);
  console.log(`  live keys ${plan[team].live.length}, fewest holders ${Math.min(...thin)} of ${Math.ceil(ROOM / 3)}`);
}
// Part 2: the whole room on the home deck, played by the pairs (at most three interventions).
{
  const gains = plan.home.gains, actions = [];
  let left = 3;
  console.log('\nPart 2 · one home · any ladder');
  console.log('| Month | Colour | Cue (free card) | Matching / room | Room top flip | Local best flip |\n| --- | --- | --- | --- | --- | --- |');
  for (let m = 0; m < M.MONTHS; m++) {
    const mo = M.play(seedOf('home'), 'home', actions).current, ctx = M.CONTEXTS[mo.context];
    const key = cueKey(ctx.id, mo.free, mo.cards[mo.free]);
    const vote = simulatedVote(sheets, null, key, { size: ROOM, salt: `home:${m}:${key}`, exclude: [mo.free], part: 'home' });
    const top = Object.entries(vote.counts).sort((a, b) => b[1] - a[1])[0];
    const g = gains[key] || {}, best = Object.keys(g).sort((a, b) => g[b] - g[a])[0];
    const useful = top && best && (g[top[0]] || 0) >= 0.5 * g[best];
    if (best && !useful) { problems++; console.log('  ! the room does not point at a useful card here'); }
    console.log(`| ${m + 1} | ${ctx.colorName} | ${mo.free} ${mo.cards[mo.free]} | ${vote.matching} / ${vote.eligible} | ${top ? `${top[0]} ${Math.round(100 * top[1] / vote.total)}%` : '—'} | ${best || 'none helps'} |`);
    const act = left > 0 && M.LADDER_IDS.some(id => mo.step[id]);
    if (act) left--;
    actions.push(act ? [...M.LADDER_IDS] : []);
  }
  console.log(`  live keys ${plan.home.live.length}`);
}
if (problems) { console.log(`\n${problems} problem(s)`); process.exitCode = 1; } else console.log('\nreport checks passed');
