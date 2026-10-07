# Security, privacy and integrity

## What is protected and how
| Asset | Where it lives | Control |
|---|---|---|
| Answer keys, hints, explanations, rubrics | Server code only (`Code.gs` / `private/keys.json`) | Never in the student page, never in git. Hints are returned only after an accepted incorrect attempt; explanations only at final review (or on lock if you choose `onLock`). A test asserts no key, hint, explanation or rubric text appears in any public bundle. |
| Teacher passcode | Script Properties as salted SHA-256 | Verified on the server; 6 failed tries lock sign-in for 10 minutes (cache-based, best effort); issues a 2-hour random token held only in the teacher's browser tab. Not in any file. |
| Sheet ID | Script Properties | Not in the frontend. |
| Student sessions | Hidden `_State` tab (authoritative) + readable `Sessions`/`Responses` tabs | Each call needs `sessionId` + unguessable session token. Students can read only their own session. |
| Preview | Server cache, separate namespace `PV-…` | Requires a valid teacher token *and* the preview session token. Never writes to Sessions, Responses, Summary, exports or the gradebook. |

## Server-authoritative design
The client sends only the answer. The server validates the payload shape and completeness, grades with the private key, counts attempts, computes points, and finalizes. A client-sent score, correctness flag or total is ignored (tested). Every action (not only login) re-validates session and token.

## Concurrency and retries
- Every mutating call carries a unique `requestId`; the server stores the result of the last 10 and replays it for duplicates.
- `expectedAttempt` protects against two tabs: the stale tab is refused and nothing is consumed.
- Writes happen inside `LockService.getScriptLock()` and the lock is held only for the read-modify-write of one session (derived `Sessions` tab updates run after the lock is released). A busy lock returns a retryable `BUSY`; the client retries with the same `requestId` and exponential backoff.
- If the response is lost, the retry gets the original result. If a write fails, the attempt is not consumed.
- Finalization is idempotent: same receipt ID, edits locked until a teacher reset. If the gradebook write fails, the student sees "Finalized on server" with "delivery pending" and a retry button; success is shown only after the Sheet row is read back.

## Honest limits
- **Class code and roster ID are routing, not identity.** Anyone with the code can type any roster ID. Per-student access tokens (`RequireRoster` + `Roster` tab) improve matching but a student can still share a token. Do not claim one verified attempt per real person without proctoring or school-account verification.
- Apps Script "Execute as me" runs all students as you; Google sign-in (if you choose "Anyone with a Google account") adds a school-account gate but this app does not read student identities from it.
- Cache-backed items (teacher tokens, lockout counters, preview sessions) can be evicted early by Google; the consequence is a re-login, never lost student data (student state is in the Sheet).
- Student-visible text is escaped by construction (no `innerHTML` with student input); student strings written to Sheets are prefixed to neutralize formulas, and CSV exports do the same.
- The student can inspect their own page. They receive prompts and options (necessarily) but not keys. They could script submissions; the three-attempt rule and server grading still apply.

## Privacy
Collected: class code, roster ID, display name, period, timestamps, responses. Not collected: diagnoses, addresses, substance use, free text health disclosures (there are no free-text answers). Scenarios are fictional. The sheet is private to you; check district policy on storing student names in Google Sheets. Browser storage holds only a cache (session id/token, drafts, motion preference).
