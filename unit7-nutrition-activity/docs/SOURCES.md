# Sources and verification notes

Every statistic and guideline used in the assessment is listed in the in-app **Sources / Learn More** dialog (book icon). Only government, public-health and peer-reviewed sources are used as authority. No blogs, commercial wellness sites, influencers or unsourced statistics are used as evidence. (Fictional products, posts and people are clearly fictional and are never presented as data.)

Verification was done on 2026-10-07 with web searches that returned summaries of the primary sources. The CDC and NIH websites could not be fetched directly from the build environment (network policy), so the figures marked "secondary" were confirmed against reputable summaries of the primary source and should be spot-checked against the link once. Everything you can click is listed below.

| Used in | Figure or guideline | Primary source | Confidence |
|---|---|---|---|
| M1 graph `f-data` | 7.1% of high school students met the fruit recommendation and 2.0% met the vegetable recommendation (YRBS 2017) | CDC MMWR, Jan 2021, "Percentage of Adolescents Meeting Federal Fruit and Vegetable Intake Recommendations" | Confirmed (MMWR summary) |
| M3 graph `a-graph` | About 27% (2013) and 25% (2023) of high school students were active 60 minutes on all 7 days; in 2023 about 17% of females and 32% of males | CDC YRBS Data Summary & Trends, Dietary, Physical Activity and Sleep Behaviors | Secondary (rounded values from a report summary). Spot-check the CDC page |
| M3 recommendations `a-rec`, `a-plan` | 60 minutes/day moderate-to-vigorous; vigorous, muscle- and bone-strengthening on at least 3 days/week | HHS Physical Activity Guidelines for Americans, 2nd edition (2018) | Standard published guideline |
| M3 intensity | Talk test; 0 to 10 effort scale with moderate about 5 to 6 and vigorous about 7 to 8 | CDC "Measuring Physical Activity Intensity" | Standard; URL not verified (CDC reorganized its site in 2024) |
| M2 labels | %DV: 5% or less is low and 20% or more is high; Daily Values (sodium 2,300 mg, added sugars 50 g, saturated fat 20 g, fiber 28 g, calcium 1,300 mg, potassium 4,700 mg, iron 18 mg, vitamin D 20 mcg, total fat 78 g, carbohydrate 275 g, cholesterol 300 mg) | FDA, Nutrition Facts label and Daily Value pages | Standard published values (2,000-calorie reference) |
| M4 table `m-study` | 176 children aged 9 to 11; those shown influencer posts with unhealthy snacks ate about 26% more total snack calories; healthy-snack posts: no meaningful difference | Coates et al., Pediatrics 2019;143(4):e20182554 | Secondary (summaries of the paper). The original paper was not opened |
| M6 graph `s-insecurity` | 10.2% (2021), 12.8% (2022), 13.5% (2023) of U.S. households food insecure | USDA ERS, Household Food Security in the United States | Confirmed |
| M6 graph `s-upf` | Ultra-processed foods: about 61% of youth calories (1999) and about 67% (2018); unprocessed or minimally processed: 28.8% to 23.5% | Wang et al., JAMA 2021 (doi 10.1001/jama.2021.10238); NIH Research Matters | Confirmed |
| M6 `s-doc` | The four largest packers handled about 85% of steer and heifer purchases (2015 data) | USDA ERS Amber Waves, Jan 2024 | Confirmed. Other measures give lower shares for total beef, which is why the item teaches checking what is measured |
| M6 `s-regen`, `s-tech` | Soil-health practices; evidence questions for new technology | USDA NRCS Soil Health; general evidence-evaluation practice | Concepts, no statistics |
| M6 `s-workers` | Large COVID-19 outbreaks occurred in meat and poultry processing plants in 2020 | CDC MMWR 2020 reports | Widely documented; stated qualitatively |
| M4 | Sponsorships must be clearly disclosed; supplements are not FDA-approved before sale | FTC "Disclosures 101"; FDA Dietary Supplements | Standard guidance |

**Fictional by design:** all products, brands, social-media accounts, the "region" in the Resilience vs. Efficiency Lab, the map, and all students (Jordan, Alex, Maya, Priya and so on) are invented. The consolidation lab is a deliberately simple model (equal-size plants, a linear cost curve) and says so.

**Updating a statistic:** edit the dataset in `js/charts.js` (`CHARTS`), the source entry in `js/sources.js`, and the matching question text and explanation in `authoring/`, then run `npm run build`.
