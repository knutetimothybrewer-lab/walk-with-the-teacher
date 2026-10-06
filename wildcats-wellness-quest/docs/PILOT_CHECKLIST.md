# Teacher pilot checklist (Chromebook classroom trial)

**Status: not yet run.** No classroom pilot has been conducted. Timing figures elsewhere in these materials are design estimates from word counts, **not** observed student durations. Please run this pilot before using the assessment for grades, and adjust per the revision priorities below.

## Before the pilot
- [ ] Teacher passcode set (docs/TEACHER_SETUP.md) and tested; test data cleared.
- [ ] Choose **3-6 students** with a range of reading levels and Chromebook models, on school accounts and the same Chrome version students will use.
- [ ] Decide what you will measure: elapsed time per mission, where students pause, and what they say aloud.
- [ ] Tell students it is a pilot, results will not be graded, and they should say what confuses them. Do not coach on content.
- [ ] Have a stopwatch or the observation form below ready. The app has a pacing chip (Settings -> "Show a pacing guide") but it is wall-clock only.

## During the pilot (one observer per 1-2 students)
Record in the form. Observe silently; note, do not rescue, unless a student is stuck for more than a minute.

### Observation form (copy per student)
| Field | Notes |
|---|---|
| Student code / device (Chromebook model, screen size) | |
| Start time / end time / total minutes | |
| Reading ability (below / at / above grade level, teacher judgment) | |

| Mission | Start | End | Minutes | Retries used | Hints read? | Confused by instructions? (quote) | Perceived challenge (1 easy - 5 hard) | Notes |
|---|---|---|---|---|---|---|---|---|
| 0 Welcome + practice | | | | | | | | |
| 1 Whole-Health Hub | | | | | | | | |
| 2 Know Your Numbers | | | | | | | | |
| 3 Habit Workshop | | | | | | | | |
| 4 Fact or Fiction Media Lab | | | | | | | | |
| 5 STOP Crossroads | | | | | | | | |
| 6 Thousand Choices Simulator | | | | | | | | |
| 7 Final Transfer | | | | | | | | |

| Area | What to look for | Observed |
|---|---|---|
| Elapsed time | Total vs 30-40 min design range; missions that run long | |
| Unclear instructions | Re-reading, asking "what do I do?", wrong guesses at controls | |
| Reading load | Skimming options, giving up on long passages, rereading the same stem | |
| Perceived challenge | "Too easy" or "tricky wording" comments; unfair-feeling items | |
| Readability | Text size, contrast, dense screens on the Chromebook display | |
| Navigation | Finding Submit, Next, the map, My work; confusion about locks | |
| Input controls | Click-to-place or drag in the sort board; dropdowns; typing negative numbers; touch screens | |
| Accessibility | Keyboard use, text-size and animation settings, anyone using a screen reader or magnifier | |
| Retry flow | Do students understand hints, the "reconsider" step and the similar-new-question idea? | |
| Export and report | Can students download the JSON and find it; do they understand the results page? | |
| Technical | Lag, animation stutter, crashes, storage errors, console errors | |

After the session ask: What was confusing? Which part felt too long? Which question felt unfair? What would you change?

## Revision priorities (use your data)
1. **Blocking issues**: anything that prevents finishing, saving, submitting or exporting. Fix before class use.
2. **Instructions students misread**: reword on the screen where they stalled, or add a one-line cue.
3. **Time over 40 minutes**: shorten the longest items first (Mission 6 questions, Mission 2 reading cases, Mission 5 STOP options). Options to reduce time without losing coverage: shorten distractors, trim reference text, enable extended time (`extendedTime: true`) and plan a longer period. Do **not** add timers or reduce attempts to save time.
4. **Items that feel unfair or ambiguous**: check the answer key (docs/ANSWER_KEY.md). If a defensible alternative is being marked wrong, add it to the key with partial credit (then run `node tests/run-all.js`).
5. **Too easy / too hard**: use perceived challenge and actual first-attempt results (the exported JSON shows first-attempt evidence per item) to adjust distractor quality. Keep the 25/55/20 demand mix (`docs/COVERAGE_MATRIX.md`) and point totals.
6. **Layout and readability** on your actual Chromebooks.
7. **Reading load for students who read below grade level**: consider a read-aloud accommodation for your class, consistent with student support plans.

Record your decisions here and keep this file with your class materials.
