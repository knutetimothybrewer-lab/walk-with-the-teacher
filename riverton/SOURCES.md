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
