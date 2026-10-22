// Households stage: the full-screen map with each team's panel as a pop-up dialog.
// competitive.js still renders and drives the panels; this only shows one at a time,
// opens it from the map (or keys A-D), and closes it once the team has decided.
import { SFX } from './sound.js';
import { label } from './pixel-cards.js';

const teams = document.querySelector('#teams');
const css = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL('stage.css', import.meta.url).href });
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

function decorate() { // panels are rebuilt on every reset or stage change
  teams.querySelectorAll('.team').forEach(el => {
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', `Team ${el.dataset.team}`);
    if (!el.querySelector('.modal-close')) {
      const x = Object.assign(document.createElement('button'), { className: 'modal-close', title: 'Back to the map', innerHTML: label('X') });
      x.setAttribute('aria-label', 'Back to the map');
      x.onclick = () => close();
      el.querySelector('.team-tools')?.append(x);
    }
    el.classList.toggle('open', el.dataset.team === openId);
  });
  teams.classList.toggle('has-open', !!openId);
}
new MutationObserver(decorate).observe(teams, { childList: true });

export function open(id) {
  if (openId === id) return;
  openId = id;
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

// Close after Skip or Intervene is accepted, so the map shows the walk.
teams.addEventListener('click', e => {
  const button = e.target.closest('[data-action]'), panel = e.target.closest('.team');
  if (!button || !panel || button.disabled) return;
  setTimeout(() => { const t = window.paperweights?.state().teams.find(x => x.id === panel.dataset.team); if (t && t.status !== 'deciding' && openId === panel.dataset.team) close(); }, 220);
}, true); // capture: the game disables the button as soon as it acts
teams.addEventListener('click', e => { if (e.target === teams) close(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') return close();
  const id = e.key.toUpperCase();
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, select, textarea')) return;
  if (teams.querySelector(`.team[data-team="${id}"]`)) openId === id ? close() : open(id);
});

decorate();
