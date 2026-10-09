'use strict';
// Per-item QA outcomes, recorded by hand during the content QA pass. docs/QA_REPORT.md is generated from this + the built content.
//   fix  = what I changed during the QA pass
//   flag = what the teacher needs to look at
// PUBLIC FILE: nothing here may say which option, card, order or value is correct for an item. The detailed accuracy notes (which DO
// say that) are in authoring/review-detail.js, which is gitignored and written out to private/REVIEW_DETAIL.md.
// "Pass" means: passes the build rules and my accuracy check against the build brief. It does NOT mean "verified against your slides"
// (not available) or "verified against a cited source" (the web was blocked).

const LEN = 'Distractors rewritten: the correct option was systematically the longest (and, for select-all items, the correct statements ran 1.4 to 2 times longer than the wrong ones), which made guessing easy. Now within the build\'s limits (80 to 120% for single-answer items, 75 to 130% for select-all) and enforced by the build.';
const ABS = 'Wrong statements rewritten to avoid giveaway limiting words.';

module.exports = {
  'C1-01': { flag: 'Anatomy diagram: teacher approval required (see TEACHER_REVIEW).' },
  'C1-02': { flag: 'Anatomy diagram: teacher approval required (see TEACHER_REVIEW).' },
  'C1-03': {},
  'C1-04': {},
  'C1-05': { flag: 'Puberty myths and values are in the build brief, not in the district overview. Confirm they were taught.' },
  'C1-06': { fix: LEN + ' ' + ABS, flag: 'Puberty timing is not in the district overview. Confirm it was taught.' },
  'C2-01': {},
  'C2-02': { fix: LEN },
  'C2-03': {},
  'C2-04': { fix: LEN },
  'C2-05': { fix: LEN },
  'C2-06': { fix: LEN },
  'C2-07': {},
  'C2-08': { flag: 'One card mentions alcohol. Confirm you want that example.' },
  'C3-01': { flag: 'Classifying STIs by cause is in the build brief, not the district overview. Confirm it was taught, and which infections your slides name.' },
  'C3-02': { fix: LEN + ' ' + ABS + ' Hint 2 reworded: it explained why three distractors were wrong.', flag: 'Covers STI treatment and the HPV vaccine. Verify against current agency wording (sources.json S4).' },
  'C3-03': { fix: LEN + ' ' + ABS, flag: 'STI testing goes beyond the district overview. Confirm.' },
  'C3-04': { flag: 'Covers HIV transmission and the effect of treatment. Verify (S5, S6).' },
  'C3-05': {},
  'C3-06': {},
  'C3-07': { flag: 'Chart interpretation is a build-brief item. The data are FICTIONAL and labeled so.' },
  'C3-08': { fix: LEN + ' ' + ABS, flag: 'Covers prevention methods and the effect of HIV treatment. Verify (S1, S2, S6) and confirm your slides do not say otherwise.' },
  'C4-01': { fix: LEN + ' Explanation reworded to match.', flag: 'Uses the STOP model (taken from your Unit 1 materials in this repository). Confirm it is the Unit 8 model. Grades the PROCESS, not the student\'s choice.' },
  'C4-02': { fix: LEN, flag: 'STOP model (confirm).' },
  'C4-03': { flag: 'STOP model (confirm). Compares three fictional choices. It states facts and does not recommend one. Confirm you are comfortable with the framing.' },
  'C4-04': { fix: LEN + ' Hint 1 reworded (it pointed straight at the correct option).', flag: 'STOP model (confirm).' },
  'C4-05': { fix: LEN + ' Options rewritten to a common length and form.', flag: 'STOP model (confirm).' },
  'C4-06': {},
  'C4-07': { fix: LEN + ' Explanation had a run-on sentence that merged three points; rewritten.' },
  'C5-01': { flag: 'Source credibility is a build-brief item. All sites and posts are FICTIONAL.' },
  'C5-02': { fix: LEN + ' ' + ABS, flag: 'Build-brief item (credibility).' },
  'C5-03': { fix: 'Hint 2 reworded so it no longer says how many resources are decoys.', flag: 'Resource types only (no phone numbers, to avoid stale or wrong numbers). Confirm the resources match what your school offers. Privacy rules for minors are described as varying.' },
  'C5-04': { fix: LEN },
  'C5-05': {},
  'C6-01': { flag: 'Integrated case (build-brief item). Mixes facts from chapters 3 to 5.' },
  'C6-02': { fix: 'Hint 2 reworded (it all but listed the answer).' },
  'C6-03': { fix: LEN },
  'C6-04': { fix: LEN, flag: 'STOP model (confirm).' },
  'C6-05': { fix: LEN, flag: 'Resource types only; confirm they match your school.' },
  'C6-06': { fix: LEN }
};
