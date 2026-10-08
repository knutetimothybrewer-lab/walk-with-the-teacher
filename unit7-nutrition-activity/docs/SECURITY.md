# Security and integrity: what is and is not protected

**A static GitHub Pages site cannot be made cheat-proof.** Everything the browser can read, a determined student can read. This project adds reasonable layers and is honest about the limits.

## Layers
1. **No plain-text answers in the page.** Local mode ships salted SHA-256 hashes of each correct response. The explanation text is lightly XOR-obfuscated and is shown only after the third wrong attempt. The answers only exist in plain text in `authoring/` and `teacher-private/`.
2. **Optional server grading** (`gradingMode: 'server'`). The page loads `content/public.server.js`, which has no hashes, answers or explanations. Each "Check answer" is sent to your Apps Script, which compares against the key in `KeyData.gs` (inside your Google account), counts the attempt, and returns the explanation only after attempt 3. This removes offline answer-guessing from the page.
3. **Attempts cannot be refreshed away.** An attempt is stored before it is graded; a tab closed mid-check counts as used; in server mode the server counts too.
4. **Server re-scoring.** `submit` recomputes the score from the attempts using the hashed key (the client's own total is only a cross-check) and records `Client/server score mismatch`, `Local data modified` (a checksum on the saved session), or `Points possible != 100` in the *Integrity Check* column.
5. **One submission per student.** The server refuses a second start or submit for the same first name + last name + block once a submission exists (until you reset). If a duplicate arrives anyway (for example two devices at once) it is written as `DUPLICATE: REVIEW` and does not count until you accept it.
6. **Teacher-only surfaces are separate.** The dashboard needs the passcode on every request and locks for 10 minutes after 8 wrong tries. Preview Mode needs its own passcode and uses a separate storage namespace. The teacher reset code is verified by hash in the browser and by script property on the server.
7. **Class codes** stop outsiders. They are not secret from students (you give it to them) and are listed in plain text in `js/config.js` and the SETTINGS tab.
8. **Randomization.** Question order, answer order, numeric/product variants, scenario names and branches differ between neighbours. The answer position is spread evenly (checked by a test).

## Known limits
* Students can share answers verbally or photograph screens.
* In **local** mode, a student with developer tools can test guesses against the hashes. Use server grading when this matters.
* The URL carries no state, so there is nothing to edit in the address bar to reveal answers.
* If the repository is public, `authoring/` and `teacher-private/ANSWER_KEY.md` are readable by anyone who guesses the path. Publish only `dist/` (or the student files listed in the README) from a separate repository, or keep the project private.
* Web-app URLs are "anyone with the link". The script only accepts the documented actions and validates every field, but it is not authenticated for students (it cannot be: they have no accounts).
* Google Apps Script quotas apply (about 20,000 URL calls/day for consumer accounts and 30 simultaneous executions). A 30-student class submitting at once is well within limits; in server mode each attempt is a call, so a class of 30 makes roughly 2,000 calls.

## Privacy
Collected: first name, last name, class block, class code, timing, answers. Not collected: weight, height, BMI, health conditions, free text, location, cookies, analytics or third-party requests. Data goes only to the Google Sheet you own.
