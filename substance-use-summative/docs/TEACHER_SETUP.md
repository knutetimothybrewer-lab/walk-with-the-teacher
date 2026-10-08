# Teacher setup (about 20 minutes)

You do not need to be a developer. Follow these steps in order.

## 1. Get the files online
Follow [`GITHUB_PAGES.md`](GITHUB_PAGES.md). You will end up with a student link such as `https://YOUR-NAME.github.io/REPO/`.

## 2. Create the results Sheet and backend
Follow [`GOOGLE_SHEETS_SETUP.md`](GOOGLE_SHEETS_SETUP.md). You will end up with a long web-app URL that ends in `/exec`.

## 3. Edit `js/config.js`
Open the file in GitHub (pencil icon) and change:

```js
schoolName: 'Your School',
teacherName: 'Ms. Example',
backendUrl: 'https://script.google.com/macros/s/XXXXXXXX/exec',   // from step 2
```

Class codes live in the **Config** tab of your Google Sheet (one per row). The `classCodeHashes` list in `config.js` is only a fallback used when the server cannot be reached. If you want the fallback to match your real codes, hash them:

```bash
node tools/hash.js MYCODE1 MYCODE2
```

(or use Preview Mode, tab **Tools**, no command line needed) and paste the lines into `classCodeHashes`.

**Do change the example codes** (`HEALTH2`, `HEALTH3`, `HEALTH5`). They are examples and appear in this documentation.

## 4. Test with the demo code
Open the student link, sign in with `DEMO2026`. Finish a few questions. Your Sheet's **Summary** tab gets a row marked **DEMO** when you submit. Demo rows never mix with real data and never block a real student.

## 5. Run through Preview Mode once
See [`PREVIEW_MODE.md`](PREVIEW_MODE.md). Check every simulation and the results screen.

## 6. Give students
The link and their class code. Nothing else. Tell them: use Chrome, do not use private/incognito windows, do not clear browsing data, and a refresh will not lose progress.

## Day-of tips
* Have students sign in **before** you start the timer.
* If a student is stuck on the sign-in screen, check the class code and the Config tab (Active = TRUE).
* A student who needs a fresh attempt: teacher dashboard (`/teacher/`), **Reset** next to the name.
* Accommodations: students can turn on larger text, a dyslexia-friendly font and reduced motion in Settings (the gear). There is no time limit.

## Changing questions
Edit `authoring/mN.js`, run `npm run build`, and (if you use the Sheet backend) paste the regenerated `google-apps-script/KeyData.gs` into Apps Script and redeploy. Rebuild changes the content version, which keeps scores from different versions separate.

## Naming
The title students see on the sign-in page and top bar is `appName` in `js/config.js` (default "Substance Abuse Summative"). Change it to whatever your course calls the assessment.
