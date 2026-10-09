# Testing: what ran, what passed, what did not run

Every number below comes from a run I made in the build environment on 9 October 2026 (Node 22, Chromium 141.0.7390.37 through Playwright 1.56.1, Linux). The raw outputs are kept in `tests/e2e/last-run.json`, `tests/gas/last-cost.json`, `tests/perf/last-run.json` and `tests/mutation/last-run.json`. Nothing here is a claim about the live Google deployment, which has not been tested (see "Not tested").

## Summary

| Layer | Command | Result |
|---|---|---|
| Unit tests (server logic, timer, scoring, contrast, public-content guards) | `npm test` | **92 of 92 pass** (see counts below) |
| Apps Script simulator tests (the Sheets adapter and workbook tools) | included in `npm test` | **17 of 17 pass** |
| End-to-end, real Chromium, real front end, real server code over HTTP | `node tests/e2e/run.js` | **20 of 20 pass** (19 scenarios on the practice set; 1 solves all 40 live questions through the UI) |
| Mutation testing of the tests | `node tests/mutation/run.js` | **30 of 32 mutations caught**; the 2 that survived are equivalent changes (explained below) |
| Content lint (runs on every build) | `node tools/build-content.js` | passes: 40 items, 100 points, all rules in QA_REPORT.md |
| Performance, 4x CPU throttle and slow 3G | `node tests/perf/run.js` | see below; the numbers are from this machine, not a Chromebook |
| Secrets gate | `node tools/check-secrets.js` | run before every commit; passed on the final run (74 committable files scanned against 120 private text needles) |

`npm test` runs `node --test tests/unit/*.test.js tests/gas/*.test.js`. If you add or remove tests, count them yourself with that command; this file was last updated at 92.

### Unit tests (75) and Apps Script simulator tests (17)

| File | Tests | What it covers |
|---|---|---|
| `tests/unit/scoring.test.js` | 16 | SHA-256 checked against Node's crypto, canonical JSON; credit 100/85/75/0 per try, lock after three misses, every question type graded correctly and wrongly, partial answers rejected, no key ever returned before it is earned, hints released after miss 1 and 2, percent and per-chapter points |
| `tests/unit/session.test.js` | 35 | Sign-in (wrong code, wrong block, bad inputs, case and spacing), duplicate IDs resume, last-name check, block lock, Begin starts the clock, server-enforced deadline, late answers rejected, the 5-minute sweep, accommodations, closed assessment (including a student who signed in before it closed), student token expiry, teacher login and throttle, reset and History, preview isolation, roster, analytics, CSV, Test Connection, internal errors never leak a stack trace, unknown actions and prototype tricks rejected |
| `tests/unit/timer.test.js` | 8 | Client clock estimate from the server clock, clock jumps, thresholds for amber, red and banner, aria-live moments |
| `tests/unit/contrast.test.js` | 9 | WCAG AA contrast (4.5:1 text, 3:1 large and UI) for every colour pair in all six chapter palettes, computed from the real `css/tokens.css` |
| `tests/unit/content.test.js` | 7 | Public content guards: no answer-bearing field names in `items.json`; the figure descriptions, alt text and SVG source never contain a label of a labeling question; no XML comments in SVGs; at least five options on every single-answer question; no text from the private bank in public docs or data files |
| `tests/gas/gas.test.js` | 17 | The committed `Code.gs` equals what the build produces and contains no keys; workbook setup (tabs, hidden and protected data tabs, random class codes, one timer); teacher password stored only as a hash; item-bank loading; a full student flow into Sessions, Responses, Master Dashboard and block tabs; wiping the cache mid-test changes nothing; busy lock gives a retryable BUSY and the retry is graded once; 30 students answering interleaved; the 5-minute trigger; late submissions refused by the server; reset; accommodations survive a cache wipe; preview isolation; teacher token expiry and login throttle; `doGet` reveals nothing; cost per answer; the real-size bank fits Sheets and cache limits |

### What the Apps Script simulator is, and is not

`tests/gas/sim.js` is a strict stand-in for the Apps Script services the code uses (SpreadsheetApp, CacheService, LockService, PropertiesService, ScriptApp, ContentService, Utilities). It is deliberately unforgiving: sheet writes outside the grid throw, `setValues` needs exact dimensions, the cache refuses values over 100 KB and expires on a clock, the script lock is a real blocking lock that times out, and each request runs in a fresh JavaScript context. It caught real bugs (a session record that grew to 27.8 KB because an explanation was stored twice, grid-bound writes in the wide block tabs, a missing field on a duplicate reply). **It is my model of how Google behaves. It is not Google.** Anything Google does that I did not model will only show up on the live deployment.

Measured in the simulator, a graded answer on a warm cache costs **1 sheet read, 1 sheet write and 1 append** (`tests/gas/last-cost.json`). That is a count of operations, not a time. I have no measurement of how long those take on Google.

## End-to-end scenarios (20)

Real Chromium drives the real page against the real server code (`tools/dev-server.js`, which serves the static files and the same JSON API as the Apps Script web app, with test-only hooks to move the server clock and inject failures). Every scenario below passed on the final run.

1. Sign-in: wrong code, wrong block, empty fields, then success
2. Duplicate student ID resumes; a second sign-in signs the first tab out; block and name are checked
3. Refresh mid-question: page, attempts, hints and the running clock all come back
4. Offline then online: the answer waits, no attempt is used, then it is graded once
5. Dropped and 503 responses are retried with the same request ID
6. Expiry during a question: the late answer is rejected and the work is auto-submitted
7. Timer: normal, amber at 30 minutes, red at 10, banner at 5, aria-live announcements, 00:00 submits
8. Hints, attempts and locking: hint after miss 1 and 2, lock and explanation after 3, credit labels
9. Stage gating: the next scene opens only when the earlier one is correct or locked; evidence must be read first
10. Every widget type works by click only (label, classify, order, single, multi, numeric)
11. Keyboard only: pick with Enter, place with Enter, Escape cancels, order buttons work
12. Drag and drop with the mouse
13. Final submit: review lists unanswered questions, confirm dialog, completion with score, locked afterwards
14. Teacher: wrong password, `WALK-TEACHER` opens teacher sign-in, monitor, reset with typed last name, the student gets a fresh start
15. Teacher: preview never touches student data; answer-key overlay; free navigation; reset my preview
16. Teacher: settings, Test Connection, analytics, reference, CSV export
17. Responsive and accessible basics: no horizontal scroll at 360 px, every control has a name, reduced-motion toggle
18. Security: the page never receives answer keys; the public question file has none
19. Demo mode (empty `API_URL`): the in-browser server runs a labeled practice set with no backend
20. **Live bank: all 40 questions solved through the real UI, final score 100/100** (about 67 seconds)

The browser console is also watched in every scenario: any console error or warning (this includes Content-Security-Policy violations) or uncaught page error fails the scenario. The expected network errors in the offline and failure scenarios are allow-listed.

## Mutation testing

`tests/mutation/run.js` copies the project to a scratch folder, makes one deliberate bug at a time (32 in all: wrong credit values, a fourth attempt, accepting extra choices in select-all, a late-answer grace period, a missing class-code check, a missing last-name check, tokens that never expire, a missing throttle, a 1-character teacher password, a lock that is never released, preview answers written to the student log, and so on), rebuilds `Code.gs`, and runs the unit and simulator tests. A bug that no test notices "survives".

**30 of 32 were caught.** The first run caught 28; the two survivors that were real gaps (a student who signs in, the teacher closes the assessment, and the student then presses Begin; and student tokens that never expire) now have tests and are caught. Two survivors remain, both equivalent changes:

- *Ordering ignores a wrong-length answer*: the request validator already rejects a wrong-length order before grading, so the second check inside the grader is defence in depth that no input can reach.
- *Teacher token cached for 6 hours instead of 2*: `core.js` checks the token's expiry time itself, so the cache lifetime cannot extend it.

This tests the tests, on the server code only. The 32 mutations are ones I chose; a different set could find different gaps. The front end has no mutation testing.

## Performance

`node tests/perf/run.js` loads the live bank in Chromium behind a gzip dev server (like GitHub Pages), with Chrome's CPU throttling and network emulation. **A 4x CPU slowdown on this machine approximates a slow Chromebook; it is not a measurement of one.** Results from the last run (9 Oct 2026):

| Profile | To sign-in form | First paint | Transfer | Requests | Sign-in to ready | Begin to first question | Five labels + Check | Worst long task |
|---|---|---|---|---|---|---|---|---|
| No throttling | 511 ms | 336 ms | 55 KB | 16 | 170 ms | 1119 ms | 904 ms | 66 ms |
| 4x CPU | 415 ms | 188 ms | 49 KB | 15 | 393 ms | 859 ms | 1517 ms | 92 ms |
| 4x CPU + Fast 3G (150 ms RTT, 1.6 Mbps) | 1083 ms | 684 ms | 49 KB | 15 | 539 ms | 980 ms | 1699 ms | 94 ms |
| 4x CPU + Slow 3G (400 ms RTT, 400 kbps) | 2790 ms | 1824 ms | 49 KB | 15 | 1096 ms | 1258 ms | 1977 ms | 101 ms |

- The whole page is about 49 to 55 KB over the wire in 15 to 16 requests, with no framework, no web fonts and no third-party scripts.
- **These timings vary a lot from run to run.** An earlier run on the same machine measured 132 ms for the unthrottled load (and 2557 ms for 4x CPU plus slow 3G); this run measured 511 ms. Treat the numbers as "about a second on a fast connection, about three seconds on a very slow one", not as precise figures.
- "Begin to first question" and "five labels + Check" include the **local dev server** answering instantly. On the live deployment each answer is a round trip to Google Apps Script, which I could not measure. Answer-check time will be dominated by that round trip, not by the page.
- The build uses lazy loading (the assessment and teacher screens load only when needed) and module preloading; before that change the slow-3G load was 5.0 s.

## Not tested (please read)

- **The live Google Apps Script deployment.** Not once. The server code has run only in Node and in my simulator. First-run problems are possible (authorization, quotas, latency, behaviour of the lock under real load). SETUP.md step 10 (Test Connection) is the first real check.
- **Load on Google.** The 30-student test runs in the simulator, in one process. I did not test 30 devices answering at the same time against Google, nor several classes at once.
- **Real devices and browsers.** Only Chromium on Linux. Not tested: actual Chromebooks, Safari, Firefox, iPads or phones, touch input, the school's network or content filter, or Chrome extensions that block scripts. The 360 px check is a Chromium viewport, not a phone.
- **Screen readers and assistive technology.** No NVDA, JAWS, VoiceOver or TalkBack testing. The automated checks cover accessible names, roles, live regions, keyboard operation and contrast; they cannot tell you whether the experience is good. I did not run an automated accessibility auditor such as axe. WCAG AA conformance is **not** established by this work.
- **Real students.** No pilot, so no data on difficulty, wording, timing or confusion.
- **Outside sources and slides.** No health fact was checked against a cited page, and no question was checked against your slides (CURRICULUM_AUDIT.md).
- **Print and export formats**, and the Master Dashboard's appearance in Google Sheets (only its cell contents are tested).
- **Accessibility of the anatomy figures** to someone who cannot see them, beyond the text description. See TEACHER_REVIEW.md, A2.

## Secrets gate

`node tools/check-secrets.js` fails if anything private could be committed: tracked or un-ignored files under `authoring/` or `private/`; any committable file containing text from the private bank or the answer key; a class code, vault passphrase or teacher password in a committable file; or an answer-bearing field in `content/items.json`. It reads what git would commit now. **It cannot read meaning**: it did not catch that figure descriptions and a claims list spelled out answers in plain words (SECURITY.md, "What is in git history"). The content tests in `tests/unit/content.test.js` now cover the figure case; judging what a sentence gives away still needs a person.
