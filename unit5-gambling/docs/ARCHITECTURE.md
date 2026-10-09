# Architecture

```
 Student Chromebook (Chrome)                       Teacher                       Your Google account
 ┌────────────────────────────┐                ┌───────────────┐              ┌───────────────────────────────┐
 │ GitHub Pages (static)      │   POST (JSON,  │ same website, │              │ Apps Script web app           │
 │  index.html, css/, js/     │ text/plain)    │ Teacher Mode  │  POST        │  Code.gs  (engine + adapter)  │
 │  shared/ (math, fictional  ├───────────────►│ (WALK-TEACHER ├─────────────►│  KeyData.gs (PRIVATE bank)    │
 │  data), sims, timer        │◄───────────────┤  + password)  │◄─────────────┤        │                      │
 └────────────────────────────┘   JSON         └───────────────┘              │        ▼                      │
                                                                              │  Google Sheet                 │
                                                                              │   Master Dashboard            │
                                                                              │   Block 1/2 … Block 8/9       │
                                                                              │   + protected support tabs    │
                                                                              └───────────────────────────────┘
```

## Why a backend at all

GitHub Pages only serves static files. Anything a student could read in the page (a score check, an answer key, a clock) can be changed by that student. So the browser only **displays and collects**; the server **decides**: it grades, keeps the clock, counts attempts, locks questions and writes the gradebook. Google Apps Script plus Google Sheets was chosen because it is free, the teacher owns the data, and the Sheet is the gradebook the teacher already wants.

## Pieces

| Piece | Files | Runs in | Notes |
|---|---|---|---|
| Shared core | `shared/core.js` | browser, Node, Apps Script | Seeded random streams, credit rule, number parser, lab “cores”. **Identical code on both sides**, so the server can recompute any number a student reads from their own simulation |
| Fictional data | `shared/data.js`, `shared/seeds.js` | browser, Node, Apps Script | Teams, odds, ads, posts (all invented), vetted lab seeds |
| Grading | `server/grading.js` | Node, Apps Script | Item model, public view (strips keys), grading, partial credit, attempt record |
| Engine | `server/engine.js` | Node, Apps Script | Every action (`login`, `begin`, `submit`, `heartbeat`, `finalize`, teacher actions). Pure: depends only on a *store* interface and a clock |
| Stores | `server/stores/memory.js` (tests, dev), Sheet adapter inside `Code.gs` | | Same interface, so the engine that was tested is the engine that ships |
| Question bank | `authoring/` → `private/KeyData.gs` | server only | Never sent to the browser except as stripped public items |
| Front end | `js/` | browser | ES modules. `main.js` router, `shell.js` assessment, `items.js` widgets, `timer.js`, `sims/*`, `teacher/*` |

## Request flow

`js/api.js` posts `{action, payload}` as `text/plain` (a “simple” CORS request, so no preflight, which Apps Script cannot answer). Every mutating call carries a `requestId`; the server remembers the result per request id, so a retry after a dropped connection **cannot** use a second attempt. The server clock is measured on each response and the browser corrects for it, so a wrong Chromebook clock never changes the countdown.

## The clock

`begin` sets `startedAt = now` and `deadline = startedAt + 90 minutes` on the server. The browser shows `deadline − (local clock + measured offset)`. Because only the server’s deadline matters:

- refresh, tab switch, closing the laptop, or going offline do not pause or reset it;
- any request after the deadline is refused (`TIME_UP`) and **finalizes** the session: finished answers kept, unanswered questions 0, label *Time Expired — Auto-Submitted*;
- a student who never reconnects is finalized by the server anyway: a one-minute time trigger (`u5Tick`) sweeps sessions past their deadline, and the teacher dashboard sweeps on every load.

## Attempts and scoring

One press of **Check answer** is one attempt, but only if every part is answered. Credit for an attempt = attempt multiplier (1, 0.85, 0.75) × fraction right. The item keeps the best credit. A question locks when it is fully correct or the third attempt is used, and only then is the explanation released. Multi-part questions use weighted partial credit on the same scale. Attempt numbers are stored server-side (`expectedAttempt` guards stale pages), so refreshing cannot restore an attempt.

## Simulations feed real questions

Coin/die streams and the house-edge game run on **per-student seeded streams** (`u01(seed, i)`); the student’s seed is chosen by the server from a vetted pool (`shared/seeds.js`) so no student gets a degenerate lab. A question like “how many heads in *your* first 20 flips” is graded by recomputing flip 0…19 on the server. Items can also be functions of a per-student seed, so each student gets different numbers while the explanation shows theirs. The other labs (sports desk, neuroscience, ads, decisions) gate progress through lab-action counters that the browser reports with heartbeats; their graded questions use the data tables in `shared/data.js`.

## Google Sheet layout

Five primary tabs, in order: **Master Dashboard**, **Block 1/2**, **Block 3/4**, **Block 6/7**, **Block 8/9**. They are derived views: rebuilt from the session records, protected (warning-only edit), and never read back by the engine. Support tabs: **Config** (codes, open/closed, settings; protected), **Roster** (optional list of allowed students), **Question Responses** (one row per attempt), **Audit History** (resets, config changes; append-only), **Test Records** (labeled fictional/test rows), and hidden **_Sessions**, **_Preview**, **_Demo**.

Session state is one JSON blob per student in `_Sessions` (about 20 KB worst case), kept write-through in the script cache. Writes verify the row they are about to update, run under a script lock, and report rebuilds run under a document lock with a dirty flag, so concurrent submissions cannot corrupt each other and a half-written report is never the source of truth.

## Teacher Mode

Typing `WALK-TEACHER` in the code field is only a **shortcut** that shows the password screen; it is public and grants nothing. The password is checked by the server against a salted hash held in Script Properties, rate-limited, and answered with a random six-hour token. **Every** teacher action (`teacherOverview`, `answerKey`, `resetStudent`, `saveConfig`, …) re-checks that token on the server. The preview is a separate session (`PV-MAIN`) in a separate store; it can never read or write a student record, and fictional students live in `_Demo` and `Test Records`.

## Determinism and tests

Because the core is shared and deterministic, the same code is exercised three ways: Node unit tests (`tests/engine.test.js`), the real generated `Code.gs` + `KeyData.gs` running under a faithful Google Apps Script mock (`tests/gas.test.js`), and a real browser against the dev server (`tests/e2e/run.mjs`). See [TESTING.md](TESTING.md).
