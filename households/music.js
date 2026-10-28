// Background music: one looping track per page, played through Web Audio so the loop has no gap.
// It starts as the page opens when the browser allows it (e.g. right after a click on the main menu),
// otherwise on the first click or key press.
export function backgroundMusic(file, volume) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return { set() {} };
  const ctx = new Ctx(), out = ctx.createGain();
  let on = true;
  out.gain.value = 0;
  out.connect(ctx.destination);
  fetch(new URL(file, import.meta.url))
    .then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
    .then(bytes => ctx.decodeAudioData(bytes))
    .then(buf => {
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.connect(out); src.start();
      out.gain.setTargetAtTime(volume, ctx.currentTime, 0.4); // fade in
    })
    .catch(() => {});
  const wake = () => { if (on && ctx.state === 'suspended') ctx.resume().catch(() => {}); };
  for (const type of ['pointerdown', 'keydown']) addEventListener(type, wake, true);
  wake();
  return { set(value) { on = value; (on ? ctx.resume() : ctx.suspend()).catch(() => {}); } };
}
