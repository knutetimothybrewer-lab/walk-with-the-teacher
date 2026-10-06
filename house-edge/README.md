# THE HOUSE EDGE — *Think You Can Beat the Game?*

An interactive **gambling-literacy investigation** for high school students. Students begin as a **PLAYER**
(bright lights, fictional tokens, big animations) and finish as an **ANALYST** who can see the probability,
expected value, house edge, variance and psychology underneath.

> **Tokens have no monetary value.** This is a classroom simulation, **not** a gambling product. There is no real money,
> no deposits, no cash-outs, no ads, no affiliate links and no real casino/sportsbook branding. Every team, game and
> company is fictional. Nothing teaches students how to gamble better.

The central question: **"Why can gambling feel like you are winning even when the mathematics favors the house?"**

* Static website: plain HTML + CSS + JavaScript. **No Node, npm, server, database, account, API key or paid service.**
* Runs on school Chromebooks (Chrome). One URL for students.
* Everything is saved only in the student's own browser (`localStorage`). Nothing is transmitted anywhere.
* Estimated time: **about 30–40 minutes** (author's estimate from counting required interactions; please time a pilot
  class and adjust. The 10 mastery scenarios and the Zone 6 bias activities are the largest blocks).

---

## 1. What students do (the flow)

`ENTER → Level 0 PLAYER → PLAY → PREDICT → X-RAY → CALCULATE → SIMULATE → EXPLAIN → Level 8 ANALYST → X-RAY EVERYTHING → 100% → Report → Exit ticket → Classroom Debrief`

| Zone | What happens | Analyst level unlocked |
|---|---|---|
| ★ Enter the Floor | Cinematic intro, 1,000 fictional tokens, starting prediction, "could a business survive paying out more than it collects?" | Level 0 – PLAYER |
| 1 Probability Training | Coin lab (1,000 flips), two-dice lab, streak detector | L1 ODDS SPOTTER (Probability Vision), L2 PATTERN BREAKER |
| 2 Slot Machine Lab | Play 12–20 spins of a fictional slot. A big win triggers celebration → freeze → **WAIT.** → **X-RAY THIS WIN** (random value → outcome, wager vs return vs net) | — |
| 3 Expected Value Lab | The +8/−10 bet, simulate 1/10/100/10,000 trials, reveal EV, EV challenges, animated slot EV | L3 VALUE DETECTIVE |
| 4 House Edge & Variance | House edge X-ray, RTP lab, one player over 10/100/1,000/10,000 bets | L4 HOUSE EDGE HUNTER |
| 5 Fictional Sportsbook & Parlays | Fictional teams, single bet, parlay builder (2–6 legs), **X-RAY THE PARLAY**, seesaw, 10,000 parlays | L5 PARLAY DECODER |
| 6 Brain vs Randomness | 7 biases with **BRAIN X-RAY**, **X-RAY THE INTERFACE**, **REMOVE THE LIGHTS** (same math, two presentations) | L6 BIAS BREAKER |
| 7 The 10,000 Players Lab | One result vs 10,000 simulated players, "YOU ARE HERE", percentile, HOUSE VIEW, run again, House Edge Experiment | L7 SIMULATION SCIENTIST |
| 8 Can You Beat the House? | Design a strategy, play it, send the same strategy through 10,000 players, "But I won" claim | — |
| 9 Mastery Challenge | 10 scenario locks (unlimited attempts, targeted feedback) | **L8 ANALYST** |
| 10 X-Ray Everything | The floor transforms into the math; ONE → 10 → 100 → 1,000 → 10,000 reveal; return to the original prediction; reflection | 100% |

After 100%: **completion screen → My Gambling Literacy Report → Exit Ticket → Classroom Debrief**.

Completion is **never** earned by clicking "Next". Every zone has required steps; a zone unlocks only when the previous one
is complete. Questions allow **unlimited attempts** and explain mistakes. A bar at the bottom always says *where you are, what to do and why you can't continue yet*.

### What the report rewards (and does not)
The report ranks **nothing** by tokens, winnings, number of bets won or largest win. It shows: predictions vs. discoveries,
"My biggest surprise" (a wrong first prediction vs. the math), the student's result placed inside 10,000 simulated players
("one result is one sample"), the concept profile, misconceptions corrected, reflection and exit ticket.

---

## 2. Mathematical integrity (important)

* **One source of truth:** `js/config.js` holds every probability and payout. The *same* objects feed the gameplay draws, X-Ray layers,
  expected-value tables, charts, the Monte Carlo engine and the explanations. There is no separate "teaching model".
* **Nothing is rigged.** Each outcome is a single uniform random number mapped onto the configured probability ranges
  (X-Ray literally shows this). Students may lose, break even or win a lot; that variance is the lesson.
  We teach "individual outcomes vary; expected value describes the mathematical average across repeated play", **not** "everyone loses".
* Slots (Neon Orchard): RTP 89.5%, house edge 10.5%. Prism Wheel (18 red / 18 black / 2 green color bet): 5.26%. Twin Dice (doubles pays 5.5×): 8.33%.
  The Fair Flip teaching game has 0% edge.
* Sportsbook: each fictional leg is priced `(1 − margin) ÷ true probability` (margin 4.5%, so an even matchup pays 1.91×). Parlay legs multiply,
  so does the margin. The simplified parlay math assumes independent legs (stated in-app).
* Zone 7: every simulated player repeats the student's **exact wager sequence** on the same game. Zone 8: the student's strategy
  object is run by the same function for the student and for all 10,000 simulated players.
* Reels, wheel and dice artwork are decoration chosen to match an already-drawn outcome. The in-app note says the classroom
  simulation uses randomized JavaScript and does not describe every commercial machine.

Run the math tests: `node house-edge/tests/engine.test.js`

---

## 3. Files

```
house-edge/
  index.html        page shell (HUD, zone bar, mission bar)
  styles.css        design system, Level-based visual transformation, print styles
  js/config.js      ★ ALL probabilities, payouts, levels, zones, simulation settings, sources, timings
  js/engine.js      random numbers, outcome draws, EV, session/strategy runners, Monte Carlo, parlay math
  js/progress.js    localStorage state, steps, percent, Analyst level
  js/ui.js          DOM helpers, sound (generated locally, OFF by default), modal, confetti, background
  js/charts.js      canvas charts (histogram, dot plot, lines, bars, survivors)
  js/questions.js   ★ question bank + reusable question engine
  js/xray.js        X-Ray overlay and layers
  js/zones1-4.js    the zones (intro, Z1–Z10)
  js/report.js      completion screen, report, exit ticket, print sheet, Help & Sources
  js/debrief.js     Teacher panel, Teacher Summary, Classroom Debrief presentation mode
  js/app.js         shell, routing, level-ups
  tests/            engine.test.js (math), e2e.js (full 0→100% playthrough), layout.js (layout/accessibility)
```
Plain scripts (no modules), so it also works when you double-click `index.html`.

---

## 4. Run locally

* Easiest: open `house-edge/index.html` in Chrome (double-click works).
* Or serve the folder: `python3 -m http.server 8000` then visit `http://localhost:8000/house-edge/`.

## 5. Deploy with GitHub Pages (teachers)

1. Push this repository to GitHub.
2. **Settings → Pages → Build and deployment → Deploy from a branch →** choose `main` and `/ (root)` → Save.
3. After a minute your URL is `https://YOUR-USERNAME.github.io/YOUR-REPO/house-edge/`. Give students that one link.

All paths are relative, so the folder can also be moved into its own repository (then the URL ends in `/`).

---

## 6. Customizing (no programming experience needed beyond editing text/numbers)

Open the file in any text editor (or GitHub's pencil icon), change a value, save. Re-run `node house-edge/tests/engine.test.js`
if you changed math (optional). **Refresh the page.** Use the Reset button to start over with new settings.

### Probabilities and payouts — `js/config.js`, section `games`
Each outcome has `p` (probability) and `ret` (tokens returned per token wagered, stake included). Probabilities **must add up to 1**.
The app checks this on load and logs `CONFIG ERROR` in the browser console if not.
```js
{ id: 'jackpot', label: 'Triple Star', p: 0.004, ret: 50 }
```
RTP = Σ p × ret. House edge = 1 − RTP. Everything else (X-Ray tables, EV questions, 10,000-player charts) updates automatically.
Other tunables: `evGame` (the +8/−10 bet), `edgeLab.edges` (0/2/5/10% experiment), `sports.margin` and `sports.slate` (true win
probabilities), `sim.sizes`, `sim.claim` (the "500 → 1,400" story), `beat` (strategy options), `slotSession` (min/max spins, what counts as a big win).

### Payout table words, text and numbers inside questions — `js/questions.js`
Each question has: `id`, `zone`, `concept`, `type` (`mc`, `numeric`, `predict`, `poll`, `scenario`), `prompt`, `choices` (with an optional `why` shown when that wrong choice is picked),
`correct`, `ok` (correct feedback), `no` (generic incorrect feedback), `required` and `learn` (shown in the report if the student corrected a misconception).
Numeric questions use `correct`, `tol` (tolerance), `mode: 'prob'` (accepts `1/6`, `16.7%`, `0.167`) or `mode: 'num'`. Text can be a function so numbers come from the config.
Mastery (Zone 9) questions are those with `zone: 'z9'`: add or remove them to change the number of locks (8–12 recommended).

### Timing — `js/config.js`, section `timing`
`reelStops` (slot reel stop times), `celebrateMs` (how long BIG WIN! plays before the freeze), `randomScanMs` (the X-Ray random-number scan),
`strategyStepMs` (Zone 8 playback speed) and `parlayStepMs` (parlay survivors animation). Required spins/rolls are in `slotSession`, and per-step requirements are in the zone files.

### Zones, levels and required steps — `js/config.js`, sections `zones` and `levels`.

### Reset progress
* Student: the **Reset** button (top right) asks for confirmation and erases this browser's saved work.
* Teacher (shared Chromebooks): Chrome → Settings → Privacy → Site settings → clear data for this site, or run `localStorage.removeItem('houseEdge.v1')` in the console.

---

## 7. Teacher Mode and Classroom Debrief

Click **Teacher** (top right; this is a convenience, *not* a security feature). It contains: learning objectives, estimated time, concepts covered,
math models (generated from the live config), simulation assumptions, mastery requirements with an answer key, discussion questions, the **Teacher Summary**
(expected misconceptions, takeaways, vocabulary, common reactions, clarification points, follow-ups, extensions), sources and settings.

* **Teacher Demo Mode** (Settings tab) unlocks every zone so you can jump around while presenting. It is OFF by default, and students follow normal progression.
* **START CLASSROOM DEBRIEF** (or open `.../house-edge/#debrief` directly) launches 8 large-type discussion screens: win with a house edge, the "5,000-token win" problem,
  Player A vs B, the parlay challenge, remove the lights, "what would you advertise?", the screenshot problem and the final question.
  Keys: **← →** navigate, **R** reveal answer, **S** run simulation, **X** X-ray, **Esc** exit. It works with no student progress.
* Optional name field: Teacher panel → Settings → *Show an optional name field*. Names are **never collected by default** and stay on that device.
* No class-wide data is gathered (there is no server). Students can **PRINT / SAVE RESULTS** (the browser print dialog; choose "Save as PDF"). The printout emphasizes understanding, not winnings.

## 8. Privacy
All data (answers, predictions, balances, simulation summaries, reflections) lives in `localStorage` under the key `houseEdge.v1` in the student's browser.
No analytics, cookies, trackers, fonts or scripts are loaded from other sites. The only external links are optional "open ↗" source and help links the student clicks.

## 9. Accessibility
Keyboard operable, visible focus, ARIA roles/labels (live regions for feedback, dialogs with focus trapping, labelled charts), high-contrast dark theme, touch targets ≥ 40px,
responsive from phone to Chromebook, `prefers-reduced-motion` honored (plus a manual switch in Teacher → Settings). **No animation is required to understand a lesson**; every animated reveal is also shown as text/numbers.
Sound is **OFF by default**, generated in the browser (no copyrighted audio).

## 10. Sources and verification status
See **Help & Sources** in the app (and `config.js → sources`). Research claims are kept modest and labeled
**MATHEMATICAL FACT / SIMULATION ASSUMPTION / RESEARCH FINDING / ILLUSTRATIVE EXAMPLE**.
Citations for the near-miss (Clark et al., 2009), losses-disguised-as-wins (Dixon et al., 2010), illusion of control (Langer, 1975) and hot-hand/re-analysis
(Miller & Sanjurjo, 2018) were confirmed to exist via web search while building. **Items marked `PLACEHOLDER` still need a teacher to verify** (e.g. the Gilovich et al. 1985 page numbers, the general statistics textbook chapter, and a state-specific problem-gambling link).
The national helpline number has changed hands recently; **confirm the current number on ncpgambling.org before class** and update `js/report.js` if needed.

## 11. Testing performed
`node house-edge/tests/engine.test.js` (probabilities sum to 1, RTP/EV/edge values, Monte Carlo vs theory, parlay math, percentile math, parsing),
`tests/e2e.js` (Playwright/Chromium: 0%→100% playthrough incl. wrong-answer retries, locks, level-ups, refresh persistence, report, print sheet, debrief, teacher panel, reset)
and `tests/layout.js` (no horizontal scroll at 1366×768, 1280×720 and 390×800, accessible names, keyboard, reduced motion, 10,000-player timing, lucky/unlucky messaging).
Playwright is only needed for the tests, never for the app.

## 12. Known limits (honest list)
* The 20–40 minute estimate has not been measured with real students.
* The Zone 8 "play" is generated by the same engine as the 10,000 players and replayed bet by bet, so the session is determined when you press Play.
* Teacher Mode and Demo Mode are not protected by a password; a curious student could turn Demo Mode on.
* Parlay math assumes independent legs (flagged in the app).
