# Setup: from nothing to students taking it

About 30 minutes the first time. You need: a Google account, the GitHub repository (you already have it), and the two private files that were delivered to you separately (**ItemBankSeed.gs** and **ANSWER_KEY.md**). Those two files contain the answers and are deliberately **not** in GitHub.

**I could not test any of the Google steps below.** The build environment had no Google Apps Script account. The server code was run against a strict simulator of Apps Script (TESTING.md), but it has never run on Google. Step 10 (Test connection) is how you find out, and "Known problems on first deploy" at the end lists what to try if something fails.

You can try everything except the Google steps right now: with `API_URL` empty (as shipped) the page runs in **demo mode** on a nine-question practice set with its own pretend server. Nothing is recorded. Demo class codes are shown on the sign-in screen, and the demo teacher password is `demo-teacher`.

---

## 1. Create the Google Sheet

1. Go to <https://sheets.google.com> and create a **blank** spreadsheet.
2. Name it something like `Unit 8 Family Life Assessment (grades)`.
3. This Sheet holds the grades and the answer key. Do **not** share it with students.

## 2. Add the code

1. In the Sheet, click **Extensions > Apps Script**. A new tab opens with a file called `Code.gs`.
2. Delete everything in `Code.gs`.
3. Open `unit8-family-life/apps-script/Code.gs` from the repository (on GitHub click the file, then **Raw**, then select all and copy). Paste it into the editor.
4. Click the **gear icon (Project Settings)** on the left and tick **Show "appsscript.json" manifest file in editor**.
5. Go back to the **Editor** (the `< >` icon), open `appsscript.json`, delete its contents, and paste the contents of `unit8-family-life/apps-script/appsscript.json`.
6. Click **Save project** (the disk icon).

## 3. Set up the workbook

1. Go back to the Sheet tab and **reload the page**. A new menu called **Unit 8** appears after a few seconds.
2. Click **Unit 8 > 1. Set up workbook**.
3. Google asks you to authorize the script. Click **Continue**, choose your account, and if you see "Google hasn't verified this app" click **Advanced** and then **Go to (project name) (unsafe)**. This is normal for a script you wrote or own. Click **Allow**.
4. Run **Unit 8 > 1. Set up workbook** again if it did not finish. It is safe to run repeatedly.
5. A message lists your **class codes**, one per block (Block 1/2, Block 3/4, Block 6/7, Block 8/9). They are random six-character codes. Write them down; you can change them later in Teacher Mode.

What this created: a **Master Dashboard** tab and one tab for each of the four blocks (visible), and six hidden, protected tabs: Config, ItemBank, Responses, Sessions, History and PreviewSessions. It also installed a timer that runs every 5 minutes (it auto-submits students whose time ran out and refreshes the dashboards).

## 4. Set the teacher password

1. **Unit 8 > 2. Set teacher password**.
2. Type a password of at least 8 characters. It is stored only as a salted hash and cannot be recovered, only replaced.
3. Do not reuse a password you use elsewhere.

## 5. Look around (2 minutes, optional)

1. You should see the tabs **Master Dashboard**, **Block 1/2**, **Block 3/4**, **Block 6/7** and **Block 8/9**. The dashboards fill in as students work. Do not type in them; they are rebuilt from the hidden data.
2. The hidden tabs hold the real data. To see them: **View > Hidden sheets**. They are protected, so only you can edit them, and you should not need to. **Sessions** is the master record of every student; **Responses** logs every answer; **History** keeps a copy of every reset.
3. Do not share the Sheet with students or other staff unless you intend them to see grades. The hidden tabs are protected, but treat anyone you share the Sheet with as able to read the ItemBank tab, which contains the answers.

## 6. Load the question bank (the answer key)

1. In the Apps Script editor click **+ next to Files > Script**. Name the new file `ItemBankSeed` (Google adds `.gs`).
2. Delete the placeholder text and paste the **whole contents** of the `ItemBankSeed.gs` file you were sent. Save.
3. Back in the Sheet: **Unit 8 > 4. Load item bank**. A message says how many questions and points it loaded: **40 questions worth 100 points**.
4. **Immediately delete the `ItemBankSeed` file** in the Apps Script editor (the file's menu **> Delete**). It contains the answers, and the bank is now stored in the protected `ItemBank` tab.
5. Delete the copy you were sent from places other people can reach (shared drives, email), or keep it only in a private place. You will need it again only if you ever have to reload the bank.

## 7. Deploy the web app

1. In the Apps Script editor click **Deploy > New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Description: `Unit 8 assessment v1`. **Execute as: Me.** **Who has access: Anyone.**
   - "Anyone" means anyone with the link can *call* the service. The service itself only does what students are allowed to do, and the answer key never leaves the server (SECURITY.md).
4. Click **Deploy** (authorize again if asked).
5. Copy the **Web app URL**. It ends in `/exec`.

## 8. Point the page at it

1. In the repository, open `unit8-family-life/js/config.js`.
2. Between the quotation marks after `API_URL:` paste the web app URL. Leave everything else alone:

   ```js
   window.W8_CONFIG = {
     API_URL: "https://script.google.com/macros/s/XXXXXXXX/exec",
     APP_VERSION: "1.0.0"
   };
   ```
3. Commit the change to the branch GitHub Pages serves (normally `main`).

## 9. Publish on GitHub Pages

The other summatives in this repository already use GitHub Pages. If Pages is already on for the repository, merging this branch is all it takes. If not: repository **Settings > Pages > Build and deployment > Deploy from a branch > `main` / root > Save**.

The student link is:

`https://knutetimothybrewer-lab.github.io/walk-with-the-teacher/unit8-family-life/`

(Allow a minute or two after a commit for Pages to update.) The work in this session is on the branch `claude/festive-ptolemy-aszrd2`. It reaches `main` only when you merge it; I have not opened a pull request.

## 10. Test connection (do this before any student)

1. Open the student link. At the **class code** box type `WALK-TEACHER`. The teacher sign-in appears. Enter your teacher password.
2. Go to **Settings > Test connection** and click **Test Connection**.
3. Every line should have a check mark: teacher password set, class codes set for all four blocks, item bank loaded (40 items, 100 points), the Google Sheet opens and every tab exists, the 5-minute timer is installed, locking works, the cache works, the account the web app runs as, whether the assessment is open, the server clock, the round-trip time, and "this page and the server have the same assessment version". (It does not write a test row to the Sheet; item 5 below, a real run as a student, is what proves writing works.)
4. Go to **Preview**, open the assessment, press **Show answer key**, and read through all 40 questions with the answers visible. Preview never touches student data.
5. Do one **real run as a student** with a made-up name and ID in one block, and check the new row in the Master Dashboard (within about 5 minutes, or use **Unit 8 > Update dashboard tabs now**). Then reset that student (**Reset student**; type the last name to confirm). The reset keeps a copy in the hidden History tab.

## 11. Day-of checklist

- [ ] Test connection is all OK (do this the morning of, on the school network).
- [ ] Settings: **Assessment is open** is on; the **default time** is what you want (90 by default; accommodations are per student in **Monitor > Time**).
- [ ] Give each class its own block's code (not all four).
- [ ] Students need their name, student ID (3 to 20 letters or numbers), block, and the class code.
- [ ] If your slides did not cover an item, switch it off in **Settings > Questions to include** *before* students press Begin.
- [ ] During the test use **Monitor**: time left, current chapter and points per student. A student who loses Wi-Fi keeps their place; their answers retry on their own and they can reopen the page and sign in again.
- [ ] After: **Analytics** (it also has the CSV export and an **Update the Google Sheet now** button). The Master Dashboard is also in the Sheet.

## Changing things later

| I want to ... | Do this |
|---|---|
| Change class codes, default time, hide scores, open/close | Teacher Mode **Settings** |
| Give one student extra time | Teacher Mode **Monitor > Time** (add minutes or set the total) |
| Let a student start again | Teacher Mode **Reset student** (type the last name). The old record is kept in History |
| Change the teacher password | Teacher Mode **Settings**, or **Unit 8 > 2. Set teacher password** |
| Reload the question bank after I changed a question | Paste the new `ItemBankSeed.gs`, **Unit 8 > 4. Load item bank**, delete it again, then publish the matching updated page files (the page and the server must have the same version; Test connection tells you if they differ) |
| Change server code | Edit `Code.gs`, then **Deploy > Manage deployments > pencil > Version: New version > Deploy**. Editing the code without a new version does *not* change the live web app |
| Check everything is healthy | **Unit 8 > Health check**, or Teacher Mode **Test connection** |

## Rebuilding from source (only if you change questions)

The question source (with the answers) lives in `authoring/`, which is not in git. A copy is stored **encrypted** in `vault/authoring.vault.json`. To get it back on a new machine:

```
W8_VAULT_PASS="your passphrase" node tools/vault.js unlock    # restores authoring/
node tools/build-content.js        # rebuilds content/items.json and the private files
node tools/build-apps-script.js    # rebuilds apps-script/Code.gs
npm install && npm test      # optional: runs the tests (needs Node 20+)
```

The vault passphrase is in `SECRETS.local.json`, delivered to you with the private files. **If you lose it, the vault cannot be opened**, so keep it somewhere safe (for example a password manager), separate from the repository.

## Known problems on first deploy (what to try)

Since I could not test on Google, these are the failures I would check first:

- **"Authorization required" or the menu is missing**: reload the Sheet; run any Unit 8 menu item once and approve.
- **Test connection says the page and the server have different versions**: the page's `content/items.json` and the loaded bank came from different builds. Reload the bank from the matching `ItemBankSeed.gs`, or publish the matching page files.
- **Students see "could not reach the server"**: the web app is not deployed as *Execute as me / Anyone*, or the URL in `js/config.js` is wrong or has a stray space. Open the `/exec` URL in a browser: you should see a small JSON message that says `"ok":true`.
- **Slow when a whole class answers at once**: the script serializes writes behind a lock, so simultaneous answers queue. I could not measure how long that takes on Google. The page shows its saving status and retries on its own; if you see long waits, tell me what Test Connection reports (it shows the round-trip time).
- **Work lost to an Apps Script daily quota**: consumer accounts have limits on script run time and triggers. I do not know your account's limits. See SECURITY.md, "Limits you should know".
- **Anything else**: Apps Script editor **Executions** (left bar) shows each call and its error message. Send me the message.
