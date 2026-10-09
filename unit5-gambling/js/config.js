// =====================================================================================================
//  THE ONE FILE A TEACHER EDITS.  Nothing in here is secret and nothing here is an answer key.
//  After editing, commit and push this file (GitHub Pages republishes in about a minute).
// =====================================================================================================
export const CONFIG = {
  // Paste the "Web app" URL (ends in /exec) from your Google Apps Script deployment.  See README.md, step 5.
  // Leave '' until you have deployed; students will then see a friendly "not connected" screen.
  backendUrl: '',

  // Typing this into the Class Code box opens Teacher Mode.  It is a shortcut, NOT a password:
  // the real teacher password is set in the Google Sheet and checked by the server.
  teacherShortcut: 'WALK-TEACHER',

  title: 'Gambling: Behind the Odds',
  schoolName: '',
  blocks: ['Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9']
};

/** The endpoint to talk to.  On localhost the bundled dev server is used automatically. */
export function endpoint() {
  if (CONFIG.backendUrl) return CONFIG.backendUrl;
  return ['localhost', '127.0.0.1'].includes(location.hostname) ? '/api' : '';
}
