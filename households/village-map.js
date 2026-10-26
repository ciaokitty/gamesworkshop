// Households shared map: a top-down village. Homes A and B stand at the top left and C on the
// right; each child's road runs through six monthly stops, with that month's field beside it,
// then joins the main road up to the school in the middle. It reads window.paperweights.state();
// the team panels and the game rules stay in competitive.js. The scenery is the same for every
// household and never reveals cards or outcomes.
import { PAL, TEAMS, SPR, FIELDS, ANIMALS, ZZZ, PUPS, FLOWERS } from './village-sprites.js';
import { SFX, addSoundButton, walking } from './sound.js';
import * as modal from './team-modal.js';

// The world is 272 pixels tall; its width follows the screen, and the extra width goes into the
// east-west roads. Houses, school and children keep their pixel size.
const H = 272, MIN_W = 480, MONTHS = 6, BUMP = 20;
const HOUSE_FOOT = 46, DOOR_X = [22, 18, 18]; // houses stand on one line; door centre within each sprite
const ROAD_Y = [220, 146, 182];                // A's road runs lowest, B's joins nearest the school, C's comes in from the right
const BEDS = [244, 252, 260];                  // flower beds in the garden, bottom left
let W = 0, MID = 240, SCHOOL = { x: 0, y: 62 }, DOOR = { x: 0, y: 0 }, HOUSES = [], STOPS = [], NORMALS = [];
const anchor = (a, dx) => (a === 'L' ? 0 : a === 'M' ? MID : W) + dx;
const PROPS = [ // [sprite, variant, anchor (Left, Middle, Right), centre offset, foot]: clear of roads, fields and camp spots
  ['tree', 0, 'L', 140, 34], ['tree', 1, 'L', 163, 30], ['tree', 0, 'L', 186, 35], ['handpump', 0, 'L', 168, 88],
  ['tree', 1, 'M', -46, 58], ['tree', 0, 'M', 46, 60], ['bush', 0, 'M', -64, 60], ['bush', 0, 'M', 66, 62],
  ['tree', 1, 'R', -110, 34], ['tree', 0, 'R', -84, 40], ['bush', 0, 'R', -62, 24], ['sapling', 0, 'M', 130, 72], ['well', 0, 'M', 104, 102],
  ['tree', 0, 'M', 150, 112], ['tree', 1, 'M', 128, 128], ['bush', 0, 'M', 166, 128],
  ['sapling', 1, 'L', 22, 266], ['bush', 0, 'L', 10, 248],
  ['tree', 1, 'R', -20, 246], ['well', 0, 'R', -42, 266], ['bush', 0, 'M', 48, 266],
];
// Animals stay in the yards, garden and paddock, clear of the roads and camps. Fixed spots, so they hint at nothing.
const PETS = [ // [kind, anchor, centre offset, foot]
  ['dogSit', 'L', 196, 92], ['cat', 'M', 66, 96],
  ['rooster', 'M', -28, 262], ['hen', 'M', -10, 266], ['chick', 'M', 2, 266], ['chick', 'M', 8, 266],
  ['cow', 'M', 72, 236], ['cowBrown', 'R', -72, 258], ['dogSleep', 'R', -100, 228],
];
const SPEED = 44, reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.querySelector('#shared-canvas'), ctx = canvas.getContext('2d');
canvas.setAttribute('aria-label', 'Village map: homes A and B at the top left, home C on the right, the school in the middle. Each road has six monthly stops. Tap a road or press A to C to open a team.');
canvas.tabIndex = 0;
const footer = Object.assign(document.createElement('div'), { className: 'map-footer', innerHTML: '<span class="home">HOME</span><span class="school">SCHOOL</span><span class="home home-right">HOME</span>' });
document.querySelector('.shared-map').after(footer);
canvas.style.filter = 'none'; // the light theme inverts canvases; keep the village in true colour
canvas.style.display = 'block';
canvas.style.imageRendering = 'pixelated';
document.querySelector('.bar .title').textContent = 'MAP';
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
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

// ---------- layout: houses, six stops per road, the school ----------
function layout(width) {
  W = width;
  MID = Math.round(W / 2);
  SCHOOL = { x: MID - 31, y: 62 };
  DOOR = { x: MID, y: SCHOOL.y + 43 };
  HOUSES = [6, 80, W - 44].map((x, k) => ({ x, y: HOUSE_FOOT - SPR.house[k].length }));
  STOPS = HOUSES.map((h, k) => {
    const door = { x: h.x + DOOR_X[k], y: HOUSE_FOOT + 8 };
    return split(door, { x: door.x, y: ROAD_Y[k] }, { x: MID + (k === 2 ? 12 : -12), y: ROAD_Y[k] });
  });
  // Detours bulge to one side of the road and the fields sit on the other: right then up for
  // A and B, left then up for C.
  NORMALS = STOPS.map((s, k) => s.slice(1).map((b, m) => {
    const a = s[m], l = dist(a, b), dx = (b.x - a.x) / l, dy = (b.y - a.y) / l;
    return k === 2 ? { x: -dy, y: dx } : { x: dy, y: -dx };
  }));
  bgC.width = fgC.width = W;
  bgC.height = fgC.height = H;
  paintBackground();
  views = []; // redraw every walk at the new size
}
function split(a, bend, b) { // six stretches with the bend on a stop, so no detour turns a corner
  const l1 = dist(a, bend), l2 = dist(bend, b), spread = n => { const p = l1 / n, q = l2 / (MONTHS - n); return Math.max(p, q) / Math.min(p, q); };
  let n = 1;
  for (let i = 2; i < MONTHS; i++) if (spread(i) < spread(n)) n = i;
  const at = (p, q, t) => ({ x: Math.round(p.x + (q.x - p.x) * t), y: Math.round(p.y + (q.y - p.y) * t) });
  return [...Array.from({ length: n }, (_, i) => at(a, bend, i / n)), ...Array.from({ length: MONTHS - n }, (_, i) => at(bend, b, i / (MONTHS - n))), b];
}
const bump = (k, m) => Math.min(BUMP, dist(STOPS[k][m], STOPS[k][m + 1]) * 0.45);
function box(k, m) { // a stretch's field, road, detour and camp: the active band and the tap target
  const a = STOPS[k][m], b = STOPS[k][m + 1], n = NORMALS[k][m], out = bump(k, m) + 21;
  const xs = [a.x + n.x * out, b.x + n.x * out, a.x - n.x * 16, b.x - n.x * 16], ys = [a.y + n.y * out, b.y + n.y * out, a.y - n.y * 16, b.y - n.y * 16];
  return { x0: Math.round(Math.min(...xs)), y0: Math.round(Math.min(...ys)), x1: Math.round(Math.max(...xs)), y1: Math.round(Math.max(...ys)) };
}
function campAt(k, m) {
  const a = STOPS[k][m], b = STOPS[k][m + 1], n = NORMALS[k][m], out = bump(k, m) + 9;
  return { x: Math.round((a.x + b.x) / 2 + n.x * out - 12), y: Math.round((a.y + b.y) / 2 + n.y * out - 11) };
}

// ---------- static background: grass, paths, fields, fences ----------
const GRASS = ['#93c862', '#7fb755', '#a8d873'];
function pave(b, x0, y0, x1, y1, w, edge) { // salmon paving; every edge goes down first so the joins stay clean
  const x = Math.min(x0, x1) - (w >> 1), y = Math.min(y0, y1) - (w >> 1), ww = Math.abs(x1 - x0) + w, hh = Math.abs(y1 - y0) + w;
  if (edge) { b.fillStyle = '#c86f5b'; b.fillRect(x - 1, y - 1, ww + 2, hh + 2); return; }
  b.fillStyle = '#e8907a'; b.fillRect(x, y, ww, hh);
  for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) {
    const h = hash(`p${x + i},${y + j}`) % 23;
    if (h < 2) { b.fillStyle = h ? '#f3a690' : '#d97f69'; b.fillRect(x + i, y + j, 1, 1); }
  }
}
function fence(b, x0, y0, x1, y1) { // a rail with a post every six pixels
  const side = (x, y, dx, dy, n) => {
    for (let i = 0; i <= n; i++) {
      const px = x + dx * i, py = y + dy * i;
      b.fillStyle = '#9c7a52'; b.fillRect(px, py, 1, 1);
      if (i % 6 === 0) { b.fillStyle = '#6b4a2e'; b.fillRect(px - dy, py - 2 * dx, 1 + 2 * dy, 1 + 2 * dx); }
    }
  };
  side(x0, y0, 1, 0, x1 - x0); side(x0, y1, 1, 0, x1 - x0); side(x0, y0, 0, 1, y1 - y0); side(x1, y0, 0, 1, y1 - y0);
}
function field(b, k, m) { // the month's paddy beside its stretch, on the side away from the detour
  const a = STOPS[k][m], z = STOPS[k][m + 1], n = NORMALS[k][m], len = Math.round(dist(a, z)), dx = (z.x - a.x) / len, dy = (z.y - a.y) / len, tile = FIELDS[m];
  for (let j = 3; j < len - 3; j++) for (let i = -1; i <= 10; i++) {
    const edge = i < 0 || i > 9 || j === 3 || j === len - 4, ch = edge ? null : tile[i][(j - 4) % 12];
    b.fillStyle = edge ? '#86653f' : ch === '.' ? '#8f6e47' : PAL[ch];
    b.fillRect(Math.round(a.x + dx * j - n.x * (5 + i)), Math.round(a.y + dy * j - n.y * (5 + i)), 1, 1);
  }
}
function paintBackground() {
  const b = bgC.getContext('2d');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const h = hash(`${x},${y}`) % 97;
    b.fillStyle = h === 0 || h === 41 ? GRASS[1] : h === 7 ? GRASS[2] : GRASS[0];
    b.fillRect(x, y, 1, 1);
  }
  fence(b, 42, 238, MID - 42, 268); // garden
  fence(b, MID + 34, 206, W - 6, 268); // paddock
  fence(b, 112, 170, MID - 24, 170); // hedge between B's fields and A's camps
  b.fillStyle = '#86653f'; for (const y of BEDS) b.fillRect(48, y - 1, MID - 96, 3);
  const ways = [[MID, DOOR.y, MID, ROAD_Y[0], 9], [MID - 26, DOOR.y + 2, MID + 26, DOOR.y + 8, 9]]; // main road and the school plaza
  STOPS.forEach((s, k) => ways.push([s[0].x, HOUSE_FOOT, s[0].x, ROAD_Y[k], 7], [s[0].x, ROAD_Y[k], MID, ROAD_Y[k], 7]));
  for (const edge of [true, false]) ways.forEach(([x0, y0, x1, y1, w]) => pave(b, x0, y0, x1, y1, w, edge));
  STOPS.forEach((_, k) => { for (let m = 0; m < MONTHS; m++) field(b, k, m); });
  const img = b.getImageData(0, 0, W, H).data, grass = (x, y) => img[(y * W + x) * 4] === 0x93 && img[(y * W + x) * 4 + 1] === 0xc8;
  for (let i = 0; i < Math.round(W / 6); i++) { // wildflowers, kept off the paths and fields
    const h = hash('f' + i), x = h % (W - 4) + 2, y = 2 + (h >> 9) % (H - 6);
    if (!grass(x, y) || !grass(x, y + 1)) continue;
    b.fillStyle = ['#f4f1de', '#ffd77a', '#e7a7a0', '#ef8e3c'][h % 4]; b.fillRect(x, y, 1, 1);
    b.fillStyle = '#3f6e3a'; b.fillRect(x, y + 1, 1, 1);
  }
}

// ---------- paths ----------
function segment(k, m, action) {
  const a = STOPS[k][m], b = STOPS[k][m + 1], n = NORMALS[k][m], len = Math.round(dist(a, b)), h = bump(k, m), pts = [];
  for (let s = 0; s <= len; s++) {
    const t = s / len, off = action === 'avoid' ? h * Math.pow(Math.sin(Math.PI * t), 0.9) : 0;
    pts.push({ x: Math.round(a.x + (b.x - a.x) * t + n.x * off), y: Math.round(a.y + (b.y - a.y) * t + n.y * off) });
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
const toSchool = k => polyline([STOPS[k][MONTHS], { x: MID, y: ROAD_Y[k] }, { x: MID, y: DOOR.y }]);
const stopShort = pts => pts.slice(0, Math.floor(pts.length * 0.55));

// ---------- following the game state ----------
// Each household's walk is animated from the actions the game records. A wrong call is
// never added to the game's legs, so the clicked button is noted to draw the last walk.
const chosen = {};
document.querySelector('#teams').addEventListener('click', e => {
  const button = e.target.closest('[data-action]'), team = e.target.closest('.team');
  if (button && team && !button.disabled) chosen[team.dataset.team] = button.dataset.action;
}, true);
canvas.addEventListener('click', e => { // tap a household's road or home to open its panel
  const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
  const away = q => Math.hypot(Math.max(q.x0 - x, 0, x - q.x1), Math.max(q.y0 - y, 0, y - q.y1));
  let best = null;
  HOUSES.forEach((h, k) => {
    const d = Math.min(away({ x0: h.x, y0: h.y, x1: h.x + SPR.house[k][0].length, y1: HOUSE_FOOT }), ...STOPS[k].slice(1).map((_, m) => away(box(k, m))));
    if (d < 12 && (!best || d < best.d)) best = { k, d };
  });
  const t = best && window.paperweights?.state().teams[best.k];
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
const position = (k, v) => v.walk ? v.walk.pts[Math.min(v.walk.pts.length - 1, Math.floor(v.walk.d))] : v.trail.at(-1) || STOPS[k][0];
function facing(k, v) { // children face the way they walk; C, coming from the right, faces west
  if (v.walk) {
    const i = Math.min(v.walk.pts.length - 1, Math.floor(v.walk.d)), a = v.walk.pts[Math.max(0, i - 2)], b = v.walk.pts[i];
    if (a.x !== b.x) return b.x < a.x;
  }
  return k === 2;
}

// ---------- frame ----------
function paint(state, now) {
  g.clearRect(0, 0, W, H);
  texts = [];
  // the stretch each household is deciding, as the game's active band
  state.teams.forEach((t, k) => {
    const m = t.activeBand?.index;
    if (m == null || m >= MONTHS || views[k].walk) return;
    const q = box(k, m), step = reduceMotion || Math.floor(now / 520) % 2 ? 1 : 2;
    g.fillStyle = 'rgba(255,255,240,.18)'; g.fillRect(q.x0, q.y0, q.x1 - q.x0, q.y1 - q.y0);
    g.fillStyle = '#fffbe8';
    for (let x = q.x0; x < q.x1; x += step) { g.fillRect(x, q.y0, 1, 1); g.fillRect(x, q.y1 - 1, 1, 1); }
    for (let y = q.y0; y < q.y1; y += step) { g.fillRect(q.x0, y, 1, 1); g.fillRect(q.x1 - 1, y, 1, 1); }
  });
  for (const [name, v, a, dx, foot] of PROPS) { const rows = pick(name, v); draw(rows, anchor(a, dx) - Math.floor(rows[0].length / 2), foot - rows.length); }
  BEDS.forEach((y, i) => { for (let x = 52; x < MID - 56; x += 10) draw(FLOWERS[i], x, y + 1 - FLOWERS[i].length); });
  PETS.forEach((pet, i) => paintPet(pet, i, now));
  paintPups(now);
  HOUSES.forEach((h, k) => draw(SPR.house[k], h.x, h.y, k));
  draw(SPR.schoolSmall[reduceMotion ? 0 : Math.floor(now / 700) % 2], SCHOOL.x, SCHOOL.y);
  if (!reduceMotion) for (let p = 0; p < 5; p++) { // chimney smoke from B's house
    const ph = (now / 1000 * 0.35 + p / 5) % 1, s = ph > 0.5 ? 2 : 1;
    g.globalAlpha = (1 - ph) * 0.8; g.fillStyle = '#e9e6dc';
    g.fillRect(Math.round(HOUSES[1].x + 10 + Math.sin(ph * 6 + p) * 1.5 + ph * 6), Math.round(HOUSES[1].y - ph * 16), s, s);
  }
  g.globalAlpha = 1;
  views.forEach((v, k) => v.camps.forEach(m => { const c = campAt(k, m); draw(SPR.camp[reduceMotion ? 1 : Math.floor(now / 600 + k) % 2], c.x, c.y); }));
  views.forEach(v => {
    const pts = v.walk ? v.trail.concat(v.walk.pts.slice(0, Math.floor(v.walk.d) + 1)) : v.trail;
    g.fillStyle = v.stopped ? '#f6d8cf' : '#fffbe8';
    pts.forEach((p, i) => { if (i % 3 === 0) g.fillRect(p.x, p.y, 1, 1); });
  });
  STOPS.forEach((_, k) => { for (let m = 0; m < MONTHS; m++) { // stop numbers on the fields
    const a = STOPS[k][m], b = STOPS[k][m + 1], n = NORMALS[k][m];
    label(String(m + 1), (a.x + b.x) / 2 - n.x * 10, (a.y + b.y) / 2 - n.y * 10, 8, '#fffbe8', { fill: '#6b4a2e', border: '#3a2a1c' });
  } });
  views.forEach((v, k) => {
    if (v.arrived) return;
    const p = position(k, v), id = TEAMS[k].id;
    if (v.stopped) { draw(SPR.kidSad[id], p.x - 6, p.y - 20, k, true); draw(SPR.bag, p.x + 5, p.y - 6, k); return; }
    let frame = 0, bob = 0;
    if (v.walk) { frame = [1, 2, 3, 2][Math.floor(v.walk.d / 4) % 4]; bob = frame === 2 ? -1 : 0; }
    else if (!reduceMotion && Math.floor(now / 700 + k) % 2) bob = -1;
    draw(SPR.kids[id][frame], p.x - 7, p.y - 19 + bob, k, facing(k, v));
  });
  let slot = 0;
  views.forEach((v, k) => {
    const id = state.teams[k].id;
    if (v.arrived) { // team flag beside the school
      const fx = MID + [-40, 36, -52][slot++], fy = SCHOOL.y + 26;
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
  views.forEach((v, k) => { // dim a stopped child's whole road, as one shape so the bends are not darker
    if (!v.stopped) return;
    ctx.fillStyle = 'rgba(20,16,26,.38)';
    ctx.beginPath();
    for (let m = 0; m < MONTHS; m++) { const q = box(k, m); ctx.rect(Math.round(q.x0 * sx), Math.round(q.y0 * sx), Math.round((q.x1 - q.x0) * sx), Math.round((q.y1 - q.y0) * sx)); }
    ctx.fill();
  });
  drawLabels(sx);
}

function paintPet([kind, a, dx, foot], i, now) {
  const t = reduceMotion ? 0 : now / 1000 + i * 1.37, cx = anchor(a, dx), base = foot;
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

// Two dogs playing beside the school: chase across, play-bow face to face, swap and chase back.
function paintPups(now) {
  const x0 = MID + 44, x1 = MID + 86, gap = 15, feet = 128, T = 6;
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
  footer.style.setProperty('--cw', `${width}px`); // keep each HOME under its houses and SCHOOL under the school
  footer.style.setProperty('--home', (HOUSES[0].x + HOUSES[1].x + 36) / 2 / W);
  footer.style.setProperty('--home-right', (HOUSES[2].x + 18) / W);
  footer.style.setProperty('--school', MID / W);
}
new ResizeObserver(fit).observe(document.querySelector('.shared-map'));
window.addEventListener('resize', fit);
fit();
requestAnimationFrame(frame);
