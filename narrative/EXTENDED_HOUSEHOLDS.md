# Extended Households - indicators, history and working together

The facilitator's guide to [Extended Households](../extended-households/README.md). **It
contains the hidden rules.** Do not project it or share it with the room before the end.

Households taught one outcome (dropout) and one indicator pair (failed harvest + loan). This
follow-up widens the lesson:

- **three outcomes**, each a five-step ladder, so a decline is gradual and visible;
- **two disruptors** that nobody controls: weather and an unforeseen expense;
- **pairs as indicators**: a disruption alone, or a stretched household alone, is a false alarm;
- **colour as history**: a colour sums up what happened last month and carries into the next;
- **an AI trained elsewhere**: it is confidently wrong in places, and the room's local data
  can catch it;
- **working separately, then together**: three organisations in three villages learn one
  outcome each, then share one family.

## Story

Three organisations each work with one household in their own village:

| Team | Organisation | Village | Watches |
| --- | --- | --- | --- |
| A | Food org | Village 1 | Harvest |
| B | Money org | Village 2 | Cash |
| C | School org | Village 3 | Schooling |

The villages' data differs: Village 1 has more storms, Village 2 more expenses, and Village 3
starts stretched. The **laws are the same everywhere**. That is why notes from one village
help in another.

In Part 2 the three organisations are called to **one family**. Every ladder now matters, and
they share a single small budget.

## Cards

Each month shows five cards.

| Card | States | Meaning |
| --- | --- | --- |
| Weather | sun · rain · storm | a disruptor; nobody controls it |
| Expense | none · expense | a disruptor: illness, repair, a wedding |
| Harvest | good · fair · weak · poor · **failed** | the Food ladder: a rice plant from lush to bare |
| Cash | enough · tight · low · borrowing · **heavy debt** | the Money ladder: a coin jar emptying, then IOU slips |
| School | regular · misses days · irregular · rarely goes · **dropout** | the School ladder: a school bag with attendance stars |

A ladder moves **at most one step a month**. The bottom step is the bad outcome, and it does not
recover by itself.

## The hidden rules

This month's cards decide whether a ladder **slips one step next month**:

```
weather ──▶ harvest ──▶ cash ◀── expense
               │          │
               └──▶ school ◀┘
```

| Ladder slips when | One alone is a false alarm |
| --- | --- |
| Harvest: **storm** + harvest already below *good* | a storm on a good harvest; a fair or weak harvest in sun or rain |
| Cash: **expense** + cash already below *enough* | an expense when cash is enough; tight cash with no expense |
| School: cash **low or worse** + harvest **weak or worse** | either pressure alone |

In a calm month a ladder climbs one step back up:

| Ladder | Climbs back when |
| --- | --- |
| Harvest | the month is sunny |
| Cash | there is no expense and the harvest is fair or better |
| School | cash is tight or better and the harvest is fair or better |

Each pair has the same shape: **a disruption plus an already-stretched state**. That is the
sentence the room should end up writing.

In Part 1 each organisation's support holds its own ladder (food aid the harvest, cash relief
cash, school support schooling). In Part 2 a single **INTERVENE** holds all three ladders for
the month.

A support holds a ladder for one month. It never pushes a ladder up. **The correct decision is
to intervene exactly when the ladder would slip next month**, at any step and not only near the
bottom.

### Colours

Colours use the same six colours and pattern marks as Households. They mean something new
here: **what happened last month**.

| Last month | No support | With support |
| --- | --- | --- |
| Calm: no ladder slipped | Red | Blue |
| Harvest slipped | Amber | Green |
| Cash or school slipped (harvest held) | Purple | Pink |

A colour never depends on this month's hidden cards or on what will happen next. In Part 1
the colour is a swatch **on the boundary between two months**: the tag before M3 is what M2's
pattern became, carried into M3. Cards and results are never coloured, so colour keeps this one
meaning. The tag before M1 is the household's starting colour. In Part 2, as in Households, the
colour is the frame of each face-up card.

Ladders move one step at a time, so last month's face-up cards plus the colour narrow down
this month's hidden cards. Rooms that notice this need fewer flips.

## Part 1 - Field reports

The screen is one central **LED chart**, like a scoreboard, with compact team tags **A**
(yellow), **B** (cyan) and **C** (pink) in a row above it and the months M1-M4 along its top.
The palette is a high-contrast terminal theme: near-black background, bright cream text,
green for a right call, red for a wrong one and yellow for "now" and "flip". Each tag shows its
team's score and reveals left. Part 1 is silent.

- Each team's line is **its record of decisions** on a shared score axis (+4 to −4). It moves
  one month right per decision, **steps up** after a right call and **steps down in
  red** after a wrong one. A wrong call is either a missed slip (skipped when the ladder
  was about to slip) or a needless intervention.
- The three lines share a three-dot band around each score, so equal scores show as one
  striped band. The team's letter marks the end of its line.
- The chart draws only decided months, so it never reveals a hidden card. The household's
  ladder levels are on the cards in the team modal.

**Clicking a team icon** (or pressing `a`, `b` or `c`) opens that team's cards, laid out like
Rover's board:
- one column per month, with the five cards stacked;
- the colour on the boundary before each month, the colour carried in from the month before;
- the past months face up, and the current month showing its free card;
- every state written as a word (STORM, TIGHT, MISSES DAYS), with rows labelled WEATHER,
  EXPENSE, HARVEST, CASH and SCHOOL. Face-down cards show a plain **?**; the team box and the
  modal show reveals left as "? ×2".

Clicking any face-up card highlights every card with the same value.

Each month, in the team's modal:

1. Click a **?** block to reveal a card. Each team has **three reveals for its whole run**.
2. **ASK AI** shows Skip / Intervene bars from the state-wide AI, plus the reveals it would
   suggest. See [The AI](#the-ai).
3. **ASK AUDIENCE** asks the team's phones **which card to flip next**, cued by the latest
   face-up card and its colour. A yellow square marks the room's top pick. It never runs out:
   ask as often as you like, even with no reveals left. See
   [Phone voting](#phone-voting).
4. Press **SKIP** or **INTERVENE**. The modal closes, the month turns face up, and the chart draws
   the step.

A reveal clears the AI and audience bars, so ask again after revealing. Every team plays all
four months; there are no hearts and no elimination. **Score:** +1 for each right call and −1
for each wrong one, whether a missed slip or a needless intervention, so intervening every month
doesn't pay. A team box shows its score and reveals left. The teams play independently.

**The audience keeps the cheatsheet on paper.** The game never points out the pair, shows no
prompts, and stores no notes.

When every team has finished, a **PART 2 ▶** button appears under the chart. Before pressing it,
ask the room to write their cheatsheets on paper:
- one line per ladder ("HARVEST slips when ___ + ___");
- what a colour tells them;
- when the AI was wrong.

### The default deck, if each team plays correctly

Each village has its own seed (`DECK` in `model.js`): Village 1 = 14, Village 2 = 30,
Village 3 = 5. Each was picked to show 2 real slips, false alarms, and one confident AI error
after month 1.

| Village | What the room should see |
| --- | --- |
| 1 (harvest) | M1 and M2: a storm on a fair harvest slips. The AI gets M2 wrong (33% with only the storm card). M4: a storm on a good harvest does nothing. |
| 2 (cash) | M1: low cash with no expense stays steady. M2 and M3: an expense on tight or low cash slips. The AI gets M2 wrong (23% with only the cash card). |
| 3 (school) | M1-M2: a weak harvest, or tight cash, alone stays steady. M3 and M4: low cash with a weak harvest slips schooling. The AI gets M3 wrong (29%). |

Different decisions change later months, because supports change the ladders. Weather, expenses
and the free card never change. `?seed=N` plays seed N in every village instead.

## Part 2 - One home

Part 2 plays like Households. The screen is one big village lane: the home on the left, six
monthly fields, the school on the right. Click the map or press `Space` to open the family's
dialog, which works like a Households team dialog with five cards. The three organisations
share (shown at the top of the dialog):

| Resource | Allowance across six months |
| --- | --- |
| Card flips ("? ×3") | 3 |
| Interventions (gold coins) | 3; each one holds all three ladders for that month |
| Ask the audience | as often as you like |

Each month:
1. Flip cards (click a **?**), ask the **AI** or ask the **AUDIENCE**. AUDIENCE opens a phone
   vote for the **whole room**: "which card to flip?", cued by the latest face-up card and its
   colour, from each seat's rows of the home's history. The dialog shows FLIP bars and a yellow
   square on the room's top pick. Offline, a simulated room of 200 answers. AUDIENCE never runs
   out, even with no flips left.
2. Press **SKIP** or **INTERVENE**.
3. The dialog closes and the child walks the month. An intervention is a detour past a support
   camp.

As in Households, ladder levels appear only on the cards, and the map does not mark slips.
The room learns a ladder's level by flipping its card.

The family is lost if any ladder reaches its bottom step:
- failed harvest, meaning poverty;
- heavy debt;
- dropout.

Surviving six months shows **HOME SAFE**.

Interventions are scarce. A room that intervenes every month or on every single cue runs out;
a room that waits until a ladder is nearly at the bottom is too late more often. The pairs win
most often and waste nothing (see the strategy table in the game README).

The game never shows the hidden rules. For the debrief, use the graph and tables in
[The hidden rules](#the-hidden-rules) above, or leave them hidden.

## The AI

The AI is a transparent historical simulator, the same idea as in Households:
- It filters an archive of 4,000 earlier households, matching the current colour and every card
  revealed this month.
- It reports how often that ladder slipped in matching histories.
- It suggests the reveal expected to remove the most uncertainty.

It never reads the live household's hidden cards.

**In Part 1 the AI was trained elsewhere.** Its archive is a state-wide history with calmer
conditions (fewer storms and expenses), not the village's own. The laws are the same
everywhere, so once every card is revealed it is exact. With cards hidden, it guesses them from
the wrong place. It therefore often says SKIP in Village 1 and Village 2 when local risk is high.

`simulate.mjs` measures this across 150 seeds. The AI's top answer is confidently wrong
(≥ 65% on the wrong action):

| Village | After the free card | After its suggested reveal |
| --- | --- | --- |
| 1 | 31% of months | 10% |
| 2 | 43% | 16% |
| 3 | 16% | 21% |

Note Village 3: more evidence fed to a model trained elsewhere does not always help. When the
AI has no record that matches at all, the panel says so ("No state-wide records look like
this") instead of guessing.

In Part 2 the AI reads the family's own region's archive. Its bars spread across Skip,
Intervene (any ladder slipping next month) and possible flips. A small Intervene bar is not a
claim of low risk when a large flip bar is asking for a useful check.

## Phone voting

Run `./run-summit.sh`, open `/audience` on phones, and set the bots on the landing page (up to 200).

- **What the audience votes on.** As in Households Indicators, the audience suggests **which
  card to flip next**. It does not vote on Skip or Intervene.
- **Teams.** For this game the room splits into **Teams A, B and C**: sheet k is Team
  `ABC[(k-1) mod 3]`. Households uses the same three-way split; Rover keeps its four teams A-D.
- **Sheets.** Each sheet holds about 20 rows from its team's **own village**, dealt by
  `extended-households/audience.mjs`. Rows are a colour block and the card's state as a word (STORM,
  TIGHT), an arrow, then a dashed face-down box naming the card to flip (HARVEST).
- **Answers.** Each row's answer is the card whose value most reduced uncertainty about that
  team's ladder in the village's records, weighted the same way as the Households sheets. About
  one member in seven holds a different card for any cue, as noise.
- **Voting.** **ASK AUDIENCE** cues the latest face-up card with its colour. Phones with a
  matching row tap it, and cards already face up are excluded. Bots vote the same way, at 85%
  turnout over 1-12 s. The modal shows live FLIP bars and "n of 67".
- **No suggestion.** "No card suggestion" means no card would change the answer for that cue,
  for example sun in Village 1. It does not mean Skip.
- **On the default deck**, the room of 200 points at the locally most useful card in every month
  where one helps: harvest after a storm in Village 1, expense or cash in Village 2, cash or
  harvest in Village 3. The AI, trained elsewhere, can still misjudge whether to act on what is
  revealed.
- **Without the room server** (any static server), ASK AUDIENCE tallies a simulated room of 200
  from the same sheets with the same turnout rule.

## Debrief prompts

1. What did you write for each ladder? Which part did you get first: the disruption, or the
   stretched state?
2. Which warning did you learn to ignore, and what told you it was safe? Examples: a storm on a
   good harvest, or an expense when cash was enough.
3. What does a colour tell you? When did it save you a reveal?
4. When was the AI wrong, and why? What did the room know that the AI did not?
5. In Part 2, where did you spend your interventions? Which ones were not needed?
6. In Part 1 each organisation watched only its own ladder. What did the school org need to know
   about harvests and cash?

## Data honesty

The ladders, rules, villages, the state-wide archive and the phone sheets are **simulated teaching devices**, not
measurements of real families. Real poverty, debt and dropout have many more causes, and
support is never this simple. The game only makes the reasoning visible: indicators come in
pairs, history carries information, and scarce help works best early.

## Verification

- `node extended-households/test-model.mjs` checks:
  - every rule over every card combination;
  - one-step moves and the final bottom step;
  - colour from last month only;
  - deterministic replays;
  - actions never rerolling weather, expenses or the free card;
  - an AI that never reads hidden live cards and is exact with full evidence, including the
    state-wide Part 1 AI;
  - the default deck: slips, false alarms and a confident AI error after month 1 per village.
- `node extended-households/simulate.mjs` prints the Part 2 strategy table, plus the Part 1
  example counts and AI error rates per village.
- `node extended-households/audience.mjs` deals `audience-sheets.json` and prints the
  200-person report for the default deck. Rerun it after changing the model or the deck.
- `python3 -B paperweights/room/test_room.py` covers the Teams A-C votes.
