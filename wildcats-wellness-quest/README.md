# Wildcats Wellness Quest: Small Choices, Whole Health

An animated, walk-through **summative assessment** for a high school health unit. Students move around an illustrated Wildcat High campus with a guide (Pounce) and a fictional classmate (Jordan), investigate fictional situations, play a seven-day choices simulation, and show what they understand. It is scored automatically (**100 points, 0 teacher-graded**) and ends with an immediate results page and a downloadable report.

- Static HTML/CSS/JavaScript. **No server, accounts, API keys, paid services or build step.** Local relative paths only.
- Runs on Chromebooks (Chrome) from one student link on GitHub Pages.
- Saves in each student's own browser. **By default nothing is sent anywhere.** Optionally, results can be sent to **your Google Sheet** with a class code (see "Send results to a Google Sheet").
- Designed for a 30-40-minute class period, with a **90-minute hard limit** counted from when the student presses Start (`timeLimitMinutes` in `js/config.js`; 0 turns it off). A countdown shows in the top bar, and at zero any selected-but-unsubmitted answer is submitted, the assessment locks and sends, and anything unanswered earns 0. See "Timing, honestly" below.

> **Before using for grades:** set your teacher passcode ([docs/TEACHER_SETUP.md](docs/TEACHER_SETUP.md)), verify the clinical reference values ([docs/SOURCE_REGISTER.md](docs/SOURCE_REGISTER.md)), and run a short pilot on real Chromebooks ([docs/PILOT_CHECKLIST.md](docs/PILOT_CHECKLIST.md)). The six source decks/worksheet were not available when this was built, so slide numbers in the coverage matrix are unverified.

## What students do

| # | Mission (campus building) | Points | Experience |
|---|---|---|---|
| 0 | Welcome (front gate) | 0 | Pick an avatar, learn controls and the attempt policy, try an ungraded practice item |
| 1 | Whole-Health Hub | 12 | Sort 10 situations by *primary* dimension (click, drag or keyboard), Overlap Lab (unscored), ripple-effect item |
| 2 | Know Your Numbers (nurse's office) | 16 | Fictional **adult** check-ups, reference panel, metric meanings, reading and follow-up judgments, lifestyle links, intake questions |
| 3 | Habit Workshop | 18 | Ratings analysis, habit-loop repair, strategies, SMART repair, SMART builder with a keyed compatibility matrix |
| 4 | Fact or Fiction Media Lab | 18 | Five fictional posts (fad diet, supplement ad, influencer, before/after photo, AI/deepfake) with Author/Evidence/Purpose/Independent tabs, plus a checklist |
| 5 | STOP Crossroads | 14 | Two branching situations plus a structured justification |
| 6 | Thousand Choices Simulator (dashboard) | 16 | Play Jordan's week (12 decisions, unscored), then five questions on fixed case weeks |
| 7 | Final Transfer (dashboard top floor) | 6 | A new integrated case: three decisions plus claim-evidence-reasoning |

A mission opens once the work in the previous one is **submitted**, whether or not it was correct. Low scores never trap a student.

## Run it locally

Open `index.html` in Chrome (double-click works), or serve the folder:

```
cd wildcats-wellness-quest
python3 -m http.server 8000     # then visit http://localhost:8000/
```

## Deploy on GitHub Pages (beginner steps)

1. Put this folder in a GitHub repository (this repository already contains it as `wildcats-wellness-quest/`).
2. On GitHub: **Settings -> Pages**. Under "Build and deployment," set **Source: Deploy from a branch**, choose your branch (for example `main`) and folder **/ (root)**, then **Save**.
3. Wait a minute. Your site appears at `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`. The student link is the folder path:
   `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/wildcats-wellness-quest/`
4. Open the link in Chrome and walk through it once. All paths are relative, so it works under the repository subpath (tested).
5. *Alternative:* copy the **contents** of this folder into its own repository and publish from root; the link is then `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

Optional: if you do not want students to be able to browse the teacher answer keys on your public site, keep `docs/` and `tools/` in a private repository or branch and publish only `index.html`, `css/`, `js/` and `teacher/` (the keys are still inspectable inside `js/data/` because the app scores in the browser; see limits below).

### Send results to a Google Sheet (optional, about 10 minutes, once)
Full steps: [docs/TEACHER_SETUP.md](docs/TEACHER_SETUP.md) section 8. In short: make a Sheet, paste `apps-script/Code.gs` into **Extensions -> Apps Script**, run **Wildcats Quest -> 1. Set up tabs**, put your class codes on the **ClassCodes** tab, deploy as a **Web app** (Execute as: Me, Access: Anyone), then paste the `/exec` URL into `backend: { url: '...' }` in `js/teacher-config.js`. Students then enter a **class code** at the start, and their result is sent when they submit (with a "Try sending again" button if the network fails). The downloadable JSON file still works as a backup.

### Share the link and collect reports (without a Sheet)
Give students **one link**. Each student enters the alias or ID you assign, works, submits, then presses **Download results (JSON)** and gives you the file the way you collect work (for example upload to your LMS assignment). A printable page (**Print / Save as PDF**) is also provided. Nothing is submitted automatically; there is no cross-device sync.

## Teacher setup in brief (full guide: [docs/TEACHER_SETUP.md](docs/TEACHER_SETUP.md))

1. **Set a passcode** with `teacher/passcode-setup.html` (or `node tools/make-passcode.js --write`) and paste the block into `js/teacher-config.js`. **No passcode is active by default**; "Teacher reset" stays disabled until you do this.
2. Optionally adjust settings in `js/teacher-config.js`:

| Setting | Default | Purpose |
|---|---|---|
| `attemptLimits` | `{ short: 2, complex: 3 }` | Total attempts per scored item (initial submission included); `complex` may be 2 or 3 |
| `caps` | `[1, 0.9, 0.75]` | Max share of points on attempt 1 / 2 / 3 (a teacher policy, not a research formula) |
| `timeLimitMinutes` | `90` | Hard limit from the moment the student presses Start; `0` = no limit |
| `timeGuidance` | 36 min target, 30-40 range, `extendedTime: false` | Pacing guidance only (the optional pacing line); does not change the limit |
| `extendedExploration` | `false` | Show optional unscored extras |
| `motion` | `auto` | Follow device reduced-motion, or force on/off |
| `letterGrades` | disabled | Optional letter grade (boundaries use the unrounded total) |
| `assessmentVersion` | `wwq-1.0` | Part of browser-storage keys; change only between class sets (see setup guide) |

## Teacher mode (click through without answering)

**Teacher reset** (footer) -> enter your teacher passcode -> **Open teacher mode**. All missions open, and a bar offers **Fill this step / Fill this mission / Fill everything and review** so you can see every screen, the Review page and the Results page. It runs only in that tab, never touches a student's saved record and sends nothing to the Sheet. See [docs/TEACHER_SETUP.md](docs/TEACHER_SETUP.md).

## Scoring and attempts

- Item score = **rubric fraction x item points x attempt cap** (100% / 90% / 75%). The best earned value across attempts is kept; only the final total is rounded (displayed to one decimal; letter boundaries use the unrounded total).
- Short matching/classification/concept items: **2** attempts. Complex data interpretation, scenario application, evidence evaluation and structured reasoning: **3**. "Attempts" includes the initial submission.
- Retries use a pre-authored **equivalent transfer variant** (different post/numbers/situation, same objective and points). A short conceptual hint appears first and the student must tick that they re-read the evidence. The explanation appears only after the item is finalized. When attempts run out, the best score is kept and the student moves on.
- Blank or incomplete submissions never use an attempt.
- Three displays: **completion** (required work submitted, independent of correctness), **first-attempt evidence** (initial responses, kept separately in the report), and the **assessment score** (all 100 auto-scored points with caps).
- The reasoning tasks are structured (claim-evidence-reasoning builders, SMART components, consequence comparisons) and scored from explicit keys and compatibility matrices (`docs/ANSWER_KEY.md`). Optional written reflections are **never graded**, never required, and included in the report only if the student ticks to share.
- Optional practice after submission is unlimited, separate, and cannot change the grade.

## One session, final submission and teacher reset

Students can pause and resume one session (autosave). Final submission requires all required items to be finalized, a warning acknowledgement and a confirmation. It then locks the session, shows the full grade page immediately, and creates a submitted marker. Reload always reopens the read-only report. Only the passcode-protected **Teacher reset** (footer link) clears a device and starts a new, labeled session for the next student.

## Honest technical limits

**This is a static-page classroom restriction, not guaranteed one attempt per student.**

- Clearing browser data, using another browser/device or private window, or editing the code bypasses the lock and attempt limits.
- Answer keys, scoring, grades, timestamps and the passcode check all run in the browser and can be inspected or altered by a technically capable user.
- The passcode verifier is **salted and iterated SHA-256** and the passcode is never stored or exported, but **hashing does not make a client-side app secure**; anyone who can open developer tools can change the verifier or the logic. The cooldown after wrong entries is an interface deterrent, not security enforcement.
- A typed alias is not verified identity. A teacher-authorized reset note in a report is recorded locally and is not independently verified.
- A secure identity-based attempt limit needs authenticated accounts and server-side records, which are outside this project's default scope. No backend was added.
- Treat the downloaded JSON like any student submission: it is a record the student hands in, not a tamper-proof certificate.

## Privacy

No accounts or analytics. By default there are **no network calls**; only if you set `backend.url` does the page contact your own Apps Script (class-code check at the start, one result at submission). What is sent: alias/ID, period, class code, scores, and per-question points and attempt counts. Never reflections, never raw answers. Students enter only an alias/ID and optional period (plus the class code when the Sheet backend is on). No medical history or personal health measurements are collected: all health data is fictional. Text is rendered safely (no HTML injection) and imported files are validated and recomputed.

## Accessibility

Fully keyboard operable (a keyboard-only run through all seven missions is tested), drag/drop always has click and keyboard alternatives, visible focus, semantic controls, WCAG AA text contrast (checked), color never the only cue, charts have text and table equivalents, text size options, an animation toggle plus support for the device's reduced-motion setting, no flashing, no audio, no reflex-speed tasks. Real screen-reader and Chromebook testing is part of the pilot.

## Timing, honestly

The estimate from word counts and selection counts is about **35 minutes for fast readers, 40-44 for typical readers, 55+ for slower readers** ([docs/TEST_REPORT.md](docs/TEST_REPORT.md), `node tools/pacing.js`). This is **not a validated student duration**. The 90-minute hard limit is generous against these estimates, but pilot it; plan the period with your pilot data and consider the extended-time setting.

## Folder map

```
index.html              student entry point
css/                    design tokens, layout, motion, print
js/config.js            default configuration (do not edit)
js/teacher-config.js    YOUR settings and passcode verifier (edit this)
js/policy.js            attempt policy + deterministic scoring engine
js/sim.js               Thousand Choices model (weights preserved)
js/data/                all authored content: mission items, keys, case weeks, examples
js/store-core.js        state, autosave, one-session lock, import/export, passcode, reset
js/report-core.js       report builder (completion / first attempt / score)
js/art.js, vis.js, ...  illustrations, charts, UI
teacher/passcode-setup.html   browser passcode utility
tools/                  make-passcode.js, gen-docs.js (keys + coverage), pacing.js
tests/                  automated suites (run-all.js)
docs/                   answer key, coverage matrix, source register, content notes,
                        teacher setup, pilot checklist, test report
```

## Tests and regenerating teacher materials

```
NODE_PATH=$(npm root -g) node tests/run-all.js     # 10 suites (browser suites need Playwright + Chromium)
node tests/run-all.js --no-browser                  # Node-only suites
node tools/gen-docs.js                              # regenerate docs/ANSWER_KEY.md and docs/COVERAGE_MATRIX.md
node tools/pacing.js                                # pacing estimate
```

Always re-run the tests and regenerate the docs after editing content.

## Further documentation

- [Teacher setup](docs/TEACHER_SETUP.md) &middot; [Answer key and compatibility matrices](docs/ANSWER_KEY.md) &middot; [Coverage matrix and demand audit](docs/COVERAGE_MATRIX.md)
- [Source register](docs/SOURCE_REGISTER.md) &middot; [Content notes](docs/CONTENT_NOTES.md) &middot; [Test report](docs/TEST_REPORT.md) &middot; [Pilot checklist](docs/PILOT_CHECKLIST.md)

All people, posts, products, studies and numbers in the assessment are fictional teaching examples and are labeled as such. Reference values are general adult examples for education, not medical advice.
