/* TEACHER CONFIGURATION — edit this file, not config.js.
 *
 * 1. Set a passcode:  open teacher/passcode-setup.html in Chrome (or run `node tools/make-passcode.js`),
 *    then paste the generated `teacher: { ... }` block below.
 *    The reset control stays disabled until this is done. No default passcode is shipped.
 * 2. Adjust any other setting you want. Anything you omit keeps the default from config.js.
 *
 * Honest limit: this is a static page. Anyone who can open browser developer tools can read or change
 * these settings, the answer keys and the passcode verifier. See README.md "Honest technical limits".
 */
WWQ.applyConfig({
  // assessmentVersion: 'wwq-1.0',          // change ONLY between class sets (starts fresh local records)
  // attemptLimits: { short: 2, complex: 3 }, // complex may be 2 or 3; short is 2 (3 only where a third variant exists)
  // caps: [1, 0.9, 0.75],
  // timeGuidance: { targetMinutes: 36, extendedMultiplier: 1.5, extendedTime: false },
  // extendedExploration: false,           // true shows optional extras (never required, never scored)
  // motion: 'auto',                       // 'auto' | 'on' | 'off'
  // letterGrades: { enabled: true },      // uses the bands in config.js; edit bands here if you like
  // identifierLabel: 'Student alias or teacher-approved ID',

  // PASTE THE GENERATED PASSCODE BLOCK HERE (replace the default below):
  teacher: { configured: false }
});
