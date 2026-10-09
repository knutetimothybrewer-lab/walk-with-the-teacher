# Testing: what was tested, how to run it, and what was NOT tested

Results below are from the final build (2026-10-09). Nothing here claims more than was run.

## Automated tests that were run (all passing)

| Suite | Command | Result | What it covers |
|---|---|---|---|
| Engine | `node --test tests/engine.test.js` | **33 / 33** | Login rules and block codes; timer starts only at Begin and ends exactly 90 min later; resume on a new device with no extra attempts; 100/85/75/0 credit, hints, explanation only after lock; incomplete answers never use an attempt; idempotent retries; partial credit; numeric/ratio answers and per-student variants; lab-based answers recomputed from the student’s own seed; late answers rejected; offline students finalized by the server sweep; teacher auth and lockout; **Reset Student Progress** (archive, 3 fresh attempts, fresh 90 min); preview isolation and **Reset My Preview Progress**; codes (unique, open/closed, testable); fictional data kept out of the gradebook; analytics; report tables; answer key; export; **1,000+ hostile or malformed requests** (junk types, 100 KB strings, `__proto__` payloads) that must never crash, leak or change data. This fuzzing found and fixed a real bug (action names such as `__proto__` reached `Object.prototype`) |
| Google Apps Script mock | `node --test tests/gas.test.js` | **12 / 12** | The **real generated `Code.gs` and `KeyData.gs`** run inside a mock of `SpreadsheetApp`, `CacheService`, `LockService`, `PropertiesService`, `ScriptApp`: setup creates exactly the five primary tabs plus protected support tabs; web-app `doPost`; sheet writes; report rebuilds; sweep trigger; formula-injection guard |
| Question bank | `node --test authoring/bank.test.js` (needs the vault unlocked) | **13 / 13** | 32 items, 51 parts, 100 points; cognitive distribution within 3 points of 15/30/35/20; every item solvable and wrong answers really wrong; independent exact-fraction math checks; no answer leakage in anything served to students; time model: typical student 56–66 min, slow reader ≤ 90 |
| Color contrast | `node --test tests/contrast.test.js` | **9 / 9** | WCAG AA (4.5:1 text, 3:1 focus ring) for all six chapter themes, the results theme and the teacher theme, computed from `css/tokens.css` against the worse end of each gradient and the lightest panel |
| Browser end-to-end | `node tests/e2e/run.mjs` | **89 / 89** | Real Chromium, real UI, real engine (own dev server): see below |
| Accessibility scan | `node tests/e2e/axe.mjs` | **0 violations** | axe-core (WCAG 2.0/2.1 A and AA) on the login, teacher sign-in, all 8 teacher tabs and **every step of all six chapters** (44 screens) |
| Performance | `node tests/e2e/perf.mjs 4` | see below | Chromium with 4× CPU throttling |

### Browser end-to-end scenarios (89 checks)

1. **Full run:** wrong code refused; sign in; begin; 90:00 timer in the upper right; answer all 32 questions through the real widgets (choice, multi, number, ratio, select-matching, drag board via its menu, ordering) and complete all six simulations’ gates; submit; 100% on screen and on the server.
2. **Attempts:** hint after a miss; 85% on the second attempt; lock on the third miss; explanation only after the lock; refresh keeps the attempt count and hint; a fourth attempt is refused by the server.
3. **Resume:** same student on a second device; one record; block cannot be changed by the student; another block’s code fails.
4. **Expiry:** server clock moved past 90 minutes; late answer refused; Time Expired screen labelled Auto-Submitted; an offline student is finalized by the server without reconnecting; auto-submissions counted.
5. **Timer states** (via the preview): normal, amber at ≤ 30 min, red at ≤ 10, prominent final state and banner at ≤ 5; at 0:00 the preview locks; Reset My Preview Progress restores 90 minutes.
6. **Teacher:** privileged actions refused without a teacher token (and with a student token); preview shows the key and is graded but leaves the gradebook untouched; Reset Student Progress needs the confirm box, archives, restores attempts and 90 minutes, invalidates the old session; codes can be changed, closed and tested; duplicate codes refused; fictional data never in the gradebook.
7. **Keyboard:** Tab reaches the choices, focus is visible, Space selects, Tab reaches Check answer, Enter submits; the skip link is first.
8. **Layout:** no horizontal overflow on any student or teacher screen at 1366×768, 1024×700 and 390×844 (phone).
9. **Network:** offline answer is shown as not counted and uses no attempt; reconnecting records exactly one attempt; after refresh the timer shows the server’s remaining time; a browser clock an hour fast does not change the countdown.

### Performance (emulated, not real hardware)

Cold load to the sign-in screen: 31 files, about 219 KB uncompressed (fonts included in the page total after sign-in: about 452 KB). With 4× CPU throttling, the heaviest interactions took: +1,000 coin flips ≈ 0.25 s, the 1,000-player simulation ≈ 0.19 s, the 10,000-slip test ≈ 0.19 s, the neuroscience tab ≈ 0.32 s, cold load ≈ 2 s. All well under one second apart from the cold load. This is an approximation of a slow Chromebook, **not a measurement of one**.

## What was NOT tested

- **The real Google backend.** No Google account was available. The generated `Code.gs` ran only inside a mock. Real latency, quotas, lock behavior under many simultaneous students, sheet protection UI, the authorization screens, trigger timing and the `script.google.com` redirect behavior of `fetch` were not exercised. Use README Step 6 and a pilot class.
- **Load.** No test with 30+ simultaneous students.
- **Real Chromebooks and other browsers.** Only Chromium (desktop, headless). Not Firefox, Safari, ChromeOS, a touch screen (drag by finger), or a low-end device.
- **Screen readers.** Only automated axe checks, keyboard tests and ARIA structure. No NVDA, JAWS, VoiceOver or ChromeVox listening test. Please have someone try one.
- **Students.** No pilot with real students, so item difficulty, clarity, and the timing estimates (56–66 min typical, up to ≈ 88 for a slow reader) are **model estimates, not measurements**.
- **Content review.** A teacher should read every item and explanation. The Prediction Markets video was not viewable and the full text of the Casey et al. review was not read (see [SOURCES.md](SOURCES.md), [DISCREPANCIES.md](DISCREPANCIES.md)).
- **Print and offline-first use.** Not supported or tested.

## Running everything

```bash
npm install
node tools/vault.js unlock          # passphrase needed for the bank and its tests
node tools/build.js                 # regenerates Code.gs, KeyData.gs, docs; re-locks the vault
npm test                            # engine, Apps Script mock, contrast, bank
npm run test:e2e                    # browser end-to-end (needs Chromium; set CHROMIUM_PATH if needed)
npm run test:a11y                   # axe scan
node tests/e2e/perf.mjs 4           # performance under throttling
```
A public clone without the vault can still run `tests/engine.test.js` and `tests/contrast.test.js`.
