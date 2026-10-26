// The Part 1 chart: one LED dot matrix, like a stadium scoreboard. Each team's line is its
// record of decisions, sharing one score axis: a month's column steps up after a right call
// and down (in red) after a wrong one, whether that was a missed slip or a needless
// intervention. Each line is one dot thick and the three share a three-dot band around the
// score's row, so equal scores read as one striped band instead of hiding each other.
export const P = 15, COLS = 82, ROWS = 40, MONTH = 20, ZERO = 19, UNIT = 4; // dots, dots per month, per point
export const W = COLS * P, H = ROWS * P;
const DODGE = [-1, 0, 1], BAD = '#ff3b2f', AXIS = '#f5efdc', OFF = '#5a564f', GROUND = '#141413';
export const rowOf = score => ZERO - score * UNIT;
export const colOf = m => 1 + m * MONTH;

// The dots a team's line lights, in drawing order. decisions: [{ right }] for decided months.
export function cellsFor(k, decisions, colour) {
  const cells = [], off = DODGE[k];
  let score = 0, r = rowOf(0) + off;
  decisions.forEach((d, m) => {
    score += d.right ? 1 : -1;
    const nr = rowOf(score) + off, x = colOf(m), step = d.right ? colour : BAD;
    for (let y = r; y !== nr; y += Math.sign(nr - r)) cells.push([x, y, step], [x + 1, y, step]);
    cells.push([x, nr, step], [x + 1, nr, step]);
    for (let c = x + 2; c < x + MONTH; c++) cells.push([c, nr, colour]);
    r = nr;
  });
  return { cells, end: [decisions.length ? colOf(decisions.length) : colOf(0), r] };
}

export class Led {
  constructor(canvas) {
    this.canvas = canvas; canvas.width = W; canvas.height = H;
    this.g = canvas.getContext('2d');
    this.bg = document.createElement('canvas'); this.bg.width = W; this.bg.height = H;
    const b = this.bg.getContext('2d');
    b.fillStyle = GROUND; b.fillRect(0, 0, W, H);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      b.fillStyle = r === ZERO && c % 2 === 0 ? AXIS : OFF;
      b.fillRect(c * P + 4, r * P + 4, 6, 6);
    }
    this.lines = []; // [{ cells, shown, t0 }]
  }
  // paths: [{ cells }] in team order. New dots light one after another.
  update(paths, now = performance.now()) {
    this.lines = paths.map((p, k) => {
      const old = this.lines[k], same = old && old.cells.length <= p.cells.length;
      const shown = same ? Math.min(old.cells.length, old.shown + Math.floor((now - old.t0) / 9)) : 0;
      return { cells: p.cells, shown, t0: now };
    });
  }
  frame(now) {
    const g = this.g;
    g.drawImage(this.bg, 0, 0);
    for (const line of this.lines) {
      const n = Math.min(line.cells.length, line.shown + Math.floor((now - line.t0) / 9));
      for (let i = 0; i < n; i++) {
        const [c, r, colour] = line.cells[i];
        if (r < 0 || r >= ROWS) continue;
        g.fillStyle = colour; g.fillRect(c * P + 1, r * P + 1, 12, 12);
      }
    }
  }
}
