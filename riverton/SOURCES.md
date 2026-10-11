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
