# Security and assessment integrity: what this does and does not do

A web page cannot be made tamper-proof. Anyone who controls their own browser can read what the browser downloads. This project adds reasonable classroom protections and is honest about the limits. It is suitable for a classroom summative taken in a monitored room. It is not suitable for a high-stakes exam taken unsupervised.

## What is in place
| Protection | How |
|---|---|
| Class-code validation | Checked on the server against the **Config** tab. A hashed fallback list in the page is used only if the server is unreachable. Codes are never in the page as text. |
| No plain-text answer key in the page | `content/public.js` has no answers. Each question carries only a salted SHA-256 hash of the correct response. Explanations are lightly obfuscated and shown only after a question locks. Modules keep this data out of global variables. |
| Randomization | Pool items, question order inside tagged blocks, answer order, matching choices, sort items and sequence starting order are shuffled per session with a seeded generator. A **Version ID** (e.g. `V-A9FA4C`) is stored with each submission. |
| Session ID | Every attempt has a unique ID. |
| Progress and attempt persistence | `localStorage`, written before grading; attempts cannot be restored by refreshing. A checksum notices hand-edited saved data and flags it ("Local data modified") in the Sheet. |
| Server-side validation | The Apps Script **re-scores every submitted attempt** against its own key, ignores attempts beyond three or after a correct one, flags a mismatch with the browser's claimed score, and reports the server's score. |
| Server-side attempt counting (optional) | Build with `node tools/release.js --strip` and set `gradingMode: 'server'`: the browser never receives a key; each check is sent to the server, which counts the attempt, limits it to three, and returns explanations only after the lock. |
| Duplicate-submission protection | The server refuses a second completed submission for the same student name and class code, and treats a repeated submit of the same session as already done. |
| Final submission lock | After submitting, the completed state and a completion lock are stored; reloading shows only the results screen. |
| Confirmation before submitting | A dialog asks for confirmation. |
| Teacher reset | Dashboard **Reset** marks the session reset on the server; the student's browser notices and returns to sign-in. The old row stays in the Sheet, marked superseded. |
| Teacher controls hidden | Preview Mode needs `?preview=1` and a passcode; the dashboard needs a passcode held only in Apps Script properties and is rate-limited. Neither is linked from student screens. |

## Known limits (be aware)
* **Hashes can be brute-forced.** In local-grading mode a determined student can read `content/public.js` and test possible answers against the hashes. For questions with few possible answers this is easy. Server grading mode removes this, at the cost of needing the backend for every check.
* **Clearing site data resets local attempts.** In local-grading mode, a student who clears browsing data could restore attempts on the **browser**. The server (which records the submission) still re-scores only the attempts it was sent, so a student who did this and submitted fresh attempts would receive credit for them. Server grading mode counts attempts on the server, so this does not work. Remind students not to clear data; consider `gradingMode: 'server'` for graded use.
* **A public repository exposes `authoring/`.** Publish only `dist/` (see `GITHUB_PAGES.md`).
* **Copying questions to another student** cannot be prevented by software. Randomized pools and answer order reduce casual sharing.
* **Class-code secrecy** depends on how you share it. Rotate it by editing the Config tab.

## Privacy
No third-party scripts, fonts, analytics or trackers. Fonts are bundled. The only network traffic is to your own Apps Script URL. Names, period, class code, scores and responses to the questions are sent to your Sheet. The assessment asks students for no personal substance-use information; all scenarios are fictional.
