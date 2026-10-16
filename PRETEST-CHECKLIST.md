# Summatives: pre-test checklist (teacher)

Run this once per assessment on **one student-managed Chromebook, signed in as a student account** (not your own). It takes about 10 minutes each. Student starting page: `student-start.html` in this repo.

Replace `BASE` below with your site root: `https://knutetimothybrewer-lab.github.io/walk-with-the-teacher/`

## 0. Do these once, for all assessments

- [ ] Open `BASE student-start.html` on the student Chromebook and press **Check my Chromebook**. All three rows should say OK. A BLOCKED row means your web filter (GoGuardian, Securly, Lightspeed, etc.) is blocking `github.io`, `script.google.com` or `script.googleusercontent.com`. Ask your tech coordinator to allowlist them.
- [ ] **Answer keys are public (fix before students use the site).** This repo is public and Pages is on, so students can open files such as `BASE substance-use-summative/teacher-private/QUESTION_BANK.md`, `BASE unit7-nutrition-activity/teacher-private/ANSWER_KEY.md`, the `authoring/` folders and `KeyData.gs`. Either move these to a separate private repo and publish only the student files, or accept the risk knowingly. Removing a file from `main` does not remove it from git history.
- [ ] Class codes are written on the board or slips on the day, never posted ahead of time.
- [ ] Stagger starts: have students sign in a few at a time. Apps Script handles about 30 simultaneous executions per account, and the 90-minute auto-submit will land in a burst.
- [ ] Any app you edited in Apps Script: **Deploy, Manage deployments, pencil, New version, Deploy**. The `/exec` URL in `config.js` must match.
- [ ] Open each backend `/exec` link in a **signed-out** browser window. A JSON reply (`{"ok":true,...}`) is good. A Google sign-in page means "Who has access" is not set to "Anyone" (no sign-in), and cross-site saving from github.io will fail.
- [ ] Students must not use Incognito, clear browsing data, or switch Chromebooks mid-test (progress and the clock live in the browser).

## 1. Per assessment

For each: open the link, sign in with a **test** class code, answer a few questions, submit, and confirm a row appears in your Sheet. Then try Teacher Mode (type `WALK-TEACHER` in the class-code box where supported).

| Assessment | Folder | Backend access setting | Class code lives in | Specific things to check |
|---|---|---|---|---|
| Wildcat Wellness Trail (Mental Health) | `health-summative/` | "Anyone" (docs); no manifest in repo, so check the deployment | Sheet **ClassCodes** tab (`serverValidatesCode: true`); fallback `TRAIL1-4` in `config.js` | Counselor heads-up sent (`ROLLOUT.md`). Pilot with 3-5 students. Wipe pilot rows from the Sheet before the real run. |
| SIGNAL (Substance Use) | `substance-use-summative/` | "Anyone" (docs) | Sheet **Config** tab; fallback hashes in `js/config.js` are still the **documented example codes** (HEALTH2/3/5) | Change or remove the fallback hashes so documented codes cannot start an offline session. Demo code `DEMO2026` rows are marked DEMO only. Answer files are public (see section 0). |
| Gambling: Behind the Odds | `unit5-gambling/` | `ANYONE_ANONYMOUS` (manifest) | Teacher **Access codes** panel; blocks start **closed** | Open the block you are testing. Confirm the Sheet's once-a-minute auto-submit timer was authorized. Class code must belong to the chosen block. |
| Unit 7 Nutrition & Physical Activity | `unit7-nutrition-activity/` | `ANYONE_ANONYMOUS` (manifest) | Sheet **SETTINGS** tab, Class Code column (the Sheet decides when a backend is connected; `classCodes` in `js/config.js` is only the offline fallback) | Add or edit the code rows in SETTINGS (per-period codes if you want them). After pasting new `Code.gs`, redeploy as a new version and run `setupGradebook()`. `teacher-private/ANSWER_KEY.md` is public (see section 0). |
| Unit 6 Injury Prevention | `unit6-injury-prevention/` | `ANYONE_ANONYMOUS` (manifest) | Sheet **Config** tab (`code:Block ...` rows; confirm every block you teach has one, e.g. Block 6/7) | Run **Test Connection** from the Unit 6 menu. The hands-on CPR check is in person, not in this test. |
| Unit 8 Family Life | `unit8-family-life/` | `ANYONE_ANONYMOUS` (manifest) | Sheet setup per `docs/SETUP.md` | The Sheet is deployed and its dashboard updates, but do a full end-to-end test and a short pilot before relying on it. Curriculum and facts are marked unverified (`docs/TEACHER_REVIEW.md`). |
| Wildcats Wellness Quest | `wildcats-wellness-quest/` | "Anyone" (docs) | Sheet **ClassCodes** tab | Teacher passcode is configured in `js/teacher-config.js`. Run the Pilot Checklist (`docs/PILOT_CHECKLIST.md`). Source decks were unavailable, so slide references are unverified. |
| Community Health Mission | `community-health-mission/` | `"access": "ANYONE"` in the manifest = **Google sign-in required** | Class codes added from the Sheet menu | Served from its own `/exec` URL (not stored in this repo). Students must be signed in to a Google account the deployment allows; test with a student account. Put the URL in `student-start.html` (`SUMMATIVES`). Run **Run delivery test** in the teacher panel. |

## 2. Day-of

- [ ] Sheet open on your computer to watch rows arrive.
- [ ] Headphones for students using read-aloud.
- [ ] Wi-Fi fallback explained: students screenshot the score page and completion code, then use "Try sending again" later on the same Chromebook.
- [ ] Accommodations entered (`studentOverrides` or each app's equivalent).
- [ ] Say aloud: "Use the normal Chrome window, don't clear data, refresh is safe, tell me if anything is blocked."
