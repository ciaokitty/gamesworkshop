// Sheet rows for the two-month rule (Team C, Indicators): purple means last month's cash
// was low, so a purple weak harvest or low cash asks for the other half of the pair.
// Writes household-streak.json: those rows' flip weights, plus the cards Team C meets on its
// winning path, which deck.py swaps in for filler rows so Team C's votes always have rows.
import {createPack, poll, categories, currentRound} from '../../households/model.js';
import {writeFileSync} from 'node:fs';
const pack = createPack(15, 200, 'medium'), rows = {};
for (const [cat, value] of [['cash', 'low'], ['harvest', 'weak']]) {
  const tally = {};
  for (const t of pack.teams) {
    const p = poll(pack, {teamId: t.id, contextId: 'C05', targetCues: {[cat]: {value}}, streak: true}, [cat], 3);
    for (const c of categories) if (c !== cat) tally[c] = (tally[c] || 0) + p.counts[c];
  }
  rows[`C05:${cat}:${value}`] = tally;
}
const teamC = [], legs = [];
for (let i = 0; i < pack.roundCount; i++) {
  const r = currentRound(pack, 2, legs);
  for (const c of [r.initialCategory, 'harvest', 'cash']) {
    const k = `${r.contextId}:${c}:${r.targetCues[c].value}`;
    if (!teamC.includes(k)) teamC.push(k);
  }
  legs.push(r.fatal ? 'avoid' : 'go');
}
writeFileSync(new URL('household-streak.json', import.meta.url), JSON.stringify({rows, teamC}, null, 1) + '\n');
console.log(rows, teamC);
