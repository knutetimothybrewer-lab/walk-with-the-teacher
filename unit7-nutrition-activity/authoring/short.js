// SHORT FORM (about 45 minutes instead of about 58). Nothing is deleted from m1-m7: tools/build.js leaves the stages below out of
// the build and adds the extra points to the kept questions, so every student version still totals exactly 100 points and each
// content domain keeps the same share of the points as before.
// To get the full test back, run `node tools/build.js --full` (or empty dropStages, ptsAdd and est below).
export default {
  // Stages left out. A stage is a single question (its id), a scene, or a whole pool (its pool id).
  dropStages: [
    'f-rank', 'f-kcal-pool',                    // Nutrition Foundations (-2 points)
    'l-sizes', 'l-ingr',                        // Nutrition Labels (-2)
    'a-apply-pool', 'a-graph', 'a-type',        // Physical Activity & FITT (-5)
    'm-study',                                  // Marketing Literacy (-2)
    'g-plan', 'g-eval',                         // SMART Goal Setting (-3)
    's-workers', 's-regen', 's-doc', 's-tech'   // Food Systems (-7)
  ],
  // Points ADDED to kept questions (same domain as the points removed). Every question in a pool group gets the same change.
  ptsAdd: {
    'f-roles': 1, 'f-plate-a': 1, 'f-plate-b': 1,                                   // Foundations +2
    'l-interp-0': 1, 'l-interp-1': 1, 'l-interp-2': 1, 'l-alias': 1,                // Labels +2
    'a-plan': 1, 'a-rpe': 1, 'a-rec': 1, 'a-fitt-id': 1, 'a-conflict': 1,          // Activity +5
    'm-spots-a': 1, 'm-spots-b': 1, 'm-halo': 1,                                    // Marketing +2
    'g-repair-act': 1, 'g-repair-veg': 1, 'g-repair-sleep': 1, 'g-match': 1, 'g-barrier': 1,   // Goals +3
    's-def': 1, 's-network': 2, 's-tradeoff': 1, 's-access': 1, 's-insecurity': 1, 's-upf': 1   // Food Systems +7
  },
  // Mission time estimates shown to students (minutes).
  est: { m1: 5, m2: 10, m3: 6, m4: 7, m5: 4, m6: 6 }
};
