# Testing: what was run and what was not

Run before every commit: `npm test` (unit and Apps Script simulator), `node tests/e2e/run.js` (needs Playwright and Chromium), `node tools/check-secrets.js`.

## Run and passing (Missions 1 and 2)

- **Unit tests (`tests/unit`)**: grading of every question type (including the slider), 100/85/75 credit, locking after three misses, idempotent retries, the simulation gate on the server, the timer and auto-submit, sign-in by first and last name, teacher reset with typed confirmation, scoring, analytics, CSV export, WCAG contrast of every theme, public-content guards (no answer fields, figures never name their own labels).
- **Physics tests (`tests/unit/physics.test.js`)**: more speed means more force; a buckled dummy always takes less chest load and force than an unbuckled one at the same speed; a helmet always cuts head load by more than half and lowers risk; the egg sheet lengthens the stop and saves the egg; the model is deterministic and keeps the dummy inside the cabin.
- **Rescue model tests (`tests/unit/rescue.test.js`)**: a steady 110 per minute with a 250 ms hold reads as in-zone; too slow, too fast, too shallow, too deep, leaning and long pauses are each detected; infants use a gentler depth scale; hand-placement feedback; what each scene still needs.
- **Apps Script simulator (`tests/gas`)**: `Code.gs` is exactly what the build produces; workbook set-up, tabs, protections, the 5-minute trigger, 30 interleaved students, real-size bank limits.
- **End to end (`tests/e2e`)**: 20 scenarios in real Chromium (the live-bank scenario also runs the rescue lab through its real controls: all three scenes by hands-free compressions plus breaths, and a full AED shock cycle), including refresh, offline queue and retries, expiry, timer levels, keyboard-only and click-only use of every widget, drag and drop, teacher mode, 360 px layout, security, demo mode, and **every live question solved through the real UI (running the crash lab through its real controls), final score checked**.
- **Screenshots**: each simulation tab (car, bike, egg, data) was rendered headless and looked at before this was reported done.

## NOT tested

- **The live Google deployment.** The build environment had no Google account. The server code ran only against the strict simulator in `tests/gas`. SETUP step 10 (Test connection) is how you find out.
- **Chromebook performance** of the crash lab (it runs a small physics solve in a few milliseconds and draws on a canvas; not measured on a real Chromebook).
- **Screen readers.** Labels, live regions and keyboard paths are in place and tested for presence, but no screen reader was run.
- **Real hand timing.** Press-and-hold compressions were exercised by synthetic pointer events and by the hands-free mode, not by a person on a touchscreen Chromebook.
- **Missions 3 to 5** are not built yet.
