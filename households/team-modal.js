// Households stage: the full-screen map with each team's panel as a pop-up dialog.
// competitive.js still renders and drives the panels; this only shows one at a time,
// opens it from the map (or keys A-D), and closes it once the team has decided.
import { SFX } from './sound.js';
import { label } from './pixel-cards.js';

const teams = document.querySelector('#teams');
const css = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL('stage.css', import.meta.url).href });
export const ready = new Promise(done => { css.onload = css.onerror = done; }); // village-map lifts the loading screen once this is in
document.head.append(css);
document.body.classList.add('hh-stage');
document.documentElement.classList.add('hh-stage');

// Dark theme ground: still, warm grey TV static, one noise pixel per CSS pixel.
function staticTile(size = 160) {
  const c = Object.assign(document.createElement('canvas'), { width: size, height: size }), x = c.getContext('2d'), img = x.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 30;
    img.data[i] = 40 + n; img.data[i + 1] = 37 + n; img.data[i + 2] = 30 + n * 0.9; img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c.toDataURL();
}
document.documentElement.style.setProperty('--static', `url(${staticTile()})`);

let openId = null;
export const focused = () => openId;

// Each team's Patterns notepad. Kept here, not in the panel, because panels are rebuilt on reset and stage change.
const notes = {};
export const note = id => notes[id] || '';
export function clearNotes() {
  for (const id in notes) delete notes[id];
  teams.querySelectorAll('.notepad').forEach(pad => { pad.value = ''; });
}

function closeButton() {
  const x = Object.assign(document.createElement('button'), { className: 'modal-close', title: 'Back to the map', innerHTML: label('X') });
  x.setAttribute('aria-label', 'Back to the map');
  x.onclick = () => close();
  return x;
}

function showTab(el, tab) {
  el.dataset.tab = tab;
  el.querySelectorAll('.folder-tab').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
}

// The dialog as a folder: the Card tab holds the game's panel as it was, the Patterns tab a notepad.
// Both panes share one grid cell, so the folder keeps the card's size on either tab.
function folder(el) {
  const id = el.dataset.team;
  const tabs = Object.assign(document.createElement('div'), { className: 'folder-tabs' });
  tabs.setAttribute('role', 'tablist');
  tabs.innerHTML = [['card', 'Card'], ['patterns', 'Patterns']].map(([tab, name]) => `<button class="folder-tab" role="tab" data-tab="${tab}">${name}</button>`).join('');
  tabs.querySelectorAll('.folder-tab').forEach(b => {
    b.onclick = () => {
      if (el.dataset.tab === b.dataset.tab) return;
      showTab(el, b.dataset.tab);
      SFX.open();
      if (b.dataset.tab === 'patterns') el.querySelector('.notepad').focus({ preventScroll: true });
    };
  });
  const card = Object.assign(document.createElement('div'), { className: 'tab-card' });
  card.setAttribute('role', 'tabpanel');
  card.append(...el.childNodes);
  const patterns = Object.assign(document.createElement('div'), { className: 'tab-patterns' });
  patterns.setAttribute('role', 'tabpanel');
  patterns.innerHTML = `<div class="team-name"><span>Team ${id}</span></div><textarea class="notepad" rows="1" spellcheck="false" placeholder="Patterns you notice..." aria-label="Team ${id} notes"></textarea>`;
  patterns.querySelector('.team-name').append(closeButton());
  const pad = patterns.querySelector('.notepad');
  pad.value = note(id);
  pad.oninput = () => { notes[id] = pad.value; };
  const body = Object.assign(document.createElement('div'), { className: 'folder-body' });
  body.append(card, patterns);
  el.append(tabs, body);
  showTab(el, 'card');
}

function decorate() { // panels are rebuilt on every reset or stage change
  teams.querySelectorAll('.team').forEach(el => {
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', `Team ${el.dataset.team}`);
    if (!el.querySelector('.modal-close')) el.querySelector('.team-tools')?.append(closeButton());
    if (!el.querySelector('.folder-body')) folder(el);
    el.classList.toggle('open', el.dataset.team === openId);
  });
  teams.classList.toggle('has-open', !!openId);
}
new MutationObserver(decorate).observe(teams, { childList: true });

export function open(id) {
  if (openId === id) return;
  openId = id;
  const k = [...teams.querySelectorAll('.team')].findIndex(el => el.dataset.team === id);
  window.paperweights?.peek(k, 0); // always open on the current deck
  const el = teams.querySelector(`.team[data-team="${id}"]`);
  if (el?.dataset.tab) showTab(el, 'card'); // and on the Card tab, where the team decides
  decorate();
  SFX.open();
  teams.querySelector('.team.open [data-action]:not(:disabled), .team.open .modal-close')?.focus({ preventScroll: true });
}
export function close() {
  if (!openId) return;
  const id = openId;
  openId = null;
  decorate();
  SFX.close();
  document.querySelector('#shared-canvas')?.focus({ preventScroll: true });
}

// Close after Skip or Help is accepted, so the map shows the walk.
teams.addEventListener('click', e => {
  const button = e.target.closest('[data-action]'), panel = e.target.closest('.team');
  if (!button || !panel || button.disabled) return;
  setTimeout(() => { const t = window.paperweights?.state().teams.find(x => x.id === panel.dataset.team); if (t && t.status !== 'deciding' && openId === panel.dataset.team) close(); }, 220);
}, true); // capture: the game disables the button as soon as it acts
// A losing choice closes at once, before the dialog can draw its OUT state; the map shows the kid stopping.
teams.addEventListener('click', e => {
  const panel = e.target.closest('[data-action]') && e.target.closest('.team');
  if (panel && openId === panel.dataset.team && window.paperweights?.state().teams.find(x => x.id === panel.dataset.team)?.status === 'eliminated') close();
});
teams.addEventListener('click', e => { if (e.target === teams) close(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') return close();
  const id = e.key.toUpperCase();
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, select, textarea')) return;
  if (teams.querySelector(`.team[data-team="${id}"]`)) openId === id ? close() : open(id);
});

decorate();
