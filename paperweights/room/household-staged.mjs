// Sheet rows for the staged Indicators months. Writes household-staged.json:
// - rows: flip weights for staged cards. Two-month rule (Team C): purple means last month's
//   cash was low, so a purple weak harvest or low cash asks for the other half of the pair.
//   Attendance rule (Team A): the room knows a green enough cash calls for attendance, a
//   pattern the AI's archive has never seen, so this row is authored rather than computed.
// - sure: on every sheet (the two-month rows and Team C's other path cards).
// - teams: only on that Households team's sheets, so other teams' polls are unchanged.
// deck.py swaps these in for filler rows.
import {createPack, poll, categories, currentRound} from '../../households/model.js';
import {readFileSync, writeFileSync} from 'node:fs';
const answers = JSON.parse(readFileSync(new URL('household-answers.json', import.meta.url)));
const pack = createPack(15, 200, 'medium'), rows = {};
for (const [cat, value] of [['cash', 'low'], ['harvest', 'weak']]) {
  const tally = {};
  for (const t of pack.teams) {
    const p = poll(pack, {teamId: t.id, contextId: 'C05', targetCues: {[cat]: {value}}, streak: true}, [cat], 3);
    for (const c of categories) if (c !== cat) tally[c] = (tally[c] || 0) + p.counts[c];
  }
  rows[`C05:${cat}:${value}`] = tally;
}
rows['C04:cash:enough'] = {attendance: 1};
// Cards a team meets on its winning path (months from..to), as the first card or a flip.
function path(team, cats, from = 0, to = pack.roundCount) {
  const keys = [], legs = [];
  for (let i = 0; i < to; i++) {
    const r = currentRound(pack, team, legs);
    if (i >= from) for (const c of [r.initialCategory, ...cats]) {
      const k = `${r.contextId}:${c}:${r.targetCues[c].value}`;
      if (!keys.includes(k)) keys.push(k);
    }
    legs.push(r.fatal ? 'avoid' : 'go');
  }
  return keys;
}
// Filler-only cards that still carry useful advice; the rest already sit on most sheets.
const filler = k => answers[k] && !answers[k].occur && categories.some(c => c !== k.split(':')[1] && answers[k][c] > 0);
const sure = ['C05:cash:low', 'C05:harvest:weak', ...path(2, ['harvest', 'cash']).filter(filler)];
// Team A's third month only: after ATTENDANCE is flipped the room asks for the harvest.
const teams = {A: ['C04:cash:enough', ...path(0, categories, 2, 3).filter(filler)]};
writeFileSync(new URL('household-staged.json', import.meta.url), JSON.stringify({rows, sure, teams}, null, 1) + '\n');
console.log({rows, sure, teams});
