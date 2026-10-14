# Question helpers (front end only)

Added without touching the private question bank. `js/helpers.js` attaches helpers by **question id** (ids are listed in BLUEPRINT.md) and works from what the question already shows. None of it is graded, stored or sent to the server, and none of it states an answer.

| Question | Helper |
|---|---|
| c1-ledger | Sportsbook "My Bets" look-alike around the question's own table (odds pills, WON/LOST badges, green/red money) |
| c1-market | Event-contract market look-alike (Yes/No price buttons, chance meters) |
| c2-basics | Animated bag of marbles; counts are read from the question text, with a "change the bag" panel if they are wrong or missing |
| c4-implied | Odds walk-through: shows what numbers to plug in, student divides |
| c4-parlay, c4-parlay-table | Parlay walk-through: sets up the multiplication |
| c4-eval | Skill-or-luck walk-through |
| c5-match | Gallery of the six animated ads (`js/fxads.js`); the same art also appears in the Ad Lab |
| c5-riskfree | Bonus-bet explainer with a replay button |
| most Chapter 1, 2, 4, 5 math items | "Stuck? Get a nudge": three concept hints, then a worked example on different numbers to copy the steps from; free, no attempt used (`NUDGES` and `EXAMPLES` in helpers.js) |

The Sports Analytics Desk lab has a new first tab, **Start here**, a four-step guided pass (read an odds line, break-even rate, parlay, 10,000 slips).

Preview all of them with `node tools/serve.js` then `/tests/e2e/helpers-demo.html` (stand-in items, dev only).

**Limits.** Skins and the marble parser guess at table headers and wording; check them against the real bank and adjust the patterns in `helpers.js`. Helpers add reading time: re-run `tools/timing.js` once the bank is open.
