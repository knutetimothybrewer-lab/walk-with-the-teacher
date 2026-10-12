# Pre/Post Tickets

A warm-up and exit ticket for every lesson, auto-graded, with each student's growth tracked in your Google Sheet.

**How it works.** You run one screen (`teacher.html`). For each period you pick the lesson and press **Open warm-up** or
**Open exit ticket**. Students go to `index.html`, type the class code and their student ID, and get the one ticket you
have open for their period. Their answers are graded on the server, stored in your Google Sheet, and shown to you per
student, per class, and per skill. Answer keys never reach a student's browser.

```
site/          the two web pages + config.js            <- the only part that goes on GitHub Pages
apps-script/   the backend (paste into Google Apps Script)
data/          lessons, item bank, import CSVs          <- contains ANSWER KEYS: keep private (see Privacy)
tools/         scripts that build the item bank and seed data
tests/         automated tests + a no-Google dev server
```

## Try it on your computer first (no Google account needed)

```
node tests/dev_server.js
```
Open `http://localhost:8787/teacher.html` (passcode `teacher`) and `http://localhost:8787/` (class code `BLUE1`, student ID `10001`).
This runs the real backend code against a fake in-memory sheet. Data disappears when you stop it.

## Set up for real (about 20 minutes)

1. **Create the Sheet.** In your school Google account, make a new Google Sheet. Name it "Class Tickets".
2. **Add the code.** Extensions > Apps Script. For each file in `apps-script/` (`Stats`, `Grading`, `Data`, `Code`, `Reports`,
   `Setup`, `SeedData`) add a script file with the same name and paste the contents. (Delete the starter code in `Code.gs`
   first.) Then Project Settings > tick "Show appsscript.json manifest file" and paste in `appsscript.json`; change
   `timeZone` to yours.
3. **Build the tabs.** In the Apps Script editor pick `setupSheet` and press Run. Approve the permissions (it is your own
   script on your own sheet). Close the editor and reload the Sheet; a **Pre/Post Tickets** menu appears.
4. **Periods tab.** Replace each `CHANGEME-n` with a class code students will type (for example `MAPLE7`). Add or remove
   rows to match your periods. Change these each semester. Codes that still start with `CHANGEME` are refused.
5. **Roster tab.** Paste `student_id, last, first, period, active` (use `Y`/`N`). Use the school student ID. No emails or birthdays.
6. **ItemBank tab.** File > Import > Upload `data/items_import.csv` > "Replace current sheet" (with the ItemBank tab selected).
7. **Teacher passcode.** Apps Script > Project Settings > Script properties > Add `TEACHER_PASSCODE` with a passcode only you know.
   Never put it in a file or in `config.js`.
8. **Check.** Menu **Pre/Post Tickets > Check setup**. Fix anything marked with an X.
9. **Publish the backend.** Apps Script > Deploy > New deployment > Web app. *Execute as:* Me. *Who has access:* Anyone.
   Deploy and copy the URL that ends in `/exec`. (After you change the code later: Deploy > Manage deployments > edit > New version.)
10. **Publish the pages.** Put the URL in `site/config.js` (`API_URL`). Publish the contents of `site/` with GitHub Pages.
    Students use `.../index.html`, you use `.../teacher.html`.
11. **Optional:** menu **Refresh summary tabs every night** keeps the `Growth`, `ClassSummary` and `CriterionMastery` tabs current.

## Using it

* **Run class** tab: choose the lesson (the next one is suggested), **Open warm-up**. Watch the count; **Close** when done.
  At the end, **Open exit ticket**. Only one ticket per period is ever open. Opening another replaces it.
* **Results** tab: pick a lesson and class. You get average warm-up, exit ticket, change, class growth, the skills that did
  or did not move (bar chart), and every student's numbers. Click a student to see each answer. **Download CSV** on any table.
* **Students** tab: one student across the semester, with a trend line and lesson-by-lesson answers.
* Unit-review days (Day 6) draw one question from each earlier lesson in the unit. Their results feed each skill's data
  and a "not retained" check on the `CriterionMastery` tab, but stay out of the daily lesson averages.

**Reading growth.** *Change* = exit % − warm-up %. *Growth (g)* = (exit − warm-up) ÷ (100 − warm-up): the share of the
possible improvement achieved. Class growth uses the class averages. Only students who took **both** tickets count toward
change and growth; absent students are shown but never lower the averages. A student at 100% on the warm-up has no g.

## Settings (Config tab)
`MASTERY_THRESHOLD` (80), `PARALLEL_FORMS` (FALSE: same questions both times; TRUE: exit ticket uses the matching form-B questions),
`PARTIAL_CREDIT` (FALSE), `POST_FEEDBACK` (`full` or `score_only`), `ONE_PER_SCREEN` (FALSE), `ITEMS_PER_TICKET` (5).
`score_only` is worth considering if several periods take the same exit ticket on one day and you worry about answers
being passed along: students then see scores but not the explanations.

## First live day checklist
- [ ] Check setup shows no X. Class codes changed from CHANGEME. Roster pasted for every period.
- [ ] Open `teacher.html` on the device you will use in class; sign in. Try the **A+** button on the projector.
- [ ] Open one ticket on your own phone as a test student (add yourself to the roster with `active = N` to keep it out of
      reports, or use a spare ID, and delete the test rows from `Scores` and `Responses` afterward).
- [ ] Put the page address and class code on the board. Tell students to leave the page open: it starts by itself when you open the ticket.
- [ ] Warm-up: Open > watch the count > Close. Exit ticket: same. A student who is mid-ticket when you press Close will not be
      able to save, so close only when the count is where you want it. (Re-opening is fine; finished students cannot resubmit.)
- [ ] After class: **Results** tab. Anyone absent shows as warm-up only or exit ticket only.

## Privacy and the answer keys
* The browser only ever receives questions, never answers, explanations, or skill tags, until a student has turned in the exit ticket.
* `data/items.json` and `data/items_import.csv` contain the answer keys. **Do not publish them.** If this repository is public with
  GitHub Pages on, move `lessons/`, `data/` and `tools/` to a private repository and publish only `site/`.
* Student data lives only in your Google Sheet (school IDs, no emails or birthdays).
* Class codes are not a strong password; the ticket is only open when you open it, and a student ID must be on the roster for that period.

## Editing the item bank
Edit `tools/items_src/uN.py` (form A) and `uNb.py` (form B), then `python3 -I tools/build_items.py` (it checks the rules and rewrites
`data/`), and re-import `items_import.csv` into the ItemBank tab. Criteria live in `data/criteria_overrides.json`;
`python3 -I tools/build_sheet_seed.py` refreshes `apps-script/SeedData.gs`.

## Tests
```
node tests/unit.js       # growth formulas, grading, and the whole backend on a fake sheet (47 tests)
node tests/simulate.js   # 3 periods x 25 students x 10 lessons with absences, ceiling scores, and a stuck skill
node tests/e2e.js        # real browser: teacher + students through a full day (needs the playwright package)
```
