// Chiptune effects. Audio starts on the first click, as browsers require.
const key = 'extended-households.sound.v1';
let on = true, silent = false, audio = null; // silent: Part 1 plays no sound
try { on = localStorage.getItem(key) !== 'off'; } catch {}

function beep(freq, dur = 0.08, type = 'square', slide = 0, delay = 0, vol = 0.05) {
  if (!on || silent) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const t = audio.currentTime + delay, o = audio.createOscillator(), v = audio.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
    v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(v); v.connect(audio.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch {}
}
const tune = (notes, step = 0.1, type = 'square', vol = 0.05) => notes.forEach((f, i) => f && beep(f, step * 0.9, type, 0, i * step, vol));

export const SFX = {
  start: () => tune([523, 659, 784, 1046, 0, 784, 1046], 0.09),
  select: () => beep(880, 0.05, 'square', 120),
  open: () => { beep(660, 0.05, 'square', 220); beep(990, 0.06, 'square', 0, 0.05); },
  close: () => beep(700, 0.06, 'square', -260),
  flip: () => { beep(1200, 0.03, 'triangle'); beep(1600, 0.04, 'triangle', 0, 0.03); },
  ai: () => tune([784, 988, 1175], 0.05, 'triangle'),
  coin: () => { beep(988, 0.06); beep(1319, 0.18, 'square', 0, 0.06); },
  bump: () => beep(196, 0.08, 'square', 80),
  powerup: () => tune([523, 659, 784, 659, 784, 1046], 0.06),
  jump: () => beep(330, 0.16, 'square', 420, 0, 0.04),
  skip: () => beep(440, 0.07, 'square', 60),
  hit: () => { beep(220, 0.12, 'sawtooth', -120); beep(160, 0.2, 'sawtooth', -60, 0.1, 0.04); },
  sparkle: () => tune([1568, 2093, 2637], 0.05, 'triangle', 0.04),
  good: () => tune([784, 1046], 0.08),
  wrong: () => tune([330, 262], 0.12, 'triangle'),
  note: () => tune([659, 0, 659, 784], 0.07, 'triangle'),
  clear: () => tune([523, 523, 523, 0, 659, 784, 0, 1046, 1046], 0.1),
  gentle: () => tune([523, 440, 392, 330], 0.22, 'triangle', 0.045),
};

export const soundOn = () => on;
export const silence = quiet => { silent = quiet; };
export function toggleSound() {
  on = !on;
  try { localStorage.setItem(key, on ? 'on' : 'off'); } catch {}
  if (on) SFX.select();
  return on;
}
