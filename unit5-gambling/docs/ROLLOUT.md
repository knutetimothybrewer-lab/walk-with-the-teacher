# Rollout: pilot plan and day-of checklist

## One-time (before any class)

- [ ] Backend deployed and `js/config.js` points at it ([README](../README.md), steps 1–5)
- [ ] Teacher password set; four codes noted; all blocks **closed**
- [ ] **Test the Google Sheets connection** is green
- [ ] Preview run-through of all six chapters; timer test at 0:20; scenario fills tried
- [ ] *Generate fictional students* and look at Analytics, then **Clear fictional test records** (sheet menu)
- [ ] Tell your technology office the site and Google script URL; confirm Chromebooks can open both
- [ ] Decide: real names or initials; use the **Roster** tab if you want sign-in limited to your list

## Pilot (strongly recommended)

1. Run **one block** (or six volunteers) first. Keep a note of: finishing times, the first question that confuses people, any error screen.
2. After the pilot open **Analytics**: average attempts, most-missed questions, time per chapter. If most students finish in under 45 or over 80 minutes, adjust (the bank is in `authoring/`).
3. Check the Master Dashboard and the pilot block’s tab in the Sheet against what you saw in Teacher Mode.

## Day of

**Before students arrive**
- [ ] Open Teacher Mode, **Access codes**, tick *Open for sign-in* for **only** the block that is starting; write that block’s code on the board
- [ ] Ask students to close other tabs; Chromebooks charged
- [ ] Open **Overview** on your screen

**While students work**
- [ ] Overview refreshes ~every 30 seconds. Watch for: stuck progress, “signed in on more than one device”, anyone within 15 minutes of the deadline
- [ ] Students who lose connection: they just reload and sign in again; the same record resumes
- [ ] Need a fresh start for a student: **Students and resets**; confirm; they sign in again and press Begin (full 90 minutes)

**After**
- [ ] Export (Excel/CSV) or use the Sheet; spot-check three students
- [ ] **Access codes**: close the block, then **Generate new codes** for the next class
- [ ] Note what to change for next time

## If something goes wrong

| Problem | Do this |
|---|---|
| A whole class sees an error | Refresh once. Open the web app URL in a browser: it should show “backend is running”. If not, check **Deploy → Manage deployments** and that you did not delete the deployment |
| Slow responses | Stagger blocks; ask students not to double-click *Check answer* (it is safe, just slow) |
| A student finished by mistake | Teacher cannot “un-submit.” Use **Reset Student Progress** (archives the old record) and have them redo it, or grade the existing score |
| You need to stop everyone | **Access codes**: close the block (blocks new sign-ins). To end running sessions, open each in **Students and resets → Submit now** |
