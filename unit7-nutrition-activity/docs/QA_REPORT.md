# QA report

Run on 2026-10-07 against content version 1.0.0.

## Automated results
| Suite | Command | Result |
|---|---|---|
| Unit tests (scoring, grading, randomization, calculations, plans, analytics, CSV, storage, content rules) | `npm test` | 25 tests, all pass |
| Google Apps Script backend (real `Code.gs` + `KeyData.gs` against a mock of Google Sheets) | `npm test` | 11 tests, all pass |
| End-to-end browser tests (Chromium via Playwright; real UI, real `Code.gs` behind a local endpoint) | `node tests/e2e/run.mjs` | see the final line of the log: 62 checks, all pass |

## What the tests cover (against the quality-control list)
| Requirement | How it is tested |
|---|---|
| All questions and every correct answer | For all 83 authored items (every pool alternative and numeric variant), the authored answer is accepted by the same grading function the page uses, a wrong response is rejected, and the answer can be recovered from the hash (so the interface cannot mark a correct response wrong because of faulty code). A full browser playthrough answers every question of a version through the real UI and scores 100.0% on the first attempt |
| Scoring and the 100/85/75/0 logic | Unit tests for the credit table and per-attempt points (including a 3-point item at 85% = 2.55); Session tests for "persisted before grading", lock after the third wrong answer, no further attempts, tab closed mid-attempt; backend tests recompute 100/85/75/0 from raw attempts; browser tests walk wrong, wrong, wrong with hints, no reveal after attempts 1 and 2, explanation after attempt 3 |
| Calculations | `f-kcal` variants (4-4-9), label math (%DV, scaling, 5%/20% benchmarks), `l-total`, `l-dv`, `l-interp` re-derived independently from the product data, plan evaluation for each recommendation |
| Randomized values | 40 seeds x 2 branches: every version totals exactly 100 points with identical domain weights, no duplicate questions, no leftover name placeholders; calculation variants and product names rotate; answer position is spread evenly across A to D |
| Graphs | Four bar charts and the label simulator bars render with no console errors; each has a data-table alternative, source links and animated growth |
| Drag-and-drop and keyboard alternatives | Real mouse drag, tap-to-place, and keyboard-only sorting (focus, Enter, Enter); ranking by up/down buttons; click-the-picture and choose-from-list for hotspots and red-flag selection; plan builder uses native selects |
| Autosave and refresh recovery | Page reload mid-assessment restores the step, answers and used attempts (attempts are not restored); completion survives reload |
| Class-code and block validation | Missing block, wrong code, missing name rejected; the block dropdown has exactly the four configured values; student block persists in the session |
| Google Sheet submission | End-to-end: submission recorded in MASTER RESULTS, routed to the right BLOCK tab only, item rows written, server re-scores, confirmation id returned |
| Duplicate submission | Same student (case and spacing differences ignored) cannot begin again; a forced duplicate is written as `DUPLICATE: REVIEW` and the original grade is untouched |
| Final locking and reset | FINAL SUBMISSION confirmation text, lock after submission, results on reload, new device refused, teacher reset (wrong code refused, right code supersedes the row, student can start again) |
| Preview Mode | Banner, correct-answer display, real wrong attempt through the grader, results preview, separate storage namespace, wrong passcode falls back to sign-in |
| Dashboard | Wrong passcode rejected; demo data generated (28 records, four blocks, labelled DEMO DATA); cards, class filter, most-missed list, question detail (correct answer and incorrect responses), reteach list, student report, grade-export CSV, delete demo data (real rows untouched) |
| Server-grading mode | Page loads only the key-free content file; hint after attempt 1; server counts attempts; explanation only after attempt 3 |
| Mobile, tablet, Chromebook | 1366x768, 820px tablet and 390px phone layouts have no horizontal scrolling and render questions |
| Accessibility | Semantic headings and landmarks, skip link, labelled form fields, visible focus outlines, ARIA radiogroups/checkboxes/regions and live regions, keyboard alternatives, reduced-motion switch and media query (run with `reducedMotion: reduce`), contrast checked: all text and button pairs in every theme are at least 4.5:1 (body text 7:1 or higher) |

## What could not be tested here
* **A real Google account.** The Apps Script was exercised against a mock of the Sheets, Properties, Cache and Lock services, and the formulas and formatting calls follow Google's documented APIs, but formulas (for example `FILTER`, `MAXIFS`, `ARRAY_CONSTRAIN`) and conditional formats are only computed by Google. Do the 10-minute check in README section 10 once: run `setupGradebook()`, then `sampleSubmission()`, and confirm the CLASS ANALYTICS and GRADE EXPORT tabs fill in.
* **Real student devices.** Chromebook layout was checked at 1366x768 in Chromium; pilot with one class for timing and device behavior.
* **Content against your slides.** See [DISCREPANCIES.md](DISCREPANCIES.md).

## Known limitations
* Time estimate (about 58 minutes) is modelled, not measured.
* Client-side security limits (README section 13, [SECURITY.md](SECURITY.md)).
* The consolidation simulator is a deliberately simple model.
