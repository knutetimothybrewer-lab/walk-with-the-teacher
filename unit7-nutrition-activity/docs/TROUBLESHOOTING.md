# Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Blank page, or "failed to load module" in the console | You opened `index.html` by double-clicking. Use a web server (`node tools/serve.js 8080`) or GitHub Pages |
| "That class code is not valid" for a correct code | Codes are not case sensitive but must match a row in the SETTINGS tab (when a Sheet is connected) or `classCodes` in `js/config.js`. Remove spaces. If the Sheet is connected, the Sheet is the real list |
| "That class block is not recognized" | The block names in `js/config.js` must match the SETTINGS tab (CLASS BLOCKS) exactly, including the slash |
| "Could not reach the server" at sign-in | Students without internet cannot start in server mode. In local mode with `allowOfflineStart: true` a valid local code still starts and the result is sent later. Check the `/exec` URL and that the deployment access is **Anyone** |
| Submission screen says "Saved on this device. Waiting to send." | The Sheet could not be reached. Work is safe in the browser. The page retries every 20 seconds and when the network returns; students can press **Try again** |
| New questions or key do not take effect | After `npm run build`, paste the new `KeyData.gs` into Apps Script and **Deploy > Manage deployments > New version**. The browser caches nothing from the script, but GitHub Pages can take a minute to update |
| "Score mismatch" in the Integrity column | The browser and server scored differently. This happens if `content/public.js` and `KeyData.gs` came from different builds. Rebuild and update both |
| Dashboard says "Could not load data (server-error)" | Open Apps Script **Executions** to see the error. Usually `setupGradebook()` was not run or `KeyData.gs` is missing |
| Dashboard shows nothing but "No real submissions yet" | DEMO DATA is hidden by default; real data appears after the first student submits. Tick "Include DEMO DATA" to preview |
| A student says a correct answer was marked wrong | Please tell me which question. The tests check every question's authored answer through the real grader, but wording or classification choices (see `docs/DISCREPANCIES.md`) may differ from your slides: edit `authoring/` and rebuild |
| Student refreshed in the middle | Nothing is lost. Sign in again with the same name and block; the student returns to the same step with attempts still used |
| Student closed the tab after clicking FINAL SUBMISSION | Reopen the link. The results screen shows and the submission retries automatically |
| `setupGradebook` cannot create block tabs | Block names in SETTINGS must be unique and tab names must be valid (no `/`). Defaults are `BLOCK 1-2` and so on |
| "Authorization required" when deploying | Run `setupGradebook()` once from the editor and approve. Choose **Advanced > Go to project (unsafe)** for your own script |
| The Sheet is slow when generating demo data | It writes about 28 submissions one at a time (about a minute). Wait for the toast |
