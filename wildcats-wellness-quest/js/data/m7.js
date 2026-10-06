/* Mission 7 — Final Transfer Challenge (6 points)
 *  3 objective decisions (1 pt each) + structured claim-evidence-reasoning (3 pts).
 * Three integrated FICTIONAL cases (A/B/C). A student's first attempt uses case A; retries use B then C. Each case contains:
 *  a misleading health post, conflicting responsibilities, a wellness pattern, and a proposed goal.
 * Source: all five decks + worksheet (integrated transfer). Text is deliberately concise for the 4-minute budget.
 */
(function (root) {
  'use strict';
  var W = root.WWQ, P = W.P, V = W.V;

  W.FINALCASES = [
    { id: 'a', who: 'Kai', post: { platform: 'Fictional feed', handle: '@HustleHealthTV', text: '“Sleep is for the weak. Elite people need 4 hours. My Energy Elixir ($45) lets you skip sleep and ace every test. 50% off ends at midnight!”', tabs: { author: 'Anonymous account; no credentials.', evidence: 'No studies; two testimonial screenshots.', purpose: 'Sells the $45 Elixir with a midnight deadline.', indep: 'No independent source agrees. CDC lists about 8–10 hours of sleep for teens.' }, art: 'bottle' },
      resp: 'Kai works closing shifts until 9:30 p.m. three nights a week, has a debate tournament Saturday, and must babysit his sister Thursday.',
      pattern: [['Physical', 'Sleeps 5–6 hours on school nights; skips breakfast on shift days.'], ['Mental', 'Struggles to focus in the afternoon.'], ['Emotional', 'Irritable; snapped at his sister.'], ['Social', 'Hasn’t talked with friends outside school.'], ['Environmental', 'Studies at a kitchen table with the TV on.']],
      goal: 'Kai’s goal: “Get more sleep so I’m healthier.”' },
    { id: 'b', who: 'Mina', post: { platform: 'Fictional video', handle: '@CleanSlateCoach (AI voice)', text: '“Skip breakfast and lunch: fasting resets your brain! 100% safe for teens. $79 program; spots close at noon!”', tabs: { author: 'An AI voice reads the script; no person or credentials named.', evidence: 'No studies; one before-and-after story.', purpose: 'Sells a $79 program with a noon deadline.', indep: 'No independent source supports it. Public guidance recommends regular balanced meals for teens.' }, art: 'avatar' },
      resp: 'Mina captains the soccer team (practice 4:00–5:30 daily), babysits Tuesday and Thursday until 7, and has a chemistry lab report due Friday.',
      pattern: [['Physical', 'Often skips lunch; dizzy at practice.'], ['Mental', 'Struggles to focus in chemistry.'], ['Emotional', 'Frustrated quickly; cried after practice.'], ['Social', 'Argued with a teammate.'], ['Environmental', 'Studies in a cluttered corner.']],
      goal: 'Mina’s goal: “Eat better soon.”' },
    { id: 'c', who: 'Teo', post: { platform: 'Fictional feed', handle: '@BeatAnxietyBen', text: '“This $59 supplement cured my anxiety in 3 days. Doctors don’t want you to know. Skip the counselor, just buy it!”', tabs: { author: 'A creator with no listed health training.', evidence: 'One story; “studies show,” none named.', purpose: 'Sells the supplement; tells viewers to avoid professionals.', indep: 'No independent source supports it. Counselors and clinicians are recommended for anxiety.' }, art: 'avatar' },
      resp: 'Teo cooks dinner four nights a week, works weekends, and wants to join the school play (rehearsal Mon and Wed, 3–5 p.m.).',
      pattern: [['Physical', 'Sleeps about 7 hours; stopped going to open gym.'], ['Mental', 'Anxious before tests; blanks out.'], ['Emotional', 'Avoids talking about worries.'], ['Social', 'Hasn’t seen his two close friends lately.'], ['Environmental', 'Has a quiet room to study.']],
      goal: 'Teo’s goal: “Be less stressed.”' }
  ];

  function caseVis(i, which) { return { type: 'finalcase', idx: i, show: which }; }

  /* D1: decide about the post */
  var D1 = [
    [['a', 'Not credible: promises, a deadline, no evidence, and it conflicts with teen sleep guidance.', 1], ['b', 'Credible: the speaker sounds confident.', 0], ['c', 'Not credible only because it is an ad; ads are always false.', 0.5], ['d', 'Questionable, but fine because many people ordered.', 0]],
    [['a', 'Not credible: AI voice, no named expert or studies, a deadline, and it conflicts with guidance on meals.', 1], ['b', 'Credible: “100% safe” means it was tested.', 0], ['c', 'Not credible only because it uses AI; AI is always false.', 0.5], ['d', 'Questionable, but safe to try for a week.', 0]],
    [['a', 'Not credible: one story, no named study, a sales pitch, and “skip professionals.”', 1], ['b', 'Credible: the creator has felt anxious too.', 0], ['c', 'Not credible only because the creator sells something.', 0.5], ['d', 'Questionable, but skip the counselor.', 0]]
  ];
  W.defItem({ id: 'm7.d1', m: 7, st: '7.1', pts: 1, cls: 'complex', d: 'A', topic: 'Transfer: evaluate a misleading health post', src: 'Wildcats_Health_Media_Literacy deck', kind: 'form',
    hint: 'Use author, evidence, purpose and independent verification. A sales motive warrants scrutiny but does not by itself prove a claim false.',
    why: 'The post makes a miracle-style claim, cites no research, pressures with a deadline and conflicts with public guidance. A sales motive alone or AI alone does not decide credibility; the missing and contradicted evidence does.',
    variants: [0, 1, 2].map(function (i) { return V('m7.d1.' + 'abc'[i], 'Case **' + W.FINALCASES[i].who + '** (fictional): open the tabs.', [P('dec', 'Best-supported response?', 'radio', D1[i], { hint: 'Check each tab, then choose the response the tabs actually support.' })], { vis: caseVis(i, ['post']) }); }) });

  /* D2: conflicting responsibilities (STOP) */
  var D2 = [
    [['a', 'Ask to swap one closing shift; set a 10:30 lights-out on off nights; use a free period for debate.', 1], ['b', 'Ask a parent to swap Thursday babysitting; get a shorter Thursday prep; protect a bedtime.', 1], ['c', 'Skip the shift without telling anyone.', 0], ['d', 'Use the Elixir tonight; sleep later.', 0]],
    [['a', 'Ask the coach for a lighter practice day; pack lunch and a snack; find a lab partner.', 1], ['b', 'Swap one babysitting night; eat lunch daily; write the report in the library at lunch.', 1], ['c', 'Skip lunch and practice to finish the report.', 0], ['d', 'Join the “fasting” program.', 0]],
    [['a', 'Talk to the counselor; share a cooking night; keep one rehearsal and one gym visit.', 1], ['b', 'Ask the director for an alternate rehearsal; share cooking; use a breathing routine before tests.', 1], ['c', 'Buy the supplement instead of talking to anyone.', 0], ['d', 'Quit everything for a month.', 0.5]]
  ];
  W.defItem({ id: 'm7.d2', m: 7, st: '7.1', pts: 1, cls: 'complex', d: 'A', topic: 'Transfer: STOP with conflicting responsibilities', src: 'Wildcats_Personal_Responsibility deck', kind: 'form',
    hint: 'Pick a plan that honors both responsibilities as much as possible, is feasible, and includes support. More than one plan can qualify.',
    why: 'STOP: state the conflict, think of options, observe consequences, and pick a feasible choice that protects health and responsibilities. Asking for support is part of a responsible choice.',
    variants: [0, 1, 2].map(function (i) { return V('m7.d2.' + 'abc'[i], '**' + W.FINALCASES[i].who + '’s responsibilities** (fictional): ' + W.FINALCASES[i].resp, [P('dec', 'Most responsible, feasible plan?', 'radio', D2[i], { hint: 'Check feasibility and health. Support from others counts.' })], { vis: null }); }) });

  /* D3: the proposed goal */
  var D3 = [
    [['a', 'Lights out by 10:30 on 4 nights a week for 3 weeks, tracked on a calendar, for more class energy.', 1], ['b', 'Sleep more every night.', 0], ['c', 'Sleep 10 hours every night, starting tomorrow, forever.', 0], ['d', 'Lights out by 10:30 on non-shift nights.', 0.5]],
    [['a', 'Eat lunch on 4 school days a week for 3 weeks, tracked on a checklist, for energy at practice.', 1], ['b', 'Eat healthier foods sometimes.', 0], ['c', 'Eat five perfect meals daily, starting tomorrow, forever.', 0], ['d', 'Eat lunch on school days.', 0.5]],
    [['a', 'A 5-minute breathing routine before tests for 4 weeks, tracked on a calendar, to feel calmer.', 1], ['b', 'Never feel anxious again.', 0], ['c', 'Meditate two hours daily, starting tomorrow, forever.', 0], ['d', 'Try to be calm before tests.', 0.5]]
  ];
  W.defItem({ id: 'm7.d3', m: 7, st: '7.1', pts: 1, cls: 'complex', d: 'A', topic: 'Transfer: repair a proposed goal using SMART', src: 'Day3_Self_Assessment_Habit_Change deck', kind: 'form',
    hint: 'Look for the version that is specific, measurable, achievable, relevant AND time-bound.',
    why: 'A fully SMART goal states a specific action, how it will be tracked, a feasible amount, a relevant purpose and a time frame. A goal can be specific without being fully SMART.',
    variants: [0, 1, 2].map(function (i) { return V('m7.d3.' + 'abc'[i], '**' + W.FINALCASES[i].goal + '**', [P('dec', 'Which rewrite is fully SMART?', 'radio', D3[i], { hint: 'Check each of S, M, A, R and T.' })], { vis: null }); }) });

  /* CER (3 pts) */
  var CLAIMS = [
    [['a', 'Physical and Mental: short sleep and skipped breakfast hurt focus.', 1], ['b', 'Physical and Emotional: short sleep makes irritability likelier.', 1], ['c', 'Environmental and Mental: a noisy table makes studying harder.', 1], ['d', 'Social and Environmental: friends make the air cleaner.', 0], ['e', 'Only Physical matters; the others are unaffected.', 0]],
    [['a', 'Physical and Mental: skipped lunch and dizziness hurt concentration.', 1], ['b', 'Physical and Emotional: low energy makes frustration likelier.', 1], ['c', 'Environmental and Mental: a cluttered corner makes focus harder.', 1], ['d', 'Social and Environmental: an argument changes the weather.', 0], ['e', 'Only Social matters; the others are unaffected.', 0]],
    [['a', 'Mental and Emotional: test anxiety plus avoiding talk makes coping harder.', 1], ['b', 'Physical and Mental: stopping movement can worsen stress and focus.', 1], ['c', 'Social and Emotional: not seeing friends may make worries heavier.', 1], ['d', 'Environmental and Physical: a quiet room causes anxiety.', 0], ['e', 'Only Mental matters; the others are unaffected.', 0]]
  ];
  var FACTS = [
    [['f1', 'Kai sleeps only 5–6 hours on school nights.', 0], ['f2', 'Kai is irritable and snapped at his sister.', 0], ['f3', 'Kai studies at a kitchen table with the TV on.', 0], ['f4', 'The Elixir costs $45.', 0], ['f5', 'Kai has a Saturday debate tournament.', 0]],
    [['f1', 'Mina often skips lunch and feels dizzy at practice.', 0], ['f2', 'Mina gets frustrated quickly and cried after practice.', 0], ['f3', 'Mina studies in a cluttered corner.', 0], ['f4', 'The program costs $79.', 0], ['f5', 'Mina babysits Tuesday and Thursday.', 0]],
    [['f1', 'Teo is anxious before tests and blanks out.', 0], ['f2', 'Teo stopped going to open gym.', 0], ['f3', 'Teo hasn’t seen his two close friends lately.', 0], ['f4', 'The supplement costs $59.', 0], ['f5', 'Teo works weekends.', 0]]
  ];
  var FACTM = [
    { a: { f1: 1, f3: 0.5 }, b: { f2: 1, f1: 1 }, c: { f3: 1 } },
    { a: { f1: 1 }, b: { f2: 1, f1: 0.5 }, c: { f3: 1 } },
    { a: { f1: 1 }, b: { f2: 1, f1: 0.5 }, c: { f3: 1 } }
  ];
  var RAT = [
    [['r1', 'STOP: too little sleep in a heavy week; a protected bedtime on off nights is feasible.', 0], ['r2', 'SMART: lights out by 10:30, 4 nights, calendar, 3 weeks fits his limits.', 0], ['r3', 'STOP: the noisy table is the problem; the free library quiet hour on off days is feasible.', 0], ['r4', 'Quit the shift and the team; that guarantees good health.', 0], ['r5', 'Take the Elixir; it fixes everything.', 0]],
    [['r1', 'STOP: skipped meals hurt focus and energy; a packed lunch and snack is feasible.', 0], ['r2', 'SMART: lunch on 4 school days, checklist, 3 weeks fits her schedule.', 0], ['r3', 'STOP: the cluttered corner is the problem; five minutes clearing a desk is free and feasible.', 0], ['r4', 'Quit soccer and babysitting; that guarantees good health.', 0], ['r5', 'Join the program; fasting fixes everything.', 0]],
    [['r1', 'STOP: untreated test anxiety is the problem; the counselor and a breathing routine are feasible.', 0], ['r2', 'SMART: a 5-minute breathing routine, calendar, 4 weeks fits his schedule.', 0], ['r3', 'STOP: stress has no outlet; a short hangout or 15-minute walk with a friend is feasible.', 0], ['r4', 'Quit everything; that guarantees good health.', 0], ['r5', 'Buy the supplement; it fixes everything.', 0]]
  ];
  var RATM = [
    { a: { r1: 1, r2: 1, r3: 0.5 }, b: { r1: 1, r2: 1 }, c: { r3: 1, r1: 0.5, r2: 0.5 } },
    { a: { r1: 1, r2: 1, r3: 0.5 }, b: { r1: 1, r2: 1 }, c: { r3: 1, r1: 0.5, r2: 0.5 } },
    { a: { r1: 1, r2: 1, r3: 0.5 }, b: { r3: 1, r1: 0.5, r2: 0.5 }, c: { r3: 1, r1: 0.5, r2: 0.5 } }
  ];
  function cerVariant(i) {
    return V('m7.cer.' + 'abc'[i], 'Use the case for **' + W.FINALCASES[i].who + '** (fictional).', [
      P('claim', 'CLAIM · Which two dimensions connect?', 'radio', CLAIMS[i], { w: 1, d: 'D', hint: 'Pick two dimensions and a connection the case describes.' }),
      P('evid', 'EVIDENCE · Which case fact supports it?', 'radio', FACTS[i].map(function (f) { return [f[0], f[1], 0]; }), { w: 1, d: 'D', dep: 'claim', matrix: FACTM[i], hint: 'The fact must be in the case AND support your claim. Prices and other dimensions don’t.' }),
      P('why', 'REASONING · Which rationale supports a feasible action?', 'radio', RAT[i], { w: 1, d: 'D', dep: 'claim', matrix: RATM[i], hint: 'The action must fit the case limits and your claim. Quitting everything or buying a product isn’t feasible STOP/SMART.' })
    ], { vis: caseVis(i, ['pattern']) });
  }
  W.defItem({ id: 'm7.cer', m: 7, st: '7.2', pts: 3, cls: 'complex', d: 'D', topic: 'Transfer: claim–evidence–reasoning across domains', src: 'All five decks + worksheet', kind: 'form',
    hint: 'Connect two dimensions in the case, point to a fact that shows it, and explain a feasible action using STOP or SMART.',
    why: 'Strong reasoning connects at least two wellness domains, uses a fact that is actually in the case, and justifies a feasible action with STOP or SMART. Several claims are defensible, but the evidence and rationale must match the claim.',
    variants: [0, 1, 2].map(cerVariant) });
})(typeof window !== 'undefined' ? window : globalThis);
