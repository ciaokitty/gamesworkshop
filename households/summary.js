// Households (Indicators mode): the facilitator's Finish button ends the game for every team and
// shows each team's HELP/SKIP calls month by month beside what following only the AI would have done.
// competitive.js keeps the decision log; this only reads window.paperweights.state().
import { TEAMS, LOOK } from './village-sprites.js';
import { SFX } from './sound.js';
import { label } from './pixel-cards.js';
import * as modal from './team-modal.js';
import { currentRound, poll } from './model.js';

const MONTHS = 4;
const CHOICE = { go: 'SKIP', avoid: 'HELP' };
const esc = t => String(t).replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);

// 0 = didn't ask, 0.5 = asked but went their own way, 1 = went with the advice.
const aiScore = d => !d.ai ? 0 : d.ai.includes(d.action) ? 1 : 0.5;
const audScore = d => !d.aud ? 0 : d.flips.some(f => f.aud) ? 1 : 0.5;

function aiText(d) {
  if (!d.ai) return 'AI: not asked';
  return `AI said ${d.ai.map(a => CHOICE[a]).join(' / ')} - ${d.ai.includes(d.action) ? 'followed' : 'went against it'}`;
}
const monthText = d => `Month ${d.month}: ${CHOICE[d.action]}${d.out ? ' - OUT' : ''}`;

// The prediction: replay the same team's months asking only the AI (no flips) and doing what it says.
// The model is seeded, so this is exactly what that player would have met.
function aiOnly(pack, k) {
  const legs = [], path = [];
  for (let month = 1; month <= MONTHS; month++) {
    const r = currentRound(pack, k, legs), p = poll(pack, r, [r.initialCategory], 0);
    const action = p.counts.avoid > p.counts.go ? 'avoid' : 'go', out = (action === 'avoid') !== r.fatal;
    path.push({ month, action, out });
    if (out) break;
    legs.push(action);
  }
  return path;
}
const aiOnlyText = d => `AI only: ${d ? `${CHOICE[d.action]}${d.out ? ' - OUT' : ''}` : 'already out'}`;
const youText = d => d ? `Team: ${CHOICE[d.action]}${d.out ? ' - OUT' : ''}` : 'Team: already out';

function verdict(t) {
  const log = t.log;
  if (!log.length) return 'No decisions recorded';
  const ai = log.filter(d => d.ai), aud = log.filter(d => d.aud);
  const lean = d => aiScore(d) + audScore(d), half = Math.ceil(log.length / 2);
  const avg = a => a.reduce((s, d) => s + lean(d), 0) / (a.length || 1);
  const drift = log.length < 2 ? 0 : avg(log.slice(half)) - avg(log.slice(0, half));
  return drift > 0.25 ? 'Leaned on advice more over time' : drift < -0.25 ? 'Leaned on advice less over time' : !ai.length && !aud.length ? 'Went their own way' : 'Steady';
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

const W = 320, H = 136, L = 92, R = 300, T = 34, B = 104;
const X = month => L + (R - L) * (month - 1) / (MONTHS - 1);
const Y = v => B - (B - T) * v;
const LEVEL = { avoid: 1, go: 0 };

// A path's line, its month dots and, if it ended OUT, a dashed marker at that month.
function path(cls, list) {
  const pts = list.map(d => [X(d.month), Y(LEVEL[d.action])]), last = list.at(-1);
  const out = last?.out ? `<line class="end" x1="${X(last.month)}" x2="${X(last.month)}" y1="${T - 8}" y2="${B}"/>` : '';
  return `<g class="path ${cls}">${out}<path class="line" d="${smooth(pts)}" pathLength="1"/>${pts.map(([x, y]) => `<circle class="dot" cx="${x}" cy="${y}" r="4"/>`).join('')}</g>`;
}

// The blue AI-only line sits under the white line of what the team did, so where they agree
// the white line shows a blue edge.
function chart(t, k, ai) {
  const log = t.log;
  const grid = [[1, 'HELP'], [0, 'SKIP']].map(([v, name]) =>
    `<line class="grid" x1="${L}" x2="${R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="ylab" x="${L - 10}" y="${Y(v) + 5}" text-anchor="end">${name}</text>`).join('');
  const xs = Array.from({ length: MONTHS }, (_, i) => `<text class="xlab" x="${X(i + 1)}" y="${B + 24}" text-anchor="middle">${i + 1}</text>`).join('');
  const last = log.at(-1), aiLast = ai.at(-1), both = last?.out && aiLast.out && last.month === aiLast.month;
  const tag = (cls, d, text) => `<text class="out-label${cls}" x="${X(d.month)}" y="${T - 10}" text-anchor="middle">${text}</text>`;
  const out = (last?.out ? tag('', last, 'OUT') : '') + (aiLast.out && !both ? tag(' ai', aiLast, 'AI OUT') : '');
  const months = Math.max(log.length, ai.length), w = (R - L) / (MONTHS - 1);
  const hits = Array.from({ length: months }, (_, i) => `<rect class="hit" tabindex="0" data-month="${i + 1}" x="${X(i + 1) - w / 2}" y="${T - 14}" width="${w}" height="${B - T + 38}" aria-label="${esc(`Team ${t.id}. Month ${i + 1}. ${youText(log[i])}. ${log[i] ? aiText(log[i]) + '. ' : ''}${aiOnlyText(ai[i])}.`)}"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Team ${t.id}: HELP or SKIP each month, beside what following only the AI would have done">
    ${grid}${xs}<text class="ylab" x="${L - 24}" y="${B + 24}" text-anchor="end">MONTH</text>
    <line class="cross" x1="0" x2="0" y1="${T - 8}" y2="${B}" visibility="hidden"/>
    ${path('ai-path', ai)}${path('you', log)}${out}<g class="hits">${hits}</g></svg>`;
}

function result(t) {
  if (t.status === 'finished') return 'FINISHED';
  if (t.status === 'eliminated') return `OUT IN MONTH ${t.log.at(-1)?.month ?? t.round}`;
  return `STOPPED AT MONTH ${t.round}`;
}

function panel(t, k, ai) {
  return `<section class="sum-team" data-k="${k}" style="--team:${TEAMS[LOOK[k]].t}">
    <h3><span class="chip"></span>Team ${t.id}<small>${result(t)}</small></h3>
    ${chart(t, k, ai)}
    <p class="verdict">${esc(verdict(t))}</p>
  </section>`;
}

const overlay = Object.assign(document.createElement('div'), { className: 'hh-summary', hidden: true });
overlay.setAttribute('role', 'dialog');
overlay.setAttribute('aria-modal', 'true');
overlay.setAttribute('aria-label', 'How each team decided');
document.body.append(overlay);
const tip = Object.assign(document.createElement('div'), { className: 'sum-tip', hidden: true });

function show() {
  const state = window.paperweights.state(), pack = window.paperweights.pack();
  const ai = state.teams.map((_, k) => aiOnly(pack, k));
  overlay.innerHTML = `<div class="sum-box">
    <div class="sum-head"><h2>How each team decided</h2><button class="modal-close" aria-label="Back to the map" title="Back to the map">${label('X')}</button></div>
    <div class="sum-legend"><span class="key you">What the team did</span><span class="key ai">If only the AI was followed</span></div>
    <div class="sum-teams">${state.teams.map((t, k) => panel(t, k, ai[k])).join('')}</div>
  </div>`;
  overlay.querySelector('.sum-box').append(tip);
  overlay.querySelector('.modal-close').onclick = hide;
  overlay.querySelectorAll('.sum-team').forEach(el => {
    const t = state.teams[el.dataset.k], cross = el.querySelector('.cross');
    const point = rect => {
      const month = +rect.dataset.month, d = t.log[month - 1], x = X(month);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', 'visible');
      tip.innerHTML = `<b>Team ${t.id} - ${esc(d ? monthText(d) : `Month ${month}: already out`)}</b>${d ? `<span>${esc(aiText(d))}</span>` : ''}<span class="ai-only">${esc(aiOnlyText(ai[el.dataset.k][month - 1]))}</span>`;
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
