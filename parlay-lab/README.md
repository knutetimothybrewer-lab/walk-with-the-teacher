# PARLAY LAB — Risk • Probability • Psychology

An interactive classroom simulation about **probability, parlays, expected value, variance and house advantage**.
Students predict the outcome of a **fictional basketball game**, build single predictions and multi-leg parlays with pretend
**Lab Tokens**, watch the game unfold live, and then explore the mathematics behind what happened.

**Educational simulation only.** No real money, no real teams or players, no sportsbooks, no purchases, prizes, deposits or
cash-outs. Lab Tokens have no real-world value and disappear when the session is reset.

It is a plain static website (HTML + CSS + JavaScript). No server, no database, no accounts, no installs, no build step.
It works on school Chromebooks in Google Chrome.

---

## 1. Quick start for teachers

1. Open the site (`parlay-lab/index.html` on GitHub Pages, see section 9).
2. Click **Teacher Mode**. Click **GENERATE CLASS CODE** (or type your own like `HEALTH101`, `PERIOD3`, `OCTOBER6`).
3. (Optional) change settings and click **Save settings**.
4. Click **COPY STUDENT LINK** and put it in your LMS. (Students can also open the site and type the code.)
5. Students: open link → enter class code → **JOIN CLASS** → study, predict, lock in, watch.
6. Afterward: **REPLAY GAME** (class code, game 1) to discuss, then **REVEAL MATH**.

**Everyone with the same class code watches the exact same game.** Their results differ only because they made different decisions.

> If you change settings (house margin, game length, token limits…) give students the **student link**, not just the code — the link carries your settings.
> A student who types only the code gets the defaults.

## 2. What students do

Study matchup & statistics → choose predictions → build a parlay → choose Lab Tokens → **lock in** → watch → see each leg resolve →
analyze why it won or lost → reflect → explore the Probability Lab → copy a session summary.

Three learning modes (chosen on the first screen):

| Mode | What it emphasizes |
|---|---|
| Guided | probabilities and explanations visible throughout |
| Experience First | probability hidden until the student presses “Reveal probability” or reviews the slip, then revealed |
| Statistics Lab | probability, expected value, simulation, long-run results |

Tabs: **Game**, **Probability Lab** (Parlay Visualizer, Monte Carlo 10,000 trials, Luck vs. Skill, Class Experiment), **Learn**
(independent vs correlated events, gambler's-fallacy coin demo, house advantage, near misses, glossary), **My Session**
(history table + final report + copy buttons), **Discussion** (class prompts).

## 3. Project structure

```
parlay-lab/
  index.html            page shell, loads the scripts in order
  css/styles.css        look & layout          animations.css  motion (respects reduced-motion)     responsive.css  screen sizes
  data/teams.js         the 8 fictional teams  players.js      the fictional players and ratings
  js/seededRandom.js    seed → hash → random numbers (the heart of classroom mode)
  js/gameEngine.js      possession-by-possession basketball simulation
  js/league.js          builds matchups, standings, team ratings
  js/model.js           replays the matchup hundreds of times to estimate probabilities
  js/props.js           every prediction (winner, spread, total, player props, events) and how it resolves
  js/probability.js     math: probabilities, correlation, house-margin pricing
  js/parlay.js          building, checking, pricing and resolving parlays
  js/simulation.js      Monte Carlo, luck-vs-skill, class experiment
  js/analytics.js       session statistics, observations, copy-able summaries
  js/classroom.js       teacher settings, class codes/links, student session state
  js/storage.js         localStorage (refresh protection)
  js/lessons.js         teaching text: questions, explanations, glossary — edit wording here
  js/charts.js          small SVG chart builders
  js/ui.js, court.js    shared UI helpers; court drawing + playback clock
  js/app.js, viewsGame.js, viewsLab.js, viewsMisc.js   screens and controller
  js/selftest.js        automated reproducibility + math checks
  tests/run-tests.js    run the same checks in Node:   node tests/run-tests.js
```
Each sport lives in its own engine file (`gameEngine.js` = basketball), so football/baseball/soccer/hockey engines could be added later.

## 4. How the simulation works

The game is played **possession by possession**: turnovers and steals, shot selection (two or three), made/missed shots, blocks,
rebounds, assists, fouls and free throws, fatigue and substitutions, scoring runs, timeouts, quarter ends and overtime.
Player ratings (finishing, three-point shooting, rebounding, playmaking, defense, stamina, usage) and team pace/home court shift the
probabilities of each event but **never guarantee** anything. Every player also gets a random "form" for the night, with occasional
outlier games, so strong teams lose and role players sometimes explode.

The whole game is generated **in advance** from the class code (`generateGame`). The screen only *plays back* that timeline, so nothing a
student does can change it. Student state (predictions, tokens, answers) and game state (the seed's game) are separate objects.
Playback compresses a 48-minute game into about 4 minutes at 1X (2X and 4X available).

## 5. How probabilities work

For each matchup the app **replays the same game 500 times** (setting `modelSamples`). The share of replays in which something happens
is its estimated probability. Betting lines (spread, total, player lines) are set near the middle of those replays, with alternate lines
above and below. The game students watch is a separate, independent draw from the same engine. Because every replay is a full game,
**correlations appear naturally** (a team that wins usually had a star who scored well).

For parlays, legs on the *same* number (e.g. Over 15.5 and Over 20.5 points) are merged into one requirement; legs on different numbers are
combined with a Gaussian copula estimated from the replays, so related legs are not simply multiplied. “Show the math” displays both the
independent estimate (just multiplying) and the correlation-aware estimate.

## 6. How parlays and house margin work

```
fair return    = stake ÷ probability that ALL legs happen
offered return = fair return × (1 − margin)^number of legs
expected value = probability × offered return − stake
```
The default margin is **5% per leg**. Because the margin is applied to every leg it *compounds*: more legs → bigger built-in advantage.
Predictions so likely that a win would pay less than the stake are shown as “not offered”.
Contradictory legs (Over and Under the same line, both teams to win…) are blocked with an explanation; strongly related legs get a note.

## 7. Classroom seeds

`seed text → hash → pseudo-random generator`. Same code ⇒ same matchup, rosters, pregame stats, probabilities, every shot, every box-score
number and prop result. Game 1 uses the code; later games add a suffix (`CODE#2`, `CODE#3`…), so a class also shares games 2, 3, … Codes are
case-insensitive, trimmed, and limited to letters, numbers, spaces, `-` and `_` (max 64 characters). **Individual Practice** generates a random code (shown on screen) just for that student.

Randomness uses only `+ − × ÷` arithmetic (no `Math.log/cos`) so different browsers produce identical games. **Check it any time:** Teacher Mode → *Run self-test*,
or open the page with `#selftest`. The “game fingerprint” for `HEALTH101` should read the same on every computer.

## 8. Teacher Mode (no login)

* **Settings:** Starting Tokens, Maximum Tokens Per Prediction, Maximum Parlay Legs (1–12), Simulation Speed, House Margin, Reflection Frequency,
  Difficulty (Introductory / Standard / Advanced — changes what is shown, never the game), Probability Visibility, Game Length (6/9/12-minute quarters), model replays.
* **Create class session** (preview as a student; shows skip buttons), **Replay game** (play, pause, 1X/2X/4X, skip to Q2/Q3/Q4, show final result),
  **Reveal math** (probabilities, fair vs offered values, margins, correlations, parlay ladder, expected-vs-actual player stats), **Run class experiment**,
  **Open Probability Lab**, **Reset session**, **Self-test**.
* The replay has the four-step discussion sequence: *Before game → During → After → After reveal*.
* Students are never ranked and nothing is uploaded. Students can **copy** an anonymous results summary or session summary to paste into your LMS.

## 9. Deploy on GitHub Pages (step by step)

1. Sign in at github.com and create a repository (or use this one).
2. Upload/push the project files (the `parlay-lab` folder, or its contents at the repository root).
3. Open the repository **Settings**.
4. Click **Pages** in the sidebar.
5. Under *Build and deployment*, choose **Deploy from a branch**.
6. Pick your branch (usually `main`) and the **/ (root)** folder, then **Save**.
7. Wait a minute or two for the green “Your site is live” message.
8. Copy the URL (for this repo: `https://USERNAME.github.io/REPO/parlay-lab/`).
9. Open it yourself once, use Teacher Mode to make a class link.
10. Give students the student link through your LMS.

To update later, change files in the repository (edit on github.com or push) — Pages redeploys automatically. All paths are relative, so any repository subfolder works.

## 10. Customizing

* **Teams:** edit `data/teams.js` (names, colors, pace, home boost). Keep 8 teams unless you also extend the code in `league.js`.
* **Players:** edit `data/players.js`: `['Name', 'G/F/C', number, 'archetype', quality]`. Exactly 8 per team; first 5 are starters. Quality ≈ 55–92.
* **Starting tokens / max legs / margin / game length:** Teacher Mode, or defaults in `DEFAULT_CONFIG` at the top of `js/classroom.js`.
* **Wording of lessons and questions:** `js/lessons.js`.

## 11. Chromebooks & reliability

No external fonts, scripts, images or services — everything loads from the repository. Layout is tuned for 1366×768 and works larger or smaller.
Keyboard navigation, visible focus, ARIA labels, tooltips that open with keyboard/touch, results shown with icons *and* text (not color alone), and reduced-motion support are built in.
Progress is saved in `localStorage` (token balance, locked slips, history, reflections, game position); after an accidental refresh students see **EXISTING SESSION FOUND → RESTORE SESSION / START OVER**.

## 12. Known limits / future ideas

* Probabilities are simulation estimates (about ±2 percentage points). Raise “model replays” for more precision (slower to load).
* One sport (basketball). The engine/props split is meant to allow others later.
* Class results are anonymous, copy-and-paste only (GitHub Pages has no database). A shared results board would need a backend and is intentionally not included.
* Feedback text is intentionally neutral (“Outcome Correct”, “Parlay Requirement Not Met”). Nothing recommends bigger stakes or hot-streak thinking.
