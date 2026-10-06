# Teacher source register

Retrieval date for this register: **October 6, 2026** (the date of the build session and of the source check in the project brief).

## Verification status: read this first

- The project brief supplied the source table below and stated it was checked on October 6, 2026.
- **This build environment could not independently re-fetch the primary pages.** Its network egress proxy blocked cdc.gov, heart.org, niddk.nih.gov, medlineplus.gov, nccih.nih.gov, doi.org and pmc.ncbi.nlm.nih.gov. Only two items were independently corroborated through secondary search results during the build: the AHA adult blood-pressure categories and the CDC teen sleep range of 8-10 hours (ages 13-17).
- Therefore every number below should be treated as "supplied by the brief, not re-verified by the build." **Please open each URL and confirm the values before classroom use**, especially those marked "used in graded items."
- Graded items assess **interpretation using an embedded reference panel**, not memorization of these numbers, and no exact habit-research statistic is graded. If a value turns out to be out of date, edit `W.REFERENCE` in `js/data/m2.js` (and the matching text in the cases) and re-run `node tests/run-all.js` then `node tools/gen-docs.js`.

## Source table

| Topic | Claim as used in the app | URL | Where used | Graded? | Status |
|---|---|---|---|---|---|
| Adolescent sleep | CDC lists 8-10 hours for ages 13-17. The worksheet's 7-9 hour example is labeled a simplified worksheet scoring rule. | https://www.cdc.gov/sleep/about/ | Mission 6 sleep decision rule box; Mission 4 influencer post (CDC claim); Mission 7 case A | Indirectly (a post is judged credible partly because it matches this) | Supplied by brief; corroborated by secondary search |
| Youth activity | Ages 6-17: at least 60 minutes daily of moderate-to-vigorous activity; vigorous, muscle- and bone-strengthening at least 3 days a week. A 30-minute choice is a helpful step, not the full recommendation. | https://www.cdc.gov/physical-activity-basics/guidelines/children.html | Mission 6 movement decision rule box | No | Supplied by brief; not re-verified |
| Youth BMI | Ages 2-19 use sex-specific BMI-for-age percentiles; ages 20+ use adult interpretation. BMI is one indicator, not a complete picture. | https://www.cdc.gov/bmi/child-teen-calculator/index.html | Reference panel; Mission 2 case "Nina" (adult, screening-tool caveat); optional practice | Yes (adult screening-tool interpretation) | Supplied by brief; not re-verified |
| Adult blood pressure | Normal: top below 120 AND bottom below 80 mmHg. Elevated: 120-129 AND below 80. Stage 1 category: 130-139 OR 80-89. Stage 2 category: at least 140 OR at least 90. A reading's category is not a confirmed diagnosis. | https://www.heart.org/en/health-topics/high-blood-pressure/blood-pressure-explained | Reference panel; Mission 2 cases "Marcus", "Priya", "Samuel" | **Yes** | Supplied by brief; corroborated by secondary search |
| Resting pulse | 60-100 beats per minute when calm and resting; activity, emotions, medication and fitness affect interpretation; lower is not automatically healthier. | https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse | Reference panel; Mission 2 cases "Elena", "Tom", "Dana" | **Yes** | Supplied by brief; not re-verified |
| Fasting glucose | 99 mg/dL or below normal; 100-125 prediabetes range; 126+ diabetes range; professional testing and confirmation matter. | https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis | Reference panel; Mission 2 case "Rosa" | **Yes** | Supplied by brief; not re-verified |
| Cholesterol and age | Total cholesterol below 170 mg/dL for ages 19 or younger; the general adult reference is below 200. Adult values are used only in age-20+ cases. | https://medlineplus.gov/lab-tests/cholesterol-levels/ | Reference panel; Mission 2 case "Hal" | **Yes** | Supplied by brief; not re-verified |
| Habit formation | Lally et al.: wide variation in time to approach automaticity; the 18-254-day range includes modeled estimates, not a guaranteed deadline. Published online 2009, in the 2010 journal volume. | https://doi.org/10.1002/ejsp.674 | Mission 3 strategy item on the "21 days" claim | Conceptually (no number graded) | Supplied by brief; not re-verified |
| Later habit research | Singh et al. (2024) systematic review: medians 59-66 days and means 106-154 across studies reporting timing, with substantial individual variability. Different statistics, not one universal average. | https://pmc.ncbi.nlm.nih.gov/articles/PMC11641623/ | Mission 3 strategy item (variant B) | Conceptually | Supplied by brief; not re-verified |
| Evidence vs testimonials | NIH/NCCIH distinguishes research-supported information from anecdotes, testimonials, unsupported claims and opinions. | https://www.nccih.nih.gov/health/know-science/finding-and-evaluating-online-resources/finding-health-information-online/how-do-you-know-the-information-is-accurate | Mission 4 | Conceptually | Supplied by brief; not re-verified |
| Website credibility | NLM tutorial framework: authorship, evidence, purpose, currency, privacy. | https://medlineplus.gov/webeval/ | Mission 4 tab structure and checklist | Conceptually | Supplied by brief; not re-verified |
| Study guidance (design) | IES Practice Guide, Organizing Instruction and Study to Improve Student Learning (worked examples, interleaving, graphics with explanations). Checked October 6, 2026 per the brief. | https://ies.ed.gov/ncee/wwc/PracticeGuide/1 | Design of worked examples and pairing graphics with brief text | No | Supplied by brief |

## Statistics deliberately NOT used

- The slide claim "76% vs 43%" goal-success statistic and the misinformation prevalence percentages: original study, population, question and design were not located or verified, so they are **not reproduced** anywhere in the app.
- Exact habit-timing numbers (66 days, 18-254 days, 59-66 median, 106-154 mean) are **not graded**; the app teaches variation and consistency.

## Unresolved flags for teacher verification

1. All numeric clinical reference values in `W.REFERENCE` (see above) before first class use.
2. The "BMI 18.5-24.9" adult reference comes from the course slides ("slide deck reference example"); confirm it matches the CDC adult BMI categories you want to teach.
3. Whether your district prefers different wording for blood-pressure "stage" language.
4. The IES guide link and any other URL: confirm it still resolves.
