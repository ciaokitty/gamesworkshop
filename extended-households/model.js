// Extended Households: three outcome ladders pushed by two disruptors. Every rule here is
// a simulated teaching rule, not an empirical estimate. The room never sees this file's
// logic; it discovers the pairs from the cards. rules.js draws it at the very end.

export const LADDERS = Object.freeze({
  harvest: ['good', 'fair', 'weak', 'poor', 'failed'],
  cash: ['enough', 'tight', 'low', 'borrowing', 'debt'],
  school: ['regular', 'missing', 'irregular', 'rarely', 'dropout'],
});
export const DISRUPTORS = Object.freeze({
  weather: ['sun', 'rain', 'storm'],
  expense: ['none', 'expense'],
});
export const CARDS = Object.freeze(['weather', 'expense', 'harvest', 'cash', 'school']);
export const LADDER_IDS = Object.freeze(['harvest', 'cash', 'school']);
export const BOTTOM = 4;

export const VALUE_LABELS = Object.freeze({
  sun: 'SUN', rain: 'RAIN', storm: 'STORM', none: 'NO EXPENSE', expense: 'EXPENSE',
  good: 'GOOD', fair: 'FAIR', weak: 'WEAK', poor: 'POOR', failed: 'FAILED',
  enough: 'ENOUGH', tight: 'TIGHT', low: 'LOW', borrowing: 'BORROWING', debt: 'HEAVY DEBT',
  regular: 'REGULAR', missing: 'MISSES DAYS', irregular: 'IRREGULAR', rarely: 'RARELY GOES', dropout: 'DROPOUT',
});
export const CARD_LABELS = Object.freeze({ weather: 'WEATHER', expense: 'EXPENSE', harvest: 'HARVEST', cash: 'CASH', school: 'SCHOOL' });

// Same six colours and pattern ids as Households, with a new meaning: last month's movement.
export const CONTEXTS = Object.freeze([
  { id: 'C01', colorName: 'RED', light: '#a74638', dark: '#d06c58', story: 'calm month' },
  { id: 'C02', colorName: 'BLUE', light: '#316b8c', dark: '#6ca4c4', story: 'calm month, with support' },
  { id: 'C03', colorName: 'AMBER', light: '#8b681d', dark: '#bd9c4e', story: 'harvest slipped' },
  { id: 'C04', colorName: 'GREEN', light: '#39785c', dark: '#75ae8e', story: 'harvest slipped, with support' },
  { id: 'C05', colorName: 'PURPLE', light: '#72528e', dark: '#ad91c4', story: 'cash or school slipped' },
  { id: 'C06', colorName: 'PINK', light: '#a24b7d', dark: '#ce83ae', story: 'cash or school slipped, with support' },
]);

export const ORGS = Object.freeze({
  harvest: { id: 'harvest', key: '1', name: 'FOOD', support: 'FOOD AID', tool: 'rice sack' },
  cash: { id: 'cash', key: '2', name: 'MONEY', support: 'CASH RELIEF', tool: 'coin purse' },
  school: { id: 'school', key: '3', name: 'SCHOOL', support: 'SCHOOL SUPPORT', tool: 'book star' },
});

// Same laws everywhere; only the disruptor frequencies and the starting ladders differ.
// 'state' is never played: it is the calmer, state-wide history the Part 1 AI learned from.
export const WORLDS = Object.freeze({
  v1: { id: 'v1', team: 'A', name: 'VILLAGE 1', ladder: 'harvest', storm: 0.5, rain: 0.3, expense: 0.22,
    start: { harvest: 1, cash: 1, school: 0 }, context: 2 },
  v2: { id: 'v2', team: 'B', name: 'VILLAGE 2', ladder: 'cash', storm: 0.16, rain: 0.42, expense: 0.55,
    start: { harvest: 0, cash: 2, school: 0 }, context: 4 },
  v3: { id: 'v3', team: 'C', name: 'VILLAGE 3', ladder: 'school', storm: 0.3, rain: 0.34, expense: 0.45,
    start: { harvest: 2, cash: 1, school: 1 }, context: 4 },
  home: { id: 'home', name: 'ONE HOME', ladder: null, storm: 0.42, rain: 0.3, expense: 0.5,
    start: { harvest: 1, cash: 2, school: 1 }, context: 0 },
  // spread: archive histories start anywhere up to these steps, so every colour appears.
  state: { id: 'state', name: 'STATE-WIDE', ladder: null, storm: 0.18, rain: 0.37, expense: 0.24,
    start: { harvest: 0, cash: 1, school: 0 }, spread: { harvest: 3, cash: 3, school: 2 }, context: 0 },
});
export const PART1_WORLDS = Object.freeze(['v1', 'v2', 'v3']);
export const MONTHS = 6;
export const PART1_MONTHS = 4;
export const AI_ARCHIVE = 'state'; // Part 1's AI was trained elsewhere; Part 2's reads the home archive
export const DEFAULT_SEED = 375;
// The default deck: a seed per village, picked so each one shows 2 real slips, false alarms,
// and one month (not the first) where the AI is confidently wrong after the free card.
// Part 2's home keeps 375. Any other ?seed= plays that seed everywhere.
export const DECK = Object.freeze({ v1: 14, v2: 30, v3: 5, home: 375 });
export const deckSeed = (seed, worldId) => seed === DEFAULT_SEED ? DECK[worldId] ?? seed : seed;

// --- the hidden graph ----------------------------------------------------------------
// The pair that pushes each ladder one step down next month. Levels: 0 = top.
export function wouldStep(cards) {
  const h = LADDERS.harvest.indexOf(cards.harvest), c = LADDERS.cash.indexOf(cards.cash);
  const s = LADDERS.school.indexOf(cards.school);
  return {
    harvest: cards.weather === 'storm' && h >= 1 && h < BOTTOM,
    cash: cards.expense === 'expense' && c >= 1 && c < BOTTOM,
    school: c >= 2 && h >= 2 && s < BOTTOM,
  };
}

// One month later. Support holds a ladder that would step down; it never pushes one up.
export function transition(cards, supported = []) {
  const step = wouldStep(cards), held = new Set(supported);
  const level = Object.fromEntries(LADDER_IDS.map(id => [id, LADDERS[id].indexOf(cards[id])]));
  const next = { ...level }, down = {};
  for (const id of LADDER_IDS) down[id] = step[id] && !held.has(id);
  const recover = {
    harvest: cards.weather === 'sun',
    cash: cards.expense === 'none' && level.harvest <= 1,
    school: level.cash <= 1 && level.harvest <= 1,
  };
  for (const id of LADDER_IDS) {
    if (down[id]) next[id] = level[id] + 1;
    else if (!step[id] && recover[id] && level[id] > 0 && level[id] < BOTTOM) next[id] = level[id] - 1;
  }
  return { step, down, next };
}

// Colour = which way last month went, and whether the family got support.
export function contextFor(down, supported) {
  const pattern = down.harvest ? 1 : down.cash || down.school ? 2 : 0;
  return pattern * 2 + (supported ? 1 : 0);
}

// --- seeded randomness (same helpers as households/model.js) ---------------------------
function mix32(value) {
  let x = value | 0;
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15; x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}
function hashSeed(seed, ...parts) {
  let hash = mix32(Number.isFinite(seed) ? Math.trunc(seed) : 0);
  for (const part of parts) {
    const text = String(part);
    for (let i = 0; i < text.length; i++) hash = mix32(hash ^ text.charCodeAt(i));
    hash = mix32(hash ^ text.length);
  }
  return hash >>> 0;
}
function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function drawDisruptors(rng, world) {
  const w = rng();
  return {
    weather: w < world.storm ? 'storm' : w < world.storm + world.rain ? 'rain' : 'sun',
    expense: rng() < world.expense ? 'expense' : 'none',
  };
}
const cardsAt = (levels, dis) => ({
  ...dis,
  harvest: LADDERS.harvest[levels.harvest], cash: LADDERS.cash[levels.cash], school: LADDERS.school[levels.school],
});

// --- a live household --------------------------------------------------------------------
// Disruptors and the free card are drawn per month from the seed, never from actions, so a
// replay of the same actions gives the same run and actions cannot reroll the weather.
// actions[m] lists the ladders supported in month m.
export function play(seed, worldId, actions = [], length = MONTHS) {
  const world = WORLDS[worldId];
  let levels = { ...world.start }, context = world.context;
  const months = [];
  for (let m = 0; m < length; m++) {
    const rng = makeRng(hashSeed(seed, 'live', worldId, m));
    const cards = cardsAt(levels, drawDisruptors(rng, world));
    const free = CARDS[Math.floor(rng() * CARDS.length)];
    const month = { index: m, context, cards, free, step: wouldStep(cards) };
    months.push(month);
    if (m >= actions.length) break;
    const supported = actions[m] || [];
    const t = transition(cards, supported);
    Object.assign(month, { supported: [...supported], down: t.down, after: t.next });
    levels = t.next;
    context = contextFor(t.down, supported.length > 0);
  }
  const last = months[months.length - 1];
  return { world: worldId, months, current: last.supported ? null : last, levels };
}

// --- the archive the AI reads --------------------------------------------------------------
// Earlier households from the same world: same laws, separate random streams, a random mix
// of support so every colour appears. Rows are histories, never the live household.
function archiveRow(rng, world) {
  let levels = { ...world.start }, context = world.context;
  if (world.spread) {
    levels = Object.fromEntries(LADDER_IDS.map(id => [id, Math.floor(rng() * (world.spread[id] + 1))]));
    context = Math.floor(rng() * CONTEXTS.length);
  }
  const months = Math.floor(rng() * MONTHS);
  for (let m = 0; m <= months; m++) {
    const cards = cardsAt(levels, drawDisruptors(rng, world));
    if (m === months) return { context, cards, step: wouldStep(cards) };
    const supported = LADDER_IDS.filter(() => rng() < 0.22);
    const t = transition(cards, supported);
    levels = t.next;
    context = contextFor(t.down, supported.length > 0);
  }
}

const archives = new Map();
export function archive(seed, worldId, size = 4000) {
  const key = `${seed}:${worldId}:${size}`;
  if (!archives.has(key)) {
    const rng = makeRng(hashSeed(seed, 'archive', worldId));
    archives.set(key, Array.from({ length: size }, () => archiveRow(rng, WORLDS[worldId])));
  }
  return archives.get(key);
}

function selectPool(seed, worldId, month, revealed) {
  const match = row => row.context === month.context && revealed.every(c => row.cards[c] === month.cards[c]);
  const pool = archive(seed, worldId).filter(match);
  if (pool.length) return pool;
  // A rare archive gap: deterministic extra histories from the same world, same filter.
  // If that world almost never looks like this, the pool stays empty and the AI has no
  // matching history at all, which is exactly when an AI trained elsewhere guesses badly.
  const key = [seed, worldId, month.context, ...revealed.map(c => c + ':' + month.cards[c])].join('|');
  if (!backfills.has(key)) {
    const rng = makeRng(hashSeed(seed, 'backfill', key));
    const extra = [];
    for (let n = 0; n < 20000 && extra.length < 30; n++) {
      const row = archiveRow(rng, WORLDS[worldId]);
      if (match(row)) extra.push(row);
    }
    backfills.set(key, extra);
  }
  return backfills.get(key);
}
const backfills = new Map();

const rate = (pool, ladder) => pool.length ? pool.filter(r => r.step[ladder]).length / pool.length : 0;
function entropy(p) {
  const q = clamp(p, 1e-9, 1 - 1e-9);
  return -(q * Math.log2(q) + (1 - q) * Math.log2(1 - q));
}
// Expected drop in uncertainty about the given ladders if this card were flipped.
function gain(pool, card, ladders) {
  const groups = new Map();
  for (const row of pool) {
    const v = row.cards[card];
    if (!groups.has(v)) groups.set(v, []);
    groups.get(v).push(row);
  }
  let g = 0;
  for (const id of ladders) {
    let after = 0;
    for (const group of groups.values()) after += group.length / pool.length * entropy(rate(group, id));
    g += entropy(rate(pool, id)) - after;
  }
  return g > 0.005 ? g : 0;
}

// Largest remainder, so the bars always add up to exactly 100.
function percentages(entries) {
  const total = entries.reduce((s, e) => s + e.weight, 0) || 1;
  const out = entries.map(e => ({ ...e, pct: Math.floor(e.weight / total * 100), r: e.weight / total * 100 % 1 }));
  let left = 100 - out.reduce((s, e) => s + e.pct, 0);
  [...out].sort((a, b) => b.r - a.r).forEach(e => { if (left > 0) { e.pct++; left--; } });
  return out.map(({ label, pct }) => ({ label, pct }));
}

// AI for one org (Part 1) or the whole council (Part 2). It sees the colour and the cards
// revealed this month, and reads only an archive: never the live hidden cards.
// Without reveals left it splits only between actions, like Households.
// archive: whose histories it learned from. Part 1 passes AI_ARCHIVE, a calmer state-wide
// world, so its guesses about hidden cards can be confidently wrong for a stormier village.
// With every card revealed it is still exact, because the laws are the same everywhere.
// joint: one intervention protects every ladder (Part 2), so it weighs Skip against
// "any ladder slips next month" instead of one bar per ladder.
export function poll(seed, worldId, month, revealed = [], { ladders = LADDER_IDS, flips = 0, archive: from = worldId, joint = false } = {}) {
  const pool = selectPool(seed, from, month, revealed);
  const risk = Object.fromEntries(ladders.map(id => [id, rate(pool, id)]));
  const hidden = CARDS.filter(c => !revealed.includes(c));
  const inspections = flips > 0 ? hidden.map(c => ({ label: `flip:${c}`, weight: gain(pool, c, ladders) })) : [];
  const inspectTotal = inspections.reduce((s, e) => s + e.weight, 0);
  const any = pool.length ? pool.filter(r => ladders.some(id => r.step[id])).length / pool.length : 0;
  const certainty = joint ? 1 - 4 * any * (1 - any)
    : ladders.reduce((s, id) => s + 1 - 4 * risk[id] * (1 - risk[id]), 0) / ladders.length;
  const actionShare = inspectTotal > 0 ? clamp(0.28 + 0.6 * certainty, 0.28, 0.88) : 1;
  let actions;
  if (ladders.length === 1 || joint) {
    const p = joint ? any : risk[ladders[0]];
    actions = [{ label: 'skip', weight: 1 - p }, { label: 'intervene', weight: p }];
  } else {
    const skip = ladders.reduce((s, id) => s * (1 - risk[id]), 1);
    actions = [{ label: 'skip', weight: skip }, ...ladders.map(id => ({ label: id, weight: risk[id] }))];
  }
  const actionTotal = actions.reduce((s, e) => s + e.weight, 0) || 1;
  const weighted = [
    ...actions.map(e => ({ label: e.label, weight: e.weight / actionTotal * actionShare })),
    ...inspections.map(e => ({ label: e.label, weight: inspectTotal ? e.weight / inspectTotal * (1 - actionShare) : 0 })),
  ];
  return { bars: percentages(weighted).filter(b => b.pct > 0 || !b.label.startsWith('flip:')), risk, matched: pool.length };
}
