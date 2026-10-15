# Security: where the answers live and what a student could still do

## Where the answer keys are (exactly)

| Place | What is there | Who can read it |
|---|---|---|
| `authoring/` on the build machine | The question source with answers, hints and explanations (plain text) | Nobody else. It is **git-ignored** and never pushed |
| `vault/authoring.vault.json` in the repository | The same source, **encrypted** (AES-256-GCM, key from your passphrase via scrypt) | Visible to anyone, readable only with the passphrase |
| `private/ItemBankSeed.gs`, `private/itembank.json`, `private/ANSWER_KEY.md` on the build machine | Generated key files (git-ignored). `ANSWER_KEY.md` is the human-readable key | Nobody else. Hand them to the teacher privately |
| Hidden `ItemBank` tab of **your** Google Sheet | The key the server grades against, after you load it (SETUP step 6) | You, and anyone you share the Sheet with |
| `content/items.json` and `content/demo/*` in the repository | Question wording, options with opaque ids, figures. **No keys, hints or explanations** | Public by design |

Nothing a student's browser downloads contains a key. Grading happens only in the Apps Script server (`server/core.js`, built into `apps-script/Code.gs`). Hints and explanations are sent one at a time, only after a miss or a finished question.

`node tools/check-secrets.js` must pass before every commit. It fails if a private file could be committed, if any committable file contains text from the private bank, or if a forbidden answer-bearing field appears in the public JSON.

## What a student could still do

- **Read question wording before the test.** The wording is public (so the page loads fast and works offline). The answers are not.
- **Sign in as a classmate.** Sign-in is first name + last name + block + class code, as requested. There is no proof of identity. One active sign-in per student: a second sign-in signs the first tab out, so a classmate who signs in as someone else is noticed when the real student is kicked out. Give each block its own code and watch **Monitor**.
- **Skip a simulation by calling the server directly.** The simulation gate is enforced by the server against the chip list the page reports, but the chip list comes from the page. A student who writes their own requests could open a question without running the simulation. That only skips the learning, it reveals no answer.
- **Guess.** Each question allows 3 attempts at 100%, 85% and 75%. After three misses it locks.

## Teacher access

Typing `HEALTH-TEACHER` into the class-code box opens the teacher sign-in. The phrase is **not** a secret (it is in the page source); the **teacher password** is. It is checked on the server and stored only as a salted hash. Reset, answer-key preview, settings and exports all require the teacher session.

## Idempotence and the timer

Every answer carries a request id; a retried request returns the stored result and does not use another attempt. The deadline is computed on the server when the student presses Begin. The page timer is cosmetic: a late answer is refused by the server, and an every-5-minutes trigger auto-submits expired sessions.
