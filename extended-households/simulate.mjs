// Strategy table for Extended Households. Policies here see every card (an upper bound on
// what a room can see), so the table measures the rules a room might write, not luck.
//   node extended-households/simulate.mjs [seeds]
import { play, poll, WORLDS, PART1_WORLDS, LADDER_IDS, LADDERS, BOTTOM, MONTHS, PART1_MONTHS as M1, AI_ARCHIVE } from './model.js';

const SEEDS = Number(process.argv[2]) || 400;
const SUPPORTS = 3;
const level = (cards, id) => LADDERS[id].indexOf(cards[id]);

// Part 2: the shared household. One INTERVENE holds every ladder that would slip this month
// and costs one of the three. A policy says whether to intervene.
const policies = {
  'Always skip': () => false,
  'Always intervene': () => true,
  'Act only one step above the bottom': c => LADDER_IDS.some(id => level(c, id) === BOTTOM - 1),
  'Single cues (storm, expense, low cash)': c => c.weather === 'storm' || c.expense === 'expense' || level(c, 'cash') >= 2,
  'The pairs': (c, step) => LADDER_IDS.some(id => step[id]),
};

function runPart2(seed, policy) {
  const actions = [];
  let left = SUPPORTS, wasted = 0;
  for (let m = 0; m < MONTHS; m++) {
    const run = play(seed, 'home', actions);
    if (LADDER_IDS.some(id => run.levels[id] >= BOTTOM)) return { won: false, wasted };
    const month = run.current, act = left > 0 && policy(month.cards, month.step);
    if (act) { left--; if (!LADDER_IDS.some(id => month.step[id])) wasted++; }
    actions.push(act ? [...LADDER_IDS] : []);
  }
  const end = play(seed, 'home', actions);
  return { won: LADDER_IDS.every(id => end.levels[id] < BOTTOM), wasted };
}

console.log(`Part 2 (home), ${SEEDS} seeds, ${SUPPORTS} interventions (each holds all three ladders)`);
console.log('| Policy | Wins | Avg wasted interventions |\n| --- | --- | --- |');
for (const [name, policy] of Object.entries(policies)) {
  const runs = Array.from({ length: SEEDS }, (_, s) => runPart2(s + 1, policy));
  const wins = runs.filter(r => r.won).length;
  const wasted = runs.reduce((s, r) => s + r.wasted, 0) / SEEDS;
  console.log(`| ${name} | ${(100 * wins / SEEDS).toFixed(0)}% | ${wasted.toFixed(2)} |`);
}

// Part 1: four months per org. How many teaching examples each rep meets (playing the pairs),
// and how often the AI trained elsewhere is confidently wrong (>= 65% on the wrong action).
const P1_SEEDS = Math.min(SEEDS, 150);
console.log(`\nPart 1 per run (own ladder, ${M1} months, playing the pairs), mean over ${P1_SEEDS} seeds`);
console.log('| Village | Ladder | Slips | Disruptor alone | Stretched alone | AI confidently wrong: free card | after the best reveal |\n| --- | --- | --- | --- | --- | --- | --- |');
for (const worldId of PART1_WORLDS) {
  const id = WORLDS[worldId].ladder;
  const t = { step: 0, disruptor: 0, stretched: 0, wrongFree: 0, wrongReveal: 0, months: 0 };
  for (let s = 1; s <= P1_SEEDS; s++) {
    const actions = [];
    for (let m = 0; m < M1; m++) {
      const month = play(s, worldId, actions, M1).current;
      const c = month.cards;
      const disruptor = id === 'harvest' ? c.weather === 'storm' : id === 'cash' ? c.expense === 'expense' : level(c, 'cash') >= 2;
      const stretched = id === 'harvest' ? level(c, 'harvest') >= 1 : id === 'cash' ? level(c, 'cash') >= 1 : level(c, 'harvest') >= 2;
      if (month.step[id]) t.step++;
      else if (disruptor) t.disruptor++;
      else if (stretched) t.stretched++;
      const wrong = p => month.step[id] ? p <= 0.35 : p >= 0.65;
      const free = poll(s, worldId, month, [month.free], { ladders: [id], archive: AI_ARCHIVE });
      t.wrongFree += wrong(free.risk[id]);
      const best = free.bars.length ? poll(s, worldId, month, [month.free], { ladders: [id], archive: AI_ARCHIVE, flips: 1 }).bars
        .filter(b => b.label.startsWith('flip:')).sort((a, b) => b.pct - a.pct)[0] : null;
      const revealed = best ? [month.free, best.label.slice(5)] : [month.free];
      t.wrongReveal += wrong(poll(s, worldId, month, revealed, { ladders: [id], archive: AI_ARCHIVE }).risk[id]);
      t.months++;
      actions.push(month.step[id] ? [id] : []);
    }
  }
  const f = v => (v / P1_SEEDS).toFixed(1), pct = v => `${Math.round(100 * v / t.months)}%`;
  console.log(`| ${WORLDS[worldId].name} | ${id} | ${f(t.step)} | ${f(t.disruptor)} | ${f(t.stretched)} | ${pct(t.wrongFree)} | ${pct(t.wrongReveal)} |`);
}
