// Pixel art for Extended Households. Sprites are rows of palette characters (Households'
// PAL, '.' transparent, 't'/'T' swapped for an org colour), drawn here with shape helpers.
// Houses, children, the school and clouds come from Households unchanged.
import { PAL, SPR, ICONS } from '../households/village-sprites.js';

export { PAL, SPR };

// --- tiny pixel canvas ---------------------------------------------------------------------
function grid(w, h) { const g = Array.from({ length: h }, () => Array(w).fill('.')); g.w = w; g.h = h; return g; }
function px(g, x, y, c) { if (x >= 0 && y >= 0 && x < g.w && y < g.h) g[y][x] = c; }
function rect(g, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(g, x + i, y + j, c); }
function disc(g, cx, cy, r, c) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(g, cx + x, cy + y, c); }
function stamp(g, rows, x, y) { rows.forEach((row, j) => [...row].forEach((c, i) => { if (c !== '.') px(g, x + i, y + j, c); })); }
function outline(g, c = 'k') {
  const add = [];
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (g[y][x] !== '.') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== '.' && g[y + dy][x + dx] !== c)) add.push([x, y]);
  }
  add.forEach(([x, y]) => px(g, x, y, c));
  return g;
}
const rows = g => g.map(r => r.join(''));
const flip = r => r.map(s => [...s].reverse().join(''));

// --- card icons, 16 x 16 ----------------------------------------------------------------------
// Harvest: five rice plants, lush to bare.
function plant(level) {
  const g = grid(16, 16);
  rect(g, 0, 13, 16, 3, 'b'); rect(g, 0, 13, 16, 1, level === 4 ? 'E' : 'G');
  if (level === 4) { // cracked, bare field with stubble
    for (const x of [2, 5, 9, 12]) { px(g, x, 12, 'e'); px(g, x + 1, 11, 'E'); }
    px(g, 3, 14, 'k'); px(g, 4, 15, 'k'); px(g, 10, 14, 'k'); px(g, 11, 15, 'k'); px(g, 7, 14, 'k');
    return rows(g);
  }
  const spec = [ // [stalk xs, height, stalk colour, head colour, head size, droop]
    [[3, 7, 11], 11, 'g', 'y', 3, 0],
    [[4, 8, 12], 9, 'g', 'y', 2, 0],
    [[5, 10], 8, 'L', 'Y', 2, 1],
    [[5, 10], 6, 'e', 'E', 1, 2],
  ][level];
  const [xs, h, stalk, head, size, droop] = spec;
  for (const x of xs) {
    for (let j = 0; j < h; j++) px(g, x + (j > h - 3 ? Math.min(droop, j - (h - 3)) : 0), 12 - j, stalk);
    const tx = x + droop, ty = 13 - h;
    for (let k = 0; k < size; k++) { px(g, tx - 1, ty + k + (droop ? 1 : 0), head); px(g, tx + 1, ty + k + (droop ? 1 : 0), head); }
    px(g, tx, ty - 1 + (droop ? 2 : 0), head);
    if (level < 2) { px(g, x - 1, 9, 'G'); px(g, x - 2, 8, 'G'); px(g, x + 1, 10, 'G'); px(g, x + 2, 9, 'G'); }
  }
  return rows(outline(g));
}

// Cash: a coin jar emptying, then IOU notes.
function jar(level) {
  const g = grid(16, 16);
  rect(g, 4, 1, 8, 2, 'b'); rect(g, 5, 3, 6, 1, 'c');
  rect(g, 3, 4, 10, 11, 'c'); rect(g, 4, 5, 8, 9, 'a');
  const fill = [9, 7, 3, 0, 0][level];
  for (let j = 0; j < fill; j++) for (let i = 0; i < 8; i++) px(g, 4 + i, 13 - j, (i + j) % 3 ? 'o' : 'O');
  if (level === 0) { rect(g, 6, 3, 4, 2, 'o'); px(g, 7, 2, 'O'); }
  if (level >= 3) { // an IOU slip hangs on the jar
    rect(g, 0, 7, 6, 7, level === 4 ? 'x' : 'w');
    for (const y of [9, 11]) rect(g, 1, y, 4, 1, level === 4 ? 'a' : 'C');
  }
  if (level === 4) { px(g, 9, 6, 'k'); px(g, 10, 7, 'k'); px(g, 9, 8, 'k'); px(g, 10, 9, 'k'); px(g, 11, 10, 'k'); }
  return rows(outline(g));
}

// School: a school bag with attendance stars above it.
function backpack(level) {
  const g = grid(16, 16);
  const body = level === 4 ? 'z' : 'n', dark = level === 4 ? 'Z' : 'N';
  rect(g, 4, 6, 8, 9, body); rect(g, 4, 6, 8, 3, dark); rect(g, 6, 10, 4, 3, dark);
  rect(g, 7, 4, 2, 2, dark);
  const stars = 4 - level;
  for (let i = 0; i < 4; i++) {
    const x = 1 + i * 4, c = i < stars ? 'y' : '.';
    if (c === '.') continue;
    px(g, x + 1, 0, c); rect(g, x, 1, 3, 1, c); px(g, x + 1, 2, c);
  }
  if (level === 4) { px(g, 6, 2, 'x'); px(g, 9, 2, 'x'); px(g, 7, 3, 'x'); px(g, 8, 3, 'x'); px(g, 6, 4, 'x'); px(g, 9, 4, 'x'); }
  return rows(outline(g));
}

// Expense: a calm closed purse, or a bill with a coin flying off.
function expense(on) {
  const g = grid(16, 16);
  if (!on) {
    rect(g, 3, 7, 10, 7, 'm'); rect(g, 3, 7, 10, 2, 'M'); rect(g, 7, 5, 2, 2, 'o');
    return rows(outline(g));
  }
  rect(g, 2, 2, 9, 12, 'w');
  for (const y of [5, 7, 9]) rect(g, 3, y, 6, 1, 'C');
  rect(g, 6, 11, 4, 2, 'x');
  disc(g, 12, 4, 2, 'o'); px(g, 12, 4, 'O'); px(g, 14, 1, 'o'); px(g, 15, 0, 'o');
  return rows(outline(g));
}

export const ICON_ROWS = {
  weather: ICONS.weather,
  expense: { none: expense(false), expense: expense(true) },
  harvest: Object.fromEntries(['good', 'fair', 'weak', 'poor', 'failed'].map((v, i) => [v, plant(i)])),
  cash: Object.fromEntries(['enough', 'tight', 'low', 'borrowing', 'debt'].map((v, i) => [v, jar(i)])),
  school: Object.fromEntries(['regular', 'missing', 'irregular', 'rarely', 'dropout'].map((v, i) => [v, backpack(i)])),
};

// --- level sprites ---------------------------------------------------------------------------
// The "?" block each org bumps to drop its support.
function qblock(used) {
  const g = grid(12, 12);
  rect(g, 0, 0, 12, 12, used ? 'E' : 'O'); rect(g, 1, 1, 10, 10, used ? 'e' : 'o');
  for (const [x, y] of [[1, 1], [10, 1], [1, 10], [10, 10]]) px(g, x, y, used ? 'E' : 'O');
  if (!used) ['.www.', 'w...w', '...w.', '..w..', '.....', '..w..'].forEach((r, j) => [...r].forEach((c, i) => c === 'w' && px(g, 4 + i, 3 + j, 'a')));
  return rows(outline(g));
}
function sack() { const g = grid(9, 10); rect(g, 1, 3, 7, 7, 'm'); rect(g, 3, 1, 3, 2, 'M'); rect(g, 2, 5, 5, 2, 'w'); return rows(outline(g)); }
function coins() { const g = grid(11, 8); for (const [x, y] of [[0, 3], [4, 0], [7, 4]]) { disc(g, x + 2, y + 2, 1, 'o'); px(g, x + 2, y + 2, 'O'); } return rows(outline(g)); }
function bookStar() {
  const g = grid(11, 11);
  rect(g, 1, 5, 9, 5, 'n'); rect(g, 5, 5, 1, 5, 'w');
  px(g, 5, 0, 'y'); rect(g, 4, 1, 3, 1, 'y'); rect(g, 2, 2, 7, 1, 'y'); rect(g, 3, 3, 5, 1, 'y'); px(g, 3, 4, 'y'); px(g, 7, 4, 'y');
  return rows(outline(g));
}
// Disruptors are the "enemies": a grumpy storm cloud and a walking bill. Never the family.
function stormCloud(frame) {
  const g = grid(22, 18);
  disc(g, 6, 6, 4, 'Z'); disc(g, 12, 5, 5, 'Z'); disc(g, 17, 7, 3, 'Z'); rect(g, 3, 7, 17, 4, 'Z');
  rect(g, 4, 10, 15, 1, 'K');
  px(g, 8, 6, 'a'); px(g, 14, 6, 'a'); px(g, 8, 7, 'k'); px(g, 14, 7, 'k');
  px(g, 7, 5, 'k'); px(g, 9, 6, 'k'); px(g, 15, 5, 'k'); px(g, 13, 6, 'k');
  rect(g, 10, 9, 3, 1, 'k');
  outline(g);
  for (let i = 0; i < 5; i++) px(g, 5 + i * 3 + frame, 13 + ((i + frame) % 2) * 2, 'q');
  for (const [x, y] of [[11, 12], [10, 13], [11, 14], [10, 15]]) px(g, x + frame, y, 'y');
  return rows(g);
}
function bill(frame) {
  const g = grid(12, 15);
  rect(g, 1, 0, 10, 12, 'w'); rect(g, 8, 0, 3, 3, 'W');
  px(g, 3, 4, 'k'); px(g, 7, 4, 'k'); px(g, 2, 3, 'k'); px(g, 8, 3, 'k');
  rect(g, 4, 7, 3, 1, 'k'); rect(g, 2, 9, 7, 1, 'C');
  rect(g, 7, 9, 3, 2, 'x');
  outline(g);
  const legs = frame ? [[3, 13], [3, 14], [8, 12], [9, 13]] : [[3, 12], [2, 13], [8, 13], [8, 14]];
  legs.forEach(([x, y]) => px(g, x, y, 'k'));
  return rows(g);
}
function sun() { const g = grid(13, 13); disc(g, 6, 6, 4, 'l'); for (const [x, y] of [[6, 0], [6, 12], [0, 6], [12, 6], [2, 2], [10, 2], [2, 10], [10, 10]]) px(g, x, y, 'o'); px(g, 5, 5, 'k'); px(g, 7, 5, 'k'); px(g, 5, 8, 'k'); px(g, 6, 8, 'k'); px(g, 7, 8, 'k'); return rows(g); }
function rainCloud() { const g = grid(16, 12); disc(g, 5, 4, 3, 'c'); disc(g, 10, 3, 3, 'c'); rect(g, 2, 4, 12, 3, 'c'); outline(g); for (const x of [4, 8, 12]) { px(g, x, 9, 'q'); px(g, x - 1, 11, 'q'); } return rows(g); }

// Org mascots: a small field worker in the org colour, carrying the org's tool.
function mascot(tool, frame) {
  const g = grid(14, 20);
  rect(g, 4, 0, 6, 2, 't'); rect(g, 3, 2, 8, 1, 'T');
  rect(g, 4, 3, 6, 5, 's'); px(g, 5, 5, 'k'); px(g, 8, 5, 'k'); rect(g, 6, 7, 2, 1, 'S');
  rect(g, 3, 8, 8, 6, 't'); rect(g, 3, 8, 8, 1, 'T');
  rect(g, 4, 14, 6, 3, 'p');
  if (frame) { rect(g, 3, 17, 3, 2, 'k'); rect(g, 8, 16, 3, 2, 'k'); } else { rect(g, 4, 17, 2, 2, 'k'); rect(g, 8, 17, 2, 2, 'k'); }
  if (tool === 'harvest') { rect(g, 10, 9, 4, 5, 'm'); rect(g, 11, 10, 2, 2, 'w'); }
  if (tool === 'cash') { disc(g, 12, 11, 1, 'o'); px(g, 12, 11, 'O'); }
  if (tool === 'school') { rect(g, 10, 9, 4, 5, 'n'); rect(g, 12, 9, 1, 5, 'w'); }
  return rows(outline(g));
}

function granary() {
  const g = grid(40, 44);
  rect(g, 6, 14, 28, 28, 'e'); rect(g, 6, 14, 28, 2, 'E');
  for (let j = 0; j < 12; j++) rect(g, 20 - j - 2, 2 + j, 2 * j + 4, 1, j % 3 ? 'r' : 'R');
  rect(g, 15, 26, 10, 16, 'B'); rect(g, 19, 26, 2, 16, 'b');
  for (const x of [9, 28]) rect(g, x, 20, 3, 3, 'y');
  rect(g, 2, 38, 6, 4, 'm'); rect(g, 32, 37, 6, 5, 'm');
  return rows(outline(g));
}
function bank() {
  const g = grid(44, 44);
  for (let j = 0; j < 8; j++) rect(g, 22 - j * 2 - 2, 4 + j, j * 4 + 4, 1, 'W');
  rect(g, 4, 12, 36, 3, 'w'); rect(g, 6, 15, 32, 25, 'c'); rect(g, 4, 40, 36, 3, 'w');
  for (const x of [9, 17, 25, 33]) rect(g, x, 16, 3, 24, 'w');
  rect(g, 19, 28, 6, 12, 'P');
  disc(g, 22, 8, 2, 'o'); px(g, 22, 8, 'O');
  return rows(outline(g));
}
function flagpole(frame) {
  const g = grid(16, 50);
  rect(g, 2, 2, 1, 46, 'C'); disc(g, 2, 2, 1, 'y'); rect(g, 0, 47, 6, 3, 'K');
  for (let j = 0; j < 8; j++) rect(g, 3, 5 + j, 11 - Math.abs(4 - j) - (frame && j % 2 ? 1 : 0), 1, 't');
  return rows(g);
}
function heart(full) {
  const g = grid(9, 8);
  const c = full ? 'x' : 'K';
  ['.cc...cc.', 'ccccccccc', 'ccccccccc', 'ccccccccc', '.ccccccc.', '..ccccc..', '...ccc...', '....c....']
    .forEach((r, j) => [...r].forEach((ch, i) => ch === 'c' && px(g, i, j, c)));
  if (full) { px(g, 2, 1, 'a'); px(g, 1, 2, 'a'); }
  return rows(g);
}
function brick() { // 16 x 16 ground block: grass lip over dirt bricks
  const g = grid(16, 16);
  rect(g, 0, 0, 16, 16, 'b'); rect(g, 0, 0, 16, 3, 'g'); rect(g, 0, 3, 16, 1, 'G');
  for (const y of [7, 11, 15]) rect(g, 0, y, 16, 1, 'B');
  for (const [x, y] of [[4, 4], [12, 4], [0, 8], [8, 8], [4, 12], [12, 12]]) rect(g, x, y, 1, 3, 'B');
  px(g, 3, 0, 'L'); px(g, 9, 0, 'L'); px(g, 14, 1, 'L');
  return rows(g);
}

export const LEVEL = {
  qblock: qblock(false), qblockUsed: qblock(true),
  power: { harvest: sack(), cash: coins(), school: bookStar() },
  storm: [stormCloud(0), stormCloud(1)], bill: [bill(0), bill(1)], sun: sun(), rain: rainCloud(),
  mascot: Object.fromEntries(['harvest', 'cash', 'school'].map(t => [t, [mascot(t, 0), mascot(t, 1)]])),
  landmark: { harvest: granary(), cash: bank(), school: SPR.school[0] },
  flag: [flagpole(0), flagpole(1)],
  heart: { full: heart(true), empty: heart(false) }, brick: brick(),
  kid: SPR.kids, kidSad: SPR.kidSad, house: SPR.house, cloud: SPR.cloud, tree: SPR.tree, bush: SPR.bush,
};
export { flip };

// --- rendering -------------------------------------------------------------------------------
// SVG for the DOM (cards, HUD), with an org colour for 't'/'T'.
export function svg(rowsIn, { team, cls = 'px', title } = {}) {
  const h = rowsIn.length, w = rowsIn[0].length;
  let out = '';
  rowsIn.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const c = row[x];
      if (c === '.') { x++; continue; }
      let n = 1;
      while (row[x + n] === c) n++;
      const fill = team && (c === 't' || c === 'T') ? (c === 't' ? team.t : team.T) : PAL[c] || c;
      out += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${fill}"/>`;
      x += n;
    }
  });
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges"${title ? ` role="img" aria-label="${title}"` : ' aria-hidden="true"'}>${out}</svg>`;
}

// Cached offscreen canvases for the level scenes.
const cache = new Map();
export function sprite(rowsIn, team) {
  const key = rowsIn.join('/') + (team ? team.t : '');
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = rowsIn[0].length; c.height = rowsIn.length;
  const x = c.getContext('2d');
  rowsIn.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    x.fillStyle = team && (ch === 't' || ch === 'T') ? team[ch] : PAL[ch] || ch;
    x.fillRect(i, j, 1, 1);
  }));
  cache.set(key, c);
  return c;
}
