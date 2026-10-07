# SIGNAL: Substance Use Summative (Grade 10 Health)

An immersive, self-grading digital summative. Students move through eight "missions" (brain science, nicotine and vaping, alcohol, other substances, overdose response, social pressure, evidence evaluation, and a final synthesis case). Each mission looks and behaves differently, and the work is mostly interpreting evidence and making decisions rather than recalling facts.

* **100 points per student**, about **50 to 60 minutes** (see `teacher-private/BLUEPRINT.md` for the item-by-item time estimate).
* **Three attempts per question**: 100% / 85% / 75% / 0, with no answer reveal until a question locks.
* **Five simulations**: reaction time, an alcohol BAC model, an overdose response scene, a branching social-pressure conversation, and an Evidence Lab.
* **Static website** (HTML, CSS, vanilla JavaScript; no framework, no build step needed to run it, no external requests, no trackers). Works on Chromebooks (Chrome) and tablets.
* **Results go to your Google Sheet** through a Google Apps Script web app (summary tab, question-level tab, analytics tab) and a teacher dashboard.
* **Preview Mode** for the teacher, hidden from students.

> **Read first:** [`docs/DISCREPANCIES.md`](docs/DISCREPANCIES.md). The unit's slides and handouts were **not** available when this was built, so the content map follows the unit outline in the assignment brief. Check the items against what you actually taught before using it for a grade.

## Quick start

```bash
cd substance-use-summative
npm run serve            # then open http://localhost:8080/   (any static server works; file:// does not)
npm test                 # unit + backend tests (Node 18+)
node tests/e2e/run.mjs   # full browser playthrough (needs Playwright)
```

Try it without a backend: open the page, use class code **DEMO2026**, any name and period.

## What you edit

| Want to... | Edit |
|---|---|
| Set the results backend URL, class-code hashes, school/teacher name | `js/config.js` |
| Add/remove class codes (with a backend) | the **Config** tab of your Google Sheet |
| Change a question | `authoring/m*.js`, then `npm run build` |
| Change the preview passcode | `node tools/hash.js --preview "new passcode"` into `js/config.js` |

## Folder map

```
index.html            student entry point
css/                  design tokens, layout, item styles, mission environments and simulations
js/                   app, engine, scoring, items, simulations, charts, visuals, backend transport, preview
content/public.js     GENERATED: questions without answers (hashed keys) for the browser
authoring/            SOURCE OF TRUTH: every question WITH its answer and explanation (keep private)
google-apps-script/   Code.gs (backend) and KeyData.gs (GENERATED scoring key for the server)
teacher/              teacher dashboard page (not linked from the student screens)
teacher-private/      GENERATED: BLUEPRINT.md, QUESTION_BANK.md (contain the answer key)
tools/                build, release, hash, serve
tests/                unit tests, Apps Script mock tests, browser tests
docs/                 setup guides, scoring, security, testing checklist, troubleshooting, sources
```

## Protecting the answer key (important)

GitHub Pages publishes everything in the branch. `authoring/` and `teacher-private/` contain the answers in plain text. Either keep the repository private, or run `node tools/release.js` and publish only the generated `dist/` folder (student files only). Details: [`docs/SECURITY_AND_INTEGRITY.md`](docs/SECURITY_AND_INTEGRITY.md).

## Documentation index

1. [`docs/TEACHER_SETUP.md`](docs/TEACHER_SETUP.md): the one-page setup
2. [`docs/GOOGLE_SHEETS_SETUP.md`](docs/GOOGLE_SHEETS_SETUP.md): Sheet, Apps Script, deployment, test
3. [`docs/GITHUB_PAGES.md`](docs/GITHUB_PAGES.md): publishing the student link
4. [`docs/PREVIEW_MODE.md`](docs/PREVIEW_MODE.md): teacher testing tools
5. [`docs/SCORING.md`](docs/SCORING.md): the scoring model
6. [`docs/SECURITY_AND_INTEGRITY.md`](docs/SECURITY_AND_INTEGRITY.md): what is and is not protected
7. [`docs/TESTING_CHECKLIST.md`](docs/TESTING_CHECKLIST.md): pre-launch checklist
8. [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md)
9. [`docs/SOURCES.md`](docs/SOURCES.md): where each external fact came from
10. [`docs/CONTENT_MAP.md`](docs/CONTENT_MAP.md): unit coverage, interaction map, visual concept
11. [`docs/DISCREPANCIES.md`](docs/DISCREPANCIES.md): things to confirm against your own instruction
12. `teacher-private/BLUEPRINT.md` and `teacher-private/QUESTION_BANK.md`: the assessment blueprint and full question bank with answers
