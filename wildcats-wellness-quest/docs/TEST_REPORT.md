# Test report, attempt-policy verification, cognitive-demand audit and pacing estimate

**Read this first.** Everything in section 1-5 is **actually tested behavior** (automated, run in the build environment). Section 6 lists what is **assumption** and needs a classroom pilot. No classroom pilot has been run, and **no student duration has been measured.**

Environment: Node 22, Playwright 1.56 with Chromium 1194 (Linux), viewports 1366x768, 1280x720, 1024x700 and 390x780. Not tested on physical Chromebooks, other browsers, touch hardware or a real screen reader.

Run everything: `NODE_PATH=$(npm root -g) node tests/run-all.js` (Playwright and Chromium required for the browser suites; `--no-browser` runs the Node suites only).

## 1. Automated suites (10/10 pass)

| Suite | Checks | What it proves |
|---|---|---|
| `tests/content-tests.js` | 32,585 | Blueprint = 100 pts (12/16/18/18/14/16/6); 49 items, 0 manual points; every variant has the same part structure; an exhaustive search finds a perfect response for every variant; hints exist for every part; demand mix exactly 25/55/20 (A+D = 75, at least 70); attempt-policy maths; compatibility scoring; simulation model; case-week uniqueness |
| `tests/store-tests.js` | 59 | State save/resume, one-session lock, duplicate-submit protection, import validation and recomputation, older-backup protection, passcode cooldown, teacher reset, storage failure, report contents |
| `tests/e2e.js` | 70 | Real clicks: setup, practice, retry with variant, refresh persistence, sort board by click/keyboard/drag, overlap, ripple, locks, downloads, malformed/different-session imports, final submit with confirmation and double-click, locked reopen, marker-only lock, teacher passcode and cooldown, reset hand-off, no-passcode state, reduced motion, no horizontal overflow at 4 viewports |
| `tests/e2e-full.js best` | 21 | Complete run of all 7 missions through the UI = exactly **100.0**; first-attempt evidence 100 |
| `tests/e2e-full.js wrongfirst` | 21 | Every item wrong first, then right on the retry = exactly **90.0**; first-attempt evidence reported separately (3.0) |
| `tests/e2e-keyboard.js` | 13 | Complete run using only Tab/Space/Enter/arrow keys and typing (1,040 key presses) = **100.0** and a locked report; dialog focus trap and Escape |
| `tests/a11y.js` | 9 | Names on all controls, labelled inputs, no duplicate ids, heading order, SVG names, computed text contrast WCAG AA across 25+ screens, focus ring, target size |
| `tests/subpath-and-network.js` | 7 | Served under `/<repo>/wildcats-wellness-quest/` with relative paths: no 404s, no external requests, no fetch/XHR/WebSocket, no root-absolute paths |
| `tests/print-and-tools.js` | 9 | Print hides chrome and expands sections; PDF generated; passcode tool rejects short/easy/mismatched and its verifier re-derives independently |
| `tests/storage-fail.js` | 6 | Storage blocked: honest warnings, recovery download still works, avatar change cannot reset attempts |

## 2. Attempt-policy verification (tested)

| Requirement | Result |
|---|---|
| 5-pt item, correct on attempt 1 / 2 / 3 | 5.0 / 4.5 / 3.75 (tested) |
| Short items: 2 total attempts; complex: 3 | Default config; complex may be set to 2 |
| Partial credit retention | 4/5 on attempt 1 stays 4.0 after a weaker retry (tested) |
| Exhausted attempts | Item finalizes, score kept, progress allowed even if wrong (tested) |
| No further gain possible | Item auto-finalizes with a plain-language reason (tested) |
| Blank/invalid submissions | Do not consume an attempt (tested, also in UI) |
| Untouched items in a batch | Not submitted and never burn attempts (UI test: 3 of 10 cards submitted, 7 unaffected) |
| Hints | Conceptual only; no answer revealed while attempts remain; explanation withheld until finalization (UI test) |
| Reconsider before retry | Retry button disabled until the "I re-read the evidence and hint" box is ticked (UI test) |
| Equivalent variants | Retry shows a different checked variant; stored in state and survives refresh (UI test) |
| Refresh / navigate / import / avatar change | Never reset attempt counts (UI + store tests) |
| Final report | Three displays: completion, first-attempt evidence, assessment score; one-decimal display from the unrounded total |
| Optional practice | Held outside graded state; cannot change the grade |

## 3. Final submission, lock, import and reset (tested)

- Exact warning shown: "Submitting locks your assessment. You will not be able to change answers or start over without a teacher reset."
- Submit is disabled until every required item is finalized and the acknowledgement box is ticked; a confirmation dialog follows; a double-click produces exactly one submitted marker.
- Reload opens the locked read-only report; removing the active record still shows the locked report (the submitted marker wins); a new alias cannot bypass it.
- Malformed JSON, wrong format, wrong schema, invalid responses, extra attempts and tampered points are rejected or recomputed from the key, with a "your current work was not changed" message.
- An older backup merges monotonically (attempt counts can only rise). A record from a different session cannot replace work in progress. Any import is blocked while a submitted marker exists unless it is the same final record.
- Teacher reset: wrong passcodes change nothing; cooldown after 3 wrong entries; the correct passcode is also refused during cooldown; export-first prompt; explicit confirmation; new session ID labeled teacher-authorized (local, unverified); previous student data not in the next export; passcode never stored. With no passcode configured the control refuses (no default like 1234).

## 4. Simulation verification (tested)

- All-A week = +245, all-B = 0, all-C = -245; daily max 35; domain weekly maxima 56/49/49/56/35.
- Editing one cell recalculates daily, domain and running totals correctly; a mixed week is internally consistent (sum of days = sum of domains).
- Greatest-day ties return every tied day (positive and negative); all-neutral weakest-domain tie handled; the three case weeks have unique greatest day, unique weakest domain (margin > 4 percentage points) and a unique top category on the greatest day.
- Jordan's week intentionally has a lowest **raw** domain (Mental) different from the weakest **normalized** domain (Environmental). Maya's week has a positive total that hides a weak domain.
- Jordan's 12 decisions cover all five domains and use 12 distinct cells (no double counting). Revision effects are computed from category weights.

## 5. Guessing resistance and cognitive demand

- Uniform random answers on first attempts: mean 33.1 / 100. Random answers using **every permitted retry** (best retained, 400 simulated students): mean 48.5, 95th percentile 54.7, maximum 59.1. Random guessing never reached 70 (asserted). The baseline is not low because the policy gives retries, hints and partial credit; a student who also reads hints will score higher, so treat low-50s as the guessing floor when setting expectations.
- Demand mix (points): foundational 25, application in context 55, analysis/evaluation/construction 20; knowledge used in context = 75 (target at least 70). Per-item table: `docs/COVERAGE_MATRIX.md`.

## 6. Pacing estimate (design estimate, NOT a measured duration)

`node tools/pacing.js` counts the words a student reads in the primary variants, the number of selections, and applies stated assumptions.

| Mission | Words (primary path) | Selections | Est. min (220 wpm, 5 s/selection, 20% retry re-reading) | Blueprint target |
|---|---|---|---|---|
| 0 Launch | 284 | 2 | 1.6 | 2 |
| 1 Whole-Health Hub | 506 | 15 | 4.2 | 4 |
| 2 Know Your Numbers | 862 | 16 | 6.5 | 5 |
| 3 Habit Workshop | 762 | 18 | 6.4 | 5 |
| 4 Media Lab | 776 | 16 | 6.5 | 5 |
| 5 STOP Crossroads | 718 | 12 | 5.3 | 4 |
| 6 Thousand Choices | 1,238 | 28 | 9.7 | 7 |
| 7 Final Transfer | 527 | 6 | 3.6 | 4 |
| **Total** | | | **43.9** | 36 |

Sensitivity: fast readers (260 wpm, 4 s/selection, 10% retry text) about **35 min**; no retries at 220 wpm about **40 min**; slower readers (180 wpm, 6 s, 30% retries) about **56 min**.

**Honest conclusion.** The structure (about 120 required selections, 100 scored points) puts a typical student near the **upper end of, or modestly above, the 30-40-minute design range** (about 40-44 minutes in this model), with fast readers near the 36-minute target and slower readers needing roughly an hour. Because of this, the app never enforces time, offers extended-time guidance (`timeGuidance.extendedTime`), and the pilot checklist lists the first items to shorten. **Do not treat 36 minutes as validated.** The model also assumes students read every option; real skimming would shorten it, and difficulty with the reasoning items would lengthen it.

## 7. Issues found and fixed during testing (for transparency)

1. Content was first authored at about 59-68 estimated minutes; after a concision pass the estimate fell to about 44. (Pacing, section 6, remains the main open risk.)
2. Practice retry state was lost on refresh (fixed; refresh keeps the retry variant).
3. Item points showed 3.75 as "3.8"; per-item points now show up to two decimals (only totals round to one).
4. A null entry in dialog content crashed the import-error dialog; fixed.
5. Print: score cards vanished (entrance animation restarted at opacity 0) and collapsed sections stayed collapsed; both fixed, and counters are set to final values before printing.
6. Heading levels skipped (h1 -> h3); fixed. A small footer control was under 32 px tall; fixed.
7. Narrow-phone overflow in the sticky action bar and tab strip; fixed (tabs scroll inside their own container).

## 8. Known limitations and what still needs a human

- **Source decks and the worksheet were not supplied**: slide numbers are unverified (docs/COVERAGE_MATRIX.md).
- **Primary clinical/research sources could not be re-fetched** in the build environment (docs/SOURCE_REGISTER.md); numeric reference values need teacher verification.
- **No classroom pilot** has been performed; difficulty calibration, reading load and timing are unvalidated.
- Tested on desktop Chromium emulation only. Real Chromebook performance (animation smoothness, touchscreens, school-managed profiles that block storage) needs the pilot.
- No assistive-technology testing with a real screen reader; only structural/ARIA and keyboard checks were automated.
- The one-session lock, answer keys, grades, timestamps and passcode check are client-side. A technically capable student can bypass or alter them (README, "Honest technical limits"). A secure identity-based limit needs authenticated accounts and server-side records, which are outside this project's scope.
- No audio is used, so no captions or transcripts are needed.
