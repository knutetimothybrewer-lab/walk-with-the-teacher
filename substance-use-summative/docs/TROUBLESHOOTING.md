# Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Blank page when opening `index.html` by double-click | Browsers block JavaScript modules on `file://`. Use the GitHub Pages link or `npm run serve`. |
| "That class code is not valid" | Check the code and the Config tab (Active = TRUE). If the server is unreachable it falls back to the hashed list in `js/config.js`. |
| "Could not reach the server" at sign-in | Wi-Fi or the web-app URL. Open the `/exec` URL in a browser: you should see `{"ok":true,"app":"SIGNAL",...}`. If you see a Google sign-in page, redeploy with **Who has access: Anyone**. |
| Submissions do not appear in the Sheet | `backendUrl` empty or wrong; or Apps Script not redeployed after editing `Code.gs`/`KeyData.gs` (Deploy > Manage deployments > New version). Use Preview Mode > Sheets > Test connection. |
| Scores in the Sheet differ from the student's screen | The server re-scores. A mismatch note appears in the **Integrity** column. Most often `KeyData.gs` is out of date: run `npm run build`, paste the new file, redeploy. |
| Student sees "already submitted" | They (or someone with the same name and code) already submitted. Teacher dashboard > **Reset**. |
| Student lost progress | They used a private window, cleared browsing data, or switched Chrome profile/device. Progress is stored per browser profile. Use **Reset** if they must restart. |
| Charts or simulations look wrong | Update Chrome; make sure browser zoom is 100%. |
| Dashboard says "Could not load data" | Wrong passcode (Script properties > TEACHER_PASSCODE) or backend not deployed. Eight wrong tries lock it for ten minutes. |
| `npm test` fails after editing a question | The build must be rerun: `npm run build`. The test verifies that every authored answer matches its hash. |
| Apps Script says "You do not have permission" | Re-run `setup`, click **Advanced > Go to project (unsafe)**, allow. |
| Quota errors with a large class | Apps Script allows many calls per day for a classroom; if 100+ students submit at once, ask them to wait a minute and press **Try again**. |
