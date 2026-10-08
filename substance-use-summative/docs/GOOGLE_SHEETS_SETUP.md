# Google Sheets setup (exact steps)

You need a Google account. Nothing here costs money.

1. **Create the Sheet.** Go to <https://sheets.google.com>, click **Blank**, name it `SIGNAL Substance Use Results`.
2. **Open Apps Script.** In the Sheet choose **Extensions > Apps Script**. A code editor opens. (Opening it from inside the Sheet is important: it binds the script to this Sheet.)
3. **Paste the backend code.**
   * Click the file `Code.gs` and replace everything with the contents of `google-apps-script/Code.gs` from this project.
   * Click the **+** next to **Files**, choose **Script**, name it `KeyData`, and replace everything with the contents of `google-apps-script/KeyData.gs`. Run `npm run build` first if you changed questions so this file is current.
   * Click the disk icon (**Save project**).
4. **Create the tabs.** In the function dropdown at the top choose `setup`, click **Run**. Approve the permission prompts (Google will say the app is not verified: click **Advanced > Go to project (unsafe)**, which is normal for your own script). Setup creates the tabs **Summary, Questions, Analytics, Config, Sessions**, writes three example class codes, and creates a teacher passcode. Open **View > Logs** (or the Execution log) to read the passcode.
5. **Set your class codes.** In the **Config** tab, replace the example rows. Columns: `Class Code`, `Label` (what students see in the class drop-down), `Active` (TRUE/FALSE), `Period` (optional; recorded in your results and shown in the drop-down; if blank the student's choice is used). The sign-in drop-down is filled from this tab, so it always matches what you typed here. Codes are not case sensitive. `DEMO2026` always works and is always marked DEMO. Students never see this list.
6. **Set the teacher passcode.** In Apps Script click the gear (**Project Settings**), scroll to **Script properties**, and edit `TEACHER_PASSCODE`. Pick something long. This protects the dashboard and the Reset button.
7. **Deploy as a Web App.** Click **Deploy > New deployment**, the gear next to *Select type* > **Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy** and approve again if asked.
8. **Copy the URL** that ends in `/exec`.
9. **Paste it into the app.** Open `js/config.js`, set `backendUrl: '...the /exec URL...'`, save/commit.
10. **Test.**
    * In the Apps Script editor run `sampleSubmission` (function dropdown). Check that the **Summary** and **Questions** tabs each have a new `[DEMO]` row.
    * Open the student link in Chrome and sign in with `DEMO2026`. Or use Preview Mode, tab **Sheets**, button **Test connection**.

## What lands in the Sheet
* **Summary**: one row per completed assessment (timestamp, name, class code, period, version, start/completion time, total minutes, raw score, points possible, percentage, number correct on 1st/2nd/3rd attempt, missed, status, mode LIVE/DEMO, integrity note, session and confirmation IDs, and seven domain percentages).
* **Questions**: one row per question per student (question ID, concept, domain, type, Attempt 1/2/3 results, final result, points, last attempt time, and the recorded responses).
* **Analytics**: rebuilt after each real submission (class summary, domain averages, question difficulty from hardest, most-missed concepts). Menu **SIGNAL > Rebuild analytics** does it on demand.
* **Config**: your class codes. **Sessions**: working records (do not edit; Reset uses it).

## After you change the code
Apps Script keeps the old version live until you redeploy: **Deploy > Manage deployments > pencil > Version: New version > Deploy**. The URL stays the same.

## Using a different endpoint later (Excel / Power Automate)
All network calls go through `js/transport.js`. Set `backendKind: 'webhook'` to POST the final submission JSON (the same payload the Apps Script receives) to any URL. Class-code validation, server-side checking and the dashboard need the Apps Script backend.
