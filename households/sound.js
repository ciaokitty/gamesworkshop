// Chiptune effects and faint background music for the Households stage, with an on/off button in the top bar.
import { backgroundMusic } from './music.js';
const soundKey = 'households.sound.v1';
let soundOn = true, audio = null, lastStep = 0;
try { soundOn = localStorage.getItem(soundKey) !== 'off'; } catch {}
const music = backgroundMusic('assets/audio/sprite-sprint-loop.ogg', 0.12); // Sprite Sprint, Dylann Taylor: kept faint under the effects
music.set(soundOn);

function context() { // created on first use, after someone has clicked, so the browser allows audio
  audio = audio || new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === 'suspended') audio.resume();
  return audio;
}

function beep(freq, dur = 0.08, type = 'square', slide = 0, delay = 0, vol = 0.06) {
  if (!soundOn) return;
  try {
    context();
    const t = audio.currentTime + delay, o = audio.createOscillator(), v = audio.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
    v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(v); v.connect(audio.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch {}
}

export const SFX = {
  skip: () => beep(440, 0.07, 'square', 60),
  intervene: () => { beep(523, 0.08); beep(659, 0.08, 'square', 0, 0.08); beep(784, 0.14, 'square', 120, 0.16); },
  // Fallback tick, used only if walking.mp3 cannot play
  step: () => { if (steps !== false) return; const n = performance.now(); if (n - lastStep < 110) return; lastStep = n; beep(170 + Math.random() * 40, 0.025, 'triangle', 0, 0, 0.035); },
  arrive: () => beep(660, 0.06, 'triangle', 40),
  open: () => { beep(660, 0.05, 'square', 220); beep(990, 0.06, 'square', 0, 0.05, 0.05); },
  close: () => beep(700, 0.06, 'square', -260, 0, 0.05),
  out: () => { beep(330, 0.32, 'sawtooth', -180, 0, 0.05); beep(196, 0.4, 'sawtooth', -90, 0.28, 0.045); },
  finish: () => {
    for (let i = 0; i < 3; i++) { beep(1318, 0.28, 'triangle', 0, i * 0.22, 0.07); beep(1046, 0.28, 'triangle', 0, i * 0.22 + 0.11, 0.05); }
    [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.12, 'square', 0, 0.7 + i * 0.1, 0.05));
  },
};

// Footsteps: walking.mp3, one shared loop while any child is walking.
// The bytes load with the page; decoding waits for the first walk (audio needs a click first).
const stepBytes = fetch(new URL('walking.mp3', import.meta.url)).then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status));
let steps = null, decoding = null, loop = null; // null: not decoded yet, false: unavailable

function decodeSteps() {
  decoding = decoding || stepBytes.then(bytes => context().decodeAudioData(bytes)).then(buf => {
    // Loop only the audible part, so silence at either end of the file never leaves a gap.
    const data = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
    let peak = 0, sum = 0;
    for (const ch of data) for (const x of ch) peak = Math.max(peak, Math.abs(x));
    const loud = i => data.some(ch => Math.abs(ch[i]) > peak * 0.05);
    let a = 0, b = buf.length - 1;
    while (a < b && !loud(a)) a++;
    while (b > a && !loud(b)) b--;
    for (const ch of data) for (let i = a; i <= b; i++) sum += ch[i] * ch[i];
    const rms = Math.sqrt(sum / ((b - a + 1) * data.length)) || 1;
    steps = { buf, start: a / buf.sampleRate, end: (b + 1) / buf.sampleRate, gain: Math.min(1.5, 0.05 / rms) };
  }).catch(() => { steps = false; });
}

function startSteps() {
  if (loop || steps === false) return;
  if (!steps) return decodeSteps();
  const t = context().currentTime, src = audio.createBufferSource(), v = audio.createGain();
  src.buffer = steps.buf; src.loop = true; src.loopStart = steps.start; src.loopEnd = steps.end;
  v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(steps.gain, t + 0.1);
  src.connect(v); v.connect(audio.destination);
  src.start(t, steps.start + Math.random() * (steps.end - steps.start)); // a different stride each walk
  loop = { src, v };
}

function stopSteps() {
  if (!loop) return;
  const t = audio.currentTime, { src, v } = loop;
  v.gain.cancelScheduledValues(t); v.gain.setValueAtTime(Math.max(v.gain.value, 0.0001), t);
  v.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  src.stop(t + 0.22);
  loop = null;
}

// Called every frame by the map: true while at least one child is walking.
export function walking(active) {
  try { active && soundOn ? startSteps() : stopSteps(); } catch { steps = false; }
}

export function addSoundButton(before) {
  const button = document.createElement('button');
  button.id = 'sound';
  const paint = () => { button.textContent = soundOn ? 'Sound on' : 'Sound off'; button.setAttribute('aria-pressed', soundOn); };
  button.onclick = () => { soundOn = !soundOn; try { localStorage.setItem(soundKey, soundOn ? 'on' : 'off'); } catch {} paint(); music.set(soundOn); if (soundOn) SFX.arrive(); else stopSteps(); };
  paint();
  before.before(button);
}
