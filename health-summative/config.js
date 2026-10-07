/* ==========================================================================
   config.js — THE ONE FILE A TEACHER EDITS
   --------------------------------------------------------------------------
   Everything here is plain JavaScript. Keep the quotes and commas exactly as
   you see them. After editing, save the file and reload the page.

   Questions, hints and readings live in the /content folder (see README).
   ========================================================================== */

export default {
  /* ---- Names shown to students -------------------------------------------
     Rename freely. The default is intentionally neutral. */
  appTitle: 'The Wildcat Wellness Trail',
  schoolName: 'Your School',          // e.g. 'Howard High School'
  mascot: 'Wildcats',                 // e.g. 'Wildcats'
  unitName: 'Mental Health Unit — Summative Assessment',
  teacherName: 'your teacher',        // shown in "show your teacher" messages

  /* ---- Class codes ---------------------------------------------------------
     One code per class or period. Codes are NOT case-sensitive.
     NOTE: a code in this file is a classroom gate, not real security (a student
     who opens the page source can read it). For real validation, turn on
     `backend` below and keep the codes in your Google Sheet instead (README §7). */
  classCodes: ['TRAIL1', 'TRAIL2', 'TRAIL3', 'TRAIL4'],
  periods: ['1', '2', '3', '4', '5', '6', '7', '8', 'Other'],

  /* ---- Scoring -------------------------------------------------------------
     attemptCredit[0] = share of the points earned if right on attempt 1, etc.
     A question not solved after the last attempt earns 0 (the answer and
     explanation are then shown). */
  maxAttempts: 3,
  attemptCredit: [1.0, 0.9, 0.75],

  /* Points per item. Most items are worth 1. Items with several parts
     (sorting 6 cards, ordering steps...) are worth more so they count for more.
     [minimum number of parts, points]  — the last row that fits is used.
     An individual item can still set its own `points` in the content file. */
  pointsBySubparts: [[1, 1], [4, 2], [7, 3]],

  /* ---- Backend (Google Sheet via Apps Script) -----------------------------
     Paste your Web app URL (ends in /exec) here after following README §6.
     Leave '' to run in "local only" mode: students still get a score and a
     completion code, but nothing is sent to a Sheet. */
  backend: {
    url: 'https://script.google.com/macros/s/AKfycbzMoyRYWK0-u7Kmw33YInX8QhqlwVnhfLzNmasA0sqYpajViNWCesjg0bgKFVDDd03XSw/exec',
    /* true  = the SERVER checks the class code (recommended once a backend is set);
       false = only the list above is checked. */
    serverValidatesCode: true,
    /* If the server cannot be reached when a student starts, may they begin
       anyway using the local list above? (They are flagged "unverified code".) */
    allowOfflineStart: true,
    /* Passcode for /teacher.html is stored in the Apps Script project, not here. */
  },

  /* ---- Features ------------------------------------------------------------ */
  features: {
    readAloud: true,        // "Listen" buttons using the browser's built-in voice
    paceIndicator: true,    // gentle "about N min left at a typical pace" (never a cutoff)
    reviewFinishedStations: true,
    fontToggle: true,       // dyslexia-friendly font option
  },

  /* ---- Capstone (Infographic Studio) ---------------------------------------
     Set enabled:false to remove the whole station (the other stations and the
     score adjust automatically). */
  capstone: { enabled: true },

  /* ---- Per-student settings (accommodations & retakes) -----------------------
     Key = 'first last|period' in lower case. Any of these may be set:
       extendedTime: true  -> hides the pace indicator and all time messaging
       readAloud: true     -> read-aloud buttons start switched on
       largeText: true     -> larger text
       reducedMotion: true -> fewer animations
       retakeAllowed: true -> lets this student start a new attempt on a device
                              that already holds a finished one (also reset them
                              in the Sheet: README §9)
     Example:
       'sam rivera|3': { extendedTime: true, readAloud: true, largeText: true },
  */
  studentOverrides: {
    // 'sam rivera|3': { extendedTime: true, readAloud: true },
  },

  /* ---- Remove questions without touching the content files ------------------
     List item ids (shown in CONTENT-MAP.md and TIMING.md) that should be left
     out for everyone, e.g. after your pilot: disabledItems: ['s5-04', 's9-08'] */
  disabledItems: ["s1-05","s2-01","s2-02","s2-04","s2-05","s2-08","s3-01","s3-03","s3-04","s3-06","s3-07","s4-01","s4-02","s4-03","s4-04","s4-06","s4-07","s4-08","s4-09","s4-10","s5-03","s5-04","s5-06","s5-07","s5-08","s5-09","s5-10","s6-01","s6-03","s6-05","s6-06","s6-07","s6-08","s7-01","s7-02","s7-04","s7-06","s8-02","s8-c1a","s8-c1b","s8-c1c","s8-c1d","s8-c2a","s8-c2b","s8-c2c","s8-08","s8-10","s9-01","s9-02","s9-04","s9-06","s9-07","s9-08","s10-c1","s10-c2","s10-c3","s10-c4","s10-c5","s10-c6","s10-c7","s10-c8"], /* TEMPORARY SHORT TEST - REVERT */

  /* ---- Timing (used only for the pace hint; never enforced) ------------------ */
  targetMinutes: 45,

  /* ---- Versioning: change only when you want everyone to start fresh -------- */
  assessmentVersion: 'mh-1.0',
};
