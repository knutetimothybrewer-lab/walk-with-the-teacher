# Scoring model

* **Total: 100 points for every student**, regardless of which pool items they receive (checked by a unit test across 200 random versions; pool alternatives in a group always have equal point values).
* **Attempts.** An attempt is one press of **Check answer**. Changing an answer before pressing it costs nothing. After a wrong attempt the button stays disabled until the answer changes, so a student cannot waste an attempt by pressing twice.

| Result | Credit |
|---|---|
| Correct on attempt 1 | 100% of the question's points |
| Correct on attempt 2 | 85% |
| Correct on attempt 3 | 75% |
| Not correct after attempt 3 | 0%, the question locks, a short explanation appears |

* **Feedback text** is exactly: attempt 1 wrong "Not correct. Review the evidence and try again. 2 attempts remaining. Maximum available credit: 85%."; attempt 2 wrong "Not correct. 1 attempt remaining. Maximum available credit: 75%."; attempt 3 wrong "Maximum attempts reached." plus the explanation. No hints and no answer reveal before the lock.
* **All-or-nothing items.** Multi-select, sorting, matching, sequencing and slot-building questions are correct only when the whole response is correct. This keeps the three-attempt rule uniform.
* **Branching conversation (Simulation D).** One completed run through the conversation is one attempt. A run is correct when it contains no unsafe choice and the final meters meet the thresholds (Safety at least 85, Support at least 55, Pressure at most 45). 28 of the 325 possible paths qualify, so there are several good strategies (different combinations of assertive refusal, alternative, exit and support-seeking).
* **Persistence.** The attempt is written to storage **before** it is graded, so refreshing, closing the tab or losing power cannot undo it. An attempt that was in flight when a tab closed counts as used. In server-grading mode the server also counts every attempt.
* **Weighting by demand** (see `teacher-private/BLUEPRINT.md` for the generated table): recall/recognition about 16%, interpretation about 22%, application about 37%, analysis/evaluation about 25% of the points. Single items are worth 1 to 3 points, the multi-part simulations and sequences 3 to 5.

## Domain scores shown to students
Brain & Addiction 16, Nicotine/Tobacco/Vaping 15, Alcohol 18, Cannabis & Prescription Drugs 10, Opioids/Fentanyl/Emergency Response 16, Decision-Making & Refusal 17, Health Literacy 8 (points; the final synthesis case contributes to several domains).

## Where the code is
`js/scoring.js` (credit rules and totals), `js/engine.js` (attempt bookkeeping), `google-apps-script/Code.gs` `score_()` (server re-scoring). Tests: `tests/unit.test.js`, `tests/gas.test.js`, `tests/e2e/behaviors.mjs`.
