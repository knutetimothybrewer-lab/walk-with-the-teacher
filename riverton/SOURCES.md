# Sources and model notes

Riverton is a **simplified teaching model**, not a predictive tool. Numbers are invented to sit inside plausible ranges for a mid-sized U.S. city. Effect sizes are tuned so the *direction, relative size and timing* of each effect match the public-health evidence, not to forecast any real place.

## City

### Baselines (`src/content/shared/riverton-world.json`)
Ranges were chosen to look like real U.S. city data in these public sources (no real data is copied):
- CDC PLACES (census-tract estimates for obesity, diabetes, hypertension, current asthma, uninsured, depression/poor mental health days).
- County Health Rankings & Roadmaps (life expectancy, preventable hospital stays, uninsured, food environment, air pollution, housing).
- CDC/NCHS U.S. Small-area Life Expectancy Estimates Project (USALEEP): tract-level life expectancy gaps of 10+ years within a single city are common.
- CDC childhood blood lead surveillance (share of children at or above the blood lead reference value) and EPA Safe Drinking Water Act background on lead service lines.
- CDC NVSS infant mortality, and CDC/AAP immunization coverage reports for vaccination rates.

### Model structure (`src/modules/city/sim/`)
Interventions → determinants → behaviors/exposures → outcomes, one tick per month, seeded and deterministic.
- **Lags:** each effect ramps in over its own `lag` months after the facility opens, and behaviors and outcomes then move toward their targets at per-variable rates (`behaviorRate`, `outcomes.*.rate` in `tuning.json`). Water-borne illness reacts in months, child blood lead over 1–2 years, diet and obesity over years, life expectancy slowest.
- **Distance decay:** coverage falls linearly with distance from a facility; transit access extends the effective radius. Radii are in miles (1 mile = 200 map units).
- **Diminishing returns:** repeated same-type effects in one neighborhood count 100%, 40%, 15%, 5%; improvements also scale with headroom (how far the neighborhood is from the ceiling).
- **Interactions (synergies):** supermarkets change diet more when paired with nutrition education, CHWs and economic support; YMCA impact depends on a sliding-scale option, safety and transit; clinics work better with insurance enrollment.
- **Upstream vs. downstream:** hospitals mainly add emergency capacity (used in events like heat waves) and a small life-expectancy term; primary-care, food, built-environment and environmental programs move chronic outcomes.
- **Displacement:** amenities and redevelopment raise rent pressure in lower-income neighborhoods; above a threshold, original residents leave. Housing protections reduce the pressure.
- **Budget:** capital costs on build, yearly operating costs monthly; after a run of deficit months facilities cut hours, then close.

### Evidence directions behind the effect sizes (qualitative)
- Community Preventive Services Task Force (The Community Guide): community health worker programs, school-based health centers, built-environment approaches to physical activity, and tobacco smoke-free policies.
- Supermarket openings generally produce modest diet changes unless paired with other supports (e.g., pre-/post-opening studies of new supermarkets in food deserts).
- Lead service line replacement and corrosion control: blood-lead levels fall gradually.
- Evidence on gentrification and displacement around new green space and amenities (e.g., "green gentrification" literature).
- Sugary-drink taxes reduce purchases (Philadelphia, Berkeley evaluations); minimum wage evidence on health is mixed, so its effect is set small.

Teachers: tuning values are all in `src/modules/city/content/tuning.json` and can be edited without code changes.

## Sim Lab: Outbreak in Riverton

The pathogen, places and people are fictional. Parameters live in `src/modules/lab/labs/outbreak/params.json` and are shown to students in the "Under the hood" panel.

- **Investigation steps** follow the CDC's 10 steps of an outbreak investigation (CDC Field Epidemiology Manual; CDC "Steps of an Outbreak Investigation"): verify the diagnosis and confirm the outbreak, define and find cases, describe by time/place/person, develop and test hypotheses, implement control measures, communicate. The scaffolded core path covers detection, case definition, hypothesis, data collection, analysis, intervention, and communication.
- **Pathogen behavior** is modeled on norovirus-type gastroenteritis as described in CDC clinical overviews: incubation about 12–72 hours (right-skewed, median 36 h), illness lasting 1–4 days, about a quarter of infections without symptoms, and person-to-person spread mainly in households and institutions (schools, nursing homes).
- **Surveillance pyramid**: illness → seeks care → specimen → lab confirmation → report, with reporting delay of 3–6 days (the concept used in CDC FoodNet burden-of-illness work). The simulated rates (25% seek care, 50% tested, 85% reported) are teaching values chosen so that reported cases are well under a tenth of true cases; real rates vary by pathogen and place.
- **Source scenarios** (water main break, festival vendor, public pool, person-to-person) are textbook examples of continuous, point, continuous, and propagated epidemic curves. Each seed's curve shape is checked by unit tests.
- **Recall bias**: forgetting grows with days since exposure; cases over-report exposures slightly more than non-cases.
- **Counterfactuals** use common random numbers: every resident keeps the same random draws, so the "no action" and "acted earlier" runs differ only because of the intervention.
- **Compliance** with boil-water, exclusion, and hygiene measures is a function of community trust (`complianceFromTrust` in `src/platform/sharedState.ts`), which Crossroads will update.
- **Limits** (shown to students): no genetic testing of the germ, simplified reporting systems, no behavior change beyond following or ignoring a notice, a single true source per outbreak.

## Crossroads

- **Decision model:** the 7-step community health decision model (define the problem with data, identify who is affected, listen, consider evidence-based options, weigh equity and trade-offs, decide, evaluate) adapts the public health problem-solving cycle and community-engagement guidance (e.g., CDC "Principles of Community Engagement", 2nd ed.; the community health improvement process used in CDC/APHA materials).
- **Town Hall consequences** come from the City engine (`src/modules/city/sim`). Each proposal component is a scaled City intervention (clinic, supermarket as the co-op, park, affordable housing, and the developer's mixed-income redevelopment) placed on the Elm Street lot in Eastside, with the housing-protections policy. Scales and costs are in `src/modules/crossroads/engine/cityAdapter.ts`. Outcomes are projected five years with seeded luck (±25% effect realization) and a "typical case" for comparison, so the debrief can separate decision quality from outcome. Because chronic outcomes move slowly, five years shows only part of the long-run effect.
- **Equity of participation** and the engagement choices reflect the community-engagement literature on who is able to attend meetings (time, childcare, language, transportation).
- **Rumor Mill:** lateral reading comes from the Stanford History Education Group / Civic Online Reasoning research on how fact-checkers verify sources. The trusted-messenger effect reflects public-health communication guidance on credible messengers. The compliance changes (for example +10 points for a trusted faith leader, +5 for multilingual posts) are teaching values, not measured effects. Compliance changes the outbreak curve using the same formula that links community trust to compliance in Sim Lab.
- **Voting model:** each of six fictional commissioners weighs proposal features (equity, health, food, protections, the developer deal) and community trust, plus a small seeded random term. This is a teaching device, not a model of real politics.
- All characters, places, and quotations are fictional. Laws and crisis resources are teacher-editable and vary by location.

### City: rendering, missions, and learning loop
- **Rendering** (PixiJS v8, `src/modules/city/render/`) draws the same 8-neighborhood map used by every module, with building art generated from SVG in code. If WebGL is unavailable, the module falls back to the SVG map. A frame-rate governor first reduces the number of walking residents, then turns off ambient effects and lowers resolution when the frame rate stays low.
- **Missions:** "Welcome to the City" (tutorial) and "Close the Gap" (core). The Close the Gap target (narrow the Hillcrest-to-Eastside life-expectancy gap by 2.5 years in 10 years on $40M plus $14M a year) was calibrated by running candidate plans through the engine: a single supermarket gains about 0.2 years, a clinic with outreach and insurance enrollment about 1.8, a well-chosen $9M mix about 2.4, and a broad $37M plan about 3.4 with some displacement. Saves store only the seed and the action log; the deterministic engine rebuilds the city.
- **Predict–Observe–Explain** content (`content/poe.json`) lists the outcomes each intervention should move and why. `tests/city-game.test.ts` runs every intervention and policy through the engine and fails if the expected direction does not hold, so students are never taught something the model does not do.
- **Resident stories** (`game/stories.ts`) change with conditions (for example, access to a clinic with evening hours), using the shared recurring characters.

## Platform
- **Mastery:** a concept moves introduced → practiced → mastered; mastered needs correct answers in two different contexts (e.g., a lesson and a module), so recall in one setting is not enough. Spaced warm-ups draw from concepts already introduced.
- **Check and reteach:** a missed check gives one retry; a second miss shows a hint, a short reteach card for the tagged misconception, and a parallel question. Misconception tags come from the distractors' intended errors.
- **Pacing:** the 120-minute path is a planning estimate (segment times in `src/platform/storyline.ts`), not measured; adjust after a class run. Behind-pace students get shorter lessons, never fewer checks.
- **Year-end report:** assembled from the student's own results. The executive summary is a claim-evidence-reasoning response scored with a rubric; choices in Crossroads are not scored.
- **Class sync:** optional; sends name, period, answers, written work and progress to the teacher's own Google Sheet via an Apps Script web app the teacher deploys. Nothing is sent to any other service. The class code is a soft check, not authentication.
- **Fonts and icons:** Fredoka and Nunito (SIL Open Font License) via @fontsource, bundled; Lucide icons (ISC). All art is original and generated in code.
