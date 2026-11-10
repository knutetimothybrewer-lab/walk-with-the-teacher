// SHORT FORM (about 45 minutes instead of about 54). Nothing is deleted from m1-m8: tools/build.js leaves these questions
// out of the build and applies the new point values, so every student version still totals exactly 100 points.
// To get the full test back, run `node tools/build.js --full` (or empty dropQ, dropGroups, pts and est below).
export default {
  // Single-question stages left out (each worth 1 point; their topics are assessed by other questions).
  dropQ: ['n5', 'n1', 'a2', 'b2', 'a-long', 'c1', 'p1', 'n4', 'b-def', 'b4'],
  // Whole pool groups left out (pool id -> group numbers, counted from 0). Students no longer get a second alcohol scenario.
  dropGroups: { 'alc-scen': [1] },
  // New points. Removed points (12) are added back to the kept questions so the total stays 100 (pool groups stay equal inside).
  pts: {
    b3: 3, 'c-tol': 4, 'c-dep': 4, 'c-wd': 4, 'c-rein': 4, 'c-sud': 4, 'c-ins1': 4, 'c-ins2': 4,            // mission 1: +3
    n2: 3, g1b: 3, g2a: 3,                                                                                   // mission 2: +3
    'a-r2': 4, 'a-b': 4, 'a-tab': 3, 'as-drive': 3, 'as-consent': 3, 'as-poison': 3, 'as-aggr': 3,           // mission 3: +4
    'cs-drive': 4, 'cs-edible': 4, 'cs-teen': 4,                                                             // mission 4: +1
    'p-chat': 6                                                                                              // mission 6: +1
  },
  // Mission time estimates shown to students (minutes).
  est: { m1: 5, m2: 5, m3: 7, m4: 4, m6: 6 }
};
