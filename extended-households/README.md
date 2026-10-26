# Extended Households

A separate, retro-platformer follow-up to [Households](../households/README.md). Three
organisations (Food, Money, School) each watch one outcome **ladder** with five steps. Two
disruptors push the ladders down: weather and unforeseen expenses. The game follows a hidden
directed graph. The room discovers the pairs of conditions that make a ladder slip, then uses
that cheatsheet to protect one family together.

[Facilitator guide](../narrative/EXTENDED_HOUSEHOLDS.md) covers the story, both parts, colours,
the AI and the debrief. The guide holds the hidden rules, so keep it away from the room.

## Play

Run `./run-summit.sh` and choose **Extended Households** on the landing page
(`http://localhost:8688/extended-households/`). Outside the Summit, any static server at the
repository root works:

```sh
python3 -m http.server 8691        # then http://localhost:8691/extended-households/
```

- `?part=1` or `?part=2` skips the title screen.
- `?seed=N` plays seed N everywhere. The default deck uses a tuned seed per village (`DECK` in `model.js`).

- **Part 1 - Field reports:** one LED dot-matrix chart on a shared score axis, with one line per
  team charting its decisions (a step up = right call, a red step down = a missed slip or
  a needless intervention; score +1 / −1). Team boxes A, B and C sit in a row on top (keys `a`,
  `b`, `c`) and open Households-sized card modals where every state is a word. Each team plays four months
  with three reveals, and has:
  - **ASK AI**: an AI trained on state-wide records, which can be confidently wrong;
  - **ASK AUDIENCE**: the team's phones suggest which card to flip, or a simulated room of 200 does;
  - **SKIP** / **INTERVENE**.

  When all three teams finish, a **PART 2 ▶** button appears. Part 1 is silent.
- **Part 2 - One home:** played like Households: one big village lane (home, six fields,
  school) and Households' team dialog with the five cards. Three interventions (each holds all
  three ladders for the month) and three card flips. **AUDIENCE** asks the whole room's phones
  which card to flip, as often as you like. Click the map or press `Space` to open the dialog.
  The map shows only the walk: detours past support camps, and OUT when a ladder reaches the
  bottom.

The landing page reads **PAPERWEIGHTS** (only on screen; the URLs are unchanged). The top bar has
a sound button in Part 2 only (the title screen and Part 1 are silent). The game is always in its night theme; there is
no day/night option. `Esc` closes dialogs.

## Files

| File | Role |
| --- | --- |
| `model.js` | ladders, disruptors, the hidden rules, colours, worlds, archive and `poll()` (the AI) |
| `main.js` | landing, Part 1 chart and team modals, Part 2 dialog and ending |
| `led.js` | the Part 1 LED chart: one line per team on a shared score axis |
| `village.js` | the Part 2 map: one Households lane with the walk, camps and OUT |
| `audience-room.js` | Teams A-C, the sheets' vote rule and the simulated room of 200 |
| `audience.mjs` | deals `audience-sheets.json` (phones, bots, offline room) and prints the 200-person report |
| `sprites.js` | new pixel art; the houses, children, school and clouds come from Households unchanged |
| `cards.js` | ending meters and AI bar labels |
| `dialog.js` | retro text boxes |
| `sfx.js` | chiptune effects |

It reuses `households/village-sprites.js`, `households/pixel-cards.js` and the Jersey 10 font
read-only. Phone voting adds an `extended` vote kind to the live room (`paperweights/room/`
`server.py`, `deck.py` and `audience.html`). The other games' votes are unchanged.

## Verification

```sh
node extended-households/test-model.mjs   # rules, one-step moves, colour = history, AI never peeks
node extended-households/simulate.mjs      # strategy table, Part 1 example counts and AI error rates
node extended-households/audience.mjs      # redeal the phone sheets and print the 200-person report
```

Part 2, 400 seeds, every card visible to the policy, 3 interventions (each holds all three
ladders):

| Policy | Wins | Wasted interventions |
| --- | --- | --- |
| Always skip | 35% | 0 |
| Always intervene | 93% | 1.12 |
| Act only one step above the bottom | 85% | 0.47 |
| Single cues (storm, expense, low cash) | 93% | 1.07 |
| The pairs | 95% | 0 |

With 2 interventions the same policies win 35% / 80% / 71% / 80% / 83%.

Rooms see fewer cards than these policies, so real win rates are lower.
