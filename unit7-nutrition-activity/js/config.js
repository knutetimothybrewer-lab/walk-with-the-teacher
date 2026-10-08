// ======================================================================================================
//  TEACHER CONFIGURATION  -  THIS IS THE ONLY FILE YOU NEED TO EDIT.   (Step-by-step: README.md)
//  Nothing in this file is an answer key.
//  After editing, save the file and (if the site is on GitHub Pages) commit/push it. That's it.
// ======================================================================================================
export const CONFIG = {

  // ---- 1. TITLES ---------------------------------------------------------------------------------
  assessmentTitle: 'Unit 7: Nutrition & Physical Activity',     // shown on the sign-in screen
  assessmentId: 'unit7-nutrition-activity',                     // used to detect duplicate submissions. Change it only for a new test.
  schoolName: '',                                               // optional, shown under the title
  teacherName: '',                                              // optional

  // ---- 2. CLASS BLOCKS (the dropdown students must choose from) -----------------------------------
  // These four names must match the tabs the Google Sheet creates (BLOCK 1-2, BLOCK 3-4, ...).
  blocks: ['Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9'],

  // ---- 3. CLASS CODE(S) ----------------------------------------------------------------------------
  // Students must type one of these before they can begin. Not case sensitive.
  // If you connect the Google Sheet (step 5), the "SETTINGS" tab in the sheet becomes the real list and
  // this list is only a fallback when the sheet cannot be reached.
  classCodes: ['UNIT7'],

  // ---- 4. TEACHER CODES (stored as one-way hashes so they are not readable in this file) -----------
  // Make a hash: open  teacher/setup.html  in your site, type the code, copy the line it gives you.
  //   RESET code:    WALK-TEACHER
  //   PREVIEW (teacher mode) code:  WALK-TEACHER
  //   Offline DASHBOARD code (sandbox only):  WALK-TEACHER
  resetCodeHash: '75612e18810b17804293b21e1a4c7e6fb95d76a34e49a787586ba595164ef948',   // = WALK-TEACHER
  previewPasscodeHash: 'e9cbdc47081386550e24c3f5602658f4b0090588bf01d2f18ffe23d68a128861', // = WALK-TEACHER
  teacherPasscodeHash: 'd94a302ca56f4af1250602c6331cf60d25c0e5f9f03e389298bd3c802f791a56',  // = WALK-TEACHER
  hashSalt: 'u7-v1',          // do not change after you have made hashes

  // ---- 5. GOOGLE SHEETS CONNECTION -------------------------------------------------------------------
  // Paste the "Web app" URL (ends in /exec) from your Apps Script deployment. Leave '' to run without one
  // (the assessment still works and shows a receipt, but nothing is sent to a sheet).
  backendUrl: '',
  allowOfflineStart: true,      // if the sheet cannot be reached, a valid local class code can still begin
  gradingMode: 'local',         // 'local' (default) or 'server' (see README: stricter, needs the build --strip)

  // ---- 6. SCORING / RESULTS SETTINGS -----------------------------------------------------------------
  // The attempt credits (100% / 85% / 75% / 0) are fixed in js/scoring.js so every report agrees.
  scoring: {
    strongAt: 85,               // percent at/above which a domain or student is labelled "Strong Understanding"
    developingAt: 70            // below this: "Review Recommended". In between: "Developing"
  },
  // What a student sees after final submission:
  //   'full'   = percentage, points, domain bars (recommended)
  //   'score'  = percentage and points only
  //   'hidden' = confirmation only (you release scores later)
  studentResults: 'full',

  storagePrefix: 'u7'
};
