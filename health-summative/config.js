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
  periods: ['Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9'],

  /* ---- Teacher mode ---------------------------------------------------------
     Type this code into the "Class code" box on the first screen (names and
     period can stay blank) to click through the whole assessment without
     answering anything. Nothing is scored for a real student or sent to the
     Sheet. Default code: WALK-TEACHER (not case-sensitive). To change it run
       node tools/teacher-code.js "YOUR NEW CODE"
     and paste the line it prints over the one below. Set '' to turn it off. */
  teacherCodeHash: '333ce33c9211d3d5451c9b54fad80cc9a1dc3ea95e8f318f0e1da020e988b569',

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
  disabledItems: [],

  /* ---- Time limit ------------------------------------------------------------
     Hard limit in minutes, counted from the moment the student starts (the clock
     keeps running if the page is refreshed or reopened). A countdown shows in the
     top bar; at zero the work so far is submitted automatically and anything left
     unanswered earns 0. Set to 0 for no limit. Students listed in studentOverrides
     with extendedTime: true are not timed unless you also give them their own
     timeLimitMinutes (for example 'sam rivera|3': { timeLimitMinutes: 135 }). */
  timeLimitMinutes: 90,

  /* ---- Pace hint (the gentle "about N min left" chip; hidden while a limit is on) */
  targetMinutes: 45,

  /* ---- Versioning: change only when you want everyone to start fresh -------- */
  assessmentVersion: 'mh-1.0',
};
