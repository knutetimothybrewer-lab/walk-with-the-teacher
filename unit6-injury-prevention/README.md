# Mission Safe: Unit 6 Injury Prevention and Safety (digital summative)

A mission-based, auto-graded summative for High School Health. Five missions, each with an interactive simulation that unlocks its scored questions. 100 points over 20 questions when finished, a 90-minute server-enforced limit (designed to take about 70), three attempts per question scoring 100% / 85% / 75%. A static front end (GitHub Pages) talks to a Google Apps Script web app bound to a Google Sheet you own.

> **Build status: Missions 1 to 3 of 5 are built** (Predictable, Not Random: crash lab, 4 questions, 20 points; Chain of Survival: rescue scene and AED trainer, 5 questions, 25 points; Myth vs. Fact: a fictional feed and registry screen, 3 questions, 15 points). Missions 4 and 5 follow, one at a time, each checked in a browser before it is reported done. Until all five exist the total is 60 points and `content/items.json` says `partial`. Everything is built from your topic summary plus the Day 3 plan and Day 4 slides; read `docs/DISCREPANCIES.md` first.

The hands-on CPR skills check (Day 6) stays in person. This test covers knowledge and decisions only.

## Try it now (no setup)
Open `index.html` through any static server, for example `node tools/dev-server.js` (practice set) or `node tools/dev-server.js --bank=live` (the real questions; needs the private files, see SECURITY.md). With `API_URL` empty in `js/config.js` the page runs **demo mode**: a practice set and its own pretend server. Nothing is recorded.

## Put it in front of students
Follow `docs/SETUP.md` (about 30 minutes): create the Sheet, paste `apps-script/Code.gs`, run the **Unit 6** menu steps, load the private question bank, deploy the web app, paste its URL into `js/config.js`, publish, and run **Test Connection**.

- **Student link** (after GitHub Pages is on and the branch is merged): `https://knutetimothybrewer-lab.github.io/walk-with-the-teacher/unit6-injury-prevention/`
- **Teacher link**: the same page. Type `HEALTH-TEACHER` into the class-code box, then your teacher password.
- Sign-in fields: first name, last name, class block (Block 1/2, 3/4, 8/9) and that block's class code.

## Documents
| File | What it is |
|---|---|
| `docs/BLUEPRINT.md` | The approved plan: missions, simulations, questions, points |
| `docs/DISCREPANCIES.md` | Conflicts and gaps in the source materials, and what was decided |
| `docs/SETUP.md` | Click-by-click deployment and day-of checklist |
| `docs/TEACHER_GUIDE.md` | Run the test, read the Sheet, reset a student, edit a question |
| `docs/SECURITY.md` | Exactly where the answer keys live, and what a student could still do |
| `docs/TESTING.md` | What was tested and what was not |

## Layout
```
index.html, css/, js/          student and teacher front end (vanilla ES modules, strict CSP, no build step)
js/sims/                       one simulation per mission (crash.js + crash-physics.js; rescue.js + rescue-model.js; feed.js)
server/core.js                 ALL grading, sessions, timer and teacher logic (runs in Node, the browser demo and Apps Script)
server/gas/                    Google Sheets adapter
apps-script/Code.gs            GENERATED: paste into Apps Script (node tools/build-apps-script.js)
content/items.json             public question text (no answers); sources.json lists claims and their status
assets/                        SVG figures
authoring/ private/            NOT in git: question source with answers; generated key files
vault/                         encrypted backup of authoring/ (needs the passphrase)
tools/  tests/                 build, vault, secrets gate, dev server; unit, simulator, physics, end-to-end
```

## Commands
```
npm test                         unit + physics + Apps Script simulator tests (Node 20+, nothing to install)
node tests/e2e/run.js            end-to-end tests (needs Playwright and Chromium)
node tools/build-content.js      lint and build content (needs authoring/; restore with the vault)
node tools/build-apps-script.js  rebuild apps-script/Code.gs
node tools/check-secrets.js      run before every commit
```
