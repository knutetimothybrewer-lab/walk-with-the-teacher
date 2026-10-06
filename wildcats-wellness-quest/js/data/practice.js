/* Ungraded practice content.
 *  W.PRACTICE.tut  : the launch-screen practice item (demonstrates attempts, hints, retry variants and the 100/90/75 caps). Never scored.
 *  W.PRACTICE.opt  : optional practice shown on the results page AFTER final submission. Unlimited tries, never changes the grade.
 *  W.EXAMPLES      : brief worked examples (different content from every assessed item) shown before each unfamiliar interaction type.
 */
(function (root) {
  'use strict';
  var W = root.WWQ, P = W.P, V = W.V;
  W.PRACTICE = { tut: null, opt: [] };
  W.defActivity({ id: 'tutorial', m: 0, title: 'Launch practice (unscored)' });

  function tutVariant(id, text, key, hint) {
    var D = [['phys', 'Physical'], ['ment', 'Mental'], ['emo', 'Emotional'], ['soc', 'Social'], ['env', 'Environmental']];
    return V(id, text, [
      P('dom', 'Part 1 · Which dimension is MOST directly involved?', 'radio', D.map(function (d) { return [d[0], d[1], d[0] === key ? 1 : 0]; }), { fixed: true, hint: hint }),
      P('why', 'Part 2 · Which reason fits best?', 'radio', [['a', 'The main action is about how the person gets along with others.', key === 'soc' ? 1 : 0], ['b', 'The main action is about the body.', key === 'phys' ? 1 : 0], ['c', 'The main action is about the person’s surroundings.', key === 'env' ? 1 : 0], ['d', 'The main action is about thinking skills.', key === 'ment' ? 1 : 0]], { hint: hint })
    ]);
  }
  W.PRACTICE.tut = W.normItem({ id: 'pr.tut', m: 0, pts: 5, cls: 'complex', d: 'A', topic: 'Practice (not graded)', kind: 'form', practiceLimit: 3,
    hint: 'Ask what the main action is about: body, thinking, feelings, relationships, or surroundings.',
    why: 'This practice item only shows how attempts, hints and retry variants work. It is not graded.',
    variants: [
      tutVariant('pr.tut.a', 'Tomas says, “I need a minute,” then returns and calmly explains his side during a heated team discussion.', 'soc', 'The action is about getting along with others during a disagreement.'),
      tutVariant('pr.tut.b', 'Aisha asks a classmate who sat alone if they want to join her group for the project.', 'soc', 'The action is about connecting with another person.'),
      tutVariant('pr.tut.c', 'Leo and his group agree on how to share the work and listen to each other’s ideas.', 'soc', 'The action is about communication within a group.')
    ] });

  function opt(def) { W.PRACTICE.opt.push(W.normItem(def)); }
  opt({ id: 'po.stop', cls: 'complex', pts: 3, d: 'A', title: 'STOP practice: homework vs. a friend’s invite', kind: 'form',
    hint: 'Check what is feasible and what protects health and responsibilities.', why: 'A responsible choice protects health and responsibilities and is feasible. More than one plan can work.',
    variants: [V('po.stop.a', 'Zara has a quiz tomorrow. A friend invites her to a movie at 8 p.m. She has about 40 minutes of review left and an 11 p.m. bedtime.', [
      P('s', 'S · What is the decision?', 'radio', [['a', 'How to balance the quiz, sleep and time with a friend.', 1], ['b', 'Whether quizzes matter.', 0], ['c', 'Which movie is best.', 0]], {}),
      P('p', 'P · Which plan is most responsible?', 'radio', [['a', 'Finish the 40-minute review, then go to the later showing or another night.', 1], ['b', 'Ask the friend to pick a different night and study first.', 1], ['c', 'Skip the quiz review and sleep in.', 0], ['d', 'Go to the movie and study during the film.', 0]], {})
    ])] });
  opt({ id: 'po.media', cls: 'complex', pts: 3, d: 'A', title: 'Media practice: smoothie post', kind: 'form',
    hint: 'Use author, evidence, purpose and independent sources.', why: 'Strong evaluation uses all four tabs and does not decide from polish or popularity.',
    variants: [V('po.media.a', '**Fictional post:** “This berry smoothie ends all colds forever! Buy my $30 blender today only. Sold out soon!” The author has no credentials, cites no study and no independent source agrees.', [
      P('r', 'Credibility rating', 'radio', [['cred', 'Credible', 0], ['ques', 'Questionable', 0.5], ['notc', 'Not Credible', 1]], { fixed: true }),
      P('e', 'Strongest evidence', 'radio', [['a', 'It promises to end all colds forever and cites no study.', 1], ['b', 'The post has bright colors.', 0], ['c', 'Many people shared it.', 0]], {})
    ])] });
  opt({ id: 'po.smart', cls: 'complex', pts: 3, d: 'D', title: 'SMART practice: repair a goal', kind: 'form',
    hint: 'Check S, M, A, R and T one at a time.', why: 'A fully SMART goal states an action, how it is tracked, a feasible amount, a purpose and a time frame.',
    variants: [V('po.smart.a', 'Goal: “I will stretch more.” Which rewrite is fully SMART?', [
      P('g', 'Choose the best rewrite', 'radio', [['a', 'I will stretch for 5 minutes after school on 4 days a week for 3 weeks, tracked on a calendar, to feel less stiff.', 1], ['b', 'I will stretch a lot, sometimes.', 0], ['c', 'I will stretch for an hour every day forever.', 0], ['d', 'I will stretch for 5 minutes after school.', 0.5]], {})
    ])] });
  opt({ id: 'po.bmi', cls: 'complex', pts: 3, d: 'A', title: 'Teen BMI practice', kind: 'form',
    hint: 'Teen BMI uses age- and sex-specific percentiles.', why: 'Adult BMI cutoffs are not applied to teens. BMI is one screening piece, never a complete picture of health.',
    variants: [V('po.bmi.a', 'A school clinic discusses a fictional 15-year-old’s BMI. Which statement is best supported?', [
      P('b', 'Choose the best statement', 'radio', [['a', 'Teen BMI is interpreted with age- and sex-specific percentiles and is only one piece of information.', 1], ['b', 'The adult range 18.5–24.9 applies to teens.', 0], ['c', 'BMI alone shows whether a teen is healthy.', 0]], {})
    ])] });

  /* ---------- Worked examples (ungraded; different content from assessed items) ---------- */
  W.EXAMPLES = {
    1: { title: 'Worked example (not graded)', scenario: '**Mateo** joins a lunchtime chess club and makes two new friends.',
      steps: ['Click a card (or drag it).', 'Click the dimension, then \u201cPlace here.\u201d', 'Press Submit.'],
      answer: 'Social', reasoning: 'The most direct benefit is connection. Chess also uses thinking (Mental): dimensions overlap, but pick the MOST direct one.' },
    2: { title: 'Worked example (not graded)', scenario: 'A fictional adult\u2019s resting temperature is **98.2 \u00b0F**. The marker sits between the cut-points of the typical range.',
      steps: ['Read units and conditions.', 'Open the reference panel.', 'Pick the category, then the next step.'],
      answer: 'Within the typical range', reasoning: 'The number fits the reference and the conditions were resting. A reading never diagnoses by itself.' },
    3: { title: 'Worked example (not graded)', scenario: '**Casey** (speech practice): Action = rehearse out loud 10 minutes; Tracking = rehearsal checklist; Amount = 3 evenings a week; Purpose = feel calmer; Time = 2 weeks, then review.',
      steps: ['Pick the action first.', 'Tracking, amount and purpose must fit it.', 'End with a time frame and a review.'],
      answer: 'Every part fits the same action', reasoning: 'Compatible combinations score best; a mismatched part loses credit.' },
    4: { title: 'Worked example (not graded)', scenario: '**Fictional school newsletter:** \u201cWear a bike helmet.\u201d Named school nurse; links public safety guidance; sells nothing; other groups agree.',
      steps: ['Open all four tabs.', 'Rate it.', 'Pick the strongest evidence.'],
      answer: 'Credible', reasoning: 'Named author, linked guidance, no product and independent agreement. Opening tabs earns no points; reasoning does.' },
    5: { title: 'Worked example (not graded)', scenario: '**Sam** can bike or take the bus to school in light rain.',
      steps: ['S: state the decision.', 'T: pick two reasonable options.', 'O: compare right away and if repeated. P: pick.'],
      answer: 'Either plan can be responsible', reasoning: 'More than one choice can be responsible when it is safe, feasible and honest.' },
    6: { title: 'Worked example (not graded)', scenario: 'A **Hydration** choice (worth \u00b11) rated **A** is +1 a day, +7 over a week. **Sleep** (worth \u00b13) rated A is +3 a day.',
      steps: ['Daily total = five domain subtotals.', 'Running total = daily totals added up.', 'Compare each domain to its own maximum.'],
      answer: '+1 per day, +7 for the week', reasoning: 'Small repeated choices add up. These are fictional teaching weights, never assessment points.' },
    7: { title: 'Worked example (not graded)', scenario: '**Pat** studies in a bright, tidy library and finishes more homework.',
      steps: ['CLAIM: connect two dimensions.', 'EVIDENCE: a fact in the case.', 'REASONING: a feasible STOP or SMART action.'],
      answer: 'Environmental and Mental', reasoning: 'A supportive space makes focus easier; finishing more homework shows it; the library is a free, feasible action.' }
  };
})(typeof window !== 'undefined' ? window : globalThis);
