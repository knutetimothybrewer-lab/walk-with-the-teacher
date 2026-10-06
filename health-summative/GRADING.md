# GRADING.md — exactly how scores are calculated

Everything below is implemented in `js/engine/scoring.js` and `js/engine/grade.js` and covered by the unit tests in `tests/unit/scoring.test.js` (`npm test`). The end-to-end test (`npm run test:e2e`) also recomputes the final percent *independently* from the content files and checks that it matches what the app shows.

## 1. Attempts and credit

Every question allows **3 attempts** (`maxAttempts` in `config.js`). Credit depends on the attempt on which the student gets it right (`attemptCredit` in `config.js`):

| Solved on | Share of the points |
|---|---|
| Attempt 1 | **100%** |
| Attempt 2 | **90%** |
| Attempt 3 | **75%** |
| Not solved after attempt 3 | **0%** for the unsolved part. The correct answer and the explanation are then shown. |

After a **wrong** attempt the student sees a *hint* (a misconception-specific hint for the option they chose, if one is written; otherwise the question's general hint), never the answer. After a **correct** answer they see a short "why" tied to the lesson.

## 2. Points per question

* Default: **1 point** for a question with 1–3 sub-parts.
* Multi-part questions are weighted by their number of sub-parts (`pointsBySubparts` in `config.js`): **4–6 sub-parts = 2 points, 7 or more = 3 points**.
* An individual question can set its own `points` in the content file.

A *sub-part* is: one answer for a single-choice question; one **correct** option for a select-all question; one **card or row** for a sorting, matching, ordering or tagging question.

## 3. Partial credit (multi-part questions)

On each attempt the question produces a **fraction** between 0 and 1:

| Question type | Fraction on that attempt |
|---|---|
| Single choice | 1 if right, 0 if wrong |
| Select all that apply | **(right picks − wrong picks) ÷ number of right options**, never below 0 |
| Sort / match / order / tag | **(cards in the right place) ÷ (all cards)** |

Credit for that attempt = `points × fraction × attemptCredit[attempt − 1]`.

**The question's score is the best credit across its attempts.** After a wrong attempt, correct sub-parts stay locked in place (and show a check mark) and wrong ones go back to be fixed, so on the next attempt the student only fixes what is wrong. Wrong options in select-all questions are crossed out and cannot be re-picked.

Worked examples (a 4-card sort worth 2 points):

| What happens | Score |
|---|---|
| All 4 right on attempt 1 | 2 × 1 × 1.00 = **2.00** |
| 3 of 4 right on attempt 1, then all right on attempt 2 | max(2 × 0.75 × 1.00 = 1.50, 2 × 1 × 0.90 = 1.80) = **1.80** |
| 2 of 4 on attempt 1, 3 of 4 on attempt 2, all right on attempt 3 | max(1.00, 1.35, 1.50) = **1.50** |
| 3 of 4 right on every attempt, never finished | max(1.50, 1.35, 1.125) = **1.50** |
| Select-all with 4 right options: picks 3 right + 1 wrong on attempt 1 | fraction (3 − 1) ÷ 4 = 0.5 → 2 × 0.5 = **1.00** (then fixes it on attempt 2 → **1.80**) |

## 4. Skipped questions

Questions that involve scenarios some students may find uncomfortable have a **Skip this question** button (a "Skip this scene" button for the two conversation scenes). A skip earns **full credit** for the question (for a scene, all of its steps), is logged only as `skipped` (no answers, no attempts), and is excluded from the "first-attempt correct" statistics on the Items and Reteach tabs.

## 5. Final score

```
final % = (sum of credit earned over all questions) ÷ (sum of points possible) × 100
```

Rounded to a whole percent **half-up** at the very end only (e.g., 73.5 → 74). The final screen says **"Your final score: XX%"** plus the points (e.g., "92.4 out of 100 points"), a per-station breakdown (the same formula within each station) and a per-topic breakdown (used for "Strongest area" and "Worth another look"; a topic needs to be below 80% to be listed there).

If you remove questions (`disabledItems` in `config.js`) or turn the Capstone off (`capstone.enabled: false`), "points possible" shrinks to match.

## 6. Randomization

Station order is fixed. Within a station, question order and option order are shuffled per student with a seeded generator (seed = name + period + class code + retake number). A page refresh never reshuffles. A retake gets a new seed. Cards in a "match" activity are shuffled but the target rows stay in order. Some questions are pinned (`fixed: true`) when their order matters for learning: the Station 4 explorer, the first two Station 8 questions, and every Capstone section. No more than 3 consecutive entries share the same interaction kind, except the 3- or 4-step conversation scenes, which stay together.

## 7. What the credit rule does *not* do

* It does not penalize skips, help-button opens or time.
* There is no timer that locks anyone out. The "about N min left" note is a guide only and can be hidden per student (`extendedTime`).
* The score is computed in the student's browser. See README "Honest limits" for what that means and the server-grading upgrade path.
