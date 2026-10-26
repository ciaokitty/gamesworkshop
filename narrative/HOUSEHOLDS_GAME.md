# Households - risks, indicators and judgement

This is the facilitator's guide to the current Household game. Three stage reps,
each supported by one audience team (A, B or C), try to get a household through six months.
They share the screen but make decisions independently. The objective is to
experience how evidence changes a decision, what remains uncertain, and who bears
the cost of acting on incomplete information.

Run `./run-summit.sh` and choose Households on the landing page. It opens
**Indicators**. The stage selector also offers **Risks** and **Judgement**.
Introduce the icons using the landing page's Icons link.

## What the cards mean

Each month has four categories:

| Category | Observations |
| --- | --- |
| Harvest | Good, weak or failed - three grains, two grains or one drooping grain |
| Cash | Enough, low or loan - variations of the cash jar |
| Attendance | Regular or irregular; Risks also displays Dropout |
| Weather | Sun, rain or storm |

The rep chooses **Skip** or **Intervene**. Skip means continue without providing
support this month. Intervene means provide support. A card flip only obtains
information: it does not provide support, advance the month or prevent dropout.
The rep must still choose an action.

The map is a village: homes A and B at the top left, home C on the right and the
school in the middle. Each child's road has six numbered monthly stops beside that
month's field; Intervene detours to a support camp, Skip walks straight on, and after
month six the roads merge into the main road to the school. The scenery is the same
for every household and is not a risk measurement. On elimination the
team shows OUT and its marker turns red; surviving all six months shows FINISHED.

## Colors mean context

Match both the icon/value and its written color when using a sheet. A blue loan
and an amber loan are the same observation in different historical circumstances.
Red is not automatically dangerous, and green is not automatically safe.

In the implemented model, color summarizes **the previous survey's harvest/cash
pattern and whether support was provided in the previous month**. It is not
chosen by looking at the current hidden cards or whether the current household
will drop out. The opening month has a seeded starting context.

For facilitators who want the exact mapping:

| Previous survey pattern | Without recent intervention | With recent intervention |
| --- | --- | --- |
| Neither of the following pressure patterns | Red | Blue |
| Failed harvest, or weak harvest together with loan | Amber | Green |
| Otherwise, cash low or loan | Purple | Pink |

Within each pair the supported context has lower modeled pressure. Support
changes the next month's circumstances; it does not grant permanent immunity.
The current harvest and cash observations also arise from a shared simulated
pressure, so different variables can carry information about each other.

Color lets the room compare an observation with more relevant past examples.
It is a compact context label, not a universal code for the right action. In the
teaching stages, knowing the actual harvest/cash pair settles the simplified
rule regardless of color. Before both are known, context helps estimate what
might still be hidden. In Judgement, context also contributes to uncertain risk.

## Stage 1 - Risks: recognize the outcome

All four cards are face up. **Only Attendance/Dropout has the filled hazard
background** - white on the dark theme. Failed harvest, loan and storm are not
individually displayed as death cards. There are no dotted indicator borders.
The map highlights the next stop, ahead of the marker.

The audience gives spoken advice and the rep chooses:

- Dropout shown -> Intervene.
- No Dropout shown -> Skip.

The purpose is to establish the outcome that matters before asking people to
infer it. In this teaching stage, both missing a required intervention and
intervening when it is not required eliminate the team. That penalty is a game
rule for a clear learning exercise, not a claim that unnecessary real-world
support is equivalent to dropout.

There are no reveal costs or AI controls here. Household Risks does not currently
open a live phone poll; discussion happens in the room.

## Stage 2 - Indicators: ask for useful evidence

Each month begins with one free revealed card; the other three are face down.
The map highlights the current stop. **Dropout is never displayed in this
stage, even after a loss.** Instead, failed harvest and loan have dotted borders.

The deliberately simple teaching rule is:

| Harvest and cash | Required action |
| --- | --- |
| Failed harvest AND loan | Intervene |
| Any other combination | Skip |

One dotted indicator alone does not prove danger. Two together settle the rule.
Storm alone does not cause dropout. Attendance is not a mandatory warning before
failure. The teaching distribution includes both paired indicators and safe
single-indicator cases so the audience can discover the distinction.

Play a turn as follows:

1. Press **AI**. It estimates Skip/Intervene using the context and every card
   revealed so far this month.
2. If the evidence is insufficient, press **Audience**. The team's members match
   the latest revealed icon + color on their sheets and vote for the category on
   the right, such as CASH or HARVEST.
3. The rep chooses a face-down card to flip. This costs one lightning bolt.
4. The previous polls clear. Press AI again to get an estimate using the newly
   revealed evidence as well as the earlier cards.
5. Choose Skip or Intervene. The team advances or is eliminated; it does not
   advance just because a card was flipped.

There are **three extra reveals for the entire six-month run**, not three each
month. The initial reveal is free. Pressing AI or Audience does not consume a
bolt in Indicators; clicking a new hidden card does. Once the reveal budget is
spent, the rep must decide from the available evidence. Revealed cards stay
visible for the turn; there is no ten-second automatic unflip in this version.

For example, failed harvest is visible but cash is hidden. The relevant histories
may include both loan and non-loan cases, so the action estimate is uncertain.
The room recommends CASH. Revealing loan establishes the pair and points to
Intervene; revealing enough cash rules out the pair and points to Skip. Inspecting
a less useful card may spend a bolt without resolving the decision.

The live room's audience votes come from actual assigned phone/bot sheet rows,
using the **latest cue**. The AI uses **all revealed evidence**. They are different
operations, not two labels on the same poll. The standalone simulated-audience
version estimates inspection value directly from the historical model instead.

**No matching card suggestion** means the team's sheets contain no usable row
for that latest cue, or the suggested category is already revealed. Waiting
longer will not produce a suggestion. It does not mean Skip or safe. **Waiting
for votes** means a usable match exists but no candidate votes have arrived yet.

## Stage 3 - Judgement: decide under remaining uncertainty

Cards still start mostly face down, but the filled hazard backgrounds and dotted
indicator borders disappear. Colors and icons remain. AI now recommends both
actions and potentially useful card reveals in one set of bars. The rep chooses
whether to inspect further, discuss the situation or act.

Unlike Indicators, failed harvest + loan is **not a guaranteed dropout** here.
The outcome is sampled from a synthetic risk model combining those observations,
other conditions and context. A household can have regular attendance and still
experience sudden dropout. Even revealing all four cards does not guarantee a
certain prediction.

The budgets are separate:

| Resource | Allowance across six months | What spends it |
| --- | --- | --- |
| Audience consultations - the visible lightning bolts | Three | Pressing Audience for a spoken discussion |
| Extra card reveals - separate from those visible bolts | Three | Flipping another hidden card |
| Protective interventions - shown on the Intervene button | Two | Choosing Intervene |

The Audience button does not generate a machine poll or reveal a card in
Judgement. Pressing AI does not spend a consultation or reveal. The extra reveal
budget still exists even though the visible bolts now count consultations.

Intervene protects that month and spends support, whether or not dropout would
have occurred. An unnecessary intervention therefore reduces later options
rather than immediately eliminating the team. Skip on a month with a dropout
outcome eliminates the team. When both interventions are spent, the rep cannot
choose Intervene again.

The AI bars in this stage distribute recommendations across **Skip, Intervene
and Flip categories**. An Intervene percentage in that mixed display is not the
standalone probability of dropout: some recommendation weight is allocated to
checking more evidence. A rep should not read a small Intervene bar as proof of
low risk while a large Flip Cash bar is asking for a useful check.

## What “AI improves with more data” means here

The AI is a transparent historical simulator, not an external language model.
Its simulated archive and the live household generator share a distribution but
use separate random draws. The estimate filters histories by context and the
observations already revealed; it does not peek at the live hidden outcome.
Inspection suggestions favor categories expected to reduce uncertainty.

Flipping a useful card supplies **more relevant evidence about this household**.
The next AI estimate can become more informative or reverse the earlier advice.
This is not retraining the model, and certainty need not rise after every reveal.
Irrelevant evidence may add little. In Indicators, sufficient evidence can resolve
the authored rule exactly. In Judgement, uncertainty can remain even with a full
survey.

The room represents a distributed collection of examples and, later, a source
of human judgement. Each participant holds only a small slice; aggregation makes
patterns available to the rep. The live Household sheet rows encode historical
inspection recommendations, not literal causal claims such as “loan causes
failed harvest.” The histories, outcome rules and intervention effects are
simulated teaching devices, not empirical estimates for real families.

A useful spoken transition is:

> First we recognized an outcome. Then we learned which evidence to ask for.
> Now the model can suggest both an action and another question, but it cannot
> remove the uncertainty or take responsibility for the consequences. We can
> spend attention to learn more, spend support to protect someone, or accept
> the risk of acting with what we know.

## Related material

- [Game index](../GAME_INDEX.md) - the Summit running order and other games.
- [Room-as-model script](ROOM_AS_MODEL.md) - the transition from word generation.
- [Model details](../households/MODEL.md) and [implementation](../households/model.js).
- [Shared UI](../paperweights/web/competitive.js) - actions, reveals and budgets.
- [Live sheet generation and room controls](../paperweights/room/README.md).
- [Setup and print regeneration](../docs/REBUILD.md).

This guide supersedes the older “simulated audience only” scope note in
[the shared-stage trial](shared_scenarios_stages.md) for Summit Household
Indicators. The current room has live phone votes there; Judgement discussion
and Household Risks remain spoken. The room print deck is separate from the
older tracked PW5 print snapshot.
