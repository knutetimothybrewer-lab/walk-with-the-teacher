# QA report (build verification)

Run in this environment (Node 22, Chromium via Playwright, viewport 1366 x 768 unless stated).

| Check | Result |
|---|---|
| Unit tests (`npm test`): SHA-256 vectors; 100/85/75/0 credit; every one of the 83 authored answers accepted and a wrong answer rejected through the hashed-key grader; no plaintext `ans`/`explain` in the public bundle; 200 random versions each worth exactly 100 points with all seven domains and no duplicate questions; deterministic seeding; answer shuffling and sequence start order never equal to the key; attempt written before grading and restored after reload; unresolved attempts count as used; BAC model properties (slower pace lowers the peak but not clearing time, food lowers and delays the peak, body size, never negative); chat-model paths | 11 of 11 pass |
| Apps Script tests against the real `Code.gs` + `KeyData.gs` in a mock runtime: setup/tabs, DEMO and configured codes, perfect submission scores 100 and writes 1 Summary row and 1 Questions row per question, idempotent resubmission, server re-scoring catches an inflated client score, late/extra attempts ignored, duplicate refusal and teacher reset, DEMO marking, server-side attempt counting (3 max, replay-safe, explanation only after lock), dashboard passcode and lock-out, analytics tab, `sampleSubmission()` | 8 of 8 pass |
| Browser behaviour (`tests/e2e/behaviors.mjs`): invalid code; missing fields; exact feedback text, no reveal, lock on third miss and explanation; unchanged answer cannot be resubmitted; attempts persist across refresh; credit 85% and 75% shown in the UI; progress restored after closing the tab; no horizontal overflow at 1366x768, 1024x768, 768x1024, 390x844; keyboard focus and visible focus ring; reduced-motion setting persists; completed attempt locked and cannot be restarted on the device; Preview Mode hidden from students, passcode-gated, tools work, student storage untouched | 10 of 10 pass |
| Full playthrough (`tests/e2e/run.mjs`): sign in with DEMO2026, practice item, all eight missions solved through the real UI (drag/tap sorting, matching, sequencing, timeline, ordered building, slots, hotspots, graphs, reaction trials, BAC controls, overdose scene, branching chat), submit, results | 58 of 58 questions, 100/100 points, no console errors |
| Backend playthrough, local grading (`tests/e2e/backend.mjs local`): real `Code.gs`; first submit dropped to test retry; "Saved on this device" then **Try again** succeeds; one Summary row (LIVE, 100%), one Questions row per question; duplicate refused; reload shows results; teacher Reset returns the student to sign-in | pass |
| Backend playthrough, server grading (`--strip` build): 58 server-side `check` calls, no keys in the bundle, same outcome | pass |
| Contrast (computed): button text on accent 6.3 to 11.6:1 in all nine themes; secondary text on panels at least 4.5:1; error/success/warning text on panels at least 7.6:1 | pass (WCAG AA) |
| Content length bias: correct option is the longest in 12 of 35 shuffled multiple-choice items (chance is 1 in 4 to 1 in 3) | acceptable |
| Per-version size: 58 scored questions, 100 points, estimated 54 min of item time | as designed |

## Not verified here (please check on your hardware)
* A real Google Apps Script deployment and Sheet (the backend ran in a Node mock of the Apps Script runtime; the logic and the HTTP contract are tested, but Google's permissions and quotas are not).
* Real school Chromebooks: touch drag, performance of the animated backgrounds on low-end devices (Settings > Reduce motion removes them), and the school network allowing `script.google.com`.
* Screen-reader walkthrough with ChromeVox/NVDA. The page uses semantic buttons, radio/checkbox roles, labelled groups, live regions for feedback and chart readouts, keyboard alternatives for every drag interaction, and data-table alternatives for every chart, but it has not been tested with a screen reader.
* Pilot timing with students (estimates only).
* The statistics flagged "spot-check" in `SOURCES.md`.
