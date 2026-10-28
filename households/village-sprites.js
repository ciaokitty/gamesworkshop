// Pixel art for the Households village map. Sprites are rows of palette characters,
// drawn with a few shape helpers and auto-outlined, so they stay editable as text.
// Palette. One character per colour; '.' is transparent; 't'/'T' are swapped for the team colour.
export const PAL = {
  k:'#1b1720', K:'#3a3340', w:'#f4f1de', W:'#cfc9b0', s:'#d39a6a', S:'#a8704a', h:'#2b1e1a', H:'#4a3428',
  b:'#8a5a34', B:'#5e3b22', d:'#6b4a2e', p:'#3b4a6b', P:'#283350', r:'#c4573a', R:'#8e3a26',
  m:'#c9a074', M:'#9c7550', y:'#e0bb5c', Y:'#a8843a', g:'#6fa257', G:'#3f6e3a', L:'#a6cf6a',
  o:'#e8b93a', O:'#b98a22', c:'#c4c3b8', C:'#8b8a80', q:'#8cc3df', Q:'#4d7fa3', l:'#ffd77a',
  x:'#e0524a', X:'#9e2f2c', e:'#a8825a', E:'#7a5a3a', n:'#4f7fbf', N:'#34578a', z:'#a3acb5', Z:'#6b737c',
  j:'#ef8e3c', J:'#b8621f', v:'#3f8f6a', V:'#2a6a4c', u:'#4a90c8', a:'#ffffff', i:'#f7e08a',
  f:'#e7a7a0', F:'#b97a74', t:'#ff6b6b', T:'#b84545',
  A:'#b0703c', I:'#84522a', U:'#e48aa0', '1':'#2b2e4a', '2':'#454a72', '3':'#f2d34b', '4':'#e9dcc0', '5':'#d8c6a0', '6':'#a58ad0', '7':'#ecc490', '8':'#dfb47f'
};
export const TEAMS = [
  {id:'A', t:'#ff6b6b', T:'#b84545', name:'Cap'},
  {id:'B', t:'#2ec4b6', T:'#1d8278', name:'Pigtails'},
  {id:'C', t:'#ffbe0b', T:'#b88600', name:'Headband'},
  {id:'D', t:'#ff70a6', T:'#b8467a', name:'Beanie'}
];
// The TEAMS child each map lane shows. The trial run has a single household: the Beanie kid, in pink.
export const LOOK = new URLSearchParams(globalThis.location?.search).has('trial') ? [3] : [0, 1, 2];

// --- a tiny pixel canvas: draw with shapes, then auto-outline ---
function grid(w, h) { const g = Array.from({length:h}, () => Array(w).fill('.')); g.w = w; g.h = h; return g; }
function px(g, x, y, c) { if (x >= 0 && y >= 0 && x < g.w && y < g.h) g[y][x] = c; }
function rect(g, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(g, x + i, y + j, c); }
function hl(g, x, y, w, c) { rect(g, x, y, w, 1, c); }
function vl(g, x, y, h, c) { rect(g, x, y, 1, h, c); }
function disc(g, cx, cy, r, c) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(g, cx + x, cy + y, c); }
function stamp(g, rows, x, y) { rows.forEach((row, j) => [...row].forEach((c, i) => { if (c !== '.') px(g, x + i, y + j, c); })); }
function outline(g, c = 'k') {
  const add = [];
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (g[y][x] !== '.') continue;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const n = g[y + dy]?.[x + dx];
      if (n && n !== '.' && n !== c) { add.push([x, y]); break; }
    }
  }
  for (const [x, y] of add) g[y][x] = c;
  return g;
}
const rows = g => g.map(r => r.join(''));

// --- kids: 14 x 20, facing right, backpack on the back ---
const HEADS = {
  A: [ // cap
    '..............',
    '.....tttt.....',
    '....tttttt....',
    '....tttwttt...',
    '....TTTTTTTTT.',
    '....hhsssss...',
    '....hhssksss..',
    '....hsssssS...',
    '.....hSsSs....'],
  B: [ // pigtails with ribbons
    '.....hhhh.....',
    '....hhhhhh....',
    '...hhhhhhhh...',
    '..thhhhhsss...',
    '.tthhhssssss..',
    '..hhhsssksss..',
    '.hh.hsssssS...',
    '.t...hSsSs....',
    '..............'],
  C: [ // headband with tails
    '..............',
    '.....hhhh.....',
    '....hhhhhhh...',
    '..ttttttttt...',
    '.tt.hhsssss...',
    '.t..hhssksss..',
    '....hsssssS...',
    '.....hSsSs....',
    '..............'],
  D: [ // beanie and glasses
    '......ww......',
    '.....tttt.....',
    '....tttttt....',
    '....wtwtwtw...',
    '....hhsssss...',
    '....hhkkskkk..',
    '....hskqkkqk..',
    '....hsssssS...',
    '.....hSsSs....']
};
const TORSO = [
  '...bbb.ttt....',
  '..bbbbbtttts..',
  '..bBBbbttttsS.',
  '..bBBbbtttt...',
  '..bbbbbtttt...',
  '...bb..pppp...'];
const LEGS = [
  ['......pppp....', '.....pp..pp...', '.....pp..pp...', '.....KK..KKK..', '..............'], // stand
  ['.....ppppp....', '....pp...pp...', '...pp.....pp..', '..KKK.....KKK.', '..............'], // stride
  ['......pppp....', '......pPpp....', '......pPp.....', '......KKKK....', '..............'], // pass
  ['.....ppppp....', '....PP...pp...', '...PP.....pp..', '..KKK.....KKK.', '..............']  // stride, other leg
];
function kid(team, frame) {
  const g = grid(14, 21);
  stamp(g, HEADS[team], 0, 0);
  stamp(g, TORSO, 0, 9);
  stamp(g, LEGS[frame], 0, 15);
  return rows(outline(g));
}
// Sitting on the ground facing right, bag behind; frame 1 hugs one knee up.
const SIT_LEGS = [
  ['..bbbbbtttt....', '...bb.ppppppp...', '......pppppppKK.'],
  ['...........pp..', '..........ppp..', '..bbbbbttttpp...', '...bb.pppp..pp..', '......pppp..KKK.']];
function kidSit(team, frame) {
  const g = grid(16, 21);
  stamp(g, HEADS[team], 0, 3);
  stamp(g, TORSO.slice(0, 4), 0, 12);
  stamp(g, SIT_LEGS[frame], 0, 19 - SIT_LEGS[frame].length);
  return rows(outline(g));
}
function kidSad(team) { // stopped, head down, bag dropped
  const g = grid(14, 21);
  const head = HEADS[team].map(r => r.replace('k', 's'));
  stamp(g, head, 0, 1);
  stamp(g, ['.......tttt...', '......ttttt...', '......tttts...', '......tttts...', '......tttt....', '.......pppp...'], 0, 10);
  stamp(g, LEGS[0].slice(0, 4), 0, 16);
  return rows(outline(g));
}
function bag() { const g = grid(8, 7); stamp(g, ['.bbbb.', 'bBBBBb', 'bbbbbb', 'bBttBb', 'bbbbbb'], 1, 1); return g; }

// --- households ---
function hut() { // A: thatched mud hut
  const g = grid(36, 31);
  rect(g, 7, 15, 22, 14, 'm'); rect(g, 7, 15, 2, 14, 'M'); hl(g, 7, 28, 22, 'M');
  for (const [x, y] of [[12, 17], [16, 22], [23, 18], [26, 24], [10, 25], [21, 16], [14, 26]]) px(g, x, y, 'M');
  hl(g, 7, 26, 22, 'w'); for (let x = 8; x < 29; x += 3) px(g, x, 26, 'r');
  rect(g, 20, 19, 5, 9, 'B'); vl(g, 19, 18, 10, 'd'); vl(g, 25, 18, 10, 'd'); hl(g, 19, 18, 7, 'd');
  rect(g, 20, 19, 5, 3, 't'); px(g, 20, 22, 't'); px(g, 24, 22, 't');
  rect(g, 10, 19, 5, 4, 'B'); hl(g, 9, 18, 7, 'd'); hl(g, 9, 23, 7, 'd'); vl(g, 12, 19, 4, 'd'); px(g, 11, 20, 'l'); px(g, 13, 21, 'l');
  for (let y = 2; y <= 15; y++) {
    const half = Math.round((y - 2) * 16 / 13) + 1;
    for (let x = 18 - half; x < 18 + half; x++) px(g, x, y, (y % 4 === 1 || (x * 7 + y) % 9 === 0) ? 'Y' : 'y');
  }
  for (let x = 2; x < 34; x++) { px(g, x, 16, 'Y'); if (x % 2) px(g, x, 17, 'Y'); }
  rect(g, 17, 0, 2, 3, 'Y');
  stamp(g, ['.rr.', 'rRRr', 'rrrr', '.RR.'], 29, 25);
  return rows(outline(g));
}
function tiled() { // B: whitewashed house with clay tiles and a blue plinth
  const g = grid(36, 31);
  rect(g, 5, 14, 26, 15, 'w'); vl(g, 5, 14, 15, 'W'); vl(g, 6, 14, 15, 'W');
  rect(g, 5, 25, 26, 4, 'n'); hl(g, 5, 25, 26, 'N');
  for (let y = 4; y <= 13; y++) {
    const inset = Math.max(0, 13 - y) + 2;
    for (let x = inset; x < 36 - inset; x++) px(g, x, y, ((x + (y % 2) * 2) % 4 === 0) ? 'R' : 'r');
  }
  hl(g, 2, 13, 32, 'R'); hl(g, 11, 4, 14, 'R');
  rect(g, 15, 17, 6, 12, 'n'); rect(g, 16, 18, 4, 4, 'N'); rect(g, 16, 23, 4, 4, 'N'); vl(g, 18, 17, 12, 'N'); px(g, 19, 23, 'o');
  for (let x = 14; x < 22; x++) px(g, x, 16, x % 2 ? 'j' : 'g'); px(g, 14, 17, 'j'); px(g, 21, 17, 'g');
  for (const wx of [8, 24]) { rect(g, wx, 17, 5, 5, 'N'); rect(g, wx + 1, 18, 3, 3, 'q'); px(g, wx + 2, 18, 'Q'); px(g, wx + 2, 20, 'Q'); hl(g, wx + 1, 19, 3, 'Q'); hl(g, wx - 1, 22, 7, 'W'); }
  stamp(g, ['.gLg.', 'gGgLg', '.gGg.', '..b..', 'rrrrr', 'RrrrR', '.rrr.'], 31, 22);
  rect(g, 9, 1, 3, 4, 'C'); hl(g, 9, 1, 3, 'K');
  return rows(outline(g));
}
function pucca() { // C: two-storey concrete house, water tank, washing on the terrace
  const g = grid(36, 33);
  rect(g, 4, 19, 27, 12, 'f'); vl(g, 4, 19, 12, 'F'); hl(g, 4, 30, 27, 'F');
  rect(g, 4, 7, 17, 12, 'f'); vl(g, 4, 7, 12, 'F');
  hl(g, 3, 6, 19, 'w'); hl(g, 3, 18, 29, 'w');
  for (let x = 22; x < 31; x += 2) vl(g, x, 15, 3, 'w'); hl(g, 21, 14, 11, 'w');
  hl(g, 22, 10, 9, 'C'); vl(g, 30, 10, 4, 'C');
  stamp(g, ['ttt.qq.oo', 'ttt.qq.oo', '.t..qq...'], 22, 11);
  rect(g, 7, 1, 7, 5, 'K'); hl(g, 7, 1, 7, 'Z'); vl(g, 8, 2, 3, 'Z'); hl(g, 6, 5, 9, 'C');
  for (const [wx, wy] of [[7, 9], [14, 9], [7, 21], [24, 21]]) { rect(g, wx, wy, 5, 5, 'q'); px(g, wx, wy, 'Q'); for (let i = 0; i < 5; i += 2) vl(g, wx + i, wy, 5, 'K'); hl(g, wx - 1, wy + 5, 7, 'w'); }
  rect(g, 15, 22, 6, 9, 'v'); vl(g, 18, 22, 9, 'V'); hl(g, 15, 22, 6, 'V'); px(g, 17, 26, 'o'); px(g, 19, 26, 'o');
  rect(g, 13, 31, 10, 1, 'c'); stamp(g, ['.G.', 'GgG', 'rrr', '.r.'], 31, 27);
  return rows(outline(g));
}
function tin() { // D: ochre house with a tin roof and a haystack
  const g = grid(38, 31);
  rect(g, 13, 14, 22, 15, 'e'); vl(g, 13, 14, 15, 'E'); hl(g, 13, 26, 22, 'w'); hl(g, 13, 28, 22, 'E');
  for (let x = 15; x < 35; x += 4) px(g, x, 27, 'w');
  for (let y = 7; y <= 13; y++) { const s = 11 + Math.round((13 - y) * 0.4); for (let x = s; x < 37; x++) px(g, x, y, (x % 2) ? 'Z' : 'z'); }
  hl(g, 10, 13, 27, 'Z');
  rect(g, 25, 18, 5, 10, 'b'); rect(g, 26, 19, 3, 3, 'B'); rect(g, 26, 23, 3, 4, 'B'); px(g, 28, 22, 'o');
  rect(g, 16, 18, 5, 4, 'B'); hl(g, 15, 17, 7, 'd'); hl(g, 15, 22, 7, 'd'); vl(g, 18, 18, 4, 'd'); px(g, 17, 19, 'l');
  for (let y = 12; y <= 28; y++) { const half = Math.min(6, Math.round((y - 12) * 0.55) + 1); for (let x = 7 - half; x < 7 + half; x++) px(g, x, y, ((x + y) % 5 === 0) ? 'Y' : 'y'); }
  vl(g, 6, 8, 5, 'b'); hl(g, 1, 28, 12, 'Y');
  rect(g, 31, 4, 2, 4, 'C');
  return rows(outline(g));
}

function cottage() { // trial home: small whitewashed cottage with a brown roof and woodwork
  const g = grid(30, 26);
  for (let y = 3; y <= 11; y++) {
    const inset = 11 - y + 1;
    for (let x = inset; x < 30 - inset; x++) px(g, x, y, ((x + (y % 2) * 2) % 4 === 0) ? 'B' : 'b');
  }
  hl(g, 9, 3, 12, 'B'); hl(g, 0, 11, 30, 'B');
  rect(g, 21, 0, 3, 5, 'W'); hl(g, 21, 0, 3, 'B');
  rect(g, 4, 12, 22, 12, 'w'); vl(g, 4, 12, 12, 'W'); vl(g, 5, 12, 12, 'W'); hl(g, 4, 23, 22, 'W');
  vl(g, 4, 12, 12, 'b'); vl(g, 25, 12, 12, 'b'); hl(g, 4, 12, 22, 'B');
  rect(g, 16, 15, 6, 9, 'b'); rect(g, 17, 16, 4, 3, 'B'); rect(g, 17, 20, 4, 3, 'B'); px(g, 20, 19, 'o');
  rect(g, 8, 15, 5, 5, 'B'); rect(g, 9, 16, 3, 3, 'q'); px(g, 10, 16, 'B'); px(g, 10, 18, 'B'); hl(g, 9, 17, 3, 'B'); hl(g, 7, 20, 7, 'b');
  stamp(g, ['.f.', 'fGf', 'bbb'], 7, 21);
  hl(g, 15, 24, 8, 'c');
  return rows(outline(g));
}

// --- school ---
export const FONT = {
  A:'010101111101101', B:'110101110101110', C:'011100100100011', D:'110101101101110', E:'111100110100111', F:'111100110100100',
  G:'011100101101011', H:'101101111101101', I:'111010010010111', J:'001001001101010', K:'101101110101101', L:'100100100100111',
  M:'101111111101101', N:'110101101101101', O:'010101101101010', P:'110101110100100', Q:'010101101110011', R:'110101110101101',
  S:'011100010001110', T:'111010010010010', U:'101101101101111', V:'101101101101010', W:'101101111111101', X:'101101010101101',
  Y:'101101010010010', Z:'111001010100111', 0:'111101101101111', 1:'010110010010111', 2:'110001010100111', 3:'110001010001110',
  4:'101101111001001', 5:'111100110001110', 6:'011100111101111', 7:'111001010010010', 8:'111101111101111', 9:'111101111001110',
  ' ':'000000000000000', '/':'001001010100100', '.':'000000000000010', '-':'000000111000000', ':':'000010000010000', '!':'010010010000010', '?':'110001010000010'
};
function text(g, str, x, y, c) {
  for (const ch of str.toUpperCase()) { const f = FONT[ch] || FONT['?']; for (let i = 0; i < 15; i++) if (f[i] === '1') px(g, x + (i % 3), y + Math.floor(i / 3), c); x += 4; }
}
function school(wave = 0, pole = true) { // Households drops the flagpole; Extended Households keeps it
  const g = grid(84, 60);
  rect(g, 10, 27, 66, 25, 'w'); rect(g, 10, 27, 3, 25, 'W'); rect(g, 10, 44, 66, 8, 'v'); hl(g, 10, 44, 66, 'V'); hl(g, 10, 27, 66, 'v');
  for (let y = 17; y <= 26; y++) { const inset = Math.max(0, 26 - y) + 6; for (let x = inset; x < 86 - inset; x++) px(g, x, y, ((x + (y % 2) * 2) % 4 === 0) ? 'R' : 'r'); }
  hl(g, 6, 26, 74, 'R');
  rect(g, 34, 6, 18, 20, 'w'); vl(g, 34, 6, 20, 'W');
  for (let y = 0; y <= 6; y++) for (let x = 43 - y - 3; x <= 43 + y + 2; x++) px(g, x, y, ((x + y) % 3 === 0) ? 'R' : 'r');
  hl(g, 32, 6, 22, 'R');
  rect(g, 38, 9, 10, 9, 'K'); rect(g, 39, 9, 8, 1, 'K'); vl(g, 43, 9, 2, 'C');
  stamp(g, ['..oo..', '.oooo.', '.oOoo.', 'oooooo', '..O...'], 40, 11);
  rect(g, 30, 29, 26, 9, 'v'); hl(g, 30, 29, 26, 'V'); hl(g, 30, 37, 26, 'V'); text(g, 'SCHOOL', 32, 31, 'w');
  for (const wx of [14, 23, 59, 68]) { rect(g, wx, 31, 6, 8, 'V'); rect(g, wx + 1, 32, 4, 6, 'q'); vl(g, wx + 2, 32, 6, 'K'); vl(g, wx + 4, 32, 6, 'K'); px(g, wx + 1, 32, 'a'); }
  rect(g, 37, 39, 12, 13, 'V'); rect(g, 38, 40, 4, 12, 'v'); rect(g, 44, 40, 4, 12, 'v'); px(g, 42, 46, 'o'); px(g, 44, 46, 'o');
  rect(g, 4, 52, 33, 4, 'c'); rect(g, 49, 52, 33, 4, 'c'); hl(g, 4, 52, 33, 'a'); hl(g, 49, 52, 33, 'a');
  for (let x = 6; x < 37; x += 6) vl(g, x, 52, 4, 'C'); for (let x = 51; x < 82; x += 6) vl(g, x, 52, 4, 'C');
  rect(g, 34, 49, 3, 8, 'C'); rect(g, 49, 49, 3, 8, 'C'); px(g, 35, 48, 'o'); px(g, 50, 48, 'o');
  if (!pole) return rows(outline(g));
  vl(g, 2, 2, 54, 'C'); px(g, 2, 1, 'o');
  const flag = wave ? ['jjjjjjj.', 'jwwjwwjj', 'jwwjwwjj', 'jjwwwjj.', 'jjjjj...'] : ['jjjjjjjj', 'jwwjwwjj', 'jwwjwwjj', 'jjwwwjjj', 'jjjjjjj.'];
  stamp(g, flag, 3, 2);
  return rows(outline(g));
}

// --- support camp (intervention) ---
function camp(beat = 0) {
  const g = grid(24, 23);
  for (let x = 2; x < 22; x++) for (let y = 4; y < 9; y++) px(g, x, y, (Math.floor(x / 2) % 2) ? 'w' : 'x');
  for (let x = 2; x < 22; x++) if (Math.floor(x / 2) % 2 === 0) px(g, x, 9, 'x'); else px(g, x, 9, 'w');
  for (let x = 1; x < 23; x++) px(g, x, 3, 'X');
  vl(g, 3, 10, 11, 'b'); vl(g, 20, 10, 11, 'b');
  stamp(g, ['..hhh..', '.hhhhh.', '.hssss.', '.hssks.', '..sss..', '.vvvvv.', 'vvvvvvv'], 9, 9);
  rect(g, 5, 15, 14, 2, 'b'); hl(g, 5, 15, 14, 'd'); vl(g, 6, 17, 4, 'B'); vl(g, 17, 17, 4, 'B');
  stamp(g, ['qqq', 'ooo', 'xxx'], 7, 12); stamp(g, ['ww', 'ww'], 15, 13);
  const heart = beat ? ['.xx.xx.', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'] : ['.......', '.xx.xx.', '.xxxxx.', '..xxx..', '...x...', '.......'];
  rect(g, 8, 0, 8, 7, 'w'); stamp(g, heart, 8, 0);
  return rows(outline(g));
}

// --- hedgehog: after a 16 x 12 pixel-art reference, shrunk to 12 x 9; outlined in dark brown, not black ---
const HEDGEHOG = [ // facing left: two spike tips, bead eye level with the nose, pale belly
  '.....h.h....',
  '....hbhbhh..',
  '..hHbBbdbBh.',
  '..hbdbBdbdBh',
  '.h77HbdBdBdh',
  '.7777HdBdBdh',
  'kk7k77HdHddh',
  '.h8888888Hh.'];
const hedgehog = frame => [...HEDGEHOG, frame ? '...h..H..H..' : '..hh.H..H...']; // frame swaps the feet for a trot
const HEDGEHOG_BALL = ['..h.h....', '.hbhbhh..', 'hbBbdbBh.', 'hdbBdbdBh', 'hBdbdBdbh', '.hdBdBdh.', '..hhhhh..']; // curled up mid-hop
const mirror = r => r.map(row => [...row].reverse().join(''));

// --- scenery ---
function tree(seed = 0) {
  const g = grid(22, 26);
  rect(g, 10, 15, 3, 10, 'b'); vl(g, 12, 15, 10, 'B'); px(g, 9, 24, 'b'); px(g, 13, 24, 'B'); px(g, 9, 17, 'b');
  const blobs = seed ? [[7, 9, 5], [14, 8, 5], [11, 5, 5], [11, 12, 5]] : [[6, 10, 5], [15, 10, 5], [10, 6, 5], [12, 12, 4]];
  for (const [x, y, r] of blobs) disc(g, x, y, r, 'g');
  for (const [x, y, r] of blobs) { disc(g, x + 1, y + 1, r - 2, 'G'); }
  for (const [x, y, r] of blobs) { disc(g, x, y, r - 2, 'g'); disc(g, x - 1, y - 1, Math.max(1, r - 4), 'L'); }
  return rows(outline(g));
}
function sapling(seed = 0) { // young neem for the lanes, small enough to keep clear of children and camps
  const g = grid(14, 18);
  rect(g, 6, 11, 2, 6, 'b'); vl(g, 7, 11, 6, 'B'); px(g, 5, 16, 'b'); px(g, 8, 16, 'B');
  const blobs = seed ? [[5, 6, 3], [9, 6, 3], [7, 4, 3], [7, 8, 3]] : [[4, 7, 3], [9, 7, 3], [7, 4, 3]];
  for (const [x, y, r] of blobs) disc(g, x, y, r, 'g');
  for (const [x, y, r] of blobs) disc(g, x + 1, y + 1, r - 1, 'G');
  for (const [x, y, r] of blobs) { disc(g, x, y, r - 1, 'g'); px(g, x - 1, y - 1, 'L'); }
  return rows(outline(g));
}
function bush() { const g = grid(12, 8); disc(g, 4, 4, 3, 'g'); disc(g, 7, 4, 3, 'g'); disc(g, 5, 3, 1, 'L'); px(g, 8, 5, 'G'); px(g, 3, 5, 'G'); return rows(outline(g)); }
function handpump() {
  const g = grid(14, 16);
  rect(g, 5, 4, 3, 9, 'C'); vl(g, 5, 4, 9, 'Z'); rect(g, 4, 2, 5, 2, 'Z'); hl(g, 8, 6, 3, 'Z'); px(g, 10, 7, 'Z');
  hl(g, 7, 2, 1, 'Z'); for (let i = 0; i < 5; i++) px(g, 9 + i, 2 - Math.floor(i / 2) + 1, 'Z');
  rect(g, 2, 13, 10, 2, 'c'); hl(g, 2, 13, 10, 'a'); px(g, 10, 9, 'u'); px(g, 10, 11, 'u');
  return rows(outline(g));
}
function well() {
  const g = grid(16, 16);
  vl(g, 2, 1, 9, 'b'); vl(g, 13, 1, 9, 'b'); hl(g, 1, 1, 14, 'B'); vl(g, 8, 2, 4, 'K'); rect(g, 7, 5, 3, 2, 'C');
  rect(g, 1, 8, 14, 7, 'c'); for (let y = 8; y < 15; y += 2) for (let x = 1 + (y % 4 ? 0 : 2); x < 15; x += 4) px(g, x, y, 'C');
  hl(g, 1, 8, 14, 'a'); hl(g, 3, 9, 10, 'Q');
  return rows(outline(g));
}
function cloud() { const g = grid(26, 10); disc(g, 7, 6, 3, 'w'); disc(g, 12, 4, 4, 'w'); disc(g, 18, 6, 3, 'w'); rect(g, 5, 7, 16, 2, 'w'); hl(g, 5, 8, 16, 'W'); return rows(g); }
const BIRD = [['k...k', '.k.k.', '..k..'], ['.....', 'kk.kk', '..k..']];
const STAR = ['....a....', '....i....', '...iai...', 'iiiaaaiii', '.iiaaaii.', '..iiaii..', '.ii...ii.', '.i.....i.', '.........'];

// Seasonal paddy tiles, 12 x 10, one per month: flooded, growing, ripening, harvested. Every lane shows the same fields,
// so the scenery marks time and never reveals a household's cards.
export const FIELDS = [
  ['EEEEEEEEEEEE','eeeeeeeeeeee','eeeEeeeeeEee','EEEEEEEEEEEE','eeeeeeeeeeee','eeEeeeeEeeee','EEEEEEEEEEEE','eeeeeeeeeeee','eeeeeEeeeeee','EEEEEEEEEEEE'],
  ['.L..L..L..L.','LgL.gL.gLLg.','gGg.gg.gGgg.','eeeeeeeeeeee','..L..L..L..L','.LgL.gL.gLLg','.gGg.gg.gGgg','eeeeeeeeeeee','.L..L..L..L.','LgLLgLLgLLgL'],
  ['o..o..o..o..','oOo.oOooOo.o','OgoOoOgoOoOo','gOgoOgoOgoOg','oGoOgOoGoOgO','GoGgoGgoGgoG','gGoGgGoGgGoG','GgGGgGGgGGgG','gGGgGGgGGgGG','EEEEEEEEEEEE'],
  ['............','.Y..Y...Y..Y','.Y.YY.Y.Y.YY','eeeeeeeeeeee','...Y...Y..Y.','Y.YY.Y.YY.Y.','eeeeeeeeeeee','.Y...Y..Y...','YY.Y.Y.YY.Y.','eeeeeeeeeeee']
];

// --- card icons, 16 x 16: the Households card faces ---
// Each factor shows how much is left, so the three states read as a ladder from across the room.
// Harvest is the pixel copy of the original line icon (assets/icons.json): slanted grain blocks, or a drooping stalk.
const GRAIN = ['.ioo', 'iooO', 'iooO', 'iooO', 'iooO', 'iooO', 'iooO', 'ooO.'];
function iconHarvest(v) { // three grain blocks, the middle one raised / two staggered blocks / a dry stalk bent over
  const g = grid(16, 16);
  if (v === 'good') { stamp(g, GRAIN, 1, 6); stamp(g, GRAIN, 6, 3); stamp(g, GRAIN, 11, 6); }
  else if (v === 'weak') { stamp(g, GRAIN, 3, 4); stamp(g, GRAIN, 9, 6); }
  else {
    rect(g, 3, 4, 2, 11, 'e'); vl(g, 4, 4, 11, 'E');
    hl(g, 5, 2, 4, 'e'); hl(g, 4, 3, 6, 'e'); hl(g, 5, 3, 4, 'E');
    rect(g, 9, 3, 2, 3, 'e'); vl(g, 10, 3, 3, 'E');
    stamp(g, ['YYYYYY', 'YYYYYE', 'YYYYYE', 'YYYYYE', '.YYYE.', '..YE..'], 7, 6);
  }
  return rows(outline(g));
}
function note(g, x, y) { // a 12 x 5 banknote: dark border, light centre medallion
  rect(g, x, y, 12, 5, 'g'); hl(g, x, y, 12, 'G'); hl(g, x, y + 4, 12, 'G'); vl(g, x, y, 5, 'G'); vl(g, x + 11, y, 5, 'G');
  rect(g, x + 5, y + 1, 2, 3, 'L'); px(g, x + 2, y + 2, 'L'); px(g, x + 9, y + 2, 'L');
}
function iconCash(v) { // a thick bundle of notes / one thin note / an empty wallet with a red minus
  const g = grid(16, 16);
  if (v === 'enough') {
    for (let y = 14; y >= 9; y--) hl(g, 2, y, 12, y % 2 ? 'G' : 'g');
    note(g, 2, 5);
    rect(g, 7, 5, 2, 10, 'w'); vl(g, 8, 5, 10, 'W');
  } else if (v === 'low') note(g, 2, 10);
  else {
    rect(g, 2, 8, 12, 7, 'b'); hl(g, 2, 14, 12, 'B'); vl(g, 13, 8, 7, 'B');
    rect(g, 3, 6, 10, 3, 'B'); rect(g, 4, 7, 8, 2, 'K');
    px(g, 11, 11, 'o');
    rect(g, 10, 1, 5, 2, 'x');
  }
  return rows(outline(g));
}
function iconAttendance(v) { // an attendance record of four school days: all ticks / two missed / all crosses
  const g = grid(16, 16), tick = ['....V', '...VV', 'V.VV.', 'VVV..', '.V...'], cross = ['x...x', 'xx.xx', '.xxx.', 'xx.xx', 'x...x'];
  const days = { regular: '1111', irregular: '1001', dropout: '0000' }[v];
  rect(g, 1, 1, 14, 14, 'w'); rect(g, 1, 1, 14, 2, 'n');
  [...days].forEach((d, i) => stamp(g, d === '1' ? tick : cross, 2 + (i % 2) * 7, 4 + Math.floor(i / 2) * 6));
  return rows(outline(g));
}
function iconWeather(v) {
  const g = grid(16, 16);
  if (v === 'sun') { disc(g, 8, 8, 4, 'o'); disc(g, 7, 7, 2, 'i'); for (const [x, y] of [[8, 1], [8, 15], [1, 8], [15, 8], [3, 3], [13, 3], [3, 13], [13, 13]]) px(g, x, y, 'o'); }
  else { disc(g, 6, 6, 3, 'W'); disc(g, 10, 5, 4, 'W'); rect(g, 3, 7, 11, 3, 'W'); hl(g, 3, 9, 11, 'C');
    if (v === 'rain') for (const [x, y] of [[4, 12], [7, 13], [10, 12], [13, 13], [5, 15], [11, 15]]) px(g, x, y, 'u');
    else stamp(g, ['..o..', '.oo..', 'oooo.', '..oo.', '..o..', '.o...'], 6, 10); }
  return rows(g);
}

// --- budget coin, 14 x 14: a full coin per remaining reveal or consultation, a ring once spent ---
function coin(spent) {
  const g = grid(12, 12), d = (x, y) => Math.hypot(x - 5.5, y - 5.5), inside = (x, y) => d(x, y) <= 6;
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    if (!inside(x, y)) continue;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !inside(x + dx, y + dy)), r = d(x, y);
    if (spent) { if (edge) px(g, x, y, 'C'); continue; }
    let c = 'o';
    if (edge) c = 'J';
    else if (r >= 3.4 && r <= 4.3) c = 'O';                          // embossed rim
    else if (r > 4.3 && x + y <= 8) c = 'i';                          // light from the top left
    else if (r > 4.3 && x + y >= 14) c = 'O';                         // shade bottom right
    if (!edge && (x === 5 || x === 6) && y >= 4 && y <= 7) c = x === 5 ? 'O' : 'J'; // slot
    px(g, x, y, c);
  }
  if (!spent) px(g, 3, 2, 'a');
  return rows(g);
}

// --- village animals, drawn after the reference sprites; '.' transparent, auto-outlined ---
const ani = (rows, w = Math.max(...rows.map(r => r.length)), h = rows.length) => { const g = grid(w + 2, h + 2); stamp(g, rows, 1, 1); return rows_(outline(g)); };
const rows_ = g => g.map(r => r.join(''));
const DOG_SIT = [
  '.........AAA...',
  '........AAAAAA.',
  '.......AAAAkAAkk',
  '.......AIAAAAkk',
  '......AAIAAAAA.',
  '......AAIAAAU..',
  '.....AAAIIAAA..',
  '....AAAAAAAAA..',
  '.A..AAAAAAAAA..',
  'AA.AAAAAAAAAA..',
  'AAAAAAAAIAAIAA.',
  '.AAAAAAAAIAIAA.'];
const CAT = { // compact body, round head, tail curling up behind
  idle: ['........1..1', '1.......1111', '1.......1313', '.1.122211111', '..11111111..', '..1111111...', '..1.1..1.1..'],
  crouch: ['............', '........1..1', '11......1111', '..1.....1313', '..1222111111', '.11111111111', '.1.1....1.1.'],
  jump: ['..........1..1', '..........1111', '..........1313', '1......111111.', '.1..12221111..', '..1111111.....', '.11..11.......'],
  run: ['........1..1', '1.......1111', '.1......1313', '..12221111..', '.111111111..', '1...1..1...1', '............']
};
const COW = [
  '..5......5.....',
  '..wwwwwwwww....',
  '.wKwwwwwwwKw...',
  '..wwkwwwkww....',
  '..wfffffffwwwww',
  '..wfkfffkfwKKww',
  '...fffffffwKKKw',
  '....wwwwwwwwwKw',
  '....wKKwwwwwwww',
  '....ww.ww..ww.w',
  '....CC.CC..CC.C'];
const HEN = [
  '...xx.......',
  '..xxx.......',
  '..www.......',
  '.owkw......w',
  '..xww.....ww',
  '..wwwwwwwwww',
  '..wwWWWWwwww',
  '...wwwWWww..',
  '....wwwww...',
  '.....o..o...'];
const ROOSTER = [
  '..xx.....G.',
  '.xxx....GG.',
  '.rrr...G.GG',
  'orkr...GGG.',
  '.xrr..GGG..',
  '..rrrrrrGG.',
  '..rjjjjrr..',
  '...rjjrrr..',
  '....rrrr...',
  '.....o.o...'];
const HEN_PECK = [
  '............',
  '............',
  '...........w',
  '..........ww',
  '...wwwwwwwww',
  '..xwwWWWWwww',
  '.xxwwwwWWww.',
  'xwkw.wwwww..',
  'ox...wwwww..',
  '.....o..o...'];
const CHICK = ['.ii.', 'oik.', '.iii', '.iiI'.replace('I', 'i'), '.o.o'];
function tweak(rows, edits) { const g = rows.map(r => [...r]); for (const [x, y, c] of edits) { if (g[y]) g[y][x] = c; } return g.map(r => r.join('')); }
export const ANIMALS = {
  dogSit: [ani(DOG_SIT), ani(tweak(DOG_SIT, [[0, 9, '.'], [0, 8, 'A'], [1, 8, 'A'], [1, 9, '.']]))],
  hedgehog: { walk: [hedgehog(0), hedgehog(1)], right: [mirror(hedgehog(0)), mirror(hedgehog(1))], ball: HEDGEHOG_BALL },
  cat: Object.fromEntries(Object.entries(CAT).map(([k, r]) => [k, ani(r)])),
  cow: [ani(COW), ani(tweak(COW, [[14, 9, '.'], [14, 8, '.'], [14, 7, 'w'], [14, 10, '.']]))],
  cowBrown: [COW, tweak(COW, [[14, 9, '.'], [14, 8, '.'], [14, 7, 'w'], [14, 10, '.']])].map(r => ani(r.map(row => row.replace(/w/g, 'A').replace(/K/g, 'I').replace(/f/g, 'm')))),
  hen: [ani(HEN), ani(HEN_PECK)],
  rooster: [ani(ROOSTER), ani(tweak(ROOSTER, [[0, 3, '.'], [0, 2, 'o'], [1, 0, 'x'], [4, 0, 'x']]))],
  chick: [ani(CHICK), ani(tweak(CHICK, [[0, 1, '.'], [0, 2, 'o'], [1, 0, '.'], [1, 1, 'i']]))]
};
// Two dogs at play in the school yard: run (two strides) and a play bow.
const PUP = {
  run: ['........AA..', '.......AAAA.', 'A......AkAAk', '.A.AAAAAAAA.', '..AAAAAAAA..', '..AAAAAAA...', '.AA....AA...'],
  run2: ['........AA..', '.......AAAA.', '.A.....AkAAk', 'A..AAAAAAAA.', '..AAAAAAAA..', '..AAAAAAA...', '...AA.AA....'],
  bow: ['A...........', '.A..........', '.AAA........', '.AAAAA..AA..', '..AAAAAAAAA.', '..AA.AAAkAAk', '..AA.AAAAAA.']
};
const pupColour = (rows, body, patch) => rows.map(r => r.replace(/A/g, body)).map((r, i) => i === 4 ? r.replace(body + body + body, patch + patch + body) : r); // cream pup with a brown patch
export const PUPS = [
  Object.fromEntries(Object.entries(PUP).map(([k, r]) => [k, ani(r)])),
  Object.fromEntries(Object.entries(PUP).map(([k, r]) => [k, ani(pupColour(r, '4', 'I'))]))
];

// Small flower clumps for the lanes: marigold, white daisy, pink.
export const FLOWERS = [
  ['.j...j.', 'jJj.jJj', '.jG.Gj.', '..GGG..'],
  ['..w.w..', '.wiwiw.', '..wGw..', '...G...'],
  ['.f.f.', 'fFfFf', '.fGf.', '..G..']
];

// --- build the sprite catalogue ---
export const SPR = {
  house: [hut(), tiled(), pucca(), tin()],
    school: [school(0), school(1)], schoolNoFlag: school(0, false),
  camp: [camp(0), camp(1)],
  kids: Object.fromEntries(['A', 'B', 'C', 'D'].map(t => [t, [0, 1, 2, 3].map(f => kid(t, f))])),
  kidSad: Object.fromEntries(['A', 'B', 'C', 'D'].map(t => [t, kidSad(t)])),
  kidSit: Object.fromEntries(['A', 'B', 'C', 'D'].map(t => [t, [0, 1].map(f => kidSit(t, f))])),
  cottage: cottage(),
  bag: rows(outline(bag())),
  tree: [tree(0), tree(1)], sapling: [sapling(0), sapling(1)], bush: bush(), well: well(), handpump: handpump(), cloud: cloud(), bird: BIRD, star: STAR
};

export const ICONS = {
  harvest: {good: iconHarvest('good'), weak: iconHarvest('weak'), failed: iconHarvest('failed')},
  cash: {enough: iconCash('enough'), low: iconCash('low'), loan: iconCash('loan')},
  attendance: {regular: iconAttendance('regular'), irregular: iconAttendance('irregular'), dropout: iconAttendance('dropout')},
  weather: {sun: iconWeather('sun'), rain: iconWeather('rain'), storm: iconWeather('storm')}
};
export const COIN = { full: coin(false), spent: coin(true) };
