# Live room

Landing page, audience phones and live votes in front of the Rover site.

```sh
python3 paperweights/room/server.py --port 8688
```

- `/` landing: today's running order, Icons, Audience, and the bots count.
- `/audience` phones: each gets sheet k (words side, data side) and votes when asked.
- Everything else is the assembled site (`build_site.py` output in `out/room-site`).

Room size = phones + bots. Phones take the lowest free sheets; bots take the rest.
Bots vote over 1-12 s. Rover/Households use 85% turnout. Sentence bots always vote when they have a match.
Pages served by the plain 8684 server find no `/api/room` and keep their simulated polls.

Updates are pushed, not polled: phones, game screens and the landing page each hold one
server-sent events stream (`/api/room/events`, or `?pid=` for a phone's own view). A phone gets a
message only when its own view changes (a vote opens or closes, its status moves, its ballot lands,
its sheet changes); game screens get every ballot. Idle streams carry a keep-alive every 20 s, a
dropped phone shows *Reconnecting...* until the browser reconnects, and a connected phone keeps
its seat.

## Votes

| Game | Who | Phone shows | Host shows |
| --- | --- | --- | --- |
| Sentences, Majority word | everyone | Tap the word that matches, if any | bars; click one to accept, or Accept = top |
| Rover Competitive, Risks | the rep's team | Team X: GO or AVOID? (no cards; the data side shows the Households dropout to avoid) | GO / AVOID percentages under the team |
| Households Competitive, Indicators | the team's Households group (A, B or C) | Tap the row that matches (latest card) | FLIP percentages under the AI estimate |

Teams: sheet k is team `ABCD[(k-1) % 4]` for Rover. Households regroups the same seats into `ABC[(k-1) % 3]` (vote keys `HA`/`HB`/`HC`) for its votes only. A rep's Go/Avoid, a card flip or Reset closes that vote. Navigating to another activity (including landing, collaborative and Icons) closes old votes without clearing the roster.

Empty polls distinguish **Waiting for votes** from **No matching card suggestion**. The latter means nobody in that team has a usable matching row, after excluding already revealed categories; it is not a recommendation to Skip.

## Sheets (`deck.py`)

- Words: the complete RM4 room-size bucket (12, 15, 20, 30, ... 200), or all 15 prior-duplex sheets. Reserve word bots hold unused seats, including when the room has fewer people than the complete deal. No word pack is truncated. This preserves every continuation without altering the data. Reserve bots do not join Rover/Households votes.
- Rover: the three hazards, with a stratified minority (`PATTERN`) that also fears a harmless
  square or misses one hazard. Every PW6 screen, every team, every room size: safe screens
  get at most 20% AVOID, hazard screens at least 90%.
- Households: 24 rows `context colour + card -> category to flip`, from the Indicators archive's
  information gain (`household-answers.mjs` -> `household-answers.json`), weighted toward cards
  that occur in the seed-15 game, about one noisy row per seven team members per card.
  Every sheet also holds the two-month-rule rows (purple weak harvest -> CASH, purple low cash
  -> HARVEST) and Team C's other path cards (`household-streak.mjs` -> `household-streak.json`).
  They replace filler rows only, so the rows for cards in the game are unchanged.

Simulated seed-15 Households (the game we play): AI alone survives 2.5/6 months, no team
finishes; AI plus the audience's flips survives about 4.7/6, half the teams finish, with 50%
turnout and with rooms of 10 to 200. Across 100 seeds: 31% vs about 64% finish.

## Print

```sh
cd paperweights/room && ../.venv/bin/python print.py --sheets 20
```

`printouts/room/room-20.pdf`: front words, back household data plus Rover squares to avoid.
Print the size you will set on the landing page; sheet k on paper is sheet k on the phones.

## Facilitation and checks

[Spoken running-order narrative](../../narrative/ROOM_AS_MODEL.md).

Run `python3 -B paperweights/room/test_room.py` from the repository root for continuation coverage at every room size, reserve bots, activity transitions and empty-poll states.

Word sheets can still change when room size crosses a bucket boundary. This fix guarantees coverage, not a frozen roster or printed-seat assignment.

## Phone and vote controls

Opening `/audience` registers a browser with a localStorage ID. Refreshing retains its seat; another browser or private session counts separately. Seats cycle through teams A, B, C, D (A, B, C for both Households games). Idle phones are pruned after 30 minutes when another phone joins. Configured bots are additive, not a fixed-room-size top-up. Sentence reserve bots additionally complete the selected word pack.

The host can type a starting word, choose a word/color autocomplete suggestion, or enter a full cue such as `PURPLE:robot`. Ambiguous words require the color. Live bars show percentages of submitted candidate votes. The phone’s **No matching word** button appears during word polls and records an abstention, excluded from those percentages; tapping a valid row replaces it.
