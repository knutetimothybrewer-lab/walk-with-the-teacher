# QA report (what was tested, and what was not)

Run on 2026-10-07 in the build container (Node 22, Chromium 141-class via Playwright 1.56.1).

## Automated results
| Suite | Result | Command |
|---|---|---|
| Engine / integration (31 tests) | 31 pass | `npm test` |
| Apps Script adapter against a Google-services mock (7 tests; runs the real generated `Code.gs`) | 7 pass | `npm test` |
| Real-browser walkthrough (31 checks) | 31 pass | `npm run test:e2e` |
| Demo build in a browser | pass | `node tests/e2e/demo.js` |

## Behavior covered
- **Scoring:** the four outcomes (100/85/75/0) per unit; weighted grade; one-decimal display with unrounded storage; 100 points / 29 units / per-location blueprint; at least 4 graph/table units; ≥7 interaction formats; ≥50% application-or-higher points.
- **Grading rules:** exact-set multiselect (order-insensitive, extra/missing wrong); numeric tolerances; equivalent plan solutions (two accepted soccer plans, three accepted budget pairs, multiple audiences); budget over-limit and wrong-count rejection before an attempt is used; blank/incomplete never consumes an attempt.
- **Server authority:** altered score/correct fields ignored; attempts beyond three refused; locked units frozen across reload; unknown unit/session/token refused; class closed/not-yet-open/wrong-version/roster-token rules.
- **Reliability:** duplicate request replay (including the current state in the replay), double click, stale second tab, lost response (response dropped after processing, client auto-retry), offline submit with recovery, injected storage failures not consuming attempts, gradebook failure → "pending" → retry once, idempotent finalization with stable receipt, reload/resume, 60-student interleaved simulation (and 45 × 29 through the Apps Script adapter mock).
- **Privacy/authorization:** answer-key/preview/export/reset/class endpoints refuse requests without a server-issued teacher token (student tokens and fake tokens included); passcode lockout; public bundles contain no key/hint/explanation/rubric text (automated check, also verified by string search of every committed bundle).
- **Preview:** isolated from production tabs (no sessions, responses, gradebook rows, summary entries); four outcome scenarios render the results screen with the required label and a simulated receipt; delivery test writes only an isolated record.
- **Reset / export:** audit row with reason, old responses kept, fresh session; CSV is class-filtered, UTF-8 BOM, quotes and formula-injection safe; Sheets cell guard for student strings.
- **UI:** all 29 units answered through the real UI at 1366×768 with no horizontal overflow; touch tablet (800×1100) layout; reduced-motion media query disables animation; in-app motion toggle; every button/input has an accessible name; keyboard focus reachable; data-table alternatives exist for every chart (`Data table` tab, noise-chart details table) and the outbreak picture view has a text table.

## Not tested / limits (be skeptical of anything here)
1. **No live Google deployment.** `Code.gs` ran only against a mock. Real behaviors that the mock cannot show: authorization prompts, `google.script.run` inside Google's iframe sandbox (localStorage may be restricted there; the app treats it as an optional cache), quota errors, lock contention under truly parallel executions, web-app access policy of your district. Do the steps in README step 6 and the delivery test.
2. **No real student timing.** The 53-minute blueprint and 55–60-minute estimate are modeled. Pilot required.
3. **Not tested on physical Chromebooks.** Tested in desktop Chromium at 1366×768 and a touch-emulated tablet viewport.
4. **Accessibility** was checked with scripted heuristics (names, focus, reduced motion, tables), not with a screen reader or axe-core. SVG maps expose labeled, keyboard-operable hotspots plus checklist equivalents; the county map has a separate mission list. A manual screen-reader pass is recommended.
5. **Content accuracy** of agency facts was checked against search-result excerpts only; sources were unavailable (see SOURCE_STATUS.md, SOURCES.md).
6. **Rate limiting of class-code guessing** is not implemented (only teacher sign-in lockout). Use unguessable class codes and close classes when done.
7. **Simulated "simultaneous" load** is sequential (Apps Script itself serializes writes through the lock); true parallel contention is untested.
8. Audio is not implemented at all (off by default requirement met trivially); no flashing/strobing effects exist.
