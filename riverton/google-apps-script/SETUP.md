# Riverton class sync: teacher setup (about 10 minutes)

Sync is optional. If you skip it, no student data leaves the student's device.

**Before you start**
- Use your **school Google Workspace account**, not a personal Gmail.
- Students are identified by name and class period only. The data lives in your Sheet, under your district's Google agreement. Check district policy before turning sync on.

**1. Create the Sheet.** In Google Drive, create a new Google Sheet (for example "Riverton class data").

**2. Add the script.** Open **Extensions > Apps Script**. Delete the sample code and paste in everything from `Code.gs`. Save.

**3. Set the class code.** In Apps Script, open **Project Settings (gear icon) > Script properties > Add script property**. Name: `CLASS_CODE`. Value: a word or phrase you make up (for example `river-blue-7`). This is the shared secret; the script rejects any request without it.

**4. Deploy.** Click **Deploy > New deployment > Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Deploy and approve the permissions. Copy the **Web app URL**.

**5. Connect Riverton.** Open Riverton, go to **Teacher mode > Class sync**, and enter the Web app URL and your class code. Press **Send test**: you should see "Connected". Then build your assignment preset and share the link or file. The URL and code travel inside the preset; they are never stored in the public repository.

**What appears in the Sheet** (tabs are created automatically)
- `Roster`: student, period, first seen, last seen.
- `Events`: one row per answered check (module, item, concept, type, correct, attempts, hint used, and the student's prediction where one was made).
- `Written`: CER responses, Crossroads justifications, and lab conclusions, with an empty `teacher_score` column for your rubric score (0 to 2 per response works well).
- `Progress`: one row per student per module, updated in place (chapters completed, minutes, mastery by concept).
- `Gradebook`: formulas only. Per student: accuracy on auto-scored checks, checks answered, modules with progress, written responses, and the average of your `teacher_score` values.

**Class roll-up from the Sheet.** In Teacher mode > Class roll-up, press **Load from Sheet** to see mastery by concept, the most-missed questions, and more without collecting files.

**Troubleshooting**
- "bad class code": the code in Riverton does not match the Script property.
- Nothing arrives: confirm the deployment says Who has access: Anyone, and press Send test.
- After editing the script, use **Deploy > Manage deployments > Edit > New version**.
- Students on a school network that blocks Google will still work offline; their events send when the network allows.
