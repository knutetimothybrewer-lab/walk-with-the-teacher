# Outbreak City: a public health tower defense

A satirical zombie-outbreak tower defense game for high school community health classes, seen from a 2.5D isometric bird's-eye view. Every mechanic is a real public health concept in a zombie costume. Students soon find they can't just "shoot the visible cases": surveillance, vaccination, treatment, communication, trust and equity decide who survives and what kind of city is left.

- A static site with no server, build step, accounts, trackers, CDNs, images, fonts or audio files. Everything is drawn and synthesized in the browser.
- Runs from GitHub Pages or by double-clicking `index.html`.
- About 489 KB in total, including three embedded open-license fonts (the limit is 1 MB).
- A full game is 9 waves and takes about 25–40 minutes. A quick game is 6 waves and takes about 15 minutes.

## Run it locally

- **Easiest:** double-click `outbreak-city/index.html` and it opens in your browser.
- **Or** serve the folder and open `http://localhost:8000/outbreak-city/`:

```bash
python3 -m http.server 8000
```

## Publish with GitHub Pages

1. Push this repository to GitHub.
2. Open the repository on GitHub, then go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**, set **Branch** to **`main`** with folder **`/ (root)`**, then click **Save**.
4. Wait a minute or two. The game will be at:

   `https://YOUR-GITHUB-USERNAME.github.io/walk-with-the-teacher/outbreak-city/`

> **Remember:** on a free GitHub plan, the repository *and* the Pages site are **public**. Anyone with the link can play, and anyone can read the code, including the webhook URL if you set one. Don't put student data or secrets in the repository.

Thirty students can play at once from one link with no problem. The game runs entirely on each student's device, so there is no shared server to overload.

## Class links: everyone gets the same outbreak

Add options to the link:

| Option | Example | What it does |
|---|---|---|
| `seed` | `?seed=PERIOD3` | Same city, same Patient Zero, same arrivals and the same Mayor's Briefing cards for everyone. The seed shows on screen (bottom right). |
| `diff` | `&diff=easy` | `easy`, `normal` (default) or `hard` |
| `mode` | `&mode=quick` | 6-wave quick game |
| `teacher` | `?teacher=reset` | Clears this device's saved game and settings |

Example: `.../outbreak-city/?seed=PERIOD3&diff=normal&mode=quick`

The title screen also has a **Daily outbreak** button, which gives everyone playing on the same day the same seed. **Teacher tools** at the bottom of the title screen builds a class link for you and **decodes completion codes**.

## Results page for screenshot submission

When a game ends, students see a newspaper front page for their ending, then click **My Results page (screenshot this)**. The page fits on one screen and shows:
- A **✔ COMPLETE** stamp
- The student's name, which they can type or fix right on the page
- The date and time, plus the seed, difficulty and length
- The ending and its headline
- Key scores, including City Hall integrity, buildings overrun and Super-Spreaders faced
- The completion code
- How to take a screenshot on a Chromebook, Windows, Mac or iPad

Ask students to submit a screenshot of this page. The full After-Action Report is one click away.

## INSANE mode

**INSANE** is on the title screen from the start. It gives an unlimited budget (towers and upgrades are free), about 4× as many zombies, and a higher zombie limit. It's a reward round, not a fair assessment, so completion codes mark it as INSANE.

## Completion codes (works without any setup)

At the end, every student gets a completion code like `OC1-MXxCb3R8...-MFUA`, which they paste into your LMS. It encodes their name, seed, difficulty, ending, survival, trust, equity, peak R_eff, deaths, stray-fire deaths, vaccination and detection rates, the towers they built and each Mayor's Briefing decision. Paste a code into **Teacher tools → Check a student's completion code** to read it. A checksum flags codes that were edited by hand. It is an honor-system check, not real security.

The **Copy results** button copies a full text summary: the ending, scores, decisions, the student's personal reflection questions and the code.

## Optional: log results to a Google Sheet

1. Create a new Google Sheet.
2. In the sheet, choose **Extensions → Apps Script**, delete the sample code, and paste the script below. Click **Save**.
3. Click **Deploy → New deployment**. Under "Select type" (gear icon), choose **Web app**. Set **Execute as** to **Me** and **Who has access** to **Anyone**. Click **Deploy** and authorize it.
4. Copy the **Web app URL** (it ends in `/exec`).
5. Open `outbreak-city/js/config.js` and paste the URL between the quotes:
   ```js
   D.SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfy.../exec";
   ```
6. Commit and push. Results now arrive in a **Results** tab, one row per finished game.

```js
// Outbreak City results -> this Google Sheet (paste into Extensions > Apps Script)
const HEADERS = ['Received', 'Name', 'Seed', 'Difficulty', 'Mode', 'Ending', 'Survival %', 'Deaths', 'Trust',
  'Equity', 'Panic', 'Peak R_eff', 'Stray-fire deaths', 'Vaccinated %', 'Detected %', 'Cured', 'Towers',
  'Decisions', 'Completion code', 'Sim seconds'];

// Stop spreadsheet formulas sneaking in through a typed name
function safe(v) {
  if (v === null || v === undefined) return '';
  v = typeof v === 'object' ? JSON.stringify(v) : v;
  return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // serialize ~30 near-simultaneous submissions so rows never collide
  try {
    const d = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Results') || ss.insertSheet('Results');
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
    sheet.appendRow([new Date(), d.name, d.seed, d.difficulty, d.mode, d.endingTitle, d.survivalPct, d.deaths,
      d.trust, d.equity, d.panic, d.peakR, d.strayDeaths, d.vaccinatedPct, d.detectedPct, d.cured, d.towers,
      (d.decisions || []).join(' | '), d.code, d.simSeconds].map(safe));
    SpreadsheetApp.flush();
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error: ' + err);
  } finally {
    lock.releaseLock();
  }
}
```

How the game sends results:
- It sends with `fetch(..., { mode: "no-cors" })` as plain text, after a **random 0–10 second delay** so a whole class finishing together doesn't hit Google at the same instant.
- It **retries once** on a network failure.
- If the URL is blank or the device is offline, it fails silently.
- Because of `no-cors`, the browser can't confirm the row was written, so students should always paste their completion code too.
- If you change the script later, use **Deploy → Manage deployments → Edit → New version**. Otherwise the old code keeps running.
- Privacy: the sheet stores whatever name a student types. Consider asking for first name and last initial.

## Where to change things

| File | What's in it |
|---|---|
| `js/config.js` | **The top of the file has the city name, newspaper name and district names**, plus `SHEETS_WEBHOOK_URL`, every balance number (`CONFIG`), difficulty settings, the towers (cost, range, upgrades, text), zombie types and the wave table |
| `js/content.js` | All writing: the 30 Mayor's Briefing events, endings, news ticker headlines, concept and "real life" notes, reflection questions, tutorial text and briefing characters |
| `js/city.js` | City generation (districts, roads, river, blocks, landmarks) |
| `js/sim.js` | The deterministic simulation: infection model, agents, towers, meters, waves, endings and report data |
| `js/render.js` | Isometric renderer, sprites, effects, ending illustrations |
| `js/ui.js`, `js/app.js`, `style.css` | HUD, screens, input, save/resume, teacher logging |
| `fonts.css`, `FONTS-LICENSE.txt` | Embedded fonts (Bangers, Oswald, Atkinson Hyperlegible; SIL Open Font License) |

The format for events and effects is documented at the top of `content.js`. Effects can be immediate or delayed (the `later:` key), and decisions can set flags that change the ending.

## Embedding it in a larger app

The whole game is one namespace (`window.OutbreakCity`) with one entry point:

```html
<link rel="stylesheet" href="outbreak-city/fonts.css">
<link rel="stylesheet" href="outbreak-city/style.css">
<!-- load js/config.js, content.js, core.js, city.js, sim.js, render.js, audio.js, ui.js, app.js in that order -->
<div id="activity" style="position:relative;width:100%;height:80vh"></div>
<script>
  const game = OutbreakCity.mount(document.getElementById('activity'), {
    seed: 'PERIOD3',        // optional
    difficulty: 'normal',   // optional
    quick: false,           // optional
    webhook: ''             // optional: overrides SHEETS_WEBHOOK_URL
  });
  // later: game.destroy();   // removes the DOM and every listener
</script>
```

All CSS is scoped under `.oc-root`, saved data uses one `localStorage` key (`outbreakCity.v1`), and the game fills whatever element you give it.

## What the counters mean

- **Look healthy:** every resident not yet showing symptoms. Most people are indoors (badges over buildings show how many). Only residents on a trip walk the streets, and the line under the number says how many are out right now.
- **Zombies:** every active zombie. Up to 220 walk the streets at once (400 in INSANE) so Chromebooks stay smooth. Any extra wait inside buildings, still count, and show as red ▲ badges. The line under the number splits the total, e.g. "220 in streets, 173 inside buildings".

## How the game maps to public health

| In the game | Real concept |
|---|---|
| Bitten residents look healthy for ~34 s before turning (orange ◆ only when found) | Incubation period, asymptomatic/presymptomatic spread |
| Each person is S → E → zombie (I) → dead, or vaccinated (V) / recovered (R) | SEIR epidemic model |
| R_eff in the status panel; curve in the corner | R0 vs. R_eff, flattening the curve, hospital capacity line |
| Testing & Tracing Lab, contact-tracing upgrade, wastewater card | Surveillance, screening, contact tracing (**secondary** prevention) |
| Vaccination Clinic, vaccine stock, uptake depends on trust | **Primary** prevention, herd immunity, vaccine hesitancy, supply |
| Field Hospital beds | **Tertiary** prevention, surge capacity |
| Known-exposed people isolate only if they comply; compliance depends on trust, panic, pantries and paid sick leave | Isolation vs. quarantine, social support for isolation |
| Quarantine Barricades cost trust and income | Movement restrictions and their social and economic costs |
| Radio Towers, honest vs. spun numbers, myth-busting | Risk communication, misinformation |
| Community Health Workers boost underserved districts | Community-based public health, health equity |
| Districts start with very different health-care access | Social determinants of health |
| Equity Index | Health equity and distributive justice |
| City Hall command bunker in the middle of town: zombies march on it, crowd its walls and pound on it (damage numbers, cracks, smoke, then fire); an arrow points to it when it's off screen; if its integrity hits 0 the game ends | Protecting public health infrastructure and coordination (Essential Service 10) |
| New arrivals claw out of glowing "hell holes" at the city's edges | Imported cases keep arriving from outside, so a response has to plan for them |
| Super-Spreader zombies (from wave 5): giant, armored, infect several people per attack, smash barricades | Super-spreading (a few cases cause most spread); vaccination and controlling crowds blunt it |
| Spitters (infect from a distance), Screamers (speed up nearby zombies, raise panic), Crawlers (slip under barricades, hard to hit) | Different transmission routes need different responses; one tool never fits all |
| Before the middle wave, a General offers tanks for one wave: they kill many zombies but can't see hidden infections | Military force can't replace surveillance and prevention; it costs trust and endangers bystanders |
| Once the infection takes over, a two-step "Nuclear Option" can destroy the whole city (its own ending) | Ethics of proportionality: the most extreme measure, and what it costs |
| Districts fall into chaos as they're overrun: burning buildings and car wrecks, flashing police cars, fire glow and smoke, a news helicopter, falling ash | An uncontrolled outbreak spreads harm beyond the sick: panic, lost services, damage to whole neighborhoods |
| Buildings permanently decay once residents are infected (quarantine X → smashed and overgrown → smoking ruin) | The lasting damage of an uncontrolled outbreak; which neighborhoods were hit hardest |
| Laser Cannon (key 0): unlocks after wave 5 ("advanced research"), one per city, built downtown near City Hall. The player aims it (Z or the FIRE LASER button, then click) and it has a limited number of charges each wave | Scarce emergency tools (antivirals, ventilators, antibodies): deciding where each limited dose goes, and they still can't find hidden cases |
| Overrun buildings keep getting worse the longer they're lost: window fires and a tentacle poking out, then a roof inferno with writhing tentacles, then a towering column of fire, huge tentacles and a giant blinking eye. Pustules and fungus grow on the walls | The longer an outbreak goes uncontrolled, the more damage it does |
| Heavy Turret (key 9): an expensive upgraded military turret with twin cannons and splash damage, and even louder | More force still can't see hidden infections; escalation costs trust |
| Militia Turret: stray fire, noise draws more arrivals, trust loss | Containment by force, ethics (autonomy, non-maleficence, justice, proportionality) |
| Briefing cards (curfews, schools, stadium detention, donors, price gouging) | Public health policy, law and ethics |
| After-Action Report checklist | The 10 Essential Public Health Services |

**Endings** are computed from the final state:
- **The Nuclear Option:** the player destroyed the city to stop the outbreak.
- **City Hall Has Fallen:** zombies broke into the command bunker.
- **Collapse:** fewer than 55% survive or the outbreak is out of control.
- **Hollow Victory:** survived, but trust is near zero or the response was coercive.
- **Two-Tier City:** survived, but equity collapsed.
- **Eradication:** almost no active cases, R_eff < 1, 80%+ survive.
- **Controlled Endemic:** survived, but cases keep coming back.
- Two secret endings, which students should find for themselves.

## Teacher guide

**Before playing (5–10 min).** Ask:
- "If a disease made people look healthy for a while before they got sick, how would you stop it?"
- "Is the fastest way to stop an outbreak always the right way?"
- Introduce or review SEIR, R0, incubation period, and the three levels of prevention.

Tell students the game is satirical, and that how they win matters as much as whether they win.

**During play.**
- First-timers should leave the tutorial on. It is a 22-step guided walkthrough of the first wave: it moves the camera, spotlights each button and meter, and has students build a lab, turret, clinic and hospital themselves (Back, Next and Skip are always available).
- Encourage students to hover meters and towers (every one explains itself) and to try the **Data lens (L)**.
- For a whole-class comparison, give everyone the same `?seed=` link.
- A strong lesson design: play once, debrief, then replay **the same seed** with a different strategy.

**Debrief questions.** Each student's report also generates 4–6 personal questions.
1. Why didn't killing visible zombies stop the outbreak? What was happening that you couldn't see?
2. What did your R_eff do after you built Testing Labs, Clinics or Hospitals? What does R_eff below 1 mean?
3. How did trust change what your interventions could do (vaccine uptake, isolation compliance)? What raised or lowered it?
4. Compare deaths per 100 residents across districts. Which social determinants made Eastside Flats and Rustwater Port more vulnerable before anyone was bitten?
5. Which Mayor's Briefing decision had the biggest delayed consequence? What does that suggest about short-term vs. long-term thinking in policy?
6. When is a restrictive measure (curfew, barricade, detention, mandatory tracking) justified? Use necessity, effectiveness, proportionality and fairness.
7. Two students survived with similar numbers but got different endings (for example, Eradication vs. Hollow Victory). Which city would you rather live in, and why?
8. Which of the 10 Essential Public Health Services did your strategy use most? Which did you neglect?

**Standards connections (general).**
- National Health Education Standards 1 (core concepts: disease prevention), 2 (influences: social determinants), 3 (accessing valid information vs. misinformation), 5 (decision-making) and 8 (advocacy for community health).
- The 10 Essential Public Health Services.
- Introductory epidemiology: SEIR, R0/R_eff, herd immunity.
- Check your own state framework for exact codes.

**Content notes.** The humor targets officials, institutions and tropes, not real diseases, groups or victims. There is no gore. Zombies "collapse" or "poof" and cured people celebrate with balloons. A detention card and a stray-fire mechanic exist to prompt ethics discussions. Preview them if your class needs a heads-up.

## Controls and accessibility

**Mouse or touch:**
- **Move the map:** drag, use the screen edges, or WASD / arrow keys.
- **Zoom:** scroll wheel, pinch, or +/−. **Recenter:** C.

**Keyboard:**

| Key | Action |
|---|---|
| 1–9, 0 | Pick an intervention (Shift-click to place several); 0 is the Laser Cannon |
| Z | Aim the Laser Cannon, then click to fire (Esc stops aiming) |
| Esc or right-click | Cancel |
| U / X | Upgrade / sell the selected tower |
| Space | Pause (you can still build while paused) |
| F | Speed 1x / 2x / 3x |
| L | Data lens |
| Enter | Start the next wave |
| M | Mute |
| H | Guide |
| T | Status panel |

**Accessibility:**
- Colorblind-safe Okabe–Ito palette, plus a distinct shape or glyph for every tower, marker and count, so color is never the only cue.
- Text size options: Normal, Large, Extra large.
- Reduced motion (defaults to the device setting).
- Low effects, which **turns on automatically if frames average over 20 ms for 5 seconds**.
- Sound is synthesized and starts only after the first click; there is a mute toggle. Burning districts add a fire crackle and the news helicopter a rotor sound, louder near the camera (off when muted or in Low effects).
- Progress saves automatically. A returning student sees **Continue** and resumes paused at the exact same moment (the game replays the saved decisions deterministically).

## Testing (for maintainers)

Install-free: Node 18+ and the Playwright Chromium that ships with the dev environment.

```bash
node outbreak-city/tools/bots.js TEST01,ABC,K7Q2MX normal full nothing,shooter,balanced,expert
```

```bash
node outbreak-city/tools/browser-test.js /tmp/oc-shots
```

- `tools/bots.js` runs scripted strategies headlessly to check balance.
- `tools/browser-test.js` runs the end-to-end browser checks and saves screenshots.

Win rates and game length (`node outbreak-city/tools/winrates.js 40 normal full`). This plays 40 different seeds per strategy on Normal. "Infection wins" means the city collapsed, City Hall fell, or it was nuked.

| Strategy | Infection stopped | Contained (endemic) | Survived, damaged | Infection wins | Avg survival | Game length at 1× |
|---|---|---|---|---|---|---|
| Do nothing | 0% | 0% | 0% | 100% | 44% | 4 min (4–5) |
| Pure militia | 0% | 0% | 0% | 100% | 40% | 14 min (12–15) |
| Heavy Turrets + militia | 0% | 0% | 0% | 100% | 38% | 9 min (7–15) |
| Rich districts only | 0% | 35% | 8% | 58% | 54% | 15 min |
| **Typical student** (varied, partly random choices) | 0% | 28% | 23% | **50%** | 54% | 14 min (8–15) |
| Balanced public-health toolkit | 13% | 83% | 0% | 5% | 74% | 15 min |
| Expert (guards entrances + full toolkit) | 20% | 68% | 0% | 13% | 75% | 14 min |

The bots never fire the Laser Cannon (it needs a player to aim it), so a student who uses it well will do a bit better than these numbers.

- **Tuning target:** a typical student loses about half the time, while strong public-health play rarely loses.
- **Easy:** the typical student never loses, and balanced play stops the infection about 90% of the time.
- **Hard:** the typical student loses about 70% and balanced players about 15%.

**Classroom time:** a full game is about 15 minutes of simulated time at 1× speed. With planning between waves and reading briefings (about 25 s per wave), plan on **18–20 minutes**, plus the tutorial (about 5 minutes) the first time. Doing nothing ends in about 7 minutes. 2× or 3× speed shortens waves. Simulating 280 games takes the computer about 3.5 minutes.
