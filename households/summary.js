// Households (Indicators mode): the facilitator's Finish button ends the game for every team and
// shows how each team's representative used the AI and the audience, month by month.
// competitive.js keeps the decision log; this only reads window.paperweights.state().
import { TEAMS } from './village-sprites.js';
import { SFX } from './sound.js';
import { label } from './pixel-cards.js';
import * as modal from './team-modal.js';

const MONTHS = 6;
const CHOICE = { go: 'SKIP', avoid: 'HELP' };
const up = c => c.toUpperCase();
const esc = t => String(t).replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);

// 0 = didn't ask, 0.5 = asked but went their own way, 1 = went with the advice.
const aiScore = d => !d.ai ? 0 : d.ai.includes(d.action) ? 1 : 0.5;
const audScore = d => !d.aud ? 0 : d.flips.some(f => f.aud) ? 1 : 0.5;

function aiText(d) {
  if (!d.ai) return 'AI: not asked';
  return `AI said ${d.ai.map(a => CHOICE[a]).join(' / ')} - ${d.ai.includes(d.action) ? 'followed' : 'went against it'}`;
}
function audText(d) {
  if (!d.aud) return 'Audience: not asked';
  const top = d.flips.find(f => f.aud)?.cat ?? d.audTop?.[0];
  if (d.flips.some(f => f.aud)) return `Audience picked ${up(top)} - flipped it`;
  return top ? `Audience picked ${up(top)} - didn't flip it` : 'Audience asked - no votes';
}
const flipText = d => d.flips.length ? `Flipped ${d.flips.map(f => up(f.cat)).join(', ')}` : 'No flips';
const monthText = d => `Month ${d.month}: ${CHOICE[d.action]}${d.out ? ' - OUT' : ''}`;

function verdict(t) {
  const log = t.log;
  if (!log.length) return 'No decisions recorded';
  const ai = log.filter(d => d.ai), aud = log.filter(d => d.aud);
  const lean = d => aiScore(d) + audScore(d), half = Math.ceil(log.length / 2);
  const avg = a => a.reduce((s, d) => s + lean(d), 0) / (a.length || 1);
  const drift = log.length < 2 ? 0 : avg(log.slice(half)) - avg(log.slice(0, half));
  const trend = drift > 0.25 ? 'leaned on advice more over time' : drift < -0.25 ? 'leaned on advice less over time' : !ai.length && !aud.length ? 'went their own way' : 'steady';
  return [
    `AI asked ${ai.length}/${log.length}, followed ${ai.filter(d => aiScore(d) === 1).length}`,
    `Audience asked ${aud.length}/${log.length}, followed ${aud.filter(d => audScore(d) === 1).length}`,
    trend[0].toUpperCase() + trend.slice(1),
  ];
}

// Monotone cubic (Fritsch-Carlson): smooth, but never overshoots 0 or 1 between months.
function smooth(pts) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
  const n = pts.length, dx = [], m = [], t = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], h = dx[i] / 3;
    d += ` C${x0 + h},${y0 + t[i] * h} ${x1 - h},${y1 - t[i + 1] * h} ${x1},${y1}`;
  }
  return d;
}

const W = 320, H = 200, L = 92, R = 300, T = 22, B = 156;
const X = month => L + (R - L) * (month - 1) / (MONTHS - 1);
const Y = v => B - (B - T) * v;
const SERIES = [
  { key: 'ai', name: 'AI', score: aiScore, nudge: -2.5 }, // nudged apart so equal values stay visible
  { key: 'aud', name: 'Audience', score: audScore, nudge: 2.5 },
];

function chart(t, k) {
  const log = t.log;
  const grid = [[1, 'FOLLOWED'], [0.5, 'ASKED'], [0, 'NOT ASKED']].map(([v, name]) =>
    `<line class="grid" x1="${L}" x2="${R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="ylab" x="${L - 10}" y="${Y(v) + 5}" text-anchor="end">${name}</text>`).join('');
  const xs = Array.from({ length: MONTHS }, (_, i) => `<text class="xlab" x="${X(i + 1)}" y="${B + 24}" text-anchor="middle">${i + 1}</text>`).join('');
  const lines = SERIES.map(s => {
    const pts = log.map(d => [X(d.month), Y(s.score(d)) + s.nudge]);
    const dots = pts.map(([x, y]) => `<circle class="dot" cx="${x}" cy="${y}" r="4.5"/>`).join('');
    return `<g class="series ${s.key}"><path class="line" d="${smooth(pts)}" pathLength="1"/>${dots}</g>`;
  }).join('');
  const last = log.at(-1);
  const end = !last ? '' : last.out
    ? `<g class="out"><line x1="${X(last.month)}" x2="${X(last.month)}" y1="${T - 8}" y2="${B}"/><text x="${X(last.month)}" y="${T - 10}" text-anchor="middle">OUT</text></g>`
    : '';
  const hits = log.map(d => `<rect class="hit" tabindex="0" data-month="${d.month}" x="${X(d.month) - (R - L) / (MONTHS - 1) / 2}" y="${T - 14}" width="${(R - L) / (MONTHS - 1)}" height="${B - T + 40}" aria-label="${esc(`Team ${t.id}. ${monthText(d)}. ${aiText(d)}. ${audText(d)}. ${flipText(d)}.`)}"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Team ${t.id}: how much it leaned on the AI and the audience each month">
    ${grid}${xs}<text class="xlab axis" x="${(L + R) / 2}" y="${H - 2}" text-anchor="middle">MONTH</text>
    <line class="cross" x1="0" x2="0" y1="${T - 8}" y2="${B}" visibility="hidden"/>
    ${lines}${end}<g class="hits">${hits}</g></svg>`;
}

function result(t) {
  if (t.status === 'finished') return 'FINISHED';
  if (t.status === 'eliminated') return `OUT IN MONTH ${t.log.at(-1)?.month ?? t.round}`;
  return `STOPPED AT MONTH ${t.round}`;
}

function panel(t, k) {
  const lines = verdict(t);
  return `<section class="sum-team" data-k="${k}" style="--team:${TEAMS[k].t}">
    <h3><span class="chip"></span>Team ${t.id}<small>${result(t)}</small></h3>
    ${chart(t, k)}
    <ul class="verdict">${(Array.isArray(lines) ? lines : [lines]).map(l => `<li>${esc(l)}</li>`).join('')}</ul>
  </section>`;
}

function table(teams) {
  const rows = teams.flatMap(t => t.log.map(d => `<tr><td>Team ${t.id}</td><td>${d.month}</td><td>${CHOICE[d.action]}${d.out ? ' (OUT)' : ''}</td><td>${esc(aiText(d))}</td><td>${esc(audText(d))}</td><td>${esc(flipText(d))}</td></tr>`));
  return `<details class="sum-table"><summary>Table</summary><table><thead><tr><th>Team</th><th>Month</th><th>Choice</th><th>AI</th><th>Audience</th><th>Flips</th></tr></thead><tbody>${rows.join('') || '<tr><td colspan="6">No decisions recorded</td></tr>'}</tbody></table></details>`;
}

const overlay = Object.assign(document.createElement('div'), { className: 'hh-summary', hidden: true });
overlay.setAttribute('role', 'dialog');
overlay.setAttribute('aria-modal', 'true');
overlay.setAttribute('aria-label', 'How each team decided');
document.body.append(overlay);
const tip = Object.assign(document.createElement('div'), { className: 'sum-tip', hidden: true });

function show() {
  const state = window.paperweights.state();
  overlay.innerHTML = `<div class="sum-box">
    <div class="sum-head"><h2>How each team decided</h2><button class="modal-close" aria-label="Back to the map" title="Back to the map">${label('X')}</button></div>
    <div class="sum-legend"><span class="key ai">AI</span><span class="key aud">Audience</span><span class="note">Higher = leaned on that advice more</span></div>
    <div class="sum-teams">${state.teams.map(panel).join('')}</div>
    ${table(state.teams)}
  </div>`;
  overlay.querySelector('.sum-box').append(tip);
  overlay.querySelector('.modal-close').onclick = hide;
  overlay.querySelectorAll('.sum-team').forEach(el => {
    const t = state.teams[el.dataset.k], cross = el.querySelector('.cross');
    const point = rect => {
      const d = t.log.find(x => x.month === +rect.dataset.month), x = X(d.month);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', 'visible');
      tip.innerHTML = `<b>Team ${t.id} - ${esc(monthText(d))}</b><span class="ai">${esc(aiText(d))}</span><span class="aud">${esc(audText(d))}</span><span>${esc(flipText(d))}</span>`;
      tip.hidden = false;
      const box = overlay.querySelector('.sum-box').getBoundingClientRect(), r = rect.getBoundingClientRect();
      const left = Math.min(Math.max(r.left + r.width / 2 - box.left - tip.offsetWidth / 2, 8), box.width - tip.offsetWidth - 8);
      tip.style.left = `${left}px`;
      tip.style.top = `${r.top - box.top + overlay.querySelector('.sum-box').scrollTop - tip.offsetHeight - 6}px`;
    };
    const away = () => { cross.setAttribute('visibility', 'hidden'); tip.hidden = true; };
    el.querySelectorAll('.hit').forEach(rect => {
      rect.onpointerenter = rect.onfocus = () => point(rect);
      rect.onpointerleave = rect.onblur = away;
    });
  });
  modal.close();
  overlay.hidden = false;
  overlay.querySelector('.modal-close').focus({ preventScroll: true });
}
function hide() {
  if (overlay.hidden) return;
  overlay.hidden = true;
  tip.hidden = true;
  SFX.close();
  document.querySelector('#shared-canvas')?.focus({ preventScroll: true });
}

const button = Object.assign(document.createElement('button'), { id: 'finish', textContent: 'Finish' });
button.title = 'End the game for every team and show how each team decided';
document.querySelector('#reset').before(button);
button.onclick = () => {
  const state = window.paperweights?.state();
  if (!state) return;
  if (!state.ended) {
    if (!confirm('Finish the game for every team?')) return;
    window.paperweights.finish();
    SFX.finish();
  }
  show();
};
// Only Indicators mode records the decisions; the button follows the mode select.
const sync = () => { button.hidden = window.paperweights?.state().mode !== 'medium'; };
document.querySelector('#difficulty').addEventListener('change', () => { overlay.hidden = true; sync(); });
document.querySelector('#reset').addEventListener('click', () => { overlay.hidden = true; });
document.addEventListener('keydown', e => { // the summary sits over the map; keep team keys from opening dialogs behind it
  if (overlay.hidden) return;
  if (e.key === 'Escape') hide();
  e.stopImmediatePropagation();
}, true);
sync();
