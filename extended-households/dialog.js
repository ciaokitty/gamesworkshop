// A retro text box over the stage. One at a time; Escape or X closes it.
import { SFX } from './sfx.js';

const layer = () => document.querySelector('#dialog-layer');
let current = null;

export function open({ title, portrait = '', body, onClose, wide = false, cls = '' }) {
  close(true);
  const box = document.createElement('section');
  box.className = `dialog ${wide ? 'wide' : ''} ${cls}`;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', title.replace(/<[^>]+>/g, ''));
  box.innerHTML = `<header><span class="portrait">${portrait}</span><h2>${title}</h2>
    <button class="x" type="button" aria-label="Close" title="Close (Esc)">X</button></header><div class="dbody"></div>`;
  box.querySelector('.x').onclick = () => close();
  layer().append(box);
  layer().classList.add('open');
  current = { box, onClose };
  render(body);
  SFX.open();
  return box;
}

// Re-rendering after a flip or an AI poll keeps the text still; only a new box types.
export function render(body, type = true) {
  if (!current) return;
  const el = current.box.querySelector('.dbody');
  el.innerHTML = body;
  if (type) typewrite(el);
}

// Lines marked .say type themselves out, like an old game's text box.
function typewrite(root) {
  root.querySelectorAll('.say:not([data-typed])').forEach(el => {
    const text = el.textContent;
    el.dataset.typed = '1';
    el.textContent = '';
    let i = 0;
    const tick = () => { if (!el.isConnected) return; el.textContent = text.slice(0, ++i); if (i < text.length) setTimeout(tick, 14); };
    tick();
  });
}

export function close(silent = false) {
  if (!current) return;
  const { box, onClose } = current;
  current = null;
  box.remove();
  layer().classList.remove('open');
  if (!silent) SFX.close();
  onClose?.();
}

export const isOpen = () => !!current;
export const box = () => current?.box;

document.addEventListener('keydown', e => { if (e.key === 'Escape' && current) close(); });
