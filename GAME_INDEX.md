# Game index

## Summit

Run `./run-summit.sh` and open the [landing page](http://localhost:8688/).
One server provides all four games, the icon overview and audience phones.

### Sentences

The room follows word + color lookups on its sheets. Type or search for the
starting word and select its color when needed.

- **Next word:** sample one matching sheet, then one matching row. Keep chaining
  to hear how a sentence wanders.
- **Majority word:** open a room vote. Each person selects one matching row;
  bots use their own sheets. Accept the leading word or choose a bar. Percentages
  exclude people who select No matching word.
- **Change one word:** an optional spoken exercise, not implemented as a game
  control. After completing a robot sentence, ask the room to replace its `-ing`
  word. Compare how the replacement changes the meaning and what the opening
  sentence led people to imagine.

Mixed corpus favors several neutral robot sentences under broad voting, while
random sampling can wander. Prior duplex uses the older 15-sheet word deck.
Both can continue through punctuation. The exercise illustrates how examples and
participation shape outputs; it is not a literal implementation of an LLM.

[Corpus and measured results](paperweights/robot-majority/MIXED.md) -
[Prior deck](paperweights/robot-majority/PRIOR_DUPLEX.md)

### Rover

Start with **competitive Risks**: four teams use the audience's Go/Avoid votes
to navigate one shared map. Dead battery, storm and sand pit are hazards.

Then use **collaborative Easy**: the whole room drives one rover and finds
patterns across the visible board. Go, Avoid and Recharge have different costs.
Use repeated examples to distinguish a hazard from an indicator that precedes it.

Competitive teaching stages eliminate a team for missing a hazard or avoiding a
safe square. Collaborative has its own lives, scoring and difficulty rules.

[Collaborative controls](space/rover-run/src/README.md) -
[Indicator facilitation](narrative/INDICATORS.md) -
[Competitive evidence model](paperweights/competition/EVIDENCE.md)

### Households

[Full Household game and facilitator guide](narrative/HOUSEHOLDS_GAME.md) -
colors, dropout, the three stages, reveals, AI and lightning budgets.

The landing page opens **competitive Indicators**. Four teams share the Rover
map as a visual placeholder. The cards are harvest, cash, attendance and weather.
Use the landing page's **Icons** link to introduce them.

1. Ask AI for Skip/Intervene estimates from the revealed evidence.
2. Ask Audience which card to inspect, using the team's color + icon lookups.
3. Reveal a card, ask AI again, then decide.

Each team has three extra card reveals across six turns. Teams progress and reset
independently. The simplified teaching rule combines failed harvest and loan;
weather alone is not a death card. These are simulated histories, not validated
predictions about real households.

[Household model](households/MODEL.md) -
[Shared stage design](narrative/shared_scenarios_stages.md)

### Extended Households

A retro follow-up to Households; its screen title is **PAPERWEIGHTS**. Open
`/extended-households/`.

- **Part 1 - Field reports:**
  - one LED dot-matrix chart, where each team's line charts its decisions on a shared score
    axis: a step up for a right call, a red step down for a missed slip or a needless
    intervention (score +1 / −1);
  - team icons A, B and C (Food, Money, School; Villages 1-3) open Rover-style card modals with
    reveals, **ASK AI**, **ASK AUDIENCE**, **SKIP** and **INTERVENE**;
  - each team plays four months;
  - the AI learned from calmer state-wide records, so it can be confidently wrong;
  - phones suggest which card to flip, from pictures of their own village's history. The room
    splits into Teams A-C for this game only;
  - when all teams finish, the room writes its paper cheatsheet and moves on to Part 2.
- **Part 2 - One home:** played like Households, on one big village lane with Households' team
  dialog. The three organisations share one family, with 3 interventions (each holds all three
  ladders) and 3 card flips; **AUDIENCE** asks the whole room's phones which card to flip, any
  number of times. Click the map or press `Space` to open the dialog.

The game never shows the true rules; they are only in the facilitator guide. To test with a full room, set 200 bots on the landing page.

[Facilitator guide](narrative/EXTENDED_HOUSEHOLDS.md) -
[Game README](extended-households/README.md)

### Other competitive stages

Both scenarios have the same stage selector and visual design:

| Stage | Visible evidence | AI | Audience |
| --- | --- | --- | --- |
| Risks | All cards face up | None | Go/Avoid or Skip/Intervene advice |
| Indicators | One initial reveal | Action estimate | Suggest which card to reveal |
| Judgement | One initial reveal | Action and reveal suggestions | Spoken judgement |

Household Risks uses Dropout as its only filled death card. Indicators hides
Dropout and marks the failed-harvest/loan indicators with dotted borders.
Judgement removes those hints and uses uncertain dropout outcomes. Household
Judgement has two interventions; an unnecessary intervention spends support
rather than eliminating the team.

Live phone polls currently support Sentences, Rover Risks, Households
Indicators and both parts of Extended Households. Other stages retain the prototype's simulated or spoken interaction.

### Phones, sheets and facilitation

Open `/audience` on each phone. Browser IDs retain seats across refreshes. Seats
cycle through teams A, B, C and D; data-game votes go to that person's team.
Configured bots are additional voters. Sentence reserve bots complete the word
pack so continuations remain available.

Household **No matching card suggestion** means no usable row on that team's
sheets for the latest cue, including suggestions for already revealed cards.
It does not mean Skip or safe. **Waiting for votes** means responses can still arrive.

Room prints are generated into `paperweights/printouts/room/` and stay local.
The older tracked `paperweights/printouts/latest/` snapshot is not the live-room
deck. Word deals can change at room-size boundaries, so finalize the roster before
matching phones with printed sheets.

[Room controls and print command](paperweights/room/README.md) -
[Spoken event narrative](narrative/ROOM_AS_MODEL.md) -
[Rebuilding and data dependencies](docs/REBUILD.md)

## Other games and experiments

- [Servers](servers/README.md): the indicator exercise as running a service.
- [Crew](crew/README.md), [Fieldwork](fieldwork/README.md), [Idlisseus](idlisseus/):
  earlier games; `python3 play.py` selects a terminal game.
- [Good robot / bad robot benchmark](narrative/SENTENCE_BENCHMARK.md): archived
  sentence-revision experiment, separate from Summit Sentences.
- [Space projects](space/README.md): anchor films and local media work.
- [Chronology](chronology/): checkpoints and playtest findings.
