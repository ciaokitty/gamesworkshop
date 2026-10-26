// Part 2's map: one Households lane, drawn large. The home on the left, six monthly fields,
// the school on the right, in Households' daytime village art. The child walks one field per
// month; an intervention is a detour past a support camp; a
// ladder on its bottom step stops the walk (OUT). Like Households, the map never shows cards,
// ladder levels or slips: those stay in the council's dialog.
import { PAL, TEAMS, SPR, FIELDS, ANIMALS, FLOWERS } from '../households/village-sprites.js';

export const W = 400, H = 213; // world pixels; the canvas is 1600 x 852, four screen pixels each
const S = 4, X0 = 44, RIGHT = 96, MONTHS = 6, CW = (W - X0 - RIGHT) / MONTHS;
const RY = 150, SCHOOL = { x: W - 88, y: RY + 4 - 60 }, DOOR = SCHOOL.x + 42, KID = 3; // the home wears the fourth colour
const SPEED = 40, reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const A = m => Math.round(X0 + m * CW);

// Fixed scenery, so it hints at nothing: [sprite, variant, x, feet y].
// Anything near the road sits mid-field, clear of the month boundaries where the child waits
// and of the camps above the road.
const PROPS = [['tree', 0, 70, 70], ['tree', 1, 150, 58], ['bush', 0, 110, 80], ['well', 0, 196, 84], ['tree', 0, 244, 64],
  ['bush', 2, 270, 96], ['handpump', 0, 165, 198], ['bush', 1, 153, 142], ['bush', 3, 240, 142], ['handpump', 0, 230, 198],
  ['tree', 1, W - 70, 74], ['tree', 0, W - 24, 82], ['sapling', 0, W - 46, 52], ['bush', 0, 30, 200], ['bush', 2, 128, 202],
  ['tree', 0, 196, 208], ['bush', 1, 262, 202], ['sapling', 1, W - 60, 206], ['well', 0, W - 24, 204]];
const PETS = [['cow', 124, 84], ['hen', 190, 140], ['chick', 199, 141], ['chick', 205, 140], ['cat', 60, 204], ['dogSit', 300, 204], ['cowBrown', 250, 92]];
const BLOOMS = [[0, 58, 142], [1, 140, 128], [2, 186, 146], [1, 256, 126], [0, 300, 146], [2, 96, 186], [0, 170, 190], [1, 236, 190]];

function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const cache = new Map();
function sprite(rows, flipX = false) {
  const key = rows.join('/') + flipX;
  if (!cache.has(key)) {
    const w = Math.max(...rows.map(r => r.length)), c = Object.assign(document.createElement('canvas'), { width: w, height: rows.length }), x = c.getContext('2d');
    rows.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch === '.') return;
      x.fillStyle = ch === 't' ? TEAMS[KID].t : ch === 'T' ? TEAMS[KID].T : PAL[ch] || ch;
      x.fillRect(flipX ? w - 1 - i : i, j, 1, 1);
    }));
    cache.set(key, c);
  }
  return cache.get(key);
}
const pick = (name, v) => (Array.isArray(SPR[name][0]) ? SPR[name][v] : SPR[name]);

function segment(m, action) {
  const pts = [], x0 = A(m), x1 = A(m + 1), y0 = RY + 1;
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / (x1 - x0);
    pts.push({ x, y: action === 'avoid' ? Math.round(y0 - 22 * Math.pow(Math.sin(Math.PI * t), 0.9)) : y0 });
  }
  return pts;
}
const toSchool = () => Array.from({ length: DOOR - A(MONTHS) + 1 }, (_, i) => ({ x: A(MONTHS) + i, y: RY + 1 }));
const stopShort = pts => pts.slice(0, Math.floor(pts.length * 0.55));

export class Village {
  constructor(canvas) {
    this.canvas = canvas; canvas.width = W * S; canvas.height = H * S;
    this.ctx = canvas.getContext('2d');
    this.bg = Object.assign(document.createElement('canvas'), { width: W, height: H });
    this.fg = Object.assign(document.createElement('canvas'), { width: W, height: H });
    this.g = this.fg.getContext('2d');
    this.paintBackground();
    this.view = null; this.last = performance.now();
    document.fonts?.load('20px "Jersey 10"');
  }
  paintBackground() {
    const b = this.bg.getContext('2d'), sky = ['#86c4dc', '#8fcae0', '#98cfe3', '#a1d4e6', '#aad8e8', '#b3dceb', '#bce0ec', '#c4e4ee'];
    for (let y = 0; y < 30; y++) { b.fillStyle = sky[Math.min(7, Math.floor(y / 3.8))]; b.fillRect(0, y, W, 1); }
    for (let y = 30; y < H; y++) for (let x = 0; x < W; x++) {
      const h = hash(`${x},${y}`) % 97;
      b.fillStyle = h === 0 || h === 41 ? '#5f9447' : h === 7 ? '#93c46a' : '#78ae58';
      b.fillRect(x, y, 1, 1);
    }
    b.fillStyle = '#93c46a'; b.fillRect(0, 30, W, 1); b.fillStyle = '#5f9447'; b.fillRect(0, 31, W, 1);
    for (let m = 0; m < MONTHS; m++) {
      const x0 = A(m) + 2, x1 = A(m + 1) - 2, tile = FIELDS[m];
      b.fillStyle = '#86653f'; b.fillRect(x0 - 1, RY + 5, x1 - x0 + 2, 12);
      for (let y = 0; y < 10; y++) for (let x = x0; x < x1; x++) { const ch = tile[y][(x - x0) % 12]; b.fillStyle = ch === '.' ? '#8f6e47' : PAL[ch]; b.fillRect(x, RY + 6 + y, 1, 1); }
    }
    const road = (x, y, w, h) => {
      const across = w > h;
      b.fillStyle = '#7a5a3a'; b.fillRect(x, y, w, h);
      b.fillStyle = '#b48d62'; b.fillRect(x + (across ? 0 : 1), y + (across ? 1 : 0), across ? w : w - 2, across ? h - 2 : h);
      b.fillStyle = '#c9a274';
      for (let i = 0; i < Math.max(w, h); i += 7) across ? b.fillRect(x + i, y + 1 + (i % 2), 2, 1) : b.fillRect(x + 1 + (i % 2), y + i, 1, 2);
    };
    road(30, RY - 1, DOOR - 28, 4);
    for (let x = 0; x < W; x++) { // the fence along the lane, as between Households' lanes
      if (x % 6 === 0) { b.fillStyle = '#6b4a2e'; b.fillRect(x, RY + 26, 1, 3); }
      b.fillStyle = '#9c7a52'; b.fillRect(x, RY + 27, 1, 1);
    }
    for (let i = 0; i < 70; i++) { // wildflowers, kept off the road and fields
      const h = hash('f' + i), x = h % (W - 20) + 10, y = 36 + (h >>> 9) % 170;
      if (y > RY - 4 && y < RY + 30) continue;
      b.fillStyle = ['#f4f1de', '#ffd77a', '#e7a7a0', '#ef8e3c'][h % 4]; b.fillRect(x, y, 1, 1);
      b.fillStyle = '#3f6e3a'; b.fillRect(x, y + 1, 1, 1);
    }
  }
  // state: { legs: ['go' | 'avoid', ...] for months walked, camps: { month: [ladder ids] },
  //   status: 'playing' | 'won' | 'lost', active: month being decided or null }
  sync(state) {
    const v = this.view, legs = state.legs;
    this.state = state;
    if (!v || legs.length < v.legs.length) { this.view = this.rebuild(state); return; }
    while (v.legs.length < legs.length) {
      const m = v.legs.length, a = legs[m], last = m === legs.length - 1 && state.status === 'lost';
      v.legs.push(a);
      v.queue.push({ pts: last ? stopShort(segment(m, a)) : segment(m, a), end: last ? () => { v.stopped = true; } : null });
    }
    if (state.status === 'won' && !v.finishQueued) { v.finishQueued = true; v.queue.push({ pts: toSchool(), end: () => { v.arrived = true; } }); }
  }
  rebuild(state) {
    const v = { legs: [...state.legs], trail: [], queue: [], walk: null, stopped: false, arrived: false, finishQueued: false };
    state.legs.forEach((a, m) => {
      const last = m === state.legs.length - 1 && state.status === 'lost';
      v.trail.push(...(last ? stopShort(segment(m, a)) : segment(m, a)));
    });
    if (state.status === 'lost') v.stopped = true;
    if (state.status === 'won') { v.trail.push(...toSchool()); v.arrived = v.finishQueued = true; }
    return v;
  }
  idle() { return !this.view?.walk && !this.view?.queue.length; }
  position() { const v = this.view; return v.walk ? v.walk.pts[Math.min(v.walk.pts.length - 1, Math.floor(v.walk.d))] : v.trail.at(-1) || { x: A(0), y: RY + 1 }; }
  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000), v = this.view, g = this.g, st = this.state;
    this.last = now;
    if (!v) return;
    if (!v.walk && v.queue.length) v.walk = { ...v.queue.shift(), d: 0 };
    if (v.walk) {
      v.walk.d += (reduceMotion ? 140 : SPEED) * dt;
      if (v.walk.d >= v.walk.pts.length - 1) { const w = v.walk; v.trail.push(...w.pts); v.walk = null; w.end?.(); }
    }
    const draw = (rows, x, y, flipX = false) => g.drawImage(sprite(rows, flipX), Math.round(x), Math.round(y));
    const texts = [];
    g.clearRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) {
      const cx = ((reduceMotion ? 0 : now / 1000 * (2 + i * 0.6)) + i * 150 + 40) % (W + 60) - 40;
      g.globalAlpha = 0.9; draw(SPR.cloud, cx, [2, 9, 4][i]); g.globalAlpha = 1;
    }
    if (!reduceMotion) { const ph = (now / 1000) % 16; if (ph < 9) for (let b = 0; b < 3; b++) draw(SPR.bird[Math.floor(now / 220 + b) % 2], ph * 60 - 30 - b * 9, 18 + (b % 2) * 3); }
    g.fillStyle = 'rgba(255,255,255,.55)';
    for (let m = 0; m <= MONTHS; m++) for (let y = RY - 48; y < RY + 24; y += 3) g.fillRect(A(m), y, 1, 1);
    // the month being decided, as Households' active band
    if (st?.active != null && !v.walk && !v.queue.length) {
      const x0 = A(st.active) + 1, x1 = A(st.active + 1), y0 = RY - 48, y1 = RY + 24, dense = reduceMotion || Math.floor(now / 520) % 2;
      g.fillStyle = 'rgba(255,255,240,.16)'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      g.fillStyle = '#fffbe8';
      for (const x of [x0, x1 - 1]) for (let y = y0; y < y1; y += dense ? 1 : 2) g.fillRect(x, y, 1, 1);
    }
    for (const [name, k, x, y] of PROPS) { const rows = pick(name, k); draw(rows, x - Math.floor(rows[0].length / 2), y - rows.length); }
    for (const [k, x, y] of BLOOMS) draw(FLOWERS[k], x, y - FLOWERS[k].length);
    PETS.forEach(([kind, x, y], i) => {
      const t = reduceMotion ? 0 : now / 1000 + i * 1.37, frames = ANIMALS[kind], rows = Array.isArray(frames) ? frames[Math.floor(t / 0.9) % frames.length] : frames.idle;
      draw(rows, x - Math.floor(rows[0].length / 2), y - rows.length);
    });
    draw(SPR.house[KID], 4, RY + 3 - SPR.house[KID].length);
    draw(SPR.school[reduceMotion ? 0 : Math.floor(now / 450) % 2], SCHOOL.x, SCHOOL.y);
    // support camps, where the council intervened
    for (const [m, ids] of Object.entries(st?.camps || {})) {
      if (!ids.length || Number(m) >= v.legs.length) continue;
      draw(SPR.camp[reduceMotion ? 1 : Math.floor(now / 600) % 2], A(Number(m)) + CW / 2 - 12, RY - 41);
    }
    const pts = v.walk ? v.trail.concat(v.walk.pts.slice(0, Math.floor(v.walk.d) + 1)) : v.trail;
    g.fillStyle = v.stopped ? '#f6d8cf' : '#fffbe8';
    pts.forEach((p, i) => { if (i % 3 === 0) g.fillRect(p.x, p.y, 1, 1); });
    const p = this.position(), id = TEAMS[KID].id;
    if (v.arrived) {
      const fx = SCHOOL.x + 40, fy = SCHOOL.y + 36;
      g.fillStyle = '#5a5650'; g.fillRect(fx, fy, 1, 17);
      texts.push({ text: 'HOME', x: fx + 7, y: fy + 4, size: 10, colour: '#1b1720', box: { fill: TEAMS[KID].t, border: '#1b1720' } });
      if (!reduceMotion && Math.floor(now / 300) % 3 === 0) draw(SPR.star, fx - 3, fy - 14);
    } else if (v.stopped) {
      draw(SPR.kidSad[id], p.x - 6, p.y - 20, true); draw(SPR.bag, p.x + 5, p.y - 6);
      texts.push({ text: 'OUT', x: p.x, y: p.y - 28, size: 12, colour: '#1b1720', box: { fill: '#e0524a', border: '#1b1720' } });
    } else {
      let frame = 0, bob = 0;
      if (v.walk) { frame = [1, 2, 3, 2][Math.floor(v.walk.d / 4) % 4]; bob = frame === 2 ? -1 : 0; } else if (!reduceMotion && Math.floor(now / 700) % 2) bob = -1;
      draw(SPR.kids[id][frame], p.x - 7, p.y - 19 + bob);
      if (st?.active != null) texts.push({ text: `M${st.active + 1}`, x: p.x, y: p.y - 28, size: 12, colour: '#1b1720', box: { fill: TEAMS[KID].t, border: '#1b1720' } });
    }
    texts.push({ text: 'HOME', x: 22, y: RY + 37, size: 13, colour: '#fffbe8' }, { text: 'SCHOOL', x: SCHOOL.x + 42, y: RY + 37, size: 13, colour: '#fffbe8' });
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.bg, 0, 0, W * S, H * S);
    ctx.drawImage(this.fg, 0, 0, W * S, H * S);
    if (v.stopped) { ctx.fillStyle = 'rgba(20,16,26,.38)'; ctx.fillRect(A(0) * S, (RY - 48) * S, (A(6) - A(0)) * S, 72 * S); }
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    for (const t of texts) {
      ctx.font = `${t.size * S}px "Jersey 10", monospace`;
      const w = ctx.measureText(t.text).width, h = t.size * S * 0.8, pad = 2 * S, cx = t.x * S, cy = t.y * S;
      if (t.box) {
        ctx.fillStyle = t.box.border; ctx.fillRect(Math.round(cx - w / 2 - pad - S), Math.round(cy - h / 2 - pad - S), Math.round(w + 2 * pad + 2 * S), Math.round(h + 2 * pad + 2 * S));
        ctx.fillStyle = t.box.fill; ctx.fillRect(Math.round(cx - w / 2 - pad), Math.round(cy - h / 2 - pad), Math.round(w + 2 * pad), Math.round(h + 2 * pad));
      }
      ctx.fillStyle = t.colour;
      ctx.fillText(t.text, cx, cy + S * 0.5);
    }
  }
}
