# Testing checklist

Automated (run before every release): `npm test` (unit and Apps Script tests), `node tests/e2e/behaviors.mjs`, `node tests/e2e/run.mjs`, and `node tests/e2e/backend.mjs` (full playthrough against the real `Code.gs` in a mock). Last results are in `docs/QA_REPORT.md`.

## CONTENT
- [ ] Every domain is represented (blueprint table; test asserts each domain appears in every version).
- [ ] Answers are scientifically accurate: spot-check `teacher-private/QUESTION_BANK.md` against your unit and `SOURCES.md`.
- [ ] Questions match what you taught (`DISCREPANCIES.md`).
- [ ] No accidental answer clues: correct option is the longest in about 1 of 3 multiple-choice items (chance level is 1 in 4) and answer order is shuffled per student.
- [ ] Distractors reflect real misconceptions (the blueprint lists the misconception for each item).
- [ ] Reading level and rigor are right for Grade 10.

## SCORING
- [ ] First-attempt correct = 100%, second = 85%, third = 75%, three misses = 0 (`behaviors.mjs`).
- [ ] Attempts persist after refresh and after closing the tab (`behaviors.mjs`).
- [ ] Total is 100 for every version; domain totals add up (`unit.test.js`).

## FUNCTION
- [ ] Invalid class code cannot begin; `DEMO2026` works.
- [ ] Refresh restores the session. Randomization works. Every simulation and chart works (Preview Mode > Graphs & sims).
- [ ] Final submission works; the Sheet receives Summary and Questions rows; duplicate submission is refused; completed assessment stays locked.
- [ ] Teacher Reset lets the student start over.
- [ ] Network failure at submission shows "Saved on this device. Waiting to send" and **Try again** succeeds (`backend.mjs`).

## UX (on a real Chromebook, in Chrome)
- [ ] 1366 x 768: no horizontal scroll (`behaviors.mjs` checks four sizes).
- [ ] Animations run smoothly; Settings > Reduce motion makes them still.
- [ ] Keyboard only: Tab reaches every control; Enter/Space select; sorting works with "tap an item, then tap a category" and sequencing with the arrow buttons.
- [ ] Text is readable; Larger text and the dyslexia-friendly font work.
- [ ] Touch: tap targets are at least 44 px; drag works with a finger.
