# Households

[Current facilitator guide](../narrative/HOUSEHOLDS_GAME.md) explains the three
stages, colors, indicators, dropout and resource budgets, including live Summit votes.

Households and Rover now use the same competitive interface and original Rover
map. Choose the scenario separately from Risks, Indicators or Judgement.

## Play

```sh
python3 paperweights/serve.py --rover-only --bind 0.0.0.0
```

Open [Households](http://100.82.28.38:8684/paperweights/web/?scenario=households&mode=easy)
or [Rover](http://100.82.28.38:8684/paperweights/web/?scenario=rover&mode=easy).
The old `/households/game.html` link redirects to Household Judgement.

- Risks: all cards visible, room advises Skip/Intervene.
- Indicators: AI gives a decision estimate; Audience suggests cards to check.
- Judgement: AI gives both; Audience spends a human consultation, no machine poll.
- Four turns per team, three extra card reveals across the run. Judgement adds
  three separate consultations and keeps its two protective interventions.
- Risks: only Dropout is filled and signals death. No dotted indicators.
- Indicators: Dropout never appears; failed harvest + loan form the dotted pair.
  Both require intervention; either alone is safe. Storm is not a death card.
  Wrong actions lose.
- Judgement: styling hints disappear and dropout is probabilistic. Unnecessary
  intervention spends support without eliminating the team.
- Both scenarios share geometry, responsive layout and decision-dependent routes.
  Reset replays a team independently; scenario switches preserve the stage.

[Stage design](../narrative/shared_scenarios_stages.md) - [Model](MODEL.md).
The original trial did not generate sheets. The later live Summit room has its
own [sheet generator](../paperweights/room/README.md); older PW5 PDFs remain incompatible.
Pre-trial checkpoint: `trial-before-shared-stages-2026-10-19` (`aad8fcf`).

## Verification

```sh
node households/test-stages.mjs
node households/test-model.mjs
node households/test-handoff.mjs
node households/test-routes.mjs
node households/playtest.mjs
```

## Archived visual studies

The [illustrative social contour landscape](http://100.82.28.38:8684/households/landscape.html)
and [measured attendance chart](http://100.82.28.38:8684/households/evidence.html)
remain review artifacts. They are not the gameplay map or outcome model.
[Evidence boundaries](../narrative/household_evidence_landscape.md).
