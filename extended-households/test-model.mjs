// node extended-households/test-model.mjs
import assert from 'node:assert/strict';
import {
  LADDERS, DISRUPTORS, CARDS, LADDER_IDS, BOTTOM, WORLDS, PART1_WORLDS, MONTHS, PART1_MONTHS, DEFAULT_SEED, AI_ARCHIVE, deckSeed,
  wouldStep, transition, contextFor, play, archive, poll,
} from './model.js';

let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

// Every combination of cards, against the rules written out by hand.
const all = [];
for (const weather of DISRUPTORS.weather) for (const expense of DISRUPTORS.expense)
  for (const harvest of LADDERS.harvest) for (const cash of LADDERS.cash) for (const school of LADDERS.school)
    all.push({ weather, expense, harvest, cash, school });
for (const c of all) {
  const h = LADDERS.harvest.indexOf(c.harvest), k = LADDERS.cash.indexOf(c.cash), s = LADDERS.school.indexOf(c.school);
  const step = wouldStep(c);
  ok(step.harvest === (c.weather === 'storm' && h >= 1 && h < BOTTOM), `harvest rule ${JSON.stringify(c)}`);
  ok(step.cash === (c.expense === 'expense' && k >= 1 && k < BOTTOM), `cash rule ${JSON.stringify(c)}`);
  ok(step.school === (k >= 2 && h >= 2 && s < BOTTOM), `school rule ${JSON.stringify(c)}`);
  for (const supported of [[], ['harvest'], ['cash'], ['school'], LADDER_IDS]) {
    const t = transition(c, supported);
    for (const id of LADDER_IDS) {
      const before = LADDERS[id].indexOf(c[id]);
      ok(Math.abs(t.next[id] - before) <= 1, 'one step at most');
      if (step[id]) ok(t.next[id] === (supported.includes(id) ? before : before + 1), 'support holds a step, skip lets it fall');
      else ok(t.next[id] <= before, 'no step down without the pair');
      if (before === BOTTOM) ok(t.next[id] === BOTTOM, 'the bottom step is final');
    }
  }
}

// Colour is history: last month's movement and support, nothing about the current hidden cards.
ok(contextFor({ harvest: false, cash: false, school: false }, false) === 0, 'calm');
ok(contextFor({ harvest: true, cash: true, school: false }, true) === 3, 'harvest first, supported');
ok(contextFor({ harvest: false, cash: false, school: true }, false) === 4, 'school slipped');
for (const worldId of Object.keys(WORLDS)) {
  for (let seed = 1; seed <= 40; seed++) {
    const actions = [];
    for (let m = 0; m < MONTHS; m++) {
      const run = play(seed, worldId, actions);
      const month = run.current;
      if (m > 0) {
        const prev = run.months[m - 1];
        ok(month.context === contextFor(prev.down, prev.supported.length > 0), 'colour from last month only');
      }
      // Same seed + same actions -> the same month; disruptors ignore actions.
      ok(JSON.stringify(play(seed, worldId, actions).current) === JSON.stringify(month), 'deterministic replay');
      const other = play(seed, worldId, actions.map(a => a.length ? [] : ['harvest'])).months[m];
      ok(other.cards.weather === month.cards.weather && other.cards.expense === month.cards.expense && other.free === month.free,
        'actions cannot reroll weather, expense or the free card');
      actions.push((seed + m) % 3 ? [] : [LADDER_IDS[m % 3]]);
    }
  }
}

// The AI reads the archive, not the live household.
const month = play(DEFAULT_SEED, 'v1', []).current;
const twin = { ...month, cards: { ...month.cards, weather: month.cards.weather === 'storm' ? 'sun' : 'storm' } };
const revealedOthers = CARDS.filter(c => c !== 'weather');
for (const flips of [0, 3]) {
  ok(JSON.stringify(poll(DEFAULT_SEED, 'v1', month, ['harvest'], { ladders: ['harvest'], flips }))
    === JSON.stringify(poll(DEFAULT_SEED, 'v1', { ...month, cards: { ...month.cards, weather: 'rain' } }, ['harvest'], { ladders: ['harvest'], flips })),
    'hidden live cards never change the poll');
}
ok(poll(DEFAULT_SEED, 'v1', twin, revealedOthers, { ladders: ['harvest'] }).bars.length === 2, 'no flips left -> actions only');
for (const worldId of Object.keys(WORLDS)) {
  for (let seed = 1; seed <= 25; seed++) {
    const m = play(seed, worldId, []).current;
    const full = poll(seed, worldId, m, [...CARDS], { flips: 0 });
    for (const id of LADDER_IDS) ok(full.risk[id] === (m.step[id] ? 1 : 0), 'full evidence resolves exactly');
    const p = poll(seed, worldId, m, [m.free], { ladders: worldId === 'home' ? LADDER_IDS : [WORLDS[worldId].ladder], flips: 3 });
    ok(p.bars.reduce((s, b) => s + b.pct, 0) === 100, 'bars add to 100');
    ok(p.matched > 0, 'archive covers the free card');
  }
}
ok(archive(DEFAULT_SEED, 'v1').length === 4000, 'archive size');
ok(new Set(archive(DEFAULT_SEED, 'v3').map(r => r.context)).size === 6, 'archive has every colour');

// The AI trained elsewhere: same rules, so it never peeks and is exact on full evidence,
// but it reads the state-wide archive, not the village's own.
for (const worldId of PART1_WORLDS) {
  const id = WORLDS[worldId].ladder;
  for (let seed = 1; seed <= 15; seed++) {
    const m = play(seed, worldId, [], PART1_MONTHS).current;
    // Exact whenever it has matching records; with none it reports matched 0 (the page says so).
    const full = poll(seed, worldId, m, [...CARDS], { archive: AI_ARCHIVE });
    ok(full.matched === 0 || full.risk[id] === (m.step[id] ? 1 : 0), 'state AI exact on full evidence');
    const other = { ...m, cards: Object.fromEntries(CARDS.map(c => [c, c === m.free ? m.cards[c] : play(seed + 99, worldId, [], PART1_MONTHS).current.cards[c]])) };
    ok(JSON.stringify(poll(seed, worldId, m, [m.free], { ladders: [id], archive: AI_ARCHIVE, flips: 3 }))
      === JSON.stringify(poll(seed, worldId, other, [m.free], { ladders: [id], archive: AI_ARCHIVE, flips: 3 })), 'state AI never reads hidden cards');
  }
}
ok(new Set(archive(DEFAULT_SEED, AI_ARCHIVE).map(r => r.context)).size === 6, 'state archive has every colour');
ok(play(DEFAULT_SEED, 'v1', [[], [], [], []], PART1_MONTHS).months.length === PART1_MONTHS, 'Part 1 is four months');

// The default deck teaches: per village 2+ real slips, a false alarm, and a confident AI
// error after the free card that is not in month 1.
for (const worldId of PART1_WORLDS) {
  const id = WORLDS[worldId].ladder, seed = deckSeed(DEFAULT_SEED, worldId), actions = [];
  let steps = 0, alarm = 0;
  const wrong = [];
  for (let m = 0; m < PART1_MONTHS; m++) {
    const mo = play(seed, worldId, actions, PART1_MONTHS).current, c = mo.cards;
    const h = LADDERS.harvest.indexOf(c.harvest), k = LADDERS.cash.indexOf(c.cash);
    const disruptor = id === 'harvest' ? c.weather === 'storm' : id === 'cash' ? c.expense === 'expense' : k >= 2;
    const stretched = id === 'harvest' ? h >= 1 : id === 'cash' ? k >= 1 : h >= 2;
    steps += mo.step[id];
    alarm += !mo.step[id] && (disruptor || stretched);
    const p = poll(seed, worldId, mo, [mo.free], { ladders: [id], archive: AI_ARCHIVE }).risk[id];
    if (mo.step[id] ? p <= 0.35 : p >= 0.65) wrong.push(m + 1);
    actions.push(mo.step[id] ? [id] : []);
  }
  ok(steps >= 2 && alarm >= 1, `${worldId} default deck has slips and a false alarm`);
  ok(wrong.length >= 1 && !wrong.includes(1), `${worldId} default deck has a confident AI error after month 1 (${wrong})`);
}

console.log(`extended-households model: ${checks} checks passed`);
