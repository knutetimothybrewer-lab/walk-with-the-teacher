# Community Health Mission — 10th-grade Community & Environmental Health summative

An animated, self-grading digital assessment. Students join a youth advisory team, travel an illustrated county map, and complete **29 scored units (100 points)** across six locations: neighborhood investigation and $1M budget challenge, an outbreak operations center, an environmental safety lab, a health-data observatory, a media and source studio, and a community action council. Grading, attempts, scoring and results all happen **on the server**, and results land in **your private Google Sheet** automatically.

> **Read this first — three honest limits**
> 1. **Your 14 source files were not available to the builder.** Content follows the topic list in your assignment, not the original slides/worksheets. Slide/page locators in `docs/ALIGNMENT.md` are topic-level and must be confirmed. See `docs/SOURCE_STATUS.md`. The Riverbend profile details and the "illustrative" minutes/miles are written to be replaced or confirmed against your case files.
> 2. **Nothing has been deployed to your Google account.** The Apps Script code was tested against a mock of Google's services and the same logic was tested end-to-end in a real browser with a local server. A live deployment (steps below) and the delivery test are still yours to run. See `docs/QA_REPORT.md`.
> 3. **Timing is an estimate, not a measurement.** Model estimate ≈ 55–60 minutes typical (range roughly 45–70). A classroom pilot is still needed. See `docs/BLUEPRINT.md`.

## What is in this folder

| Path | What it is | Safe to publish? |
|---|---|---|
| `dist/apps-script/Index.html`, `appsscript.json` | The student/teacher web page and manifest for Apps Script | Yes (no answers) |
| `dist/apps-script/Code.gs` | **Server code including the answer key** | **NO. Private. Not in git.** |
| `dist/demo/index.html` | Demo build with 2 sample questions, no backend, no credentials | Yes (demo only) |
| `dist/web/index.html` | Same frontend for a self-hosted server (`npm start`) | Yes (no answers) |
| `private/` | Answer key, rubrics, editable authoring files with keys | **NO. Never commit or publish.** |
| `content/`, `server/`, `web/`, `tools/`, `tests/` | Source code and tests | Yes |
| `docs/` | Alignment, blueprint, sources, content notes, security, preview, pacing, QA | Yes |

**Why `private/` is not in git:** this repository is public and GitHub Pages is enabled, so anything committed is visible to students. The private bundle (answer key + `Code.gs`) is delivered to you separately as a zip. Keep it in your school Drive, not in GitHub.

## Teacher setup (about 20 minutes, no programming)

You need: a Google account allowed by your school to use Apps Script, and the private bundle.

1. **Create the results spreadsheet.** In Google Sheets create a new blank spreadsheet named e.g. `CHM Results (PRIVATE)`. Do not share it with students.
2. **Open Apps Script.** In that sheet: *Extensions → Apps Script*.
3. **Paste the code.**
   - Replace everything in `Code.gs` with the contents of the private `Code.gs`.
   - Click **+** → **HTML**, name it exactly `Index`, and paste the contents of `Index.html`.
   - *Project Settings (gear) → check “Show appsscript.json manifest file in editor”*, open `appsscript.json` and paste the provided manifest. Save.
4. **Reload the spreadsheet.** A new menu **Community Health Mission** appears.
   - **1. Set up this spreadsheet** (you will be asked to authorize; this is *you* granting your own script access to your own sheet).
   - **2. Set teacher passcode** (8+ characters; stored hashed on the server; never shown to students).
   - **3. Add or update a class code** (for example `HEALTH3A`).
5. **Deploy.** *Deploy → New deployment → type: Web app.* Execute as: **Me**. Who has access: choose what your school policy allows (*Anyone with a Google account* or *Anyone in your organization* are typical on Chromebooks; an anonymous “Anyone” option may be blocked by your district). Authorize, then **copy the web app URL** (ends in `/exec`).
6. **Test before students (important).**
   - Open the URL → **Teacher sign-in** → enter your passcode → *Delivery test* → *Run delivery test*. This confirms browser → Apps Script → your Sheet through the *real* deployed path. It writes an isolated row to a `DeliveryTest` tab.
   - Open the preview (see `docs/TEACHER_PREVIEW.md`) and walk it. Preview never writes grades.
   - Then do one **real test-student run** with a test class code (e.g. `TESTRUN1`) and a roster ID like `test01` from a student-like account if possible. Confirm a row appears in `Sessions` with *Gradebook = recorded* and rows in `Responses`. Reset it afterward (below) or ignore that class in reports.
7. **Share** the URL and class code. Give each student a roster ID (student number or the ID you choose). Students open the link, enter code + roster ID + name + period.
8. **Results.** Open your sheet: `Sessions` (one row per student, updated as they work), `Responses` (every attempt), `Summary` (menu → *Refresh Summary tab*: section averages with live formulas, module averages and chart, item first-attempt accuracy, retries, common missed concepts), `ResetAudit`. For Excel: Teacher panel → *Classes and results* → class → **Download CSV** (UTF-8 with BOM, class-filtered, formula-injection protected), or *File → Download → .xlsx* on the sheet.
9. **Resume.** Students who reload, change devices, or lose Wi-Fi sign in with the same class code + roster ID and continue exactly where the server has them. Locked questions stay locked.
10. **Reset (with audit).** Teacher panel → *Classes and results* → class → enter a reason → **Reset** (or sheet menu *Reset a student session*). The old rows stay in `Responses`, the session is marked `reset`, a `ResetAudit` row is written, and the student can start fresh.
11. **Update the code later.** After pasting new code: *Deploy → Manage deployments → pencil → Version: New version → Deploy*. The URL stays the same.

### Class settings (Classes tab or Teacher panel)
`Status` open/closed · `OpensAt`/`ClosesAt` (optional window) · `RequireRoster` (students must also type a personal access token you list in the `Roster` tab: stronger identity matching) · `RevealMode` `final` (default: explanations only after submission) or `onLock` · `PacingFactor` (1 = standard; 1.5 shows 50% more suggested time; **no timer or cutoff is ever enforced**).

### Honest limits of identity and quotas
- A shared class code plus a self-typed roster ID **cannot prove who is at the keyboard**, and a student could type a classmate's roster ID. Use `RequireRoster` with per-student tokens for stronger matching; still, only proctoring gives real assurance. See `docs/SECURITY_PRIVACY.md`.
- Apps Script limits (consumer vs Workspace accounts differ; check Google's current quotas page): roughly 30 simultaneous executions per user, and daily limits on script runtime and spreadsheet operations. A class of 30 submitting in the same second can briefly hit those; the app automatically retries with the same request ID (no attempt is lost or doubled), and a stagger of a few seconds helps. Large simultaneous starts (60+) should be split across two script deployments or sections. Your school may restrict web apps or require sign-in.

## Easy mode: GitHub Pages + Google Sheet (static build, `play/`)

This is the same style as the other summatives: students open a GitHub Pages link, the page grades in the browser, and a small script on your Sheet records the finished result. **The answer key is inside `play/index.html`, which is public in this repository. Anyone who opens that file can read the answers. This was chosen deliberately by the teacher; use the server-based setup above if that is not acceptable.** Progress is saved on the student's own device (a different device starts over). Because the browser does the grading, a technically skilled student could send altered numbers to the Sheet.

1. Create a blank Google Sheet named `CHM Results (PRIVATE)`. Do not share it. Open *Extensions -> Apps Script*, replace everything in `Code.gs` with the contents of `play/SheetReceiver.gs`, and save. (Do not paste the old answer-key `Code.gs`, `Index.html` or manifest.)
2. Reload the sheet. In the new **Community Health Mission** menu run **1. Set up this spreadsheet** (authorize it), then **2. Add a class code** for each class (for example `HEALTH3A`; students type it in any capitalization).
3. *Deploy -> New deployment -> Web app*. Execute as **Me**, who has access **Anyone**. Copy the link ending in `/exec`.
4. Edit `play/config.js` on GitHub and paste that link between the quotes of `window.CHM_RESULTS_URL = "";`. Commit.
5. Turn on GitHub Pages (Settings -> Pages -> deploy from the main branch). The student link is `https://<your-account>.github.io/walk-with-the-teacher/community-health-mission/play/`.
6. Test: open the link, use your test class code, finish (or use Teacher sign-in -> passcode `WALK-TEACHER` -> Start preview for a quick look; preview never writes grades). Confirm a row appears on `Summary` and rows on `Responses`. Menu **3. Refresh Reteach tab** builds the "what should I reteach" table.

Class codes are checked by the Sheet, so a student with a wrong code is stopped before starting. If the student is offline at the end, the result stays "pending" and the **Retry** button sends it; resending never double-counts.

Rebuild after changing content: `node private/regen-keys.js && npm run build` (also refreshes `play/`). `npm run test:play` runs a real-browser check of this build.

## Student experience (for your review)
Class code → entry briefing (3 min, ungraded) → county map with a guide character → six locations → final review → submit → results with module breakdown, attempts, strengths/areas, server timestamp, receipt ID, printable/downloadable receipt, answers and explanations, and the student's own **Community Health Action Plan**. Status chips separate **Progress saved**, **Finalized on server**, and **Recorded in teacher gradebook**.

## Scoring rules (enforced on the server)
Three submitted attempts per unit. Correct on attempt 1 = 100% of the unit's points, attempt 2 = 85%, attempt 3 = 75%, never correct = 0%. All-or-nothing correctness per unit. Blank/incomplete answers and network failures never use an attempt. Grade = earned ÷ 100 × 100, displayed to one decimal, stored with full precision. “Completed” and “Correct” are shown separately.

## Running locally (optional, needs Node 18+ and the private bundle)
```
npm install            # only for browser tests
npm run build          # builds dist/* from the sources
npm start              # http://127.0.0.1:8080  class code DEVCLASS, teacher passcode printed
npm test               # unit/integration tests (needs private/keys.json)
npm run test:e2e       # real-browser walkthrough (Playwright)
```
The local server uses the *same* engine as Apps Script but stores data in `.devdata/` JSON, for development only.

## Demo mode
Open `dist/demo/index.html` (or host it on GitHub Pages). Class code `DEMO`, any roster ID; teacher passcode `demo-teacher`. It uses 2 sample questions with different content, runs entirely in the browser, and shows a permanent **DEMO MODE** banner. **A demo success never means anything reached your gradebook.**

## Documentation index
`docs/SOURCE_STATUS.md` · `docs/ALIGNMENT.md` · `docs/BLUEPRINT.md` · `docs/CONTENT_NOTES.md` (accuracy corrections for teachers) · `docs/SOURCES.md` · `docs/SECURITY_PRIVACY.md` · `docs/TEACHER_PREVIEW.md` · `docs/PACING_PLAN.md` · `docs/QA_REPORT.md` · `private/ANSWER_KEY.md` (private)
