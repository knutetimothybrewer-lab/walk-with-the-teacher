# Build Your Plan: Motivation and Goal-Setting Lesson (High School Health)

A single-file, self-paced lesson (about 65 minutes) for grades 9-12 on how motivation works, goal setting, habits, and recovering from missed days. Open `index.html`; no build step, no libraries, no network calls, no accounts. Works from `file://` and on GitHub Pages.

## Scoring and theme
- **Attempts:** the Knowledge Check (10 questions) and the Science vs Hype card sort (10 cards) give 100% for a correct answer on the first attempt, 75% on the second, 50% on the third, and 0% on the fourth (or when attempts run out). Wrong answers do not reveal the answer until the item is finished. Change the values in `TRY_PTS` at the top of the script.
- Other activities (Goal Repair Lab, if-then builder, action plan) use rule-based structure checks and allow unlimited revision.
- **Look:** a laboratory theme with little animated lab workers (inline SVG, no images). They blink, wave, swirl flasks and cheer when a step is complete. "Reduce motion" (or the system setting) turns all animation off and leaves static poses.

## How students submit
On the last screen: **Print / Save as PDF** (name and date print on every page) or **Download plan (.txt)** (file name like `Build-Your-Plan_Rivera-Alex.txt`). They hand it in or upload it where you direct. Nothing is sent from the page.

## Editing content
All text lives in labeled constants at the top of the `<script>`: `CONFIG`, `AREAS`, `NEEDS_ITEMS`, `OA_ITEMS`, `SVH_CARDS`, `OBST_EVENTS`, `LAPSE_OPTS`, `TRACK`, `KC` (knowledge check), `REFLECT`, `GOAL_LAB`. `CONFIG` holds the title, whether to show answers after a wrong attempt, minimum word counts, and an editable `standards` string.

## Resetting
- Student: Menu > "Reset lesson on this computer" (or the footer link), with a confirmation.
- Or clear site data for the page in the browser.

## Publishing (GitHub Pages)
Push to a GitHub repo, then Settings > Pages > "Deploy from a branch" > `main` / root. In this repo the link is `https://<username>.github.io/<repo>/build-your-plan/`. Progress is saved per browser and device; a student on a different computer or browser starts fresh.

## Known limitations
- Progress lives only in `localStorage`. If the browser blocks it, a banner warns students and the lesson runs in memory.
- Scores are rule-based checks, not AI; the Application score checks structure (specific, cue, if-then shape), not the student's choices.
- Drag-and-drop is optional (mouse); every drag activity has click/keyboard buttons.
- Science vs Hype scoring changed from a single pass with half credit to per-card attempts (100/75/50/0).
- Print header repeats on each page in Chrome/Edge; other browsers may vary.
- Tested with scripted headless Chromium (full playthrough, 600px width, reload/resume, blocked storage). Not tested on real Chromebooks, Safari, Firefox, a screen reader, or a physical touch screen.
