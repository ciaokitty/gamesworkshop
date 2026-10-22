// Retro card faces for Households, shared by the projector and the audience phones.
// Icons and labels are SVG pixels (no web font needed offline). Each context colour
// also gets its own corner pattern, so cards stay distinguishable without colour names.
import { PAL, ICONS, FONT, COIN } from './village-sprites.js';

function rects(rows, fill) {
  let out = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const c = row[x];
      if (c === '.' || c === '0') { x++; continue; }
      let w = 1;
      while (row[x + w] === c) w++;
      out += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${fill ? fill(c) : PAL[c]}"/>`;
      x += w;
    }
  });
  return out;
}

const iconSvg = rows => `<svg viewBox="0 0 16 16" class="sym pixel" shape-rendering="crispEdges" aria-hidden="true">${rects(rows)}</svg>`;
export const pixelIcons = Object.fromEntries(Object.entries(ICONS).map(([category, values]) =>
  [category, Object.fromEntries(Object.entries(values).map(([value, rows]) => [value, iconSvg(rows)]))]));

// Budget coins replace the lightning bolts: gold while available, a dim ring once spent.
export const coin = available => available
  ? `<svg class="coin" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">${rects(COIN.full)}</svg>`
  : `<svg class="coin spent" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">${rects(COIN.spent, () => 'currentColor')}</svg>`;

// Readable text in the stage font (Jersey 10, households/assets/fonts) for the projector.
export const label = text => `<span class="plabel">${String(text).replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`)}</span>`;

export function pixelText(text) {
  const chars = [...String(text).toUpperCase()], rows = Array.from({ length: 5 }, () => '');
  chars.forEach((ch, i) => {
    const f = FONT[ch] || FONT['?'];
    for (let y = 0; y < 5; y++) rows[y] += f.slice(y * 3, y * 3 + 3) + (i < chars.length - 1 ? '0' : '');
  });
  return `<svg class="ptext" viewBox="0 0 ${rows[0].length} 5" style="--chars:${chars.length}" shape-rendering="crispEdges" aria-hidden="true">${rects(rows, () => 'currentColor')}</svg>`;
}

const PATTERNS = { // 5 x 5, one per context colour
  C01: ['11111', '11111', '11111', '11111', '11111'], // red: solid
  C02: ['11111', '00000', '11111', '00000', '11111'], // blue: rows
  C03: ['10101', '10101', '10101', '10101', '10101'], // amber: columns
  C04: ['10101', '01010', '10101', '01010', '10101'], // green: checks
  C05: ['10001', '01010', '00100', '01010', '10001'], // purple: cross
  C06: ['11111', '10001', '10101', '10001', '11111'], // pink: ring
};
export const contextMark = id => `<svg class="ctx-mark" viewBox="0 0 5 5" shape-rendering="crispEdges" aria-hidden="true">${rects(PATTERNS[id] || PATTERNS.C01, () => 'currentColor')}</svg>`;
