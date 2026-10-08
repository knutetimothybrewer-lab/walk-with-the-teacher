# Teacher setup guide

Everything here is done once, before class. You do not need a server, accounts, an API key or a build step.

## 1. Set your reset passcode (required before class)

The app ships with **no passcode**. Until you set one, the "Teacher reset" control refuses to work and the welcome screen shows a "Teacher setup not finished" notice.

**Option A: in the browser (easiest).**
1. Open `teacher/passcode-setup.html` in Chrome (double-click it, or visit it on your deployed site).
2. Choose a passcode of at least 8 characters (easy ones such as 1234 or "wildcats" are refused) and type it twice.
3. Press **Generate verifier**. Copy the block that appears.
4. Open `js/teacher-config.js` and replace the line `teacher: { configured: false }` with the copied block.

**Option B: command line (Node 16+).** `node tools/make-passcode.js --write` prompts for a passcode (hidden) and edits `js/teacher-config.js` for you. Or paste the printed block yourself.

Commit and publish the change. Keep the passcode somewhere safe; if you lose it, generate a new verifier.

**What it protects, honestly.** A salted, iterated SHA-256 verifier is stored, never the passcode itself, and the entered passcode is never saved or exported. After 3 wrong entries a cooldown starts (30 s, doubling to 5 min). This is an **interface deterrent**, not security: anyone who can open developer tools can read or change the verifier and the code.

## 2. Optional settings (`js/teacher-config.js`)

Uncomment and change only what you need. Anything omitted keeps its default from `js/config.js`.

| Setting | Default | Meaning |
|---|---|---|
| `assessmentVersion` | `wwq-1.0` | Part of every browser-storage key. Changing it starts **fresh local records on every device** (old records are not deleted, just no longer found). Change only between class sets, as a deliberate decision. |
| `attemptLimits` | `{ short: 2, complex: 3 }` | `complex` may be 2 or 3. `short` items have two authored equivalent variants, so 2 is the maximum. |
| `caps` | `[1, 0.9, 0.75]` | Maximum share of an item's points on attempt 1, 2, 3 (a teacher-selected grading policy, not a research formula). |
| `timeGuidance` | target 36, range 30-40, `extendedTime: false`, multiplier 1.5 | Pacing guidance only (never speed-scored). The enforced limit is the separate `timeLimitMinutes` setting (default 90). `extendedTime: true` shows a longer pacing guide (x1.5) in the optional pacing chip. |
| `extendedExploration` | `false` | `true` shows optional, unscored extras (for example the best/worst-case week explorer). |
| `motion` | `auto` | `auto` follows the device's reduced-motion setting; `on`/`off` force the default. Students can still change it in Settings. |
| `letterGrades` | `{ enabled: false }` | Set `enabled: true` to show a letter grade (bands in `js/config.js`; boundaries use the unrounded total). |
| `identifierLabel` | "Student alias or teacher-approved ID" | Label for the identification field. |

## 3. Publish (GitHub Pages)

See the README, "Deploy on GitHub Pages." The student link is the folder's URL, for example `https://YOURNAME.github.io/REPO/wildcats-wellness-quest/`.

## 4. Test it before students do

1. Open the link in Chrome, enter an alias, and walk through a mission or two. Try a wrong answer, read the hint, retry.
2. Press **Teacher reset** in the page footer and enter your passcode. Confirm it opens teacher options.
3. Reset the device (Teacher reset -> Reset this device) so your test data is cleared before class.
4. Run your own pilot (docs/PILOT_CHECKLIST.md) with a few students on real Chromebooks.

### Teacher mode: click through without answering

1. Press **Teacher reset** in the page footer and enter your **teacher passcode** (the same one that protects the reset).
2. Press **Open teacher mode**. The page reloads into a purple "Teacher mode" bar.
3. Every mission is open. Use **Fill this step**, **Fill this mission** or **Fill everything and review** (best answers, full marks) to jump to the Review, Submit and Results pages. **Exit teacher mode** returns to the normal screen.

Teacher mode runs only in that browser tab (session storage). It never reads or changes a student's saved record on the device, never sends anything to the Google Sheet, and ends when you exit or close the tab.

## 5. Running it in class

- Share **one link**. Students enter the alias or ID you give them and an optional period.
- Progress saves in each student's browser. A student who reloads or comes back later resumes automatically. A student whose assessment is submitted always sees the locked final report.
- When finished, each student presses **Download results (JSON)** and gives you the file the way you prefer (upload to your LMS assignment, a shared folder, etc.). Nothing is sent automatically, and there is no cross-device sync.
- The report records the alias, session ID, version, submission time, every response with attempt number and variant, raw and capped points, first-attempt evidence, final score, completion, and any teacher-authorized reset note. There are no manual-review points.

## 6. Shared devices and resets

To clear a device for the next student: **Teacher reset** (page footer) -> passcode -> **Download this report** (recommended) -> **Reset this device for a new student** -> confirm. A new session ID is created and the new record is labeled "teacher-authorized new attempt (recorded locally, not independently verified)."

A student cannot start another session through the normal interface after submission. A new alias or period does not bypass the existing session.

## 7. Helping a student

- **Lost progress** (cleared site data, new device): if they have a recovery file (Settings -> Download recovery file), Settings -> Load a recovery file restores it. A recovery file can never lower attempt counts or replace a locked submission.
- **Storage blocked** (private browsing, locked-down profile): the app says device-level save/lock protection is unavailable and still offers downloads. Ask the student to use a normal window and download recovery files.
- **A student needs another attempt:** only a teacher reset starts a new session. This is by design.

## 8. Teacher materials

| File | Contents |
|---|---|
| `docs/ANSWER_KEY.md` | Every item, variant, option credit, compatibility matrix, numeric key, rationale and hint (generated from the live content) |
| `docs/COVERAGE_MATRIX.md` | Objective -> source file -> activity -> scored evidence, scoring blueprint, cognitive-demand audit |
| `docs/SOURCE_REGISTER.md` | Authoritative sources, claim mapping, verification status |
| `docs/CONTENT_NOTES.md` | Clarifications and corrections to slide/worksheet simplifications |
| `docs/TEST_REPORT.md` | What was actually tested vs what needs a classroom pilot; pacing estimate |
| `docs/PILOT_CHECKLIST.md` | Observation form and revision priorities for your pilot |

After editing any content, run `node tests/run-all.js` and `node tools/gen-docs.js` to re-verify and regenerate the keys.

## 8. Send results to a Google Sheet (optional)

Without this, students download a JSON file and hand it in. With it, each student enters a **class code** at the start and the result arrives in your Sheet when they submit. You do this once, in about 10 minutes.

1. Create a new Google Sheet in your own account, for example "Wildcats Quest Results".
2. **Extensions -> Apps Script.** Delete the sample code, open `apps-script/Code.gs` from this folder, copy **all** of it, paste it in, and save.
3. Reload the Sheet. A **Wildcats Quest** menu appears. Choose **Wildcats Quest -> 1. Set up tabs (first time)** and approve the permissions (it only touches this Sheet).
4. On the **ClassCodes** tab replace the sample codes (`QUEST1`, `QUEST2`) with your own, one per row. Codes are not case-sensitive. Write them on the board; do not post them ahead of time.
5. In the Apps Script editor choose **Deploy -> New deployment -> Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Deploy and copy the **Web app URL** (ends in `/exec`). If your school's Google domain blocks "Anyone," deploy from a personal Google account. Students never sign in to anything.
6. Open `js/teacher-config.js`, uncomment or add `backend: { url: 'PASTE-THE-URL-HERE' },` inside `WWQ.applyConfig({ ... })`, commit and publish.
7. **Test:** open the student link, enter one of your codes and a fake ID, finish (or use a test copy), submit, and check that a row appears on **Summary**. Then clear your test rows with **Wildcats Quest -> Wipe ALL results**.

**What you get**

| Tab | Shows |
|---|---|
| **Summary** | One row per student: percent, points, letter (if enabled), completion, first-attempt points, attempts used, minutes, points per mission. **File -> Download -> CSV** to import into your gradebook. |
| **Detail** | One row per student per question: points, first-attempt points, attempts. |
| **Reteach** | Topics ranked by how many points the class missed, plus the 10 most-missed questions (flagged if the class averages under 50%). Start reteaching at the top. |
| **Class - &lt;code&gt;** | One tab per class code on **ClassCodes** (for example `Class - QUEST1`): only that class's students, sorted by ID, with a class-average row. Rebuilt after every submission; **Wildcats Quest → Rebuild class tabs** rebuilds on demand. **Summary** stays the master list. |
| **Resubmissions** | A second submission under an ID that already has a result (see below). |
| **ClassCodes / Log** | Your codes; errors from the script. |

**Retakes and resets.** The Sheet keeps the **first** result for each ID + class code. If a student is reset on their Chromebook (Teacher reset) and submits again, the new result goes to **Resubmissions** instead of overwriting the first. To use it for the gradebook choose **Wildcats Quest -> Use a resubmission for one student** and type the ID; the two results swap places, so nothing is lost.

**If the network fails.** The student still sees the full results page, with "Not sent yet" and a **Try sending again** button; the page also retries on its own and when the connection returns. They can always press **Download results (JSON)** as a backup.

**Honest limits.** The page scores in the browser and sends the numbers, so a technically capable student could send altered numbers or look up the class code in the page's network traffic. The class code is checked on the server (it is not stored in the web page), but treat the Sheet like any other student-submitted record. A typed ID is not verified identity: tell students exactly what ID to use so rows match your roster.
