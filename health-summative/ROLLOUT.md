# ROLLOUT.md — a plain-language checklist for you

Four steps: **(1)** tell your counselor, **(2)** pilot with a few students, **(3)** run it, **(4)** use the results.

---

## 1. Counselor heads-up (do this before students see anything)

Send this (edit the brackets). Copy your administrator if your school expects that.

> **Subject:** Heads-up: mental health unit assessment on [DATE]
>
> Hi [Counselor name],
>
> On [DATE], my [PERIOD(S)] Health classes will take an online summative assessment for our Mental Health Unit. It is an interactive, self-grading activity of about 45 minutes. I want you to know about it before students do, because it includes **scenarios about stress, sadness, and safety**.
>
> How it is designed: it follows safe-messaging guidelines (AFSP / SAMHSA / reportingonsuicide.org). There are no methods or graphic details of self-harm; the safety content is about *recognizing signs and getting an adult*, using calm language and "Are you safe right now?" and walking a friend to a counselor. Students are **never asked to share their own mental health information**; there are no free-text boxes about feelings. Every screen has a **"Need help? / Take a break"** button showing 988, Crisis Text Line (text HOME to 741741), 911, and "talk to your counselor or a trusted adult," and students can **skip any scenario** without penalty.
>
> Could you be available (or have someone available) during [PERIOD/TIME] in case a student needs support? If a student seems upset, I will follow our school protocol and send them to you. I am happy to send you the content map or walk through it with you.
>
> Thank you,
> [Your name]

**If a student seems upset during or after the assessment** (a short note for you):
* Stay calm and private. Let them step away; the page autosaves and the Help/Take-a-break button is always there.
* Follow your school's protocol and involve the counselor. Do not try to counsel, diagnose, or investigate yourself; your role is the same "bridge" the unit teaches.
* Skipped scenarios and help-button opens are logged only as counts (never as answers). They are not a measure of a student's wellbeing and should not be treated as one.
* After class, check in privately with the student in the same warm way the unit models.

---

## 2. Student pilot (3–5 students, before the real run)

Pick a mix: one faster reader, one who reads slowly, one who is anxious about tests if you can, and if possible a student who uses accommodations. Use **school Chromebooks**, the real link, and fake or real names (you will wipe them).

**Before:** turn on the backend (README §6) and set a pilot class code in the **ClassCodes** tab, e.g. `PILOT`.

**Observation sheet** (print it, one per student):

| | Notes |
|---|---|
| Student / device / date | |
| Start time → finish time (minutes) | |
| Where did they pause, reread, or look confused? (station and question) | |
| Questions that felt **unfair, unclear, or had two good answers** (write the question id) | |
| Any **technical** issue on the Chromebook (slow, sound, layout, stuck button, Wi-Fi) | |
| Did drag/click placing work? Did they discover the tap-then-tap way? | |
| Anything that felt **uncomfortable** (which scenario)? Did they use Skip or Help? | |
| Did the final screen make sense? Did the completion code display? | |
| Their one suggestion | |

**Using the pilot data**
* **Timing:** compare real minutes to `TIMING.md`. If students are much faster or slower, edit `WPS` or the base seconds in `js/engine/timing.js`, or add/remove questions, then run `npm run timing`. To remove a question without editing content, add its id (shown in `CONTENT-MAP.md`) to `disabledItems` in `config.js`.
* **Bad questions:** open the Sheet's **Reteach** and **Items** tabs. Anything under 40% correct on the first attempt is flagged. Read the "most common wrong answer": if it is a *reasonable* answer, fix the question or its hint in `content/`.
* **Hints:** if students keep needing the third attempt on a question, make the hint for the commonest wrong option more specific (`['option text', 'your better hint']` in the content file).
* **Discomfort:** if any scenario bothered a student, discuss with your counselor and adjust or remove it.

**Wipe the pilot results before the real run:** in the Sheet choose **Wildcat Trail → Wipe ALL results**. (This clears Summary, Detail, Archive, Items and Reteach and keeps class codes.) Then replace `PILOT` with your real codes.

---

## 3. Day-of checklist

* [ ] Class code(s) set for each period (README §4 and the Sheet's **ClassCodes** tab). Written on the board or on slips, **not** emailed to students ahead of time.
* [ ] Test link opens on a Chromebook, a fresh browser window, signed out.
* [ ] Backend URL is in `config.js` and the Sheet is open on your computer (watch rows appear).
* [ ] Headphones available if any student uses **read-aloud** (volume tested).
* [ ] Counselor aware and reachable; your school protocol in mind.
* [ ] Accommodations entered in `studentOverrides` (extended time, read-aloud, larger text, reduced motion).
* [ ] **If Wi-Fi fails:** students can still finish on their device (progress saves in the browser), and they screenshot the **completion code** and score page. Collect the codes. When the Wi-Fi is back, have the student reopen the link on the same Chromebook, enter the same name, period and code, and click **Try sending again**.
* [ ] **Absent students:** give them the same link and a code later. No setup needed.
* [ ] **Reminder to say aloud:** "You can skip any scenario or take a break at any time. The Help button is always at the top. Your progress saves."

---

## 4. After the test

1. **Read the Sheet.** **Summary** shows every student. **Class** shows the average and a by-period table.
2. **Reteach tab:** start at the top. It ranks topics (Mental Health 101, Emotional Health patterns, Stress and the Brain, Communication, Help-Seeking, Infographic) and stations by class-wide first-attempt miss rate, lists the 10 most-missed questions with the most common wrong answer, and flags questions under 40% as "possibly a bad question." Reteach the top topic; consider dropping or fixing flagged questions before you grade (you can adjust `disabledItems` and recompute, or simply exclude them in your gradebook).
3. **Reset a student** (retake or make-up): README §6, or `teacher.html`.
4. **Export to your gradebook:** open the **Gradebook** tab → **File → Download → Comma-separated values (.csv)**. Columns: Last, First, Period, Percent. (The **Summary** tab has points and time if you want them.)
5. **Say something encouraging.** The final screen already does; your follow-up matters more.
