# Riverton: a community health studio

One app, three modules, one shared fictional city. A high-school Community Health student is the newest youth member of the Riverton Health Commission.

- **City**: a living Pixi simulation. Place interventions, advance time, see which determinants and neighborhoods move, and why.
- **Crossroads**: branching decisions (Town Hall, Rumor Mill). Choices are never graded; the reflection is.
- **Sim Lab**: outbreak investigation with a surveillance pyramid, a hypothesis, and what-if counterfactuals.
- **Platform**: profiles, lessons with check-and-reteach, notebook, glossary/concept map, year-end report, teacher mode, optional Google Sheets sync.

The core path is about 119 minutes (`npm run validate-content` prints the estimate). Everything is original, generated in code, and works offline.

## Run it

```
cd riverton
npm install
npm run dev            # development server
npm test               # unit tests (engines, sync, roll-up, validators)
npm run validate-content
npm run build          # multi-file build in dist/ (committed; works from file://)
npm run build:single   # one self-contained HTML file in dist-single/index.html
npm run sizes          # build sizes
npm run a11y           # axe-core pass over key screens of dist/ (needs Playwright's Chromium)
npm run e2e            # browser tests against dist-single/ (set PW_CHROMIUM to a Chromium binary)
```

`dist/index.html` opens straight from a folder or USB stick: the build ships one classic script instead of ES modules, which browsers block on `file://`. The cost is that the City engine (PixiJS) is in the first download (about 640 KB gzipped for everything). Sizes are far below the 15 MB threshold, so no per-module single files are needed.

## Put it on GitHub Pages
`riverton/dist/` is committed. Serve that folder (or the repo and open `/riverton/dist/`). It uses hash routes and relative paths, so no server configuration is needed. `.github/workflows/riverton.yml` runs typecheck, tests, the validator and both builds on changes under `riverton/`, and fails if `dist/` is stale. Always run `npm run build` and commit `dist/` after changing source.

## Teacher setup
1. Open **Teacher mode** (lock icon, `#/teacher`) and choose a PIN. It lives only on that device and keeps students out of answer keys; it is not strong security.
2. Pick settings: foundations lessons required or optional, timed choices, reteach strictness, Sim Lab options, pacing (off, gentle, strict).
3. **Assignment preset**: set chapter order, switch chapters off, lock missions or scenarios. Copy the join link or save the file; students open it and start in the same place.
4. **Class sync (optional)**: follow `google-apps-script/SETUP.md` (about 10 minutes), paste the web-app URL and class code into the Sync panel (or include them in the preset). Without sync, students use **Export** and you drop their files into **Class roll-up**.
5. Class roll-up shows chapter completion, mastery by concept, most-missed questions with the most chosen wrong answer, misconceptions, and Sim Lab results, with CSV export.

Students' answers stay in their browser unless sync is on. The Sheets backend was tested against an in-memory fake of Google's services, not a live account; do a trial student before class.

## Editing content
All content is JSON. After any edit run `npm run validate-content`; it checks structure, parallel question versions, misconception-to-reteach links, lesson checks, scenario graphs, and the time estimate.

| What | Where |
|---|---|
| Neighborhoods, baselines, residents | `src/content/shared/riverton-world.json` |
| Questions (with misconception tags, hints, parallel versions, rubrics) | `src/content/shared/questions/*.json` |
| Reteach cards | `src/content/shared/reteach.json` |
| Lessons (hook, visual, worked example, checks) | `src/content/shared/lessons/*.json` |
| Glossary and concept map | `glossary.json`, `concepts.json` |
| City tuning (effect sizes, costs, radii, lags) | `src/modules/city/content/tuning.json` |
| City predict-observe-explain prompts | `src/modules/city/content/poe.json` |
| Crossroads scenarios and rubric | `src/modules/crossroads/content/*.json` |
| Sim Lab outbreak parameters and scenarios | `src/modules/lab/labs/outbreak/` (`model.ts`, `params.json`) |

City tuning notes: effects are per intervention, applied to determinants first, then behaviors, then outcomes, each with a lag ramp, distance decay and diminishing returns. If you change a number, run `npm test`: some tests pin the Close the Gap target and the POE answers to the simulation. The model is documented in `SOURCES.md`.

## Layout
```
src/platform/   shell, profile, questions, learn/, teacher/, sync/, report/, story/, map/, art/
src/modules/    city/ (sim = pure engine, render = Pixi), crossroads/, lab/
src/content/    shared content
tools/          validator, screenshot and browser test scripts, a11y, sizes
google-apps-script/   Code.gs + SETUP.md
```
City saves only its seed and action log and replays it, so saves are small and always match the current engine.
