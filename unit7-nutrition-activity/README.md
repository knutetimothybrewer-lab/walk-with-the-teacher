# Unit 7: Nutrition & Physical Activity. Digital Summative

An interactive, self-grading, ~1-hour digital summative for 10th-grade health. Students move through **seven missions** (Fuel Lab, Label Detective, Movement Lab, Marketing Manipulation, Goal Builder, Food System, Health Decision Challenge) with five simulations, a plan builder, clickable labels, maps and graphs, **three attempts per question (100% / 85% / 75% / 0)**, automatic scoring, a **Google Sheets gradebook** that sorts every submission into your four class blocks, and a **Teacher Analytics Dashboard** that tells you what to reteach.

* Static site (HTML, CSS, vanilla JavaScript). No build step is needed to run it, nothing is loaded from the internet, no trackers, nothing for students to install.
* 100 points, 50 to 60 minutes. Randomized per student: question order, answer order, numbers, fictional product and student names, and which equivalent version of a question each student gets.
* Results go to your own Google Sheet through a Google Apps Script you paste in (free). You never copy scores between tabs.

> **Read first:** [`docs/DISCREPANCIES.md`](docs/DISCREPANCIES.md). The Unit 7 slides and handouts were not in the repository, so the content follows the unit outline in your assignment brief. Check the items against what you actually taught.

## Contents
1. [Project structure](#1-project-structure)
2. [Run it on your computer](#2-run-it-locally)
3. [Upload (push) to GitHub](#3-upload-push-to-github)
4. [Turn on GitHub Pages](#4-enable-github-pages)
5. [Create the Google Sheet](#5-create-the-google-sheet)
6. [Install and deploy the Apps Script](#6-install-and-deploy-the-google-apps-script)
7. [Paste the deployment URL](#7-where-to-paste-the-deployment-url)
8. [Class codes](#8-set-or-change-class-codes)
9. [Teacher reset code](#9-set-the-teacher-reset-code)
10. [Test a submission](#10-test-submissions)
11. [Reset a student](#11-reset-a-student)
12. [Export results](#12-export-results)
13. [Security limits (read this)](#13-limitations-of-client-side-assessment-security)
* [Teacher dashboard](#teacher-analytics-dashboard) · [Preview Mode](#preview-mode) · [Demo data](#demo-data) · [Changing a question](#changing-a-question) · [Tests](#tests-and-quality-control) · [Troubleshooting](docs/TROUBLESHOOTING.md)

## 10-minute checklist
1. Put the folder on GitHub and turn on Pages (sections 3 and 4).
2. Make a blank Google Sheet, paste `Code.gs` and `KeyData.gs` into Apps Script, run `setupGradebook()` (section 6). **Write down the dashboard passcode it shows.**
3. Deploy as a web app and paste the `/exec` URL into `js/config.js` (section 7).
4. Change the class code, and the three default teacher codes (sections 8 and 9).
5. Open the student link in a private window, try a full test with **Preview Mode** (`?preview`), then generate **demo data** to see the dashboard.

---

## 1. Project structure

```
unit7-nutrition-activity/
  index.html                student entry point (the link you give students)
  js/config.js              THE ONE FILE YOU EDIT: title, blocks, class codes, teacher codes, Sheet URL, results options
  css/                      tokens (colors per mission), base, items, missions, teacher
  js/                       app, engine, scoring, items, sims, figs, charts, visuals, results, preview,
                            analytics, demo, solve, plan, labeldata, sources, transport, storage, util
  content/public.js         GENERATED: questions with hashed answer keys (local grading)
  content/public.server.js  GENERATED: questions with NO answer keys at all (server grading)
  authoring/                SOURCE OF TRUTH: every question with its answer, hints and explanation (m1.js ... m7.js)
  google-apps-script/       Code.gs (backend), KeyData.gs (GENERATED scoring key), appsscript.json
  teacher/index.html        teacher analytics dashboard (passcode protected; not linked from student screens)
  teacher/setup.html        helper that turns a teacher code into the line to paste into config.js
  teacher-private/          GENERATED: ANSWER_KEY.md and build-stats.json (contain answers; do not publish)
  tools/                    build, release, hash, serve, blueprint generator
  tests/                    unit tests, Google-Apps-Script tests (mocked Google), end-to-end browser tests
  docs/                     BLUEPRINT.md, SOURCES.md, DISCREPANCIES.md, SECURITY.md, QA_REPORT.md, TROUBLESHOOTING.md
```

The full assessment blueprint (content weights, experience map, question-type map, scoring map, data architecture, file architecture, visual design system) is in [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md).

## 2. Run it locally
Browsers will not run ES modules from a double-clicked file, so use any tiny web server:

```bash
cd unit7-nutrition-activity
node tools/serve.js 8080          # then open http://localhost:8080/
# or:  python3 -m http.server 8080
```

* Student view: `http://localhost:8080/`  (class code **UNIT7** until you change it)
* Preview Mode: `http://localhost:8080/?preview`  (passcode **WALK-TEACHER** until you change it)
* Teacher dashboard: `http://localhost:8080/teacher/`  (offline sandbox passcode **WALK-TEACHER** until you change it)

Node.js 18 or newer is only needed for the tools and tests. Students and teachers using the finished site need nothing installed.

## 3. Upload (push) to GitHub
**Without using the command line:** on github.com open your repository, choose **Add file > Upload files**, drag in the `unit7-nutrition-activity` folder, and press **Commit changes**.

**With git:**
```bash
git add unit7-nutrition-activity
git commit -m "Add Unit 7 assessment"
git push
```

After you edit `js/config.js` later, commit and push that one file the same way.

## 4. Enable GitHub Pages
1. In your repository open **Settings > Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, pick your main branch and the **/ (root)** folder, and save.
3. After a minute your student link is  
   `https://YOUR-USER.github.io/YOUR-REPO/unit7-nutrition-activity/`  
   (for this repository: `https://knutetimothybrewer-lab.github.io/walk-with-the-teacher/unit7-nutrition-activity/`).
4. The teacher dashboard is at that link plus `teacher/`. Bookmark it; students are never sent there.

**Before students use it**, read section 13 about answer files in a public repository.

## 5. Create the Google Sheet
1. Go to [sheets.google.com](https://sheets.google.com) and create a **blank** spreadsheet. Name it, for example, "Unit 7 Gradebook".
2. That is all. The script builds every tab for you in the next step.

## 6. Install and deploy the Google Apps Script
1. In the sheet choose **Extensions > Apps Script**.
2. Delete the sample code. Create two files:
   * `Code.gs`: paste the whole contents of `google-apps-script/Code.gs`.
   * `KeyData.gs` (use the **+** next to Files > Script): paste the whole contents of `google-apps-script/KeyData.gs`.
   * Optional: **Project Settings > Show "appsscript.json" manifest file**, and paste `google-apps-script/appsscript.json` (sets the V8 runtime and public web-app access).
3. Press **Save**. In the function list pick **`setupGradebook`** and press **Run**. Approve the permissions (Google shows an "unverified app" screen for your own script: **Advanced > Go to project > Allow**).
4. A box shows your **teacher dashboard passcode**. Copy it somewhere safe. (Change it any time: sheet menu **Unit 7 Gradebook > Set dashboard passcode**.)
5. `setupGradebook()` created these tabs for you, with frozen headers, filters, percent formats, color rules and live formulas:

   | Tab | What it holds |
   |---|---|
   | **MASTER RESULTS** | every submission from every class |
   | **BLOCK 1-2, BLOCK 3-4, BLOCK 6-7, BLOCK 8-9** | each submission is automatically routed to its block |
   | **ITEM ANALYSIS** | one row per student per question (attempts, points, responses, concept, skill, difficulty) |
   | **CLASS ANALYTICS** | live formulas: averages, medians, mastery counts, domain mastery, first-attempt accuracy, per-question difficulty, most-missed list |
   | **GRADE EXPORT** | Last name, First name, Block, Final % (live, sorted) for copying into another gradebook |
   | **SETTINGS** | class codes, block names, thresholds, "include DEMO DATA in analytics" switch |
   | **SESSIONS** | internal bookkeeping (hidden) |

   Duplicate submissions turn red and say `DUPLICATE: REVIEW`; demo records are orange and labelled `DEMO DATA`.
6. **Deploy:** press **Deploy > New deployment**, choose the gear icon > **Web app**, set **Execute as: Me** and **Who has access: Anyone**, press **Deploy**, and copy the **Web app URL** (it ends in `/exec`).
7. Whenever you change `Code.gs` or `KeyData.gs` later, use **Deploy > Manage deployments > edit (pencil) > Version: New version > Deploy**. The URL stays the same.

## 7. Where to paste the deployment URL
Open `js/config.js` and paste the URL between the quotes:

```js
backendUrl: 'https://script.google.com/macros/s/AKfycb.../exec',
```

Commit and push the file. That is the only place the URL goes.

## 8. Set or change class codes
* **In the Sheet (the real list when connected):** open the **SETTINGS** tab. Each row under **CLASS CODES** is a code; add a row to add a code; set **Active** to `FALSE` to switch one off. Codes are not case sensitive.
* **In `js/config.js` (fallback when the Sheet cannot be reached, and the only list when no Sheet is connected):** `classCodes: ['UNIT7']`.
* **Class blocks** (the required dropdown) are `blocks:` in `js/config.js`, initialized to exactly `Block 1/2`, `Block 3/4`, `Block 6/7`, `Block 8/9`. If you rename a block, change it in the **SETTINGS** tab too (the "CLASS BLOCKS" table), then run **Unit 7 Gradebook > Set up / repair gradebook** to create its tab.

Students cannot begin until they choose a block from the dropdown and type a valid code.

## 9. Set the teacher reset code
There are three teacher codes, all in `js/config.js`, all stored as one-way hashes:

| Setting | Default (CHANGE IT) | Purpose |
|---|---|---|
| `resetCodeHash` | `WALK-TEACHER` | clears the "already submitted" lock for a student |
| `previewPasscodeHash` | `WALK-TEACHER` | opens Preview Mode (`?preview`) |
| `teacherPasscodeHash` | `WALK-TEACHER` | opens the offline dashboard sandbox when no Sheet is connected |

**To change one:** open `teacher/setup.html` on your site (or locally), choose the code type, type your new code (8+ characters), copy the line it prints into `js/config.js`, and push.

**For the Sheet too:** the reset dialog also tells the Sheet to allow a retake. The Sheet needs the same reset code: in the sheet choose **Unit 7 Gradebook > Set teacher reset code** and type the same code. (The dashboard's own passcode is separate and is shown by `setupGradebook()`.)

## 10. Test submissions
1. **Whole path, safely:** open `.../unit7-nutrition-activity/?preview`, enter the preview passcode. A banner marks every screen as PREVIEW. On the **Sheets** tab press **Test connection (ping)**, then type your dashboard passcode and press **Send test submission**. It travels through the real pipeline and is saved as **DEMO DATA** (orange), never mixed with real grades.
2. **From the script editor:** run `sampleSubmission()`; it writes one DEMO DATA row to MASTER RESULTS, a block tab and ITEM ANALYSIS.
3. **As a student:** open the normal link in a private window, sign in with the class code, and finish. Then use **Reset** (section 11) so the test student can be removed or replaced.
4. Check the checklist in [`docs/QA_REPORT.md`](docs/QA_REPORT.md).

## 11. Reset a student
A legitimate retake needs two things: the student's browser lock and the Sheet record.
* **Fastest:** on the sign-in screen press **Teacher reset** (small link at the bottom), enter the reset code and the student's first name, last name and block. This clears the lock on that device and marks the earlier Sheet row `RESET: superseded` (it is kept, greyed out, and excluded from analytics). The student can sign in again.
* **From the dashboard:** open **Students** and press **Reset** next to the student.
* If a student submitted twice by mistake, the second row is flagged `DUPLICATE: REVIEW`. In the dashboard's **Flags** section press **Accept** (both count) or **Ignore** (the new one is excluded). Nothing is ever silently overwritten.

## 12. Export results
* **Dashboard > Export:** All Classes CSV, one CSV per block, and the **Grade Export** (`Student Last Name | Student First Name | Block | Final Percentage`) for all blocks or one block. CSV files open in Excel and Google Sheets (UTF-8 with a byte-order mark).
* **Google Sheet:** open the **GRADE EXPORT** tab (live) and use **File > Download > Comma-separated values**, or download **MASTER RESULTS** / any block tab the same way.

## 13. Limitations of client-side assessment security
**A page served from GitHub Pages cannot guarantee a one-attempt, cheat-proof test. This project does not pretend otherwise.** What it does:

| Protection | How it works | What it cannot do |
|---|---|---|
| No readable answer key in the page | Local mode stores only salted one-way hashes of the correct answers; explanations are lightly obfuscated and appear only after the third wrong attempt | A motivated student with developer tools can run guesses against the hashes. Every item has a small answer space |
| **Server grading (recommended for high stakes)** | Set `gradingMode: 'server'` in `js/config.js`. The page then loads `content/public.server.js`, which contains **no hashes, answers or explanations**. Every attempt is checked by your Apps Script, which counts attempts and releases the explanation only after attempt 3 | Needs the Sheet to be reachable; each "Check answer" takes a moment longer |
| Attempt limits | Each attempt is written to the browser **before** grading and, in server mode, counted by the server; refreshing cannot restore an attempt | A student could open a private window and start a new session, but the server refuses a second submission for the same first name, last name and block, and flags any duplicate |
| Server re-scoring | The script re-scores every submission from the recorded attempts and flags any score mismatch or edited local data | It cannot know who is typing |
| Randomized versions | Different question order, option order, numbers, product and student names, and equivalent variants | Equal difficulty is by design, not proof |
| One submission lock | Local completion token + server record of completion | Clearing storage does not help (server remembers) but nothing stops a student from sharing answers verbally |
| Dashboard protection | Data is returned only when the passcode matches (8 wrong tries lock it for 10 minutes) | The passcode is only as strong as you make it |

**Answer files in a public repository.** The folder `authoring/` and `teacher-private/` hold the answers in plain text. On a **public** repository anyone who guesses those file paths can read them. Pick one:

1. **Best:** publish only the student files. In a *new* repository (public is fine) upload `index.html`, `css/`, `js/`, `assets/`, `teacher/`, `content/public.server.js` and set `gradingMode: 'server'`. Keep the full project in a private place. (With Node installed: `node tools/release.js --server` builds exactly this into `dist/`.)
2. **Simple:** keep the whole project in a **private** repository (GitHub Pages for private repositories needs a paid plan) or run it from a school web server.
3. **Accept the risk:** publish as-is for a low-stakes check. Students would have to find and open the source files, which are not linked anywhere.

See [`docs/SECURITY.md`](docs/SECURITY.md) for details.

---

## Teacher analytics dashboard
Type the teacher code in the sign-in **Class code** box, then the dashboard passcode, to open it inside the app (or open `.../unit7-nutrition-activity/teacher/` directly). Students are never linked there, and the server returns data only for the correct passcode.

* **View:** All Classes, Block 1/2, Block 3/4, Block 6/7, Block 8/9 (every number and chart updates).
* **Overview cards:** students submitted, class average, median, highest, lowest, average completion time, number and percent demonstrating mastery, number and percent needing support.
* **Content-domain mastery:** an animated bar chart for the seven domains (all calculated from real results).
* **Question-level item analysis:** for every question: first-attempt %, eventually-correct %, zero-credit %, average points, average attempts, domain and concept. Sort by any column. **MOST MISSED QUESTIONS** list. Click a question for the prompt, the **correct answer**, number of students, first-attempt and eventual success and the **common incorrect responses**.
* **WHAT SHOULD I RETEACH?** The 3 to 5 weakest concepts, for the selected class view, generated by rules from the metadata (`domain`, `concept`, `skill`, `difficulty`, `questionType`) and student performance. No AI and no outside service.
* **Compare class blocks:** overall average, domain mastery, completion time and first-attempt accuracy side by side, framed as instructional need, not competition.
* **Students:** alphabetical, click a name for the individual report (score, raw points, time, domain bars, attempts, zero-credit questions, responses to major simulations and scenarios). There is no ranking or leaderboard.
* **Flags:** possible duplicates (accept or ignore), integrity notes. **Export** and **Demo data** sections.

Without a connected Sheet, the dashboard opens an **offline sandbox** (clearly labelled) filled with generated DEMO DATA so you can explore every view.

## Preview Mode
Quickest way in: on the normal sign-in screen type the teacher code (`WALK-TEACHER`) into the **Class code** box and press Begin. You get a click-through walk-through of the whole assessment: the Continue button always works, nothing needs answering, and nothing is sent to your Sheet.

`.../unit7-nutrition-activity/?preview` + the preview passcode. A striped banner and a docked toolbar label it as a teacher view that is not a student attempt. It uses separate storage, so it never touches real students. The toolbar can: jump to any mission or step, show the **correct answer** for any question, submit a real **correct** or **wrong** attempt through the actual grader (to test the 100/85/75/0 logic), write synthetic attempts, reset attempts, show scoring tables and the saved data, show which randomized variants a student got (or roll a new version), open every simulation (with "unlock"), preview the final results screen, and test the Google Sheet connection. Hide it with **Alt+Shift+P**.

## Demo data
The dashboard's **Demo data** section (and the sheet menu **Unit 7 Gradebook > Generate DEMO DATA**) creates about 28 fictional students across all four blocks with realistic scores, attempt patterns, timings and intentional strengths and weaknesses. Every record is labelled **DEMO DATA** (orange rows; first names start with `[DEMO]`). They are excluded from analytics unless you tick "Include DEMO DATA" (dashboard) or set the SETTINGS switch to YES (Sheet formulas). **Delete demo data** removes only records labelled DEMO DATA, from every tab; real submissions are not touched.

## Changing a question
Questions live in `authoring/m1.js` to `m7.js` (each question has its answer, three kinds of metadata, hints and an explanation). After editing run:

```bash
npm run build      # regenerates content/public.js, content/public.server.js, google-apps-script/KeyData.gs, docs/BLUEPRINT.md, teacher-private/*
npm test           # unit + Google Apps Script tests (about 5 seconds)
```
The build refuses to finish if a question is malformed, if any student version would not total exactly 100 points, if two alternatives in a pool differ in points, or if the answer cannot be recovered from its own hash. Then paste the new `KeyData.gs` into Apps Script and publish a new deployment version. See the comments at the top of `authoring/lib.js` for the concept registry that powers the reteach advice.

## Tests and quality control
```bash
npm test                    # 36 unit and backend tests
npm install                 # once, only if you want the browser suite (installs Playwright)
node tests/e2e/run.mjs      # end-to-end browser suite (Playwright + Chromium), about 5 minutes
```
The unit tests check every question and every variant: the authored answer is accepted and a wrong answer is rejected, so the interface cannot mark a correct response wrong because of faulty code. The backend tests run the real `Code.gs` against a mock of Google Sheets. The browser suite plays the whole assessment through the real UI and Sheet code, then checks sign-in, attempts, locking, reset, preview, dashboard, exports, keyboard use, Chromebook (1366x768) and phone layouts. Results are summarized in [`docs/QA_REPORT.md`](docs/QA_REPORT.md).

## Privacy and health-positive design
Students enter only first name, last name and block. No weight, BMI, calorie restriction, dieting or body comparison appears anywhere; foods are never labelled "good" or "bad"; goal-setting uses fictional students. Nothing is sent to anyone except your own Sheet.

## Licenses
Fonts: Fraunces, Atkinson Hyperlegible and OpenDyslexic (see `assets/fonts/LICENSES.txt`). All illustrations are generated inline SVG. All products, brands, accounts and people in the assessment are fictional.
