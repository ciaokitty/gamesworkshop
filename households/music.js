// Background music: one looping track per page, played through Web Audio so the loop has no gap.
// It starts as the page opens when the browser allows it (e.g. right after a click on the main menu).
// If the browser holds audio back until a click, `allowed` resolves false and the page's sound button
// is that click: set(true) from its click handler starts the music. Clicks elsewhere never start it.
export function backgroundMusic(file, volume) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return { set() {}, allowed: Promise.resolve(false) };
  const ctx = new Ctx(), out = ctx.createGain();
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
  // A blocked resume() never settles, so give the browser a moment and then read the state.
  const allowed = new Promise(done => {
    ctx.resume().then(() => done(true), () => done(false));
    setTimeout(() => done(ctx.state === 'running'), 500);
  });
  return { set(on) { (on ? ctx.resume() : ctx.suspend()).catch(() => {}); }, allowed };
}
