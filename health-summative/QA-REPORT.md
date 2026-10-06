# QA-REPORT.md — what was tested and what was found

Run on 2026-10-06 in Chromium (Playwright 1.56) on Linux. Everything below can be re-run with the commands shown.

## 1. Automated tests

| Check | Command | Result |
|---|---|---|
| Scoring engine, grading, seeded shuffle, no >3-in-a-row, variants, plan building, completion code, **Apps Script backend logic (mocked)** | `npm test` | **24 / 24 pass** |
| Browser end-to-end (14 scenarios) | `npm run test:e2e` | **14 / 14 pass** |

What the 14 browser scenarios cover: wrong and empty class codes (and case-insensitive codes); **a full run through all 10 stations with a deterministic mix of perfect, second-try, third-try, failed and skipped answers, where the app's final percent equals the independently computed value** (the test recomputes the score from the content files without calling the app's scoring code); refresh-resume (same item, same option order, same points); refresh in the middle of retries (attempt count kept); **offline submit then retry** (score and code still show, "may not have been sent" message, queue is sent on "Try sending again"); duplicate prevention and teacher reset with a reshuffle on the retake; per-student `extendedTime` / `largeText`; the Help dialog works on every screen and **offline**; **keyboard-only** (form, multiple choice, select-all, sort, tag, Check/Next); `prefers-reduced-motion` (no infinite animations); read-only review of finished stations while later stations stay locked; and, at **360×640 (phone), 1366×768 and 1280×720 (Chromebook)**, no horizontal overflow, no console errors, and no touch targets under 34 px on every screen type.

Bugs the tests found and fixed during the build: a select-all dead end (Check disabled after the wrong option was removed); stations with every question disabled crashed; the scene Skip button never appeared and skipping a scene did not jump past it; finished stations were not reviewable until after clicking Continue; low-contrast footer on the sunrise sky; an interactive chart inside an `role="img"` SVG.

## 2. Accessibility

* **axe-core** (WCAG 2.0/2.1 A and AA + best-practice) run on 16 screen types (welcome, three dialogs, station intro/end, the first question of every interaction kind including chat, explorer, tag, sort, match, order, final): **no violations** (`node tests/e2e/a11y.js`).
* **Lighthouse** on the welcome page: **Accessibility 100**, Best-practices 100, Performance ~78–81 (many small module files on a local test server; `npm run build` adds module preloads; JavaScript total is ~204 KB against the 1.5 MB budget).
* Not testable here: a real screen reader (NVDA/JAWS/VoiceOver/ChromeVox) and real Chromebook hardware. Please run one student with a screen reader in your pilot if you have one.

## 3. Screenshots

All stations were captured at desktop and phone size (`node tests/e2e/shots.js /tmp/shots desktop,phone`) and reviewed by me for overflow, clipping and contrast. Issues found and fixed: header too tall on phones (points chip hidden under 520 px), footer contrast on the light sky, poster order. The tool reports no horizontal overflow at any step at 360×640.

## 4. Independent content audit (separate reviewer agent, no build history)

The reviewer read every item, the three readings and the sources, checked facts against search excerpts (cdc.gov, pmc.ncbi.nlm.nih.gov and pewresearch.org were blocked by the network policy, so primary pages were not read), and reported: **no safe-messaging violations, no methods or graphic detail, no diagnosing of characters**, and one blocker plus many "should fix" items. **All blockers and all but a handful of the others were fixed**:

| Finding | Action |
|---|---|
| **Blocker: Capstone §5 routed "talks about wanting to die" to "911"** while Stations 7–8 teach "get an adult now" | Third box is now "Adult now, plus 988 or 911" (with the instruction in the box); explanation matches |
| Keyed answer was the longest option in 33 of 35 single-choice items | Keys shortened and distractors lengthened; longest-is-correct now 19 of 35 and keys rarely exceed distractors by more than ~20% |
| Debatable keys: Priya/Leo zones, Alex "distress" vs "not enough info", "Background" never defined, Maya "Intensity" line, clue table overlap, panic "fades in 10 minutes" | Vignettes and keys rewritten (durations added, intensity line, clue table pairs), "Background" defined on the station intro, panic stated as "peaks within minutes" |
| Suicide statistics (14% vs 27%) in a reading; hint pointed at that sentence | **Removed**; the reading is qualitative; hint rewritten |
| 2025 YRBS data (released Sept 21, 2026) made "2023 is the latest" outdated | Confirmed via news reports; chart now includes 2025 (about 33%) and items say "peaked in 2021, then fell" (flagged ✱ for you to confirm on cdc.gov) |
| "Are you safe right now?" alone is vague | Chat key now adds "Are you thinking about hurting yourself?"; explanation updated. **Please have your counselor read this scene.** |
| Safety scene lacked a route if the counselor is unavailable | Explanation adds any trusted adult, 988 call/text, 911 for immediate danger (also on the red-flag question) |
| "Promise you won't tell" stem too broad; "sudden calm" inconsistency; s7-06 not skippable | Stem narrowed to safety; s7-06 marked skippable and distractors fixed |
| Circle-of-support and navigator overlap (teacher in two tiers; first-stop arguments) | Tier 2 described as counselor / school psychologist / social worker; navigator re-framed as "which helper does this job?" |
| Hints that gave away answers | Rewritten as strategy prompts in the items the reviewer named |
| "Most researchers" overstated; debate passage at grade ~13 | Rewritten as a balanced summary of the evidence; passage simplified; Orben/Przybylski survey-measurement claim attributed to "other researchers" |
| Misc.: wrong "first smartphone" hint, name reuse (Priya, Theo, Alex, Sam), "weird", overstated reassurances, long explanations, Pew passage merging two reports | Fixed |

Not changed (judgment calls): the reviewer's suggestion to also mention the National Academies and Surgeon General reports in the debate (left out to keep the reading short), and "each label used once so students can finish by elimination" in a few match items (kept; they are recall items).

## 5. Coverage audit

`node tools/content-map.js` verifies that every bullet in section 3 of the brief maps to existing scored items: **no missing topics**. 27 topics are assessed by exactly **one** scored item because the time budget forced cuts (listed in CONTENT-MAP.md; for example the 4 zone names, stressor definition, the pathway order, the WSCC components, the Capstone sections, Pew/CDC social-media figures). Not built as separate items: a stand-alone sleep item, a myths-and-facts station, the prefrontal-cortex enrichment, and a timed quick-fire vocabulary mode (all noted in CONTENT-MAP.md and DISCREPANCIES.md).

Cognitive mix (64 questions): **recall 23%, apply 55%, analyze 22%** (targets 30 / 50 / 20).

## 6. Timing check

`TIMING.md` models a typical student at about **49 minutes including the welcome (2) and final (1) screens**, i.e. 46 minutes of questions, at the upper end of the 45 ±5 target. A first draft of 87 questions modelled at about 70 minutes was cut to 64. The model is untested with real students; pilot first. `TIMING.md` lists five low-priority questions you can switch off in `config.js` to save about 2.5 minutes.

## 7. Known limits and things I could not verify

* Source slides and documents were not available (see DISCREPANCIES.md #9), so slide numbers in CONTENT-MAP.md are unverified.
* CDC, PubMed Central and Pew pages could not be fetched; figures were confirmed from search excerpts and news coverage (SOURCES.md marks each ✱).
* The Apps Script backend is tested against an in-memory fake of Google's services; it has **not** been run in a real Google account from here. Please do the 10-minute test in README §6 step 8 before the pilot.
* Not tested: real Chromebook hardware, school content filters, a screen reader, Safari/Firefox. The app uses only standard browser features.
* No deployed link: I could not enable GitHub Pages from this session. `dist/` (and `dist.zip` after `npm run build`) is ready to upload; README §5 has the click-by-click steps.
