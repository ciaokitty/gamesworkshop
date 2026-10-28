// Households: the facilitator's Notes button, beside Graph, shows every team's Patterns notepad in one place.
// The notes are kept by team-modal.js; Reset starts a new game, so it clears them.
import { TEAMS, LOOK } from './village-sprites.js';
import { SFX } from './sound.js';
import { label } from './pixel-cards.js';
import * as modal from './team-modal.js';

const esc = t => String(t).replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);

const overlay = Object.assign(document.createElement('div'), { className: 'hh-summary hh-notes', hidden: true });
overlay.setAttribute('role', 'dialog');
overlay.setAttribute('aria-modal', 'true');
overlay.setAttribute('aria-label', 'Team notes');
document.body.append(overlay);

function show() {
  const state = window.paperweights?.state();
  if (!state) return;
  overlay.innerHTML = `<div class="sum-box">
    <div class="sum-head"><h2>Notes</h2><button class="modal-close" aria-label="Back to the map" title="Back to the map">${label('X')}</button></div>
    <div class="sum-teams">${state.teams.map((t, k) => {
      const text = modal.note(t.id).trim();
      return `<section class="sum-team" style="--team:${TEAMS[LOOK[k]].t}">
        <h3><span class="chip"></span>Team ${t.id}</h3>
        <p class="note-page${text ? '' : ' empty'}">${text ? esc(text) : 'No notes'}</p>
      </section>`;
    }).join('')}</div>
  </div>`;
  overlay.querySelector('.modal-close').onclick = hide;
  modal.close();
  SFX.open();
  overlay.hidden = false;
  overlay.querySelector('.modal-close').focus({ preventScroll: true });
}
function hide() {
  if (overlay.hidden) return;
  overlay.hidden = true;
  SFX.close();
  document.querySelector('#shared-canvas')?.focus({ preventScroll: true });
}

const button = Object.assign(document.createElement('button'), { id: 'notes', textContent: 'Notes' });
button.title = "Show every team's Patterns notes";
document.querySelector('#graph').after(button);
button.onclick = show;
document.querySelector('#reset').addEventListener('click', () => { overlay.hidden = true; modal.clearNotes(); });
document.querySelector('#difficulty').addEventListener('change', () => { overlay.hidden = true; });
document.addEventListener('keydown', e => { // the notes sit over the map; keep team keys from opening dialogs behind them
  if (overlay.hidden) return;
  if (e.key === 'Escape') hide();
  e.stopImmediatePropagation();
}, true);
