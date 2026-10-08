# walk-with-the-teacher

Teacher walk through AI literacy (`index.html`).

## 90-minute time limit (all five summatives)

Every summative (`health-summative/`, `substance-use-summative/`, `unit7-nutrition-activity/`, `community-health-mission/`, `wildcats-wellness-quest/`) has a hard 90-minute limit counted from the moment the student starts. A countdown shows in the top bar (amber under 15 minutes, red under 5, with warnings at 15, 5 and 1), refreshing or reopening the page does not add time, and at zero the work so far is submitted and locked automatically; anything unanswered earns 0. Change or turn it off with `timeLimitMinutes` (`0` = off) in each app's `config.js` (`community-health-mission/server/grading.js` has `TIME_LIMIT_MIN`, enforced by the server; rebuild and redeploy `Code.gs` after changing it).

## The Wildcat Wellness Trail: Mental Health Unit assessment (`health-summative/`)

An animated, ~45-minute, self-grading summative assessment for the Mental Health unit (64 questions, 10 stations, a capstone, a final score page, and an optional Google Sheet backend with a "Reteach" tab). Static site, no build step, no trackers.

Student link once GitHub Pages is on: `https://YOUR-USER.github.io/walk-with-the-teacher/health-summative/`

Start with `health-summative/README.md` (setup and deploy), `health-summative/ROLLOUT.md` (counselor email, pilot plan, day-of checklist) and `health-summative/DISCREPANCIES.md` (things to confirm against your slides).

## SIGNAL: Substance Use Summative (`substance-use-summative/`)

An immersive, self-grading, ~55-minute Grade 10 Health summative on substance use: eight missions, five simulations (reaction time, an alcohol BAC model, overdose response, a branching social-pressure conversation, an Evidence Lab), interactive graphs, three attempts per question (100/85/75/0), a 100-point score, a Google Sheets backend with server-side re-scoring, a teacher dashboard, and a hidden Preview Mode. Start with `substance-use-summative/README.md` and **`docs/DISCREPANCIES.md`** (the unit's slides were not available when this was built).

## BodyLab — Health Metrics Explorer (`body-lab.html`)

A single-file, offline classroom app (open `body-lab.html` in Chrome/Edge/Firefox/Safari).
A 3D anatomical figure responds to ~30 lifestyle choices; a patient chart shows the worksheet
metrics (BP, resting HR, respiratory rate, temperature, SpO₂, glucose, lipids, BMI, sleep…) plus
extras, and a microscope lens zooms from cells to molecules.

Sources live in `body-lab-src/`; rebuild with `node body-lab-src/build.js`.
Fictional, simplified model — not medical advice.

## SMART Goal Studio (`smart-goal-studio.html`)

Interactive SMART goal planner for high school students. Five guided steps (Specific, Measurable,
Achievable, Relevant, Time-bound) build a live goal sentence, then a Game Plan with timeline chart,
milestones, weekly schedule, first-week launch list, if-then plans and a progress log.
Single file, works offline, saves only in the student's own browser.

## Stress & the Brain Lab (`stress-brain-lab.html`)

Single-file, offline 3D classroom app that teaches the "Stress and the Brain" lesson (stressors, fight/flight,
sympathetic "gas pedal", parasympathetic "brake pedal", acute vs. chronic stress, coping).

- Procedural 3D brain with folded cortex, lobes, deep structures (amygdala, hippocampus, hypothalamus, pituitary,
  thalamus), brainstem, spinal cord, vagus nerve and body organs (heart, lungs, gut, adrenals, muscles).
  Surface / X-ray and Brain / Body views; drag to rotate, scroll to zoom.
- Cursor effects: hover any part to see a real-world application tooltip with a glowing cursor; click for a full card
  (what it does, real-life examples, what stress does, a live reading, and a "Show me" demo).
- Lab: add or remove 10 stressors (acute events end on their own, chronic ones persist, intensity sliders) and
  8 coping tools (lower the demand or boost recovery). Animated reactions: alarm chain (amygdala to hypothalamus to
  adrenals to body), adrenaline/cortisol particles, heartbeat + ECG, breathing, gut slowing, muscle tension,
  prefrontal cortex dimming, tunnel vision, thought bubble, and "skip ahead a week" to see chronic wear and tear
  (amygdala more reactive, hippocampus shrinking) and recovery.
- Seven guided lessons mirror the slides. Checks for understanding are built into every lesson, the Explore
  "find it in 3D" challenges, and the Lab missions (29 points total).
- Grading with unlimited attempts: first-try correct = 1 point, correct after retry = 0.5; Report tab shows letter
  grade, per-topic breakdown, past attempts and the exit ticket, with print/save-as-PDF. Saved only in the browser.

Sources live in `stress-brain-src/`; rebuild with `node stress-brain-src/build.js`.
Fictional, simplified model, not medical advice; time is compressed.

## Health by a Thousand Choices (`health-by-a-thousand-choices.html`)

Single-file, offline classroom simulation for the "Small Choices, Big Consequences" lesson. Students
guide an animated person from age 14 to 65 through 50 health decisions (2–4 options each), following
the STOP process (State, Think, Observe, Pick). Choices are scored on the worksheet's A/B/C scale
across five domains (Physical, Mental, Emotional, Social, Environmental).

- Realistic-proportion female or male figure (short, bob or long hair). Face, skin (sunburn, spots, wrinkles), weight, posture, hair, breathing, cough, oxygen tank, cane,
  room and friends all change with health; an "inside view" shows lungs, heart, brain, liver and arteries.
- Each choice sets a habit that keeps acting as time passes, so damage and benefits build up over the years.
- Unlimited trials; challenge badges for one healthiest and one unhealthiest run; results screen with
  running-total graph, Domain Balance table, life timeline, side-by-side trial comparison, full choice log
  and reflection questions that mirror the worksheet.

Sources live in `thousand-choices-src/`; rebuild with `node thousand-choices-src/build.js`.
Fictional, simplified model, not medical advice.

## Lucky Rush Casino — House Edge Lab (`lucky-rush-casino.html`)

Single-file, offline classroom simulation for the gambling-awareness lesson ("House-edge simulation").
Students get fake tokens (1,000,000 coins, no real value) in a deliberately slick mobile-casino clone:
slots and dice, huge numbers, animations, sounds, welcome, daily-chest, wheel and mystery-box gifts (kept modest so students spend time actually playing), VIP levels,
leaderboard, live-winner feed, auto-spin/turbo, rescue gifts.

- Math: slots return 90.5% (9.5% house edge) from a fixed outcome table, with near misses and
  "losses disguised as wins" layered on top; dice are fair but pay 2.2x / 5x instead of 2.4x / 6x.
- **X-Ray Mode** (toggle any time, or start with it on for a teacher demo) names each manipulation as it fires.
- A class-round spin cap ends the game into **The Reveal**: your real totals, balance chart, gifts vs. bets,
  near-miss and fake-win counts, a 3,000-player simulation showing the house winning over the long run,
  every trick used, discussion questions and a helpline.
- **Teacher tally**: each student copies a short code; paste them all into the teacher tool to total the
  class and show "the house" coming out ahead while some individuals finish ahead.
- Calm mode reduces flashing/shaking. Nothing is saved; no network needed; no purchases are real.

**Escalation + limited wallet:** rewards (level-ups, mystery boxes) are earned by how much is *wagered*, a "Double up & win it back"
button appears after losses, and bets go up to 500K. Students can buy coins with a limited pretend wallet ($20 by default,
$0/$10/$50 selectable on the start screen); when coins, the one free rescue gift and the wallet are all gone, the game ends in
a "BUSTED" reveal screen. Nothing real is ever purchased.

**Pacing (≈15-minute activity):** everything is scaled small so a typical student goes bust in roughly 10–15 minutes:
50,000 starting coins, bets from 500 to 50,000 (default 2,500), small gifts, coin packs of 5K–60K for $1.99–$19.99
from the pretend wallet, and one free 10,000-coin rescue. The class round defaults to a **15-minute timer** (10/20 minutes,
spin counts or free play also available); students never see a clock. A simulation of mixed betting styles put the
default 2,500 bettor at about 11–14 minutes to bottom out, heavier bettors and loss-chasers in 2–5 minutes, and very
cautious (1,000) bettors still ahead when the timer ends.

## PARLAY LAB (`parlay-lab/index.html`)

Static classroom simulation about probability, parlays and risk (fictional basketball, pretend Lab Tokens). See `parlay-lab/README.md`.
Run the checks with `node parlay-lab/tests/run-tests.js`.

## THE HOUSE EDGE — Think You Can Beat the Game? (`house-edge/index.html`)

Full gambling-literacy investigation for high school students (fictional tokens only, no real money).
Students go from **PLAYER** to **ANALYST** across 10 zones: probability, a fictional slot machine with **X-Ray Mode**, expected value,
house edge/RTP/variance, a fictional sportsbook with parlay X-ray, cognitive biases and interface design, a **10,000 Players Lab**,
a "Can you beat the house?" strategy challenge, scenario mastery locks and a final **X-Ray Everything** reveal. Includes a personal
*Gambling Literacy Report*, exit ticket, print sheet, Teacher Mode and a presentation-style **Classroom Debrief**.
Static (no build, no server), progress saved only in the student's browser. One URL for students:
`https://<user>.github.io/<repo>/house-edge/`. See `house-edge/README.md` for teacher instructions, how to edit probabilities,
payouts, questions and timing, and the tests (`node house-edge/tests/engine.test.js`).

## Teacher mode in every summative

Each summative has a private way for the teacher to click through the whole assessment without answering, which never records a student score:

| Summative | How to open it |
|---|---|
| `health-summative/` (Wildcat Wellness Trail) | Type the teacher code (default `WALK-TEACHER`) in the **Class code** box. See its README, section 10b, to change it. |
| `wildcats-wellness-quest/` | Footer **Teacher reset** -> teacher passcode -> **Open teacher mode**. |
| `substance-use-summative/` (SIGNAL) | Add `?preview=1` to the address and enter the preview passcode (default `WALK-TEACHER`). **Continue** is never locked in Preview Mode. |
| `community-health-mission/` | **Teacher sign-in** on the sign-in screen, then **Start preview** (server-checked passcode). |

The shared teacher code is **`WALK-TEACHER`** (type it in capitals) for the first three. Community Health Mission checks its passcode on the server, so set it to the same value in the spreadsheet's teacher menu. Each app stores only a hash or verifier of it, so changing it later means regenerating each one (see each app's README).

## Wildcats Wellness Quest (`wildcats-wellness-quest/`)

Animated summative assessment for a high school health unit (five dimensions of wellness, health metrics, habits and SMART goals, media literacy, STOP decisions, and the Health by a Thousand Choices simulation). Static site with automatic scoring (100 points), strict 2-3 attempt policy with equivalent retry variants, a locked final report with JSON/print export, and a passcode-protected teacher reset. Optionally sends each student's result (with a class code) to your own Google Sheet via `apps-script/Code.gs`. See `wildcats-wellness-quest/README.md` for setup, GitHub Pages deployment, limits and teacher materials.

## Unit 7: Nutrition & Physical Activity digital summative (`unit7-nutrition-activity/`)

An interactive, self-grading, ~1-hour Grade 10 Health summative on nutrition, labels, physical activity and FITT, marketing literacy, SMART goals and food systems (Food, Inc. 2 concepts). Seven missions, five simulations, plan builder, clickable labels/maps/posts, interactive graphs, three attempts per question (100/85/75/0), required class-block dropdown (Block 1/2, 3/4, 6/7, 8/9), a Google Sheets gradebook that routes each submission to its block (with item analysis and live class analytics), a **teacher analytics dashboard** ("What should I reteach?", block comparison, individual reports, CSV and grade export), Preview Mode and demo data.

Student link once GitHub Pages is on: `https://YOUR-USER.github.io/walk-with-the-teacher/unit7-nutrition-activity/`. Start with `unit7-nutrition-activity/README.md` (setup and deploy), `docs/DISCREPANCIES.md` (the unit's slides were not available when this was built) and `docs/BLUEPRINT.md`.
