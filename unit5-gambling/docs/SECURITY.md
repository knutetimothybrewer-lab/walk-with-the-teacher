# Security, privacy and academic integrity

## What is public and what is private

| Item | Public repo / GitHub Pages | Your Google account only |
|---|---|---|
| Website code, simulations, fictional data, math | yes | |
| `Code.gs` (engine, no questions, no answers) | yes | also pasted in Apps Script |
| **Question bank and answer key** (`KeyData.gs`, `ANSWER_KEY.md`) | **no** (git-ignored) | in Apps Script / your files |
| `authoring/` source | **no** (git-ignored) | |
| `vault/authoring.vault` (the bank, encrypted AES-256-GCM, key from scrypt) | yes, but unreadable without the passphrase | |
| Teacher password | **never stored in clear anywhere**, only a salted hash | Script Properties |
| Class access codes | **no** | Config tab |
| Student records | **no** | `_Sessions`, report tabs |

No admin password, answer key, API key or unrestricted grading credential is in any public file. The only things the page knows are the backend URL and the public shortcut text `WALK-TEACHER`. Keep the vault passphrase somewhere safe (a password manager). If it leaks, the encrypted file in git history can be decrypted; in that case, write new questions or rotate the bank.

## Authorization

- Students: a random session token per sign-in. Signing in on another device invalidates the old token (the record continues; a second device does not create a second record).
- Teachers: password → random six-hour token. **Each** privileged action re-checks it on the server. Students cannot call teacher actions: the server refuses with `FORBIDDEN` (this is tested, including a student token used as a teacher token).
- Grading, attempt counting, locking, the clock and resets are all server-side. Editing the page in the browser cannot award credit, restore an attempt or extend time.
- Public question content is stripped of keys, hints, explanations and weights before it is sent (`PRIVATE_KEYS` in `server/grading.js`, tested by walking every served object).
- Spreadsheet formula injection: any student-typed text written to a cell is neutralized (leading `=`, `+`, `-`, `@` escaped) in the Sheet and in exports.

## Identity limits (please read)

A class access code plus a Student ID **cannot prove who is at the keyboard**. A student who knows a classmate’s ID and the block code can sign in as that classmate if the classmate has not already started. Mitigations built in: one record per Student ID; a different name or block for an existing ID is refused; a second sign-in invalidates the first device and is counted and visible to you (“signed in on more than one device”); only you can move a student between blocks; the per-ID code-guess limit (8 tries, then 10 minutes); optional **Roster** tab restricting sign-in to your real list. None of this replaces supervision. Treat flagged multi-device sign-ins as a reason to look, not as proof.

Teacher sign-in is rate-limited globally (6 wrong tries, then 10 minutes), which protects the password but means someone who types the shortcut and guesses wrongly six times can lock you out for ten minutes. If that happens, wait; the data is unaffected.

## Student data

Collected: first name, last name, Student ID, class block, answers, attempts, timestamps, time per chapter, simulation counters, browser-reported position. **Not collected:** email address, Google identity, IP address, device identifiers, location, free-text personal information. (The Apps Script platform itself may log request metadata under your Google account’s own policies.) The data lives in a Google Sheet in **your** account.

You are responsible for your school’s and district’s rules (for example FERPA and local privacy agreements). Ask your technology office whether a teacher-owned Apps Script/Sheet is approved for student names and IDs. If you prefer not to use real names, students may enter initials and the school-issued ID; the gradebook still works.

Retention suggestion: export what you need after grading, then clear the **_Sessions**, report tabs, **Question Responses** and **Audit History** tabs at the end of the term (or delete the spreadsheet). *Generate new codes* before each use.

## Quotas and abuse

Apps Script has daily limits (script runtime, URL fetch, trigger runtime, concurrent executions). The design keeps each student to a handful of calls per minute (answer checks plus a lightweight heartbeat that writes only to the cache) and one sheet write per answer. A class of 30 is within normal limits for a Workspace-for-Education account; consumer accounts have lower quotas. **This was not load-tested against real Google infrastructure in this build.** Pilot with one class first, and stagger blocks. If the server is busy it returns a retryable error and the page retries with backoff without using an attempt.

## What you should do

1. Never commit `private/` or `authoring/` (they are in `.gitignore`).
2. Deploy the web app as **Execute as: Me**, **Access: Anyone**. Authorization is enforced by the engine, not by Google sign-in.
3. Use a long unique teacher password. Change it by running *Set teacher password* again.
4. Generate new codes for each use, and close blocks when class ends.
5. Review **Audit History** after a reset or config change.
