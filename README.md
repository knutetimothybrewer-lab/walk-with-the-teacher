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
