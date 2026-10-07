# Read this first: things to confirm against YOUR instruction

## 1. The unit's source files were not available
The assignment asked for every PowerPoint, worksheet, guided-notes packet and documentary guide to be analyzed first. This repository (and the connected Drive) contained **no Unit 7 slides, handouts or guides** (only other health units: mental health, substance use, gambling, stress). So:

* The **content map** follows the topics, vocabulary and skills listed in the assignment brief and publicly documented terminology from HHS, CDC, FDA, USDA and MyPlate.
* **Weighting** follows the emphasis in that brief: Food Systems 21 pts (the longest topic list), Nutrition Labels 18, Physical Activity & FITT 16, Foundations 13, Marketing 13, SMART Goals 10, Integrated 9.
* Your slides may use different wording, numbers or examples. Every question is plain text in `authoring/m1.js` to `m7.js`; edit it and run `npm run build` (see README, "Changing a question").

**What to do:** read `teacher-private/ANSWER_KEY.md` next to your slides. If you send the slides, the content map and any mismatches can be corrected quickly.

## 2. Specific items worth checking against your slides

| Item | Why it might differ |
|---|---|
| Effort bands (`a-rpe`, `a-conflict`, the intensity simulator) | Uses the CDC 0 to 10 scale: light about 1 to 4, moderate 5 to 6, vigorous 7 to 8 and above. If your unit uses Borg 6 to 20 or different bands, change `PROFILES`/`BANDS` in `js/sims.js` and those two items |
| Talk test wording | "Sing = light, talk but not sing = moderate, a few words = vigorous" |
| Teen recommendations (`a-rec`, `a-plan`) | HHS 2018: 60 min/day; vigorous, muscle- and bone-strengthening on at least 3 days/week. The plan builder counts moderate and vigorous blocks toward the 60 minutes and does not count light activity |
| `a-type` | Basketball and jump rope are classified "aerobic AND bone-strengthening"; swimming and flat-path cycling "aerobic only" |
| FITT vocabulary | Time = how long (some units say Duration); Type = what kind (some units say Mode) |
| %DV benchmarks and Daily Values | 5% or less low, 20% or more high; DV values for a 2,000-calorie reference diet |
| `f-kcal` (4-4-9) | The calories-from-macronutrients calculation is included with the factors stated in the question. Remove it if you did not teach it (then rebalance 1 point) |
| `f-plate` (MyPlate) | Counts cream cheese, cream and whipped topping as NOT dairy-group foods, and fortified soy milk as a dairy-group alternative (MyPlate classification) |
| Health halo, PAUSE-QUESTION-VERIFY-DECIDE | Definitions are standard; the four step names are exactly as written in the brief |
| SMART wording | Specific, Measurable, Achievable, Relevant, Time-bound (not "Attainable" or "Realistic") |
| Food, Inc. 2 content | The film itself was not available. Items assess the concepts listed in the brief (food systems, food environments, consolidation, resilience vs efficiency, access, insecurity, ultra-processed foods, marketing, agriculture and environment trade-offs, workers, policy, regenerative agriculture, emerging technology, individual vs systemic influences) using public data. No question depends on a name, date or scene from the film; `s-doc` teaches how to evaluate a documentary claim |
| Agriculture and environmental trade-offs | Covered through regenerative practices (`s-regen`), emerging-technology evaluation (`s-tech`) and the network map (`s-network`). If your documentary work emphasized specific environmental trade-offs (for example emissions or runoff), add an item to `m6.js` |
| Students' own goals | All goal work uses fictional students (no personal disclosure, no weight, BMI or calorie goals) |

## 3. Design decisions that differ slightly from the brief
* **Time:** the estimate is about 58 minutes of item time (reading load + interaction + difficulty, with a retry allowance) plus orientation. It is an estimate from content, not a measurement. Pilot one class.
* **Chart library:** charts are hand-built SVG (no external library), so nothing is loaded from the internet.
* **Fonts:** self-hosted open fonts (Fraunces, Atkinson Hyperlegible, OpenDyslexic).
* **Local vs server grading:** the default ("local") checks answers in the browser against salted hashes. The stricter "server" mode never puts any answer key in the browser (see README section 13).
* **Class codes** are typed in plain text in `js/config.js` (and the SETTINGS tab). They are not secret from students by design (you give it to them); they keep outsiders out. Teacher codes (reset, preview, offline dashboard) are stored as one-way hashes.
* **Dashboard calculations** are done in the teacher's browser from the data the Sheet returns, so changing the class view is instant and nothing is hard-coded.
