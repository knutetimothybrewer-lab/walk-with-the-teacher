# Teacher guide (short)

## Run the assessment
1. Give each class its own block's code (Settings shows all three). Students open the student link and enter first name, last name, block and code, then press **Begin**. Their clock (90 minutes, ~70 expected) starts at Begin and is kept by the server.
2. Each mission starts with a simulation. Five progress chips show what is left. The questions open only when every chip is done.
3. Watch **Monitor** (teacher mode: type `HEALTH-TEACHER` in the class-code box, then your password). You see time left, mission and points per student. A student who loses Wi-Fi keeps their place and answers retry on their own.
4. Students submit from the Review page; if time runs out the server submits for them.
5. The hands-on CPR skills check and the Safety Fair stay in person. This test measures knowledge and decisions only.

## Read the Sheet
- **Master Dashboard**: one row per student (status, time, points, percent).
- **Block 1/2, Block 3/4, Block 8/9**: the same students per block with one credit column per question.
- Hidden, protected tabs: **Sessions** (master record), **Responses** (every attempt), **History** (copy of every reset), **Config**, **ItemBank** (the answer key), **PreviewSessions**. Do not share the Sheet with students.
- Scores: full credit on attempt 1, 85% on attempt 2, 75% on attempt 3, 0 if locked.

## Reset a student
Teacher mode > **Reset student** > pick the student > type their **last name** to confirm. The old record is copied to History, the student gets a fresh start and a fresh clock, and any open tab is signed out.

## Add time for one student
**Monitor > Time**: add minutes or set a total. An extension after the session already ended is refused; use a reset.

## Edit a question
Questions are written in `authoring/` (private; restore with the vault, see SETUP "Rebuilding from source"). Edit the item in `authoring/m1.js` (text, options, hints, explanation, points), run `node tools/build-content.js` (it lints: five or more options, two hints, similar option lengths, no answer in hints), then paste the new `private/ItemBankSeed.gs` into Apps Script, run **Unit 6 > Load item bank**, delete the seed file, and publish the updated page files. Use **Settings > Questions to include** to switch off anything you did not teach.

## Analytics
Teacher mode > **Analytics**: average per block, most-missed questions, first-try percent per question (questions most students get right first time are probably too easy; questions few students ever get are too hard), attempts, auto-submits, near-deadline students, reset history, CSV export.
