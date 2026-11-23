# DEED & DEBT

A classroom board game about economics and civics, set in the invented town of **Port Juniper**. It plays like the classic property-trading board game. Every mechanic teaches a real idea, from supply and demand, loans, credit and taxes to zoning, insurance, inflation, ballot measures and bankruptcy. The mascot is **Dex the Beaver**.

- **Players:** 2–6 per device (pass the device), plus optional CPU players to fill seats. Several groups can play at once on separate devices.
- **Length:** a Standard game is 10 Years, about 40–45 minutes. There is also Short (6 Years, about 25 minutes) and Long (14 Years, multi-day).
- **One file:** `index.html` (about 370 KB) with no build step, no server, no accounts, no network and no tracking. Fonts, art, sound and charts are all built into the file.
- **Saving:** the game saves in the browser at every turn change, every few seconds in between, and whenever the tab is hidden or closed. Each save goes to two places, `localStorage` plus a backup copy in IndexedDB, and the newer copy is used. The start screen lists saved games by group name, so a game can resume on another day on the same device.

## Run it

- **Easiest:** double-click `deed-and-debt/index.html`. It opens in your browser and works with no internet.
- **Or** serve the repository folder and open `http://localhost:8000/deed-and-debt/`:

```bash
python3 -m http.server 8000
```

## Publish with GitHub Pages

1. Push this repository to GitHub.
2. On GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick your main branch and the `/ (root)` folder, then **Save**.
4. After a minute or two, the student link is:
   `https://YOUR-USER.github.io/walk-with-the-teacher/deed-and-debt/`

The page makes no outside requests. A strict Content Security Policy blocks any network connection, so school web filters have nothing to block.

**Saves stay on each device and browser.** A Chromebook signed in to a different student account, or a browser in guest mode, will not see another account's saves. Have each group use the same device and account on every class day.

## Edit the content (no coding needed)

All content is in one object called `GAME_CONTENT` near the top of the first `<script id="game-content">` block in `index.html`. Open the file in any text editor (or GitHub's web editor), change the text or numbers, and save. Keep the commas, quotes and brackets in place. If the page goes blank after an edit, a comma or quote is probably missing.

| To change… | Edit this in `GAME_CONTENT` |
|---|---|
| The town name | `meta.town` |
| Street names (for example, rename "Cotton Mill Row" after a local street) | `name` in `SPACES` |
| District names, colors, icons | `GROUPS` (keep a different `pattern` and `icon` for each group so color is never the only clue) |
| Prices and rents | `price` and `rent` in `SPACES` (`rent` = no houses, 1, 2, 3, 4 houses, hotel) |
| Which lots are residential or commercial | `zoning: "R"` or `"C"` in `SPACES`; `historic: true` blocks hotels |
| Rail corridors | `CORRIDORS` (station space → the lots it boosts) |
| Careers and salaries | `CAREERS` |
| Cards | `OPPORTUNITY`, `CIVIC`, `DECISIONS`, `TENANT`. Change `title`, `text`, `insight`, `vocab` and `realWorld` freely |
| Life/Economy events | `EVENTS` (`weights` = how likely in expansion, peak, recession and recovery) |
| Ballot measures | `BALLOTS` (`summary`, `yes`, `no`, `fiscal`, `pro`, `con`) |
| Quick Checks and the pre/post check | `QUICK_CHECKS`, `PREPOST` (`answer` = number of the right choice, starting at 0) |
| Glossary | `GLOSSARY` (terms are underlined automatically the first time they appear in a turn) |
| Debrief questions | `DEBRIEF_GENERAL` |
| Difficulty presets | `DIFFICULTY` (turn taxes, credit, inflation, variable loans, depreciation and Tenant Notices on or off) |
| Overall tuning | `TUNING`: starting cash, rent scale, living costs, loan limits, interest spreads, insurance prices, tax brackets, Years with ballot votes, and more |

**Card effects.** Each card has an `effects` list (for example `{ "op": "cash", "amount": 60 }`). You can change the numbers safely. To invent a new kind of effect, copy an existing card that does what you want and edit its numbers; the list of effect names (`op`) is in the `applyEffects` function in the engine.

**Difficulty quick tips:**
- **Easier:** raise `TUNING.startCash`, lower `TUNING.rentScale` (for example 0.8), or choose the Easy preset.
- **Harder:** lower `startCash`, raise `rentScale`, or raise `livingBase`.

After a big change, run the simulator (below) to check that the game still fits the class period and stays balanced.

## Testing tools (`sim/`)

These need [Node.js](https://nodejs.org) 18+. The browser checks also need Playwright with Chromium. All of them load the engine straight out of `index.html`, so they test exactly what students play.

| Command | What it does |
|---|---|
| `node sim/simulate.js 500` | Plays 500 seeded CPU-only Standard games and writes `sim/REPORT.md` (play time, bankruptcy rate, win rates by strategy, career and rent vs. buy). |
| `node sim/trigger-all.js` | Forces every card, card option, Decision Point, Tenant Notice, event and ballot measure, then finishes each game. Checks for errors and softlocks. |
| `node sim/engine-checks.js` | Save → reload → resume at hundreds of random points, End Game Now from any point, no softlocks, and CSV format. |
| `node sim/ui-play.js 2 2 6 fast` | Plays a whole game in a real browser by clicking the UI. |
| `node sim/ui-check.js` | Browser checks: layout at 1366×768 and 1920×1080, keyboard-only play, save/resume, End Game Now, CSV export, reduced motion and no network. It writes `sim/UI_CHECKS.md` and screenshots in `sim/shots/`. |

Games are reproducible: type the same **Random seed** on the setup screen to get the same dice and events.

## Privacy

Students use first names or nicknames only. Nothing leaves the device: there are no accounts, no analytics and no network calls (FERPA-friendly). The game stores data only in that browser on that device (`localStorage` and IndexedDB). Delete a saved game from the start screen; that removes both copies.

**Why two copies?** In testing, Chromium sometimes lost `localStorage` writes on reload when the game was opened as a local file (double-clicked). This happened in about 1 of 4 reloads; it didn't happen when the game was served from a web address. The IndexedDB copy restored the game in every one of those cases. For the most reliable saves, use the GitHub Pages link.

## Accessibility

- **Motion and sound:** animation speed can be Normal, Fast or Reduced, and the game follows the device's "reduce motion" setting. Sound is synthesized and can be muted.
- **Reading support:** every card and dialog has a 🔊 read-aloud button (using the device's own voices). Every decision has a **Why?** button.
- **Color:** color groups also use an icon and a pattern, so color never carries meaning by itself.
- **Keyboard:** the game is fully playable by keyboard (R roll, E end turn, B bank, P property, T trade, G glossary, ? help, Tab and Enter for everything else). Focus is always visible, and touch targets are at least 44 px.
