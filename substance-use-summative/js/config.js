// ======================================================================================================
//  THE FILE YOU EDIT.  (See docs/TEACHER_SETUP.md)
//  Nothing in here is an answer key. Class codes are stored only as one-way hashes.
// ======================================================================================================
export const CONFIG = {
  // Shown on the sign-in page and top bar. Change freely (for example 'Health 10: Substance Use Unit Assessment').
  appName: 'Substance Abuse Summative',
  assessmentTitle: 'An interactive investigation of what you learned',
  schoolName: '',
  teacherName: '',

  // --- Results backend (Google Apps Script web app URL ending in /exec). Leave '' to run without one.
  backendUrl: 'https://script.google.com/macros/s/AKfycbxZNAfsYSW0ie_Z4TWPgpyKLIIh6AxG2QLh8Zn1K6kdvPJ8ihQugEjBmLI0OGkwZlrFyQ/exec',
  backendKind: 'apps-script',        // 'apps-script' (full features) or 'webhook' (submit-only; e.g. Power Automate)
  allowOfflineStart: true,           // if the server cannot be reached, still allow a valid local code to begin
  gradingMode: 'local',              // 'local' (hashed keys in the page) or 'server' (build with --strip; needs backend)

  // --- Class codes. Generate hashes with:  node tools/hash.js HEALTH2 HEALTH3   (or in Preview Mode > Tools)
  //     When a backend is connected, the Config sheet is the real list and this list is only a fallback.
  codeSalt: 'sig-code-v1',
  classCodeHashes: [
    // example codes HEALTH2, HEALTH3, HEALTH5  (CHANGE THESE before using with students)
    '5ef5174539b91e30fb3e23a2fcc227ffa239b0d0c3a2aea314d5fb0462384fad', // HEALTH2
    '43ddd671e13a50f788aad8d8a6df49fb1c5e4759017bd71b620c972338008991', // HEALTH3
    '401b5ab193a135a4e3dae6b4ebdaa60373704e0317db732e8f63962c1b8fe59c'  // HEALTH5
  ],
  demoCodeHash: '549ef479d872d0413f906e6f61e58dbc4179c91795c81c0b98a1ac5125636eda',         // DEMO2026: results are marked DEMO and never mixed with real data

  // --- Preview Mode (teacher/developer tools). Passcode is stored as a hash. Default passcode: see docs.
  previewSalt: 'sig-preview-v1',
  previewPasscodeHash: 'f7a7231b894d34f1351a5e793997a8ee31a46cbd406f47d1ba9a906cd16a4cea',

  periods: ['1', '2', '3', '4', '5', '6', '7', '8'],
  // Display only. Scoring rules live in js/scoring.js (100% / 85% / 75%, three attempts).
  storagePrefix: 'sig'
};
