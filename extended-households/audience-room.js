// The Part 1 audience: who sits in which team, and how a room votes from its sheets.
// Shared by the page (offline fallback), audience.mjs (the 200-person report) and, through
// audience-sheets.json, by the live room server's phones and bots.

export const TEAMS = ['A', 'B', 'C']; // Team A watches Village 1, B Village 2, C Village 3
export const SEATS = 400;             // sheets dealt; room seats beyond this wrap around
export const TURNOUT = 0.85;          // the live room's bot turnout
export const ROOM = 200;              // the simulated room when no live room is running

export const teamOf = seat => TEAMS[(seat - 1) % TEAMS.length];
export const memberOf = seat => Math.floor((seat - 1) / TEAMS.length);
export const cueKey = (contextId, card, value) => `${contextId}:${card}:${value}`;

export function hash(text) {
  let h = 2166136261;
  for (const c of String(text)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// rows: [[key, card to flip next], ...] for one seat. Cards already face up are excluded.
export const answers = (rows, key, exclude = []) => rows.filter(r => r[0] === key && !exclude.includes(r[1])).map(r => r[1]);

// A simulated room: every seat of the team that holds a matching row, with the same turnout
// rule as the live room's bots. salt makes each new question a fresh turnout draw.
// part 'home' (Part 2) asks every seat, from its rows of the home's history; team is ignored.
export function simulatedVote(sheets, team, key, { size = ROOM, salt = '', exclude = [], part = 'village' } = {}) {
  const book = part === 'home' ? sheets.home : sheets.seats;
  const counts = {};
  let eligible = 0, matching = 0;
  for (let seat = 1; seat <= size; seat++) {
    if (part !== 'home' && teamOf(seat) !== team) continue;
    eligible++;
    const options = answers(book[(seat - 1) % book.length], key, exclude);
    if (!options.length) continue;
    matching++;
    if (hash(`${salt}|${seat}`) / 4294967296 >= TURNOUT) continue;
    const pick = options[hash(`${salt}|pick|${seat}`) % options.length];
    counts[pick] = (counts[pick] || 0) + 1;
  }
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  return { counts, total, eligible, matching, status: !matching ? 'no-data' : total ? 'voting' : 'waiting' };
}
