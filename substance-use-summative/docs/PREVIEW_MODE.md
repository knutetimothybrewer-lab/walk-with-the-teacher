# Preview Mode (teacher / developer tools)

Preview Mode is not advertised on any student screen. The teacher passcode typed in the sign-in **Class code** box opens it.

## How to open it
Type the passcode (default `WALK-TEACHER`) into the **Class code** box on the sign-in screen and press **Begin**; no name is needed. Or add `?preview=1` to the address: `https://.../index.html?preview=1`. Enter the passcode when asked (default `WALK-TEACHER`). **Change the default**:

```bash
node tools/hash.js --preview "your new passcode"     # paste the output into previewPasscodeHash in js/config.js
```

A pink banner and a pink tool dock appear. Preview Mode uses a separate storage area, so it can never touch a real student's saved attempt, and it signs in as "Preview Teacher" with the DEMO code. `Alt+Shift+P` collapses the dock.

**Click straight through:** in Preview Mode the **Continue** button is never locked, so you can walk every step (the dock's **Next step →** button does the same thing and is never covered by the dock) of every mission (and on to the review and results screens) without answering anything. Use the dock's **Questions** tab if you want a step's questions filled in as well.

## What the dock does
| Tab | Tools |
|---|---|
| **Jump** | Go to any mission and step; entry screen, orientation, review screen |
| **Questions** | For the questions on the current step: reset, mark correct at attempt 1/2/3, mark wrong once/twice, lock after three misses; reset current mission; reset everything; mark all correct / mixed |
| **Scoring** | Live points, counts by attempt number, domain totals, per-question state |
| **Data** | The stored session JSON (and a copy button), list storage keys, clear preview storage |
| **Pools** | Which pool items this version drew; "Preview here" shows any pool alternative; "New random version" re-draws |
| **Graphs & sims** | Jump to every chart and simulation; **Unlock** opens a simulation's questions without playing it |
| **Results** | Show the results dashboard (all correct or mixed) without sending anything; or simulate a completed submission (sends a DEMO row to your Sheet) |
| **Sheets** | Test the connection (ping), validate `DEMO2026`, send a sample DEMO submission |
| **Tools** | Hash a class code for `config.js`; hash a new preview passcode |

Marking tools write synthetic attempts directly; they do not exercise the grader. To test the grader itself, answer normally (`DEMO2026`).
