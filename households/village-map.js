// Households shared map: three homes, six monthly fields and the school. It replaces the
// Jezero contours for this scenario only and reads window.paperweights.state(); the team
// panels and the game rules stay in competitive.js. The scenery is the same for every
// household and never reveals cards or outcomes.
import { PAL, TEAMS, SPR, FIELDS, ANIMALS, ZZZ, PUPS, FLOWERS } from './village-sprites.js';
import { SFX, addSoundButton, walking } from './sound.js';
import * as modal from './team-modal.js';
import './summary.js';

// The world is 212 pixels tall (three lanes); its width follows the screen, and the extra width goes
// into the six month columns. Houses, school and children keep their pixel size.
const H = 212, X0 = 38, RIGHT = 92, MIN_W = 400, MONTHS = 6, LANES = 3, SCHOOL_Y = 100;
let W = 0, CW = 59, VROAD = 396, SCHOOL = { x: 402, y: SCHOOL_Y }, DOOR = { x: 444, y: SCHOOL_Y + 50 };
const YARD = SCHOOL_Y + 56;
const A = m => Math.round(X0 + m * CW);
const laneTop = k => 28 + 60 * k, roadY = k => laneTop(k) + 40;
const SCENERY = [ // small props as fractions of a month column, clear of the boundaries and camp spots
  ['bush', 0, 2, 0.24, 0], ['handpump', 0, 4, 0.8, 0], ['bush', 0, 5, 0.22, 0],
  ['bush', 0, 1, 0.78, 1], ['well', 0, 3, 0.8, 1], ['bush', 0, 4, 0.24, 1],
  ['bush', 0, 0, 0.78, 2], ['bush', 0, 3, 0.22, 2], ['handpump', 0, 5, 0.8, 2],
  ['bush', 0, 5, 0.8, 0], ['bush', 0, 2, 0.6, 0],
  ['bush', 0, 5, 0.22, 1], ['bush', 0, 1, 0.22, 1],
  ['bush', 0, 1, 0.8, 2], ['bush', 0, 4, 0.78, 2],
];
const BLOOMS = [ // [variant, month, fraction, lane]: small flower clumps beside the roads
  [0, 0, 0.27, 0], [1, 3, 0.73, 0], [2, 1, 0.86, 0], [1, 5, 0.6, 0],
  [2, 0, 0.73, 1], [0, 3, 0.27, 1], [1, 4, 0.62, 1], [0, 1, 0.14, 1],
  [1, 2, 0.73, 2], [2, 4, 0.27, 2], [0, 5, 0.6, 2], [1, 0, 0.14, 2],
];
// Animals sit in the grass just above a road, mid-column: under any support camp and below
// the detour, clear of the boundaries where children wait. Fixed spots, so they hint at nothing.
const PETS = [ // [kind, lane, month, fraction of the column]
  ['dogSit', 0, 1, 0.45], ['hen', 0, 4, 0.42], ['chick', 0, 4, 0.57], ['chick', 0, 4, 0.63],
  ['cat', 1, 2, 0.38], ['cow', 1, 5, 0.5],
  ['rooster', 2, 1, 0.5], ['dogSleep', 2, 3, 0.5],
  ['cowBrown', 2, 4, 0.42],
];
const YARD_PROPS = [['tree', 1, 16, 48], ['tree', 0, 60, 52], ['bush', 0, 76, 70], ['handpump', 0, 74, 92], ['bush', 0, 44, 80], ['sapling', 0, 24, 92], ['tree', 0, 10, 194], ['tree', 1, 48, 208], ['bush', 0, 74, 182], ['bush', 0, 62, 192]]; // x from the school's left edge
const SPEED = 44, reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.querySelector('#shared-canvas'), ctx = canvas.getContext('2d');
canvas.setAttribute('aria-label', 'Village map: three homes on the left, six months of fields, the school on the right. Tap a lane or press A to C to open a team.');
canvas.tabIndex = 0;
const footer = Object.assign(document.createElement('div'), { className: 'map-footer', innerHTML: '<span class="home">HOME</span><span class="school">SCHOOL</span>' });
document.querySelector('.shared-map').after(footer);
canvas.style.filter = 'none'; // the light theme inverts canvases; keep the village in true colour
canvas.style.display = 'block';
canvas.style.imageRendering = 'pixelated';
document.querySelector('.bar .title').textContent = new URLSearchParams(location.search).has('trial') ? 'TRIAL RUN' : 'MAP';
const bgC = document.createElement('canvas'), fgC = document.createElement('canvas');
const g = fgC.getContext('2d');
addSoundButton(document.querySelector('#reset'));

// ---------- sprites ----------
const cache = new Map();
function sprite(rows, team = 0, flipX = false) {
  let byTeam = cache.get(rows);
  if (!byTeam) cache.set(rows, byTeam = new Map());
  const key = team + (flipX ? 'f' : '');
  if (!byTeam.has(key)) {
    const w = Math.max(...rows.map(r => r.length)), c = Object.assign(document.createElement('canvas'), { width: w, height: rows.length }), x = c.getContext('2d');
    rows.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch === '.') return;
      x.fillStyle = ch === 't' ? TEAMS[team].t : ch === 'T' ? TEAMS[team].T : PAL[ch];
      x.fillRect(flipX ? w - 1 - i : i, j, 1, 1);
    }));
    byTeam.set(key, c);
  }
  return byTeam.get(key);
}
const draw = (rows, x, y, team = 0, flipX = false) => g.drawImage(sprite(rows, team, flipX), Math.round(x), Math.round(y));
const pick = (name, v) => (Array.isArray(SPR[name][0]) ? SPR[name][v] : SPR[name]);
// Labels are drawn at screen resolution over the scaled pixel art, in the stage font.
let texts = [];
const label = (text, x, y, size, colour, box = null) => texts.push({ text, x, y, size, colour, box });
document.fonts?.load('20px "Jersey 10"');
function drawLabels(s) {
  ctx.textBaseline = 'middle';
  for (const t of texts) {
    ctx.font = `${Math.round(t.size * s)}px "Jersey 10", monospace`;
    const w = ctx.measureText(t.text).width, h = t.size * s * 0.8, pad = 2 * s, cy = t.y * s;
    let x = t.x * s;
    if (t.box) {
      x -= w / 2;
      ctx.fillStyle = t.box.border; ctx.fillRect(Math.round(x - pad - s), Math.round(cy - h / 2 - pad - s), Math.round(w + 2 * pad + 2 * s), Math.round(h + 2 * pad + 2 * s));
      ctx.fillStyle = t.box.fill; ctx.fillRect(Math.round(x - pad), Math.round(cy - h / 2 - pad), Math.round(w + 2 * pad), Math.round(h + 2 * pad));
    }
    ctx.fillStyle = t.colour;
    ctx.fillText(t.text, x, cy + s * 0.5);
  }
}
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

// ---------- static background: sky, grass, fields, roads ----------
function road(b, x, y, w, h) {
  const across = w > h;
  b.fillStyle = '#7a5a3a'; b.fillRect(x, y, w, h);
  b.fillStyle = '#b48d62'; b.fillRect(x + (across ? 0 : 1), y + (across ? 1 : 0), across ? w : w - 2, across ? h - 2 : h);
  b.fillStyle = '#c9a274';
  for (let i = 0; i < Math.max(w, h); i += 7) across ? b.fillRect(x + i, y + 1 + (i % 2), 2, 1) : b.fillRect(x + 1 + (i % 2), y + i, 1, 2);
}
function layout(width) {
  W = width;
  CW = (W - X0 - RIGHT) / MONTHS;
  VROAD = W - RIGHT;
  SCHOOL = { x: W - 86, y: SCHOOL_Y };
  DOOR = { x: W - 44, y: SCHOOL_Y + 50 };
  bgC.width = fgC.width = W;
  bgC.height = fgC.height = H;
  paintBackground();
  views = []; // redraw every walk at the new size
}
function paintBackground() {
  const b = bgC.getContext('2d'), sky = ['#86c4dc', '#8fcae0', '#98cfe3', '#a1d4e6', '#aad8e8', '#b3dceb', '#bce0ec', '#c4e4ee'];
  for (let y = 0; y < 26; y++) { b.fillStyle = sky[Math.min(7, Math.floor(y / 3.2))]; b.fillRect(0, y, W, 1); }
  for (let y = 26; y < H; y++) for (let x = 0; x < W; x++) {
    const h = hash(`${x},${y}`) % 97;
    b.fillStyle = h === 0 || h === 41 ? '#5f9447' : h === 7 ? '#93c46a' : '#78ae58';
    b.fillRect(x, y, 1, 1);
  }
  b.fillStyle = '#93c46a'; b.fillRect(0, 26, W, 1); b.fillStyle = '#5f9447'; b.fillRect(0, 27, W, 1);
  for (let k = 0; k < LANES; k++) {
    const ry = roadY(k);
    for (let m = 0; m < MONTHS; m++) {
      const x0 = A(m) + 2, x1 = A(m + 1) - 2, tile = FIELDS[m];
      b.fillStyle = '#86653f'; b.fillRect(x0 - 1, ry + 5, x1 - x0 + 2, 12);
      for (let y = 0; y < 10; y++) for (let x = x0; x < x1; x++) { const ch = tile[y][(x - x0) % 12]; b.fillStyle = ch === '.' ? '#8f6e47' : PAL[ch]; b.fillRect(x, ry + 6 + y, 1, 1); }
    }
    road(b, 30, ry - 1, VROAD + 3 - 30, 4);
  }
  road(b, VROAD - 1, roadY(0) - 1, 4, Math.max(roadY(LANES - 1), YARD) - roadY(0) + 4);
  road(b, VROAD - 1, YARD - 1, DOOR.x - VROAD + 3, 4);
  road(b, DOOR.x - 2, DOOR.y, 4, YARD - DOOR.y + 2);
  for (let k = 0; k < LANES - 1; k++) for (let x = 0; x < VROAD - 3; x++) {
    if (x % 6 === 0) { b.fillStyle = '#6b4a2e'; b.fillRect(x, laneTop(k + 1) - 2, 1, 3); }
    b.fillStyle = '#9c7a52'; b.fillRect(x, laneTop(k + 1) - 1, 1, 1);
  }
  for (let i = 0; i < Math.round(W / 7); i++) { // wildflowers, kept off the roads and fields
    const h = hash('f' + i), x = h % (VROAD - 40) + 36, y = 30 + (h >>> 9) % (H - 42), ry = roadY(Math.min(LANES - 1, Math.floor((y - 28) / 60)));
    if (y > ry - 3 && y < ry + 19) continue;
    b.fillStyle = ['#f4f1de', '#ffd77a', '#e7a7a0', '#ef8e3c'][h % 4]; b.fillRect(x, y, 1, 1);
    b.fillStyle = '#3f6e3a'; b.fillRect(x, y + 1, 1, 1);
  }
}

// ---------- paths ----------
function segment(k, m, action) {
  const pts = [], y0 = roadY(k) + 1, x0 = A(m), x1 = A(m + 1);
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / (x1 - x0);
    pts.push({ x, y: action === 'avoid' ? Math.round(y0 - 22 * Math.pow(Math.sin(Math.PI * t), 0.9)) : y0 });
  }
  return pts;
}
function polyline(list) {
  const out = [];
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i], b = list[i + 1], n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    for (let s = 0; s < n; s++) out.push({ x: Math.round(a.x + (b.x - a.x) * s / n), y: Math.round(a.y + (b.y - a.y) * s / n) });
  }
  out.push(list.at(-1));
  return out;
}
const toSchool = k => polyline([{ x: A(6), y: roadY(k) + 1 }, { x: VROAD, y: roadY(k) + 1 }, { x: VROAD, y: YARD + 1 }, { x: DOOR.x, y: YARD + 1 }, { x: DOOR.x, y: DOOR.y }]);
const stopShort = pts => pts.slice(0, Math.floor(pts.length * 0.55));

// ---------- following the game state ----------
// Each household's walk is animated from the actions the game records. A wrong call is
// never added to the game's legs, so the clicked button is noted to draw the last walk.
const chosen = {};
document.querySelector('#teams').addEventListener('click', e => {
  const button = e.target.closest('[data-action]'), team = e.target.closest('.team');
  if (button && team && !button.disabled) chosen[team.dataset.team] = button.dataset.action;
}, true);
canvas.addEventListener('click', e => { // tap a household's lane to open its panel
  const box = canvas.getBoundingClientRect(), y = (e.clientY - box.top) / box.height * H;
  const k = Math.max(0, Math.min(LANES - 1, Math.floor((y - 28) / 60))), t = window.paperweights?.state().teams[k];
  if (t) modal.open(t.id);
});

const blank = () => ({ legs: [], camps: [], trail: [], queue: [], walk: null, status: 'deciding', stopped: false, arrived: false, outQueued: false, finishQueued: false });
let views = [];
function rebuild(k, t) { // jump straight to the game's state, e.g. after a reset or on load
  const v = blank();
  t.legs.forEach((a, m) => { v.legs.push(a); if (a === 'avoid') v.camps.push(m); v.trail.push(...segment(k, m, a)); });
  if (t.status === 'finished') { v.trail.push(...toSchool(k)); v.arrived = v.finishQueued = true; }
  if (t.status === 'eliminated') { v.trail.push(...stopShort(segment(k, t.legs.length, 'go'))); v.stopped = v.outQueued = true; }
  v.status = t.status;
  return v;
}
function follow(state) {
  state.teams.forEach((t, k) => {
    let v = views[k];
    const rewound = v && (t.legs.length < v.legs.length || v.legs.some((a, m) => t.legs[m] !== a)
      || (v.status === 'eliminated' && t.status !== 'eliminated') || (v.status === 'finished' && t.status !== 'finished'));
    if (!v || rewound) { views[k] = rebuild(k, t); return; }
    while (v.legs.length < t.legs.length) {
      const m = v.legs.length, a = t.legs[m];
      v.legs.push(a);
      if (a === 'avoid') v.camps.push(m);
      v.queue.push({ pts: segment(k, m, a), start: a === 'avoid' ? SFX.intervene : SFX.skip, end: SFX.arrive });
    }
    if (t.status === 'finished' && !v.finishQueued) {
      v.finishQueued = true;
      v.queue.push({ pts: toSchool(k), end: () => { v.arrived = true; SFX.finish(); } });
    }
    if (t.status === 'eliminated' && !v.outQueued) {
      const m = t.legs.length, a = chosen[t.id] || 'go';
      v.outQueued = true;
      if (a === 'avoid') v.camps.push(m);
      v.queue.push({ pts: stopShort(segment(k, m, a)), start: a === 'avoid' ? SFX.intervene : SFX.skip, end: () => { v.stopped = true; SFX.out(); } });
    }
    v.status = t.status;
  });
}
function advance(dt) {
  walking(views.some(v => v.walk || v.queue.length));
  for (const v of views) {
    if (!v.walk && v.queue.length) { v.walk = { ...v.queue.shift(), d: 0 }; v.walk.start?.(); }
    if (!v.walk) continue;
    const before = v.walk.d;
    v.walk.d += (reduceMotion ? 140 : SPEED) * dt;
    if (Math.floor(before / 8) !== Math.floor(v.walk.d / 8)) SFX.step();
    if (v.walk.d >= v.walk.pts.length - 1) { const w = v.walk; v.trail.push(...w.pts); v.walk = null; w.end?.(); }
  }
}
const position = (k, v) => v.walk ? v.walk.pts[Math.min(v.walk.pts.length - 1, Math.floor(v.walk.d))] : v.trail.at(-1) || { x: A(0), y: roadY(k) + 1 };

// ---------- frame ----------
function paint(state, now) {
  g.clearRect(0, 0, W, H);
  texts = [];
  for (let i = 0; i < 3; i++) {
    const cx = ((reduceMotion ? 0 : now / 1000 * (2 + i * 0.6)) + i * 190 + 40) % (W + 60) - 40;
    g.globalAlpha = 0.9; draw(SPR.cloud, cx, [1, 6, 0][i]); g.globalAlpha = 1;
  }
  if (!reduceMotion) { const ph = (now / 1000) % 16; if (ph < 9) for (let b = 0; b < 3; b++) draw(SPR.bird[Math.floor(now / 220 + b) % 2], ph * 60 - 30 - b * 9, 16 + (b % 2) * 3); }
  g.fillStyle = 'rgba(255,255,255,.55)';
  for (let m = 0; m <= MONTHS; m++) for (let y = 28; y < H - 2; y += 3) g.fillRect(A(m), y, 1, 1);
  // the column each household is deciding, as the game's active band
  state.teams.forEach((t, k) => {
    const m = t.activeBand?.index;
    if (m == null || m >= MONTHS || views[k].walk) return;
    const x0 = A(m) + 1, x1 = A(m + 1), y0 = laneTop(k) + 1, y1 = laneTop(k) + 58, dense = reduceMotion || Math.floor(now / 520) % 2;
    g.fillStyle = 'rgba(255,255,240,.16)'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.fillStyle = '#fffbe8';
    for (const x of [x0, x1 - 1]) for (let y = y0; y < y1; y += dense ? 1 : 2) g.fillRect(x, y, 1, 1);
  });
  for (const [name, v, m, f, lane] of SCENERY) { const rows = pick(name, v); draw(rows, A(m) + Math.round(CW * f) - Math.floor(rows[0].length / 2), roadY(lane) - 4 - rows.length); }
  for (const [name, v, x, yb] of YARD_PROPS) { const rows = pick(name, v); draw(rows, SCHOOL.x + x - Math.floor(rows[0].length / 2), yb - rows.length); }
  BLOOMS.forEach(([v, m, f, lane]) => { const rows = FLOWERS[v]; draw(rows, A(m) + Math.round(CW * f) - Math.floor(rows[0].length / 2), roadY(lane) - 3 - rows.length); });
  PETS.forEach((pet, i) => paintPet(pet, i, now));
  paintPups(now);
  SPR.house.slice(0, LANES).forEach((rows, k) => draw(rows, 0, roadY(k) + 3 - rows.length, k));
  draw(SPR.schoolNoFlag, SCHOOL.x, SCHOOL.y);
  if (!reduceMotion) for (const [sx, sy] of [[10, roadY(1) - 28]]) for (let p = 0; p < 5; p++) { // chimney smoke
    const ph = (now / 1000 * 0.35 + p / 5) % 1, s = ph > 0.5 ? 2 : 1;
    g.globalAlpha = (1 - ph) * 0.8; g.fillStyle = '#e9e6dc';
    g.fillRect(Math.round(sx + Math.sin(ph * 6 + p) * 1.5 + ph * 6), Math.round(sy - ph * 16), s, s);
  }
  g.globalAlpha = 1;
  views.forEach((v, k) => v.camps.forEach(m => draw(SPR.camp[reduceMotion ? 1 : Math.floor(now / 600 + k) % 2], A(m) + CW / 2 - 12, roadY(k) - 41)));
  views.forEach(v => {
    const pts = v.walk ? v.trail.concat(v.walk.pts.slice(0, Math.floor(v.walk.d) + 1)) : v.trail;
    g.fillStyle = v.stopped ? '#f6d8cf' : '#fffbe8';
    pts.forEach((p, i) => { if (i % 3 === 0) g.fillRect(p.x, p.y, 1, 1); });
  });
  views.forEach((v, k) => {
    if (v.arrived) return;
    const p = position(k, v), id = TEAMS[k].id;
    if (v.stopped) { draw(SPR.kidSad[id], p.x - 6, p.y - 20, k, true); draw(SPR.bag, p.x + 5, p.y - 6, k); return; }
    let frame = 0, bob = 0;
    if (v.walk) { frame = [1, 2, 3, 2][Math.floor(v.walk.d / 4) % 4]; bob = frame === 2 ? -1 : 0; }
    else if (!reduceMotion && Math.floor(now / 700 + k) % 2) bob = -1;
    draw(SPR.kids[id][frame], p.x - 7, p.y - 19 + bob, k);
  });
  let slot = 0;
  views.forEach((v, k) => {
    const id = state.teams[k].id;
    if (v.arrived) { // team flag on the school fence
      const fx = SCHOOL.x + [6, 19, 59][slot++], fy = SCHOOL.y + 36;
      g.fillStyle = '#5a5650'; g.fillRect(fx, fy, 1, 17);
      label(id, fx + 6, fy + 4, 10, '#1b1720', { fill: TEAMS[k].t, border: '#1b1720' });
      if (!reduceMotion && Math.floor(now / 300) % 3 === 0) draw(SPR.star, fx - 3, fy - 14);
      return;
    }
    const p = position(k, v);
    label(v.stopped ? 'OUT' : id, p.x, p.y - 28, 12, '#1b1720', { fill: v.stopped ? '#e0524a' : TEAMS[k].t, border: id === modal.focused() ? '#fffbe8' : '#1b1720' });
  });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bgC, 0, 0, canvas.width, canvas.height);
  ctx.drawImage(fgC, 0, 0, canvas.width, canvas.height);
  const sx = canvas.width / W;
  views.forEach((v, k) => { if (v.stopped) { ctx.fillStyle = 'rgba(20,16,26,.38)'; ctx.fillRect(Math.round(A(0) * sx), Math.round(laneTop(k) * sx), Math.round((A(6) - A(0)) * sx), Math.round(58 * sx)); } });
  drawLabels(sx);
}

function paintPet([kind, lane, m, f], i, now) {
  const t = reduceMotion ? 0 : now / 1000 + i * 1.37, cx = A(m) + Math.round(CW * f), base = roadY(lane) - 3;
  const at = (rows, dx = 0, dy = 0, flipX = false) => draw(rows, cx + dx - Math.floor(rows[0].length / 2), base + dy - rows.length, 0, flipX);
  const pulse = (period, on) => (t % period) < on; // true for `on` seconds of every `period`
  if (kind === 'dogSit') return at(ANIMALS.dogSit[pulse(2.6, 1.1) && Math.floor(t * 6) % 2 ? 1 : 0]);   // tail wag, then rest
  if (kind === 'dogSleep') {
    const rows = ANIMALS.dogSleep[Math.floor(t / 0.9) % 2];
    at(rows);
    for (let z = 0; z < 2; z++) { // two Zs drifting up from the head
      const ph = reduceMotion ? 0.3 + z * 0.4 : (t / 2.2 + z / 2) % 1;
      g.globalAlpha = 1 - ph;
      draw(ZZZ, cx - Math.floor(rows[0].length / 2) + 2 + Math.round(ph * 4) + z * 2, base - rows.length - 4 - Math.round(ph * 9));
      g.globalAlpha = 1;
    }
    return;
  }
  if (kind === 'cat') { // play loop: sit, crouch, pounce forward, trot back
    const c = t % 5.2, hop = 12;
    if (c < 1.6) return at(ANIMALS.cat.idle);
    if (c < 2.2) return at(ANIMALS.cat.crouch);
    if (c < 2.8) { const u = (c - 2.2) / 0.6; return at(ANIMALS.cat.jump, Math.round(u * hop), -Math.round(Math.sin(Math.PI * u) * 6)); }
    if (c < 4.6) { const u = (c - 2.8) / 1.8; return at(Math.floor(t * 8) % 2 ? ANIMALS.cat.run : ANIMALS.cat.idle, Math.round((1 - u) * hop), 0, true); }
    return at(ANIMALS.cat.idle);
  }
  if (kind === 'cow' || kind === 'cowBrown') return at(ANIMALS[kind][pulse(3.2, 0.5) ? 1 : 0]); // tail swish
  if (kind === 'hen') return at(ANIMALS.hen[pulse(1.9, 0.35) || pulse(4.3, 0.3) ? 1 : 0], Math.round(Math.sin(t * 0.7) * 2), 0, Math.sin(t * 0.35) > 0.6);
  if (kind === 'rooster') return at(ANIMALS.rooster[pulse(3.5, 0.6) ? 1 : 0]);
  if (kind === 'chick') return at(ANIMALS.chick[Math.floor(t / 0.45) % 2], 0, pulse(1.3, 0.15) ? -1 : 0);
}

// Two dogs playing in front of the school: chase across, play-bow face to face, swap and chase back.
function paintPups(now) {
  const x0 = SCHOOL.x + 26, x1 = SCHOOL.x + 64, gap = 15, feet = SCHOOL.y + 72, T = 6;
  const put = (pup, frame, x, left) => { const rows = PUPS[pup][frame]; draw(rows, x - Math.floor(rows[0].length / 2), feet - rows.length, 0, left); };
  if (reduceMotion) { put(0, 'bow', x0 + 8, false); put(1, 'bow', x0 + 8 + gap, true); return; }
  const t = (now / 1000) % (2 * T), back = t >= T, c = t % T, stride = Math.floor(now / 120) % 2 ? 'run' : 'run2';
  const lead = back ? 0 : 1, chase = 1 - lead; // the chaser becomes the leader on the way back
  if (c < 2.5) {
    const u = c / 2.5, x = back ? x1 - gap - u * (x1 - gap - x0) : x0 + gap + u * (x1 - x0 - gap);
    put(lead, stride, Math.round(x), back);
    put(chase, stride === 'run' ? 'run2' : 'run', Math.round(back ? x + gap : x - gap), back);
    return;
  }
  const end = back ? x0 : x1, far = back ? end : end - gap; // bow facing each other at the end of the run
  put(0, 'bow', far, false); put(1, 'bow', far + gap, true);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (window.paperweights) {
    const state = paperweights.state();
    follow(state);
    advance(dt);
    paint(state, now);
  }
  requestAnimationFrame(frame);
}
function fit() { // fill the map area; only very tall, narrow screens get bands above and below
  const box = document.querySelector('.shared-map'), holder = canvas.parentElement, dpr = Math.min(2, window.devicePixelRatio || 1);
  const bw = Math.max(1, box.clientWidth), bh = Math.max(1, box.clientHeight), world = Math.max(MIN_W, Math.round(H * bw / bh));
  if (world !== W) layout(world);
  const width = Math.min(bw, bh * W / H);
  holder.style.width = `${width}px`;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${width * H / W}px`;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(width * dpr * H / W);
  footer.style.setProperty('--cw', `${width}px`); // keep HOME under the houses and SCHOOL under the school
  footer.style.setProperty('--home', 26 / W);
  footer.style.setProperty('--school', (SCHOOL.x + 44) / W);
}
new ResizeObserver(fit).observe(document.querySelector('.shared-map'));
window.addEventListener('resize', fit);
fit();
requestAnimationFrame(frame);
