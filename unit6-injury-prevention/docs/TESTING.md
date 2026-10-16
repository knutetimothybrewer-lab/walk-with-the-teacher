# Testing: what was run and what was not

Run before every commit: `npm test` (unit and Apps Script simulator), `node tests/e2e/run.js` (needs Playwright and Chromium), `node tools/check-secrets.js`.

## Run and passing (all five missions)

- **Unit tests (`tests/unit`)**: grading of every question type (including the slider), 100/85/75 credit, locking after three misses, idempotent retries, the simulation gate on the server, the timer and auto-submit, sign-in by first and last name, teacher reset with typed confirmation, scoring, analytics, CSV export, WCAG contrast of every theme, public-content guards (no answer fields, figures never name their own labels).
- **Physics tests (`tests/unit/physics.test.js`)**: more speed means more force; a buckled dummy always takes less chest load and force than an unbuckled one at the same speed; a helmet always cuts head load by more than half and lowers risk; the egg sheet lengthens the stop and saves the egg; the model is deterministic and keeps the dummy inside the cabin.
- **Rescue model tests (`tests/unit/rescue.test.js`)**: a steady 110 per minute with a 250 ms hold reads as in-zone; too slow, too fast, too shallow, too deep, leaning and long pauses are each detected; infants use a gentler depth scale; hand-placement feedback; what each scene still needs.
- **Home model tests (`tests/unit/home.test.js`)**: every plan rule (bedroom and hall alarms, two ways out with one reaching outside, a fixed meeting spot far from the house); the night fire ends safely with the best choices and worse with standing, opening the door, running the hall, hiding or going back in; the window choice is refused when it is not on the plan; the kitchen fire (wrong extinguisher keeps you on the step, right one, stop-drop-roll, reporting); smoke exposure while crawling versus standing; cut and burn steps in order and unsafe choices refused.
- **Road model tests (`tests/unit/road.test.js`)**: more kinds of distraction mean a slower reaction in every mode; at 35 mph attentive and Do Not Disturb stop in time while typing does not; braking distance grows with the square of speed; biking and walking behave the same way; the vehicle moves, brakes and stops or hits as modelled; ruler distance and reaction time convert both ways.
- **Final report (`tests/unit/report.test.js`)**: the completion carries who and when, one row per question that adds up to the score, and no answer material; hidden scores hide the rows.
- **Simulation guards (`tests/unit/sims.test.js`)**: the feed never mentions the three scored myths or their facts; every post has a verdict, fact and source; the crash lab never shows the belt/helmet percentages; every simulation reports exactly the chips its unit gates on.
- **Apps Script simulator (`tests/gas`)**: `Code.gs` is exactly what the build produces; workbook set-up, tabs, protections, the 5-minute trigger, 30 interleaved students, real-size bank limits.
- **End to end (`tests/e2e`)**: 20 scenarios in real Chromium (the live-bank scenario also runs the rescue lab through its real controls: all three scenes by hands-free compressions plus breaths, and a full AED shock cycle), including refresh, offline queue and retries, expiry, timer levels, keyboard-only and click-only use of every widget, drag and drop, teacher mode, 360 px layout, security, demo mode, and **every live question solved through the real UI (running the crash lab through its real controls), final score checked**.
- **Screenshots**: each simulation tab (car, bike, egg, data) was rendered headless and looked at before this was reported done.

## NOT tested

- **The live Google deployment.** The build environment had no Google account. The server code ran only against the strict simulator in `tests/gas`. SETUP step 10 (Test connection) is how you find out.
- **Chromebook performance** of the crash lab (it runs a small physics solve in a few milliseconds and draws on a canvas; not measured on a real Chromebook).
- **Screen readers.** Labels, live regions and keyboard paths are in place and tested for presence, but no screen reader was run.
- **Real hand timing.** Press-and-hold compressions were exercised by synthetic pointer events and by the hands-free mode, not by a person on a touchscreen Chromebook.
- **Printing.** The print layout was written and the button is tested to exist, but a real printed page or PDF was not produced.
