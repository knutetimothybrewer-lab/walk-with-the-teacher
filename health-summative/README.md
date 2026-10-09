# The Wildcat Wellness Trail — Mental Health Unit Summative Assessment

An animated, game-like, **self-grading** assessment for a high school (grade 10) Health unit on mental health. Students enter a class code and their name, then "walk a trail from storm to sunrise" through 10 short stations. The sky gets brighter as they go. It grades itself (3 attempts per question, decreasing credit), shows a final score page, and (optionally) sends results to **your** Google Sheet, including a "Reteach" tab that tells you what to teach again.

* Static website: no accounts, no ads, no trackers, no build step. Works on Chromebooks (Chrome), phones and tablets.
* About **about 48 minutes** for a typical student (see `TIMING.md`). A 90-minute limit is enforced (`timeLimitMinutes` in `config.js`; 0 turns it off); the work so far is submitted automatically at zero.
* **64 questions, 93 points**, across 10 stations (+ a welcome screen and a final screen).
* Safe-messaging approach for a sensitive topic; "Need help? / Take a break" button on every screen; skip any scenario for full credit.

> **Read first:** `DISCREPANCIES.md` (a short list of things to confirm against your slides) and `ROLLOUT.md` (counselor email, pilot plan, day-of checklist).

---

## 1. What students do

| # | Station | Moves |
|---|---|---|
| 0 | Welcome | Content note, privacy note, class code + name + period, how scoring works |
| 1 | Mental Health Basics | Place scenarios on the 4-zone continuum |
| 2 | Risk, Protection & Resilience | Sort risk/protective factors, acute/chronic stressors, resilience building blocks |
| 3 | Connectedness & the Data | CDC reading, interactive YRBS trend chart, "supports / doesn't support / can't tell" |
| 4 | Stress & the Brain | Animated pathway explorer, gas/brake sort, Recovery Dial, stress-over-time chart, coping loop, 3 practice situations |
| 5 | Patterns, Not Labels | D.I.I.S. match, Pattern Match vignettes, "most useful clue", two D.I.I.S. Detective cases |
| 6 | Phones, Teens & Evidence | Timeline builder, Pew/CDC reading, correlation vs. causation, third-variable animation |
| 7 | Red Flags & Safety | Red Flags Radar, safety overrides uncertainty, what to do (orange accents only here) |
| 8 | Be a Bridge | Listen → Validate → Ask → Connect, two chat scenes with a trust meter (one with a safety moment), language swap |
| 9 | Who Can Help? | Circle of Support, Navigator, Barrier Buster, WSCC |
| 10 | Capstone: Infographic Studio | Build a mini-infographic section by section, then an accuracy-check error hunt |
| 11 | Final score | Animated score, per-station bars, strongest area, completion code, calm "Your next step" card (last thing students see) |

The Capstone **assesses the infographic project's content and criteria; it does not replace the Canva project.** To remove it: `capstone: { enabled: false }` in `config.js`.

## 2. Run it on your computer

```
cd health-summative
npm install        # only needed for the tests; the app itself has no dependencies
npm start          # then open http://localhost:8080/
```

Any static web server works (for example `python3 -m http.server 8080`). The page must be served over `http://` or `https://` (double-clicking `index.html` will not work, because browsers block JavaScript modules from `file://`).

## 3. Where things live

```
index.html            the page (also holds the always-available Help / Take a break dialog)
config.js             THE FILE YOU EDIT: class codes, school name, credit values, backend URL, accommodations
content/              all questions, hints, readings (see content/README.md)
  s1.js … s10.js      one file per station
  index.js            readings (passages), topic names, station order
  sources.js          the in-app Sources screen
js/                   the app (you should not need to touch this)
css/  assets/fonts/   styling and self-hosted fonts (no Google Fonts call)
teacher.html          optional hidden passcode page (the same view also opens inside the app: type the teacher code in the Class code box)
apps-script/Code.gs   the Google Sheet backend
tests/  tools/        automated tests; generators for TIMING.md and CONTENT-MAP.md
```

## 4. Change the basics (`config.js`)

* **Class codes:** `classCodes: ['TRAIL1', 'TRAIL2', …]`. Not case-sensitive. **Change them from the defaults** (the defaults are visible in this repository).
* **Names:** `appTitle`, `schoolName`, `mascot`, `unitName`, `teacherName`.
* **Credit by attempt:** `attemptCredit: [1.0, 0.9, 0.75]` and `maxAttempts: 3`.
* **Points:** `pointsBySubparts`; **remove questions:** `disabledItems: ['s5-04']`.
* **Accommodations and retakes:** `studentOverrides` (see below).

### Edit a question
Open the station file in `content/` and change the text. Every question has a prompt, options, a hint, and an explanation. `content/README.md` has a one-page guide and an example of each question type. After editing, run `npm test` (checks nothing is broken) and `npm run timing` / `npm run map` to refresh `TIMING.md` and `CONTENT-MAP.md`.

### Per-student settings and retakes
```js
studentOverrides: {
  'sam rivera|3': { extendedTime: true, readAloud: true, largeText: true, reducedMotion: true },
  'jo kim|5':     { retakeAllowed: true },
},
```
Key = first and last name in lower case, a `|`, then the period. `extendedTime` hides all time messaging; `readAloud` starts Listen buttons on; `largeText` and `reducedMotion` do what they say.

## 5. Put it online (free)

**GitHub Pages (this repository):**
1. On GitHub, open the repository → **Settings** → **Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, pick your branch (for example `main`) and the folder **/ (root)**, then **Save**.
3. After a minute your students' link is `https://YOUR-USER.github.io/YOUR-REPO/health-summative/`. Open it on a Chromebook and do one walk-through.

**Alternatives (drag and drop):** run `npm run build` to create a clean `dist/` folder, then drag `dist/` onto **Netlify Drop** (app.netlify.com/drop), or create a **Cloudflare Pages** / **Vercel** project and upload `dist/`. There is nothing to compile; `dist/` is just the files students need.

## 6. Send results to your Google Sheet (about 10 minutes, once)

1. Create a new Google Sheet (in your own account). Name it "Wildcat Trail Results".
2. **Extensions → Apps Script.** Delete the sample code. Open `apps-script/Code.gs`, copy **all** of it, and paste it in. Click the disk icon (Save).
3. Reload the Sheet. A new menu **Wildcat Trail** appears. Choose **Wildcat Trail → 1. Set up tabs (first time)** and approve the permissions it asks for (it only touches this Sheet).
4. Open the **ClassCodes** tab and replace the sample codes with your own (one per row).
5. **Wildcat Trail → 2. Set teacher passcode** and choose one.
6. Back in the Apps Script editor click **Deploy → New deployment → ⚙ Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
7. Paste that URL into `config.js` as `backend.url`. Commit and publish.
8. **Test it:** open the student link, enter one of your codes and a fake name, finish a shortened run (or temporarily set `disabledItems` to leave a few questions), and check that a row appears on the **Summary** tab.

If your school's Google domain blocks "Anyone," deploy from a personal Google account instead. Students are not asked to sign in to anything.

**With a backend turned on, the class code is checked on the server** (the codes live in your Sheet, not in the web page), duplicate final records are blocked, and you can reset a student.

### Tabs in the Sheet
| Tab | What it shows |
|---|---|
| **Summary** | One row per student: percent, points, time, skips, help-button opens, completion code, per-station % and per-topic % |
| **Detail** | One row per student per question: attempts, first-attempt correct, skipped, the wrong answer chosen first |
| **Items** | Item difficulty: % correct on attempt 1 (live formulas), average attempts, most common wrong answer |
| **Reteach** | Topics and stations ranked by class-wide first-attempt miss rate; the 10 most-missed questions with the most common wrong answer; questions under 40% correct on attempt 1 flagged "Possibly a bad question: review" (needs at least 3 answers) |
| **Class** | Class average, median, high/low, average time, by-period table (formulas) |
| **Gradebook** | Last, First, Period, Percent (formula). **File → Download → CSV** to import into your gradebook |
| **Archive** | Rows moved here when you reset a student |
| **Class - &lt;code&gt;** | One tab per class code on **ClassCodes** (for example `Class - TRAIL1`): only that class's students, sorted by last name, with a class-average row. Rebuilt after every submission and reset; **Wildcat Trail → Rebuild Items, Reteach and class tabs** rebuilds on demand. **Summary** stays the master list. |

### Reset a student (retake or absence make-up)
Any one of these, no code needed: **Wildcat Trail → Reset one student** in the Sheet; or open `teacher.html` on your site, enter your passcode and click **Reset for retake** next to the student. Their old row is saved on **Archive**. The student then enters the same name, period and code and starts fresh with a **new shuffle**. (If the student is on the same Chromebook, nothing else is needed. If you are not using a backend, add `retakeAllowed: true` for them in `config.js`.)

## 7. If the network fails

The student **always** sees their score and completion code. The page says "Your score may not have been sent yet. Show your teacher this code," keeps retrying (and has a "Try sending again" button), and the result waits in the browser until it is sent. Progress itself is saved on the device after every answer, so a refresh or a Chromebook hiccup never loses work.

## 8. What is collected (privacy)

First name, last name or initial, class period, the class code, scores, per-question attempts, which wrong answer was chosen first (a multiple-choice option, never free text), counts of skips and help-button opens, and total time. **No free-text answers. No questions about students' own mental health. No third-party analytics, ads, fonts or scripts.** Skipped scenarios are logged only as "skipped." Please confirm this fits your district's data-privacy policy (FERPA applies to student education records; COPPA does not apply at this age, but check district rules).

## 9. Honest limits

* **The class code in `config.js` is a classroom gate, not security.** A student who views the page source can read it. The Apps Script option above checks codes on the server instead.
* **Grading happens in the student's browser**, and the answer key is in the page's JavaScript (not in the visible page, but a determined student can find it with developer tools). That is typical for a classroom tool. For high-stakes use, the upgrade path is to move `grade()` into `Code.gs` (the app already sends a response object per attempt, so this is a contained change). Per-student shuffling and the completion-code check reduce casual copying.
* The completion code is a hash for spot-checking screenshots, not tamper-proof.
* Estimated time is a model until you pilot it (see `ROLLOUT.md`).

## 10. Safety and accessibility built in

* **Safe messaging** (AFSP / SAMHSA / reportingonsuicide.org): no methods, means, graphic detail or romanticized depictions; red-flag content is about recognizing signs and getting an adult.
* **No diagnosing language**: patterns and D.I.I.S. only; the only place condition names appear is the "Patterns, Not Labels" match, which is labeled as matching clues, not people.
* **Help / Take a break** on every screen: 988 (call or text), Crisis Text Line (text HOME to 741741), 911, and "talk to your school counselor or a trusted adult." It is static content and works offline.
* **Skip** on sensitive questions and both conversation scenes (full credit, logged only as "skipped").
* Keyboard operable everywhere (including sorting without drag), screen-reader live regions, visible focus, never color alone (every state has an icon and hidden text), text size and dyslexia-friendly font options, `prefers-reduced-motion` respected, optional read-aloud (browser voice, no network). Red and orange appear **only** on the Red Flags station and the Help dialog.

## 10b. Teacher mode (click through without answering)

On the first screen, type the teacher code into the **Class code** box (leave name and period blank) and press **Start the trail**. Default code: `WALK-TEACHER` (not case-sensitive). A purple bar appears at the bottom:

* **Next →** moves forward from wherever you are (intro, each question, station end). Questions are skipped, not answered.
* **Skip station**, **Jump to station…**, **Skip to results** (shows the results page at 100%).
* **Exit teacher mode** removes the preview and returns to the sign-in screen.

Teacher mode never calls the Sheet (not even to check the code), never queues a score and is labelled "nothing was recorded" on the results page. It uses its own saved record ("Teacher Preview"), so it cannot collide with a student's.

Change the code: `node tools/teacher-code.js "YOUR NEW CODE"` and paste the line it prints over `teacherCodeHash` in `config.js` (then `npm run build`). Set it to `''` to switch teacher mode off. Like the class codes, this is a classroom gate rather than real security: the app runs in the browser.

## 11. Testing and tools

```
npm test             # 24 unit tests: scoring engine, grading, shuffling, completion code, Apps Script logic (mocked)
npm run test:e2e     # real Chromium: wrong code, full mixed run vs. independently computed score, refresh-resume,
                     # offline retry, duplicate/reset, keyboard-only, reduced motion, 360x640 phone and Chromebook sizes
npm run timing       # TIMING.md        npm run map   # CONTENT-MAP.md        npm run build  # clean dist/
```
`QA-REPORT.md` has the results of the final audit run.

## 12. Choices I made that you may want to review

See `DISCREPANCIES.md` for the full list. The short version: zone names (Healthy / Struggling / Injured / Ill), which "how to help" sequence to teach, statistics I could not fully verify directly, 64 questions instead of 70–85 so the time fits, and the slide-number gap (your six source files were not available to read).
