'use strict';
// SHORT FORM (about 45 minutes instead of about 57). Nothing is deleted: content/generated/public.json and private/keys.json stay
// complete. tools/split.js leaves the units below out of what is built and served, and applies the new points, so the total is
// still exactly 100 points and each location keeps its point share (18, 12, 22, 12, 16, 20).
// To get the full assessment back: build with CHM_FULL=1 (or empty `drop` and `points` below), then paste the new Code.gs into Apps Script.
module.exports = {
  drop: [
    'M1-U2',            // Choices or surroundings? (1 min)
    'M2-U2',            // Who ate what? (1.5 min)
    'M3-U3', 'M3-U5',   // the UV and the heat plan: the smoke plan (M3-U2) still covers the planning skill (4.5 min)
    'M4-U4',            // What would you want next? (1.5 min)
    'M5-U4'             // Judge the claim (1.5 min)
  ],
  // New points for the units that stay (location totals: 18, 12, 22, 12, 16, 20; location 6 is unchanged).
  points: {
    'M1-U1': 5, 'M1-U3': 5, 'M1-U4': 4, 'M1-U5': 4,                 // location 1 = 18
    'M2-U1': 4, 'M2-U3': 4, 'M2-U4': 4,                             // location 2 = 12
    'M3-U1': 4, 'M3-U2': 7, 'M3-U4': 7, 'M3-U6': 4,                 // location 3 = 22
    'M4-U1': 4, 'M4-U2': 4, 'M4-U3': 4,                             // location 4 = 12
    'M5-U1': 4, 'M5-U2': 4, 'M5-U3': 4, 'M5-U5': 4                  // location 5 = 16
  },
  // Location times shown to students (minutes).
  minutes: { 1: 7, 2: 5, 3: 7, 4: 5, 5: 7 }
};
