# Testing: what was run and what was not

Run before every commit: `npm test` (unit and Apps Script simulator), `node tests/e2e/run.js` (needs Playwright and Chromium), `node tools/check-secrets.js`.

## Run and passing (Mission 1 build)

- **Unit tests (`tests/unit`)**: grading of every question type (including the slider), 100/85/75 credit, locking after three misses, idempotent retries, the simulation gate on the server, the timer and auto-submit, sign-in by first and last name, teacher reset with typed confirmation, scoring, analytics, CSV export, WCAG contrast of every theme, public-content guards (no answer fields, figures never name their own labels).
- **Physics tests (`tests/unit/physics.test.js`)**: more speed means more force; a buckled dummy always takes less chest load and force than an unbuckled one at the same speed; a helmet always cuts head load by more than half and lowers risk; the egg sheet lengthens the stop and saves the egg; the model is deterministic and keeps the dummy inside the cabin.
- **Apps Script simulator (`tests/gas`)**: `Code.gs` is exactly what the build produces; workbook set-up, tabs, protections, the 5-minute trigger, 30 interleaved students, real-size bank limits.
- **End to end (`tests/e2e`)**: 20 scenarios in real Chromium, including refresh, offline queue and retries, expiry, timer levels, keyboard-only and click-only use of every widget, drag and drop, teacher mode, 360 px layout, security, demo mode, and **every live question solved through the real UI (running the crash lab through its real controls), final score checked**.
- **Screenshots**: each simulation tab (car, bike, egg, data) was rendered headless and looked at before this was reported done.

## NOT tested

- **The live Google deployment.** The build environment had no Google account. The server code ran only against the strict simulator in `tests/gas`. SETUP step 10 (Test connection) is how you find out.
- **Chromebook performance** of the crash lab (it runs a small physics solve in a few milliseconds and draws on a canvas; not measured on a real Chromebook).
- **Screen readers.** Labels, live regions and keyboard paths are in place and tested for presence, but no screen reader was run.
- **Missions 2 to 5** are not built yet.
