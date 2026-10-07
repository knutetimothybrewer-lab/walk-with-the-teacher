# Read this: things to confirm against YOUR instruction

## 1. The unit's source files were not available
The brief said the project folder contained the unit's instructional materials and asked that they be read first. This repository and the connected Drive contained **no substance-use slides, handouts or notes** (only other health units: mental health, gambling, stress). Therefore:
* The **content map** follows the topics, vocabulary and distinctions listed in the assignment brief (sections A to I), and publicly documented terminology from NIDA, NIAAA, CDC, FDA, SAMHSA and the Surgeon General.
* Your slides may use different wording, different numbers, or emphasize different examples. The item bank is built so each question's wording is easy to edit (`authoring/`).

**What to do:** compare `teacher-private/QUESTION_BANK.md` to your slides. Where vocabulary differs (for example "substance use disorder" vs "addiction", "physical dependence" vs "dependence", how many standard drinks count as a binge, naloxone steps), edit the authoring file and run `npm run build`. If you send the slides or handouts later, the content map and any mismatches can be corrected quickly.

## 2. Specific items worth checking
| Item | Why |
|---|---|
| `n5` timeline dates | Dates are public record, but your unit may use different milestones |
| `a-tab`, `ae-binge` | BAC effect descriptions and the binge definition vary by source and by age; the question avoids exact drink counts |
| `ov3` (five-step response) | Local protocols differ slightly on order (check/call/naloxone/position/stay). Items teach: call 911, naloxone if available, support breathing, stay |
| `o4` ("naloxone ... usually causes serious harm if given to someone who did not take an opioid") | Marked **not true**, consistent with public-health guidance that naloxone has no meaningful effect without opioids; confirm it matches your unit |
| Good Samaritan laws | Deliberately not assessed because they vary by state; add a state-specific item if you teach them |
| Not directly assessed | Nonverbal refusal (body language), the "broken record" technique by name (the refusal builder uses it, as "repeat" or "alternative"), cannabis effects on mood and perception as separate items (they appear inside `c1` and `cs-drive`), and prescription-opioid dependence risk as a standalone item (covered in `c-dep`, `o4`, `cs`) |
| Graph values | See `SOURCES.md` for which values are confirmed and which should be spot-checked |

## 3. Design decisions that differ slightly from the brief
* **Length:** exactly 58 scored questions per student in every version (pools swap equivalent items), 100 points, estimated 54 minutes of item time plus orientation. The estimate is from reading-and-response length; **time a pilot class** and adjust.
* **Chart library:** charts are hand-built in SVG (no Chart.js) so the project has no external requests and works offline on school networks.
* **Fonts:** self-hosted open fonts copied from this repository's other assessments.
* **Grading mode:** the default keeps hashed keys in the page for simplicity; the stricter server-grading build is supported (`SECURITY_AND_INTEGRITY.md`).
