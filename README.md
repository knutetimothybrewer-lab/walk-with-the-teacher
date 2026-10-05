# walk-with-the-teacher

Teacher walk through AI literacy (`index.html`).

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

## Health by a Thousand Choices (`health-by-a-thousand-choices.html`)

Single-file, offline classroom simulation for the "Small Choices, Big Consequences" lesson. Students
guide an animated person from age 14 to 65 through 50 health decisions (2–4 options each), following
the STOP process (State, Think, Observe, Pick). Choices are scored on the worksheet's A/B/C scale
across five domains (Physical, Mental, Emotional, Social, Environmental).

- Face, skin (sunburn, spots, wrinkles), weight, posture, hair, breathing, cough, oxygen tank, cane,
  room and friends all change with health; an "inside view" shows lungs, heart, brain, liver and arteries.
- Each choice sets a habit that keeps acting as time passes, so damage and benefits build up over the years.
- Unlimited trials; challenge badges for one healthiest and one unhealthiest run; results screen with
  running-total graph, Domain Balance table, life timeline, side-by-side trial comparison, full choice log
  and reflection questions that mirror the worksheet.

Sources live in `thousand-choices-src/`; rebuild with `node thousand-choices-src/build.js`.
Fictional, simplified model, not medical advice.
