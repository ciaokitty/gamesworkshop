// Sheet rows for the staged Indicators months. Writes household-staged.json:
// - rows: flip weights for the two-month rule (Team C). Purple means last month's cash was
//   low, so a purple weak harvest or low cash asks for the other half of the pair.
// - sure: on every sheet (the two-month rows and Team C's other path cards).
// - teams: authored rows on that Households team's sheets only. Boom pull (Team A, month 3):
//   the room knows a green good harvest after a drought calls for the weather and the
//   attendance, a pattern the AI's archive has never seen; members split evenly between them.
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
// Cards a team meets on its winning path, as the first card or a harvest/cash flip.
const keys = [], legs = [];
for (let i = 0; i < pack.roundCount; i++) {
  const r = currentRound(pack, 2, legs);
  for (const c of [r.initialCategory, 'harvest', 'cash']) {
    const k = `${r.contextId}:${c}:${r.targetCues[c].value}`;
    if (!keys.includes(k)) keys.push(k);
  }
  legs.push(r.fatal ? 'avoid' : 'go');
}
// Filler-only cards that still carry useful advice; the rest already sit on most sheets.
const filler = k => answers[k] && !answers[k].occur && categories.some(c => c !== k.split(':')[1] && answers[k][c] > 0);
const sure = ['C05:cash:low', 'C05:harvest:weak', ...keys.filter(filler)];
// After one of WEATHER / ATTENDANCE is flipped, the room asks for the other.
const teams = {A: {'C04:harvest:good': {weather: 1, attendance: 1}, 'C04:attendance:irregular': {weather: 1}, 'C04:weather:rain': {attendance: 1}}};
writeFileSync(new URL('household-staged.json', import.meta.url), JSON.stringify({rows, sure, teams}, null, 1) + '\n');
console.log({rows, sure, teams});
