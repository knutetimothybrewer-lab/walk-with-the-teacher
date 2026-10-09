# Gambling: Behind the Odds (Unit 5 summative, Grade 10 Health)

A digital summative assessment for the Gambling unit. Students investigate six “case files” (about 60 minutes of work, a hard maximum of **90 minutes**), use six short simulations whose results feed real questions, and are graded automatically. Everything students type is checked by a **server you own** (a Google Apps Script web app writing to a Google Sheet in your account). The website itself is static and sits on GitHub Pages, so it works on school Chromebooks with nothing to install.

| | |
|---|---|
| Chapters | 1 Understanding Gambling · 2 Probability, Odds and House Edge · 3 Psychology and Brain Science · 4 Sports Betting and Parlays · 5 Advertising and Marketing · 6 Problem Gambling and Healthy Decisions |
| Simulations | A Probability Lab · B House Edge · C Sports Analytics Desk · D Neuroscience Lab · E Ad Investigation Lab · F Story Studio and Decision Lab |
| Questions | 32 scored questions (51 separately checked responses), 100 points |
| Attempts | 3 per question. Credit 100% / 85% / 75% / 0%. Hints after a miss, explanation after the question locks |
| Timer | Starts when the student presses **Begin Assessment**. Kept by the server. At 0:00 finished work is submitted automatically, even if the student’s computer is off |
| Teacher Mode | Type `WALK-TEACHER` in the class-code box, then your private password. Full preview with answers, class monitor, analytics, resets, code management, exports |
| Sheets | Five primary tabs: **Master Dashboard**, **Block 1/2**, **Block 3/4**, **Block 6/7**, **Block 8/9** (plus protected support tabs) |

> **Read this first.** The answer key is *not* in this public repository and must never be. The question bank is delivered to you as one private file (`private/KeyData.gs`) that you paste into your own Google Apps Script project. See [docs/SECURITY.md](docs/SECURITY.md).

---

## Setup (about 20 minutes, once)

You need: a Google account that can create a Google Sheet and Apps Script project, and write access to this GitHub repository (GitHub Pages is already serving it).

### Step 1. Get the two backend files

| File | Where it is | Secret? |
|---|---|---|
| `Code.gs` | `dist/apps-script/Code.gs` in this repo | No. Contains no questions and no answers |
| `KeyData.gs` | `private/KeyData.gs` (delivered to you privately; **never commit it**) | **Yes. This is the answer key** |
| `appsscript.json` | `dist/apps-script/appsscript.json` | No |

If you need to regenerate `KeyData.gs` from the encrypted vault in the repo:

```bash
npm install                      # once
node tools/vault.js unlock       # asks for the vault passphrase; restores authoring/ (git-ignored)
node tools/build.js              # rebuilds dist/ and private/ and re-locks the vault
```

### Step 2. Create the Google Sheet and paste the code

1. Go to <https://sheets.new> and name the spreadsheet, for example *Unit 5 Gambling Gradebook*.
2. **Extensions → Apps Script**. Delete the sample code in `Code.gs` and paste the whole of `dist/apps-script/Code.gs`.
3. Click **+ → Script** and name the new file `KeyData`. Paste the whole of `private/KeyData.gs`.
4. **Project Settings (gear) → Show “appsscript.json” manifest file in editor**. Open `appsscript.json` and replace its content with `dist/apps-script/appsscript.json`. (Set `timeZone` to yours.)
5. Click **Save**, then close the Apps Script tab and **reload the spreadsheet**. A new menu **Gambling Assessment** appears.

### Step 3. Set up the sheet, password and codes

In the spreadsheet menu **Gambling Assessment**:

1. **1. Set up this spreadsheet.** Google asks you to authorize the script (it needs your spreadsheet and a once-a-minute timer). Choose your account → *Advanced* → *Go to project* → *Allow*. This creates the five primary tabs and the protected support tabs, generates four class codes (all blocks start **closed**) and starts the auto-submit watcher.
2. **2. Set teacher password.** Choose a private password of 10 or more characters. It is stored only as a salted hash. Do not reuse a password you use elsewhere.
3. **3. Show class access codes.** Note the four codes. Change them any time in Teacher Mode.

### Step 4. Deploy the web app

1. In Apps Script: **Deploy → New deployment → ⚙ → Web app**.
2. *Execute as:* **Me**. *Who has access:* **Anyone**. Click **Deploy**.
3. Copy the **Web app URL** (it ends in `/exec`).

> If your district blocks “Anyone” links for school Google accounts, create the sheet and script in a **personal Google account** instead (the data is then in that account, so check your district’s policy), or ask your technology office to allow the web app. See *Troubleshooting*.

> Whenever you change the code in Apps Script, use **Deploy → Manage deployments → ✏ → Version: New version → Deploy** so students get the update. The URL stays the same.

### Step 5. Point the website at your backend

Edit `js/config.js` in this repository and paste the URL:

```js
backendUrl: 'https://script.google.com/macros/s/XXXXXXXX/exec',
```

Commit and push. GitHub Pages republishes in about a minute. The student link is

`https://<your-github-user>.github.io/walk-with-the-teacher/unit5-gambling/`

### Step 6. Test everything before students arrive

1. Open the student link. In **Class access code** type `WALK-TEACHER`. The page switches to the teacher password screen immediately. Enter your password.
2. **Preview and testing → Test the Google Sheets connection.** You should see a green confirmation and a labeled row in the protected **Test Records** tab.
3. **Open my preview.** Click through all six chapters. Under every question you can see the answer key. Use the toolbar to jump anywhere, set the timer to 0:20 and watch the auto-submit, and fill the preview with right or wrong answers to test scoring.
4. **Generate fictional students**, then open **Analytics → Fictional test students** to see the dashboards populated. These records are labeled `[DEMO]` and never enter the gradebook tabs.
5. Optional: do one real run as a student in a private window (use block *Block 1/2* and its code, open it first in **Access codes**). Then reset yourself in **Students and resets**.

### Step 7. Class day

1. **Access codes:** tick *Open for sign-in* for the class that is starting. Share only that block’s code.
2. Students open the link, enter first name, last name, Student ID, choose their block, and type the code. They read the briefing and press **Begin Assessment**.
3. **Overview** shows who is signed in, progress, time left and anyone near the deadline. It refreshes about every 30 seconds.
4. If a student needs a fresh start (browser crash, wrong ID, teacher decision): **Students and resets → search → View progress → Reset Student Progress**. The old record is archived, attempts are restored and they get a full 90 minutes starting when they press Begin again.
5. After class: **Export** (Excel or CSV) or use the Google Sheet. Close each block in **Access codes**.

### Step 8. Between classes and next year

- Generate new codes (**Access codes → Generate new codes**) so last class’s code cannot be reused.
- Delete or archive student data on the schedule your school requires. See [docs/SECURITY.md](docs/SECURITY.md).

---

## What students need

A Chromebook (or any recent Chrome, Edge, Firefox or Safari), the link, their Student ID and their block’s code. Nothing to install. If the Chromebook is offline for a while the page keeps the countdown, tells the student their last answer was **not** counted until it reconnects, and the server still submits their finished work at the deadline.

## What is in this folder

| Path | What it is | Public? |
|---|---|---|
| `index.html`, `css/`, `js/`, `shared/`, `assets/` | The website (student and teacher screens, simulations) | yes |
| `shared/core.js`, `shared/seeds.js`, `shared/data.js` | Math and fictional data shared by browser and server | yes (no answers) |
| `server/` | The grading engine used by the backend and by tests | yes (no answers) |
| `dist/apps-script/Code.gs` | Generated backend for Google Apps Script | yes (no answers) |
| `private/KeyData.gs`, `private/ANSWER_KEY.md` | **The question bank and answer key** | **no, git-ignored** |
| `authoring/` | Source of the question bank | **no, git-ignored** |
| `vault/authoring.vault` | The question bank, encrypted (AES-256-GCM, scrypt) so it can be kept in git safely | yes (encrypted) |
| `tools/` | Build, vault, dev server, timing model | yes |
| `tests/` | Automated tests (engine, Apps Script mock, contrast, browser end-to-end) | yes |
| `docs/` | Blueprint, curriculum alignment, architecture, security, testing, sources, discrepancies | yes |

## Documents

- [docs/BLUEPRINT.md](docs/BLUEPRINT.md): chapters, items, points, cognitive levels, timing estimates (generated; contains no answers)
- [docs/CURRICULUM_ALIGNMENT.md](docs/CURRICULUM_ALIGNMENT.md): every learning objective mapped to the source file, slide and question (generated)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how the pieces fit together
- [docs/SECURITY.md](docs/SECURITY.md): what is public, what is private, identity limits, student data
- [docs/TESTING.md](docs/TESTING.md): what was tested, how to run it, and what was **not** tested
- [docs/SOURCES.md](docs/SOURCES.md): real research used, statistics from your handouts, what is fictional
- [docs/DISCREPANCIES.md](docs/DISCREPANCIES.md): things in the unit materials to double-check
- [docs/ROLLOUT.md](docs/ROLLOUT.md): pilot plan and day-of checklist

## Running it on your own computer (for development)

```bash
npm install
node tools/vault.js unlock       # needs the passphrase
node tools/serve.js 8123         # http://localhost:8123 : real engine, no Google needed
```

On `localhost` the page talks to the bundled dev server. Dev class codes are `DEV1-TEST` … `DEV4-TEST`, the teacher password is `dev-teacher-pass-1` (development only). Tests: `npm test` (engine, Apps Script mock with the real generated `Code.gs`, curriculum bank checks, color contrast) and `npm run test:e2e` (real browser; needs Chromium).

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Students see “not connected to a backend” | `backendUrl` in `js/config.js` is empty or wrong. Paste the `/exec` URL, commit, wait a minute |
| “Not set up” message | Run **1. Set up this spreadsheet** from the sheet menu |
| Teacher password is rejected | Run **2. Set teacher password** again. Six wrong tries lock teacher sign-in for 10 minutes |
| Class code is rejected | The block is *closed* (Access codes), or the code does not belong to the chosen block |
| Students can’t reach the backend on school accounts | The district may block “Anyone” web apps. See Step 4 |
| After you edit the script, nothing changes | Create a **New version** under *Manage deployments* |
| The Master tab looks a minute old | Reports are rebuilt about once a minute; use **Update Sheets now** (Preview and testing) or the menu item *Rebuild reports now* |
| Google quota errors (rare) | Consumer accounts allow fewer script runs per day than school Workspace accounts. See [docs/SECURITY.md](docs/SECURITY.md) and [docs/TESTING.md](docs/TESTING.md) |

## Honest limitations

- **A class code plus a Student ID cannot prove who is typing.** It prevents drive-by access and accidental mix-ups; it does not stop a student from entering a classmate’s ID. Supervise as you would any assessment, and use the Roster tab if you want sign-in restricted to your real class list.
- The Google backend and real Chromebook performance were **not tested in this build** (it was built in an environment without access to your Google account). The same engine, and the real generated `Code.gs`, were tested against a faithful Apps Script mock. Run the Step 6 checks and a small pilot before the real class. See [docs/TESTING.md](docs/TESTING.md).
- Timing figures (about 56–66 minutes typical) are model estimates, not measurements. Pilot with one class.
- Some statistics in the unit’s own handouts are secondary sources that were not re-verified. See [docs/SOURCES.md](docs/SOURCES.md).
