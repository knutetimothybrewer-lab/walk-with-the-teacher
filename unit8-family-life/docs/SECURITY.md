# Security and privacy

This is written for a teacher, not a security professional. It says what is protected, how, what a determined student could still do, and what I could not test. **No independent security review has been done and the live Google deployment has not been tested** (TESTING.md).

## What is protected, and how

| Asset | Where it lives | Protection |
|---|---|---|
| **Answer keys, hints, explanations** | Hidden, protected `ItemBank` tab in your Google Sheet, copied into Apps Script's private cache | Never sent to the browser before a question is finished. Hints are sent after a miss, the explanation only after the question is correct or locked. Not in GitHub (see "Secrets"). A unit test fails if any server reply carries a key before it is earned |
| **Teacher password** | Only a salted, iterated SHA-256 hash, in Apps Script **Script Properties** | The password is checked on the server only. It is never in the page, the repository or the Sheet. Comparison is constant-time. Wrong guesses are throttled (below) |
| **Class codes** | Hidden `Config` tab (and the teacher's Settings screen) | Random six characters from a 31-letter-and-digit alphabet with no 0, O, 1, I or L. Not in the repository. Compared on the server |
| **Grades and attempts** | Hidden `Sessions`, `Responses`, `History` tabs; the visible Master Dashboard and block tabs are generated views | Only you can edit them (sheet protection). Treat the Sheet as confidential: anyone you share it with can read the answer key |
| **Timer** | Server | The 90-minute deadline is computed and enforced by the server from the moment of Begin. The page's countdown is a display; changing the computer's clock cannot add time. Answers that arrive after the deadline are refused by the server itself, not only by the 5-minute timer |
| **Student tokens** | Browser `sessionStorage`; the server keeps them in the session record | A random token per sign-in. A second sign-in for the same student replaces it and signs the first tab out. Tokens expire (12 hours if never started; 3 hours after the deadline once started) |
| **Teacher tokens** | Server cache only, 2 hours | A lost token only means you sign in again |

### Teacher login throttle

After 5 wrong passwords within 10 minutes the server starts delaying its answers (up to 8 seconds). It does **not** lock you out. A determined attacker could still try roughly one password every few seconds, so use a long, unique password (at least 8 characters is enforced, and I would use 16 or more). The web app has to be reachable by "Anyone" for students to use it, so this endpoint is on the open internet.

`WALK-TEACHER` typed in the class-code box only reveals the teacher sign-in form. It is visible in the page's source and is not a secret; the password is.

## What is deliberately public

- **The question text.** `content/items.json` has every prompt, option and card, with opaque IDs and no key. The page downloads it **before** anyone signs in, so anyone with the link can read all 40 questions in advance (and so can a student who looked at the page before the class). They cannot read the answers. If advance exposure of the wording is a problem for you, the fix is to send question text from the server only after Begin. That would slow loading on slow connections and was not built.
- **The practice set** (`content/demo/`) and its answers. It is a separate, clearly labeled practice set shown only in demo mode.
- **The alignment table and the claims list** (`content/alignment.json`, `content/sources.json`): topics and objectives, with no answers.
- **The page, the CSS and the front-end code.**

## Secrets: what is and is not in git

- `authoring/` (the question source with answers) and `private/` (the item bank, `ItemBankSeed.gs`, `ANSWER_KEY.md`, `REVIEW_DETAIL.md`, the vault passphrase) are in `.gitignore`.
- A copy of `authoring/` is stored **encrypted** in `vault/authoring.vault.json` (AES-256-GCM, key from your passphrase through scrypt) so the answers are not lost if this build machine disappears, while the public repository cannot read them. **If you lose the passphrase you cannot decrypt it.**
- `node tools/check-secrets.js` runs before each commit. It fails if private files could be committed, if any committable file contains text from the private bank, or if a class code, passphrase or password appears in one.
- No teacher password, password hash, class code or vault passphrase is in any commit.

### What is in git history (please read)

While writing these docs I found that **earlier commits on this feature branch** (`b132bf6` and `71c09bb`) contained two things that gave answers away in plain words, which the secrets gate could not recognise as answers:

1. the text description of each labeling diagram (in `content/items.json` and `content/figures.js`), and the descriptions and XML comments inside the SVG files, named the structure beside every marker, so they gave away the answers to the two labeling questions;
2. an older `content/sources.json` (commit `71c09bb`) listed health claims word for word next to the question IDs that depend on them, which spelled out the intended classification and transmission answers for a few questions.

The per-question answer notes, the answer key, the item bank, the teacher password and the class codes were never in any commit.

**The current files are fixed** (descriptions now describe shapes only; the public claims list is topic-level; detailed notes moved to the private `REVIEW_DETAIL.md`; builder and tests now guard the figure text). The branch history still contains the old text. It has **not** reached `main`. Your options, from least to most work:

- merge with **Squash and merge** so the intermediate commits never enter `main`'s history, and delete the feature branch afterward; or
- ask me to squash this branch to a single clean commit and force-push it (I did not do that on my own because it rewrites history on a remote branch).

If the repository is public, anyone who browses branches could have seen the branch before it is cleaned. I do not know whether anyone has.

## What a student could and could not do

**Could not (by design and by test):**
- read the answer key from the page, the network traffic, or the page source (tests check that no reply and no public file carries keys before they are earned);
- read the teacher screens or any other student's data without the teacher password;
- add time by changing the computer clock, by editing the page, or by holding an answer and sending it late;
- submit a question twice to get two attempts (a retried request is recognised and counted once);
- answer a staged question before the earlier stage is done, or change a locked answer;
- skip the three-attempt limit. After three misses the question locks.

**Could, and you should know:**
- **Sign in as someone else.** The class code is shared with the class, and a student ID and last name are not secrets. A student who knows a classmate's ID, last name and block, and the block's class code, can sign in as them; that signs out the real student's tab, and they can then answer in their name. The server checks that the last name matches the ID, which stops typos, not impersonation. Monitor shows each student's status and time, so you may notice, and you can reset a student; but **the system cannot prove who is at the keyboard**. Stronger identity would need a school login (for example Google sign-in restricted to your domain), which I did not build. Give each class only its own block's code, and change codes after each class.
- **Guess.** Three attempts per question is the design you asked for, so a determined guesser gets partial credit on questions with few options. The credit table (100/85/75/0) and the lock make guessing cost points, not impossible.
- **Share answers** with a neighbor, use a phone, or look things up. No web page can prevent that. The question order is the same for every student; only the option order is reshuffled.
- **Read all the question wording ahead of time**, as explained above.
- **Try class codes.** There is no limit on wrong class codes. A random six-character code from a 31-character alphabet has about 887 million possibilities, which is not guessable by hand, but I did not rate-limit it.
- **Flood the web app.** The URL is open to anyone. Google's own quotas limit it, but a flood could use up your daily quota or slow real students. There is no CAPTCHA.

## Privacy and data

- **What is stored:** each student's first and last name, student ID, block, answers, attempts, timestamps, and score, in **your** Google Sheet, and temporarily (up to 6 hours) in Apps Script's cache. Nothing is sent anywhere else. No analytics, no cookies, no tracking, no third-party scripts, no web fonts or images from other sites.
- **What the browser stores:** the sign-in token (`sessionStorage`, cleared when the tab closes) and the motion-reduction preference (`localStorage`). In demo mode only, the practice state is in `localStorage` and contains no real student data.
- **No free text.** Students never type an answer, so nothing a student types can disclose personal information. The only typed fields are name, ID, class code and one numeric answer.
- **No personal questions.** No question asks about a student's own life, family, body, relationships or experiences. All characters are fictional.
- **Confidentiality.** Nothing in the assessment promises a student that a service is confidential. Messages say to tell a teacher or school counselor.
- I am not able to tell you whether this meets FERPA, your district's data policy, or Delaware law. That needs your district's data-privacy office. Things to ask them: whether a teacher-owned Google account and an Apps Script web app are an approved place for student names and IDs, and whether you need parent or guardian notice for Family Life and Sexuality instruction or assessment.

## Browser protections

The page sets a strict **Content-Security-Policy**: scripts, styles, images and fonts only from the page's own origin; connections only to the page itself and to Google (`script.google.com` and `googleusercontent.com`, which Apps Script uses); no inline script, no `eval`, no framing of other sites, no plugins. All text is inserted as text (the code never uses `innerHTML`), so student-typed names cannot inject markup. The end-to-end tests fail on any CSP violation.

## Server hardening

- Every request is validated: types, sizes, allowed values; unknown actions and object-prototype tricks are rejected; free text is trimmed and length-limited.
- Errors never reveal stack traces or code unless debug is switched on (it is off in Apps Script).
- `doGet` (opening the web app URL in a browser) returns only a small JSON message with the service name, version and server time.
- All writes happen under Apps Script's script lock, one at a time, so two students cannot corrupt a record. A busy lock returns a retryable "busy" answer and the page retries on its own.
- Scopes requested by the script are limited to the Sheet it is attached to, script triggers, and menus: `spreadsheets.currentonly`, `script.scriptapp`, `script.container.ui`.

## Limits you should know

- **Execution identity.** The web app runs as **you** ("Execute as: Me"), with your quotas. It can only touch the one Sheet, but anyone who can call it runs code as you.
- **Quotas and latency.** Apps Script has daily limits and no promise of speed. I could not measure either on your account. A busy class is the likeliest place for slow responses.
- **The auto-submit trigger can run about 5 minutes late, or later if Google delays it** (it is a time-driven trigger every 5 minutes). That does not extend anyone's time, because the server refuses answers after the deadline and finalizes a session as soon as anything touches it, but a student who simply walks away is only submitted by the next timer run.
- **The Master Dashboard** updates on events (Begin, submit, auto-submit, reset, time change) and fully every 5 minutes; progress columns can lag by up to 5 minutes. The hidden `Sessions` tab is always the truth, and Teacher Mode Monitor reads from it.
- **The cache is only an accelerator.** If Google drops it, nothing is lost; the next request reads the Sheet.
- **Students who have not yet signed in** are not in the monitor.
- **Two teacher devices** each get their own teacher token. The password is the only shared secret.

## If something goes wrong

- *You think the class code leaked:* Teacher Mode > Settings > Class codes > Generate new > Save. Students already inside are not affected.
- *You think the teacher password leaked:* Unit 8 menu > Set teacher password (or Settings > Change teacher password). Existing teacher tokens expire within 2 hours.
- *You think the answer key leaked:* tell me; I can rewrite or reorder questions and rebuild the bank. Delete copies of `ItemBankSeed.gs` and `ANSWER_KEY.md` from anywhere shared.
- *A student claims their work was lost or taken:* Teacher Mode > Monitor > Details shows their record, and the hidden `Responses` tab has every attempt with a time and request ID.
