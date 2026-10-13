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

  /* ---------- 7.3 Second case: build a plan (required checkpoint, no points) ----------
   * Two more integrated FICTIONAL cases (no misleading post). Each asks for a claim, evidence, reasoning AND a fully SMART plan that fits the claim.
   * Worth 0 points: the 6 Final Transfer points are unchanged. */
  W.PLANCASES = [
    { id: 'd', who: 'Dani', resp: 'Dani plays in the school orchestra (rehearsal Monday and Wednesday, 3:30–5:00), helps in the family shop on Saturdays, and has a history presentation next Friday.',
      pattern: [['Physical', 'Eats a rushed lunch at her locker and drinks mostly soda.'], ['Mental', 'Loses track of the history reading.'], ['Emotional', 'Feels nervous about speaking in front of the class.'], ['Social', 'Skips lunch with her orchestra friends to practice alone.'], ['Environmental', 'Studies at home with the TV on; a quiet library room is open twice a week.']],
      goal: 'Dani’s goal: “Be less nervous about the presentation.”' },
    { id: 'e', who: 'Rafa', resp: 'Rafa runs cross-country (practice daily, 3:30–5:00), spends Sunday afternoons caring for his grandmother, and has a science fair project due in two weeks.',
      pattern: [['Physical', 'Runs every day but often goes to practice without a snack.'], ['Mental', 'Keeps putting off the science fair project.'], ['Emotional', 'Feels overwhelmed and a little guilty about the project.'], ['Social', 'His teammates are supportive, but he rarely asks them for help.'], ['Environmental', 'Works at a crowded kitchen table; the library is open until 6.']],
      goal: 'Rafa’s goal: “Get the project done and feel less stressed.”' }
  ];
  var PC = [
    [['a', 'Emotional and Social: nerves rise because Dani practices alone and skips lunch with friends who could listen.', 1], ['b', 'Physical and Mental: rushed, sugary lunches can leave her with less steady energy for the reading.', 1], ['c', 'Environmental and Mental: studying with the TV on makes the reading harder to follow.', 1], ['d', 'Social and Environmental: orchestra friends change the lighting in the room.', 0], ['e', 'Only Emotional matters; the other dimensions are unaffected.', 0]],
    [['a', 'Emotional and Mental: feeling overwhelmed makes him put the project off, which adds more guilt.', 1], ['b', 'Physical and Mental: practicing without a snack can leave him foggy when he sits down to work.', 1], ['c', 'Social and Emotional: teammates could ease the overwhelm if he asked for help.', 1], ['d', 'Environmental and Physical: the crowded kitchen table makes his legs stronger.', 0], ['e', 'Only Physical matters; the other dimensions are unaffected.', 0]]
  ];
  var PF = [
    [['f1', 'Dani skips lunch with her orchestra friends to practice alone.', 0], ['f2', 'Dani feels nervous about speaking in front of the class.', 0], ['f3', 'Dani eats a rushed lunch and drinks mostly soda.', 0], ['f4', 'Dani studies at home with the TV on.', 0], ['f5', 'The family shop opens at 9 a.m. on Saturdays.', 0]],
    [['f1', 'Rafa feels overwhelmed and a little guilty about the project.', 0], ['f2', 'Rafa often goes to practice without a snack.', 0], ['f3', 'Rafa rarely asks his supportive teammates for help.', 0], ['f4', 'Rafa’s grandmother lives two blocks away.', 0], ['f5', 'The science fair is in two weeks.', 0]]
  ];
  var PFM = [{ a: { f1: 1, f2: 0.5 }, b: { f3: 1 }, c: { f4: 1 } }, { a: { f1: 1, f5: 0.5 }, b: { f2: 1 }, c: { f3: 1, f1: 0.5 } }];
  var PR = [
    [['r1', 'STOP: practicing alone means no one hears the talk first; asking two friends to listen to a run-through at lunch is free and feasible.', 0], ['r2', 'STOP: rushed, sugary lunches leave little steady energy; packing a lunch with water takes five minutes and is feasible.', 0], ['r3', 'STOP: the TV makes the reading hard to follow; using the quiet library room on non-rehearsal days is free and feasible.', 0], ['r4', 'Quit orchestra and the shop so there is nothing to be nervous about; that guarantees good health.', 0], ['r5', 'Buy a calming supplement; it fixes everything.', 0]],
    [['r1', 'STOP: the project feels too big to start; splitting it into three small steps and doing the first one this week is feasible.', 0], ['r2', 'STOP: running on an empty stomach leaves him foggy; a banana or granola bar before practice is cheap and feasible.', 0], ['r3', 'STOP: help is already on the team; asking one teammate for a 20-minute study session is free and feasible.', 0], ['r4', 'Quit cross-country and stop visiting his grandmother to free up time; that guarantees good health.', 0], ['r5', 'Skip the project; the stress goes away right away.', 0]]
  ];
  var PRM = [{ a: { r1: 1 }, b: { r2: 1 }, c: { r3: 1 } }, { a: { r1: 1 }, b: { r2: 1 }, c: { r3: 1 } }];
  var PP = [
    [['p1', 'Practice the presentation for two friends at lunch on Tuesdays and Thursdays for 3 weeks, tracked on a calendar, to feel calmer.', 0], ['p2', 'Pack a lunch with water on 4 school days a week for 3 weeks, tracked on a checklist, for steadier energy.', 0], ['p3', 'Study the reading in the library room on 3 non-rehearsal days a week for 3 weeks, tracked on a calendar, to follow it more easily.', 0], ['p4', 'Be less nervous soon.', 0], ['p5', 'Practice for three hours every day, starting tomorrow, forever.', 0]],
    [['p1', 'Finish one small step of the project (research, outline, draft) on 3 days a week for 2 weeks, tracked on a checklist, to feel less overwhelmed.', 0], ['p2', 'Eat a snack before practice on all 5 practice days for 3 weeks, tracked on a calendar, for steadier energy.', 0], ['p3', 'Study with one teammate for 20 minutes after practice on 2 days a week for 2 weeks, tracked on a calendar, to feel supported.', 0], ['p4', 'Try to get the project done soon.', 0], ['p5', 'Work on the project 6 hours every night until it is done.', 0]]
  ];
  var PPM = [{ a: { p1: 1, p2: 0.5, p3: 0.5 }, b: { p2: 1, p1: 0.5, p3: 0.5 }, c: { p3: 1, p1: 0.5, p2: 0.5 } }, { a: { p1: 1, p2: 0.5, p3: 0.5 }, b: { p2: 1, p1: 0.5, p3: 0.5 }, c: { p3: 1, p1: 0.5, p2: 0.5 } }];
  function planVariant(i) {
    return V('ck.m7.plan.' + 'ab'[i], 'Use the case for **' + W.PLANCASES[i].who + '** (fictional). Build a claim, evidence, reasoning and a plan that all fit together.', [
      P('claim', 'CLAIM · Which two dimensions connect?', 'radio', PC[i], { hint: 'Pick two dimensions and a connection the case describes.' }),
      P('evid', 'EVIDENCE · Which case fact supports it?', 'radio', PF[i], { dep: 'claim', matrix: PFM[i], hint: 'The fact must be in the case AND support your claim. Prices, opening hours and other dimensions don’t.' }),
      P('why', 'REASONING · Which rationale supports a feasible action?', 'radio', PR[i], { dep: 'claim', matrix: PRM[i], hint: 'The action must fit the case limits and your claim. Quitting everything or buying a product isn’t feasible STOP/SMART.' }),
      P('plan', 'PLAN · Which plan is fully SMART and fits your claim?', 'radio', PP[i], { dep: 'claim', matrix: PPM[i], hint: 'Check each of S, M, A, R and T, then check that the plan works on the connection you claimed.' })
    ], { vis: { type: 'plancase', idx: i } });
  }
  W.defCheck({
    id: 'ck.m7.plan', m: 7, st: '7.3', topic: 'Second case: claim, evidence, reasoning and a SMART plan', src: 'All five decks + worksheet', kind: 'form',
    hint: 'Connect two dimensions in the case, point to a fact that shows it, explain a feasible action using STOP, then pick the SMART plan that fits that same connection.',
    why: 'A strong plan starts from a claim about how two dimensions connect, uses a fact that is actually in the case, explains a feasible action with STOP, and turns it into a goal that is specific, measurable, achievable, relevant and time-bound. Several claims are defensible, but the evidence, reasoning and plan must all match the claim.',
    variants: [planVariant(0), planVariant(1)]
  });

  /* ---------- 7.4 My 7-day plan (required, unscored, no right answers) ---------- */
  W.defActivity({ id: 'myPlan', m: 7, title: 'My 7-day plan and self-check (unscored)' });
  W.PLAN = {
    rate: [
      ['r1', 'I can name the five dimensions of wellness and show how they connect.'],
      ['r2', 'I can read a health number and know when follow-up makes sense.'],
      ['r3', 'I can turn a vague goal into a SMART goal.'],
      ['r4', 'I can judge a health post using author, evidence, purpose and independent sources.'],
      ['r5', 'I can use STOP when two good choices compete.']
    ],
    levels: [[1, 'Not yet'], [2, 'A little'], [3, 'Mostly'], [4, 'Yes']],
    dims: [['phys', 'Physical'], ['ment', 'Mental'], ['emo', 'Emotional'], ['soc', 'Social'], ['env', 'Environmental']],
    acts: {
      phys: [['a1', 'Drink a glass of water with breakfast'], ['a2', 'Walk for 10 minutes'], ['a3', 'Lights out at the same time on school nights'], ['a4', 'Eat a real snack before practice or an activity']],
      ment: [['a1', 'Do a 10-minute focused study block with the phone away'], ['a2', 'Write tomorrow’s top three tasks'], ['a3', 'Take a 5-minute screen-free break after homework'], ['a4', 'Do three slow breaths before a test or hard task']],
      emo: [['a1', 'Name one feeling and why, in a sentence'], ['a2', 'Write down one thing that went okay today'], ['a3', 'Say one kind thing to myself after a mistake'], ['a4', 'Tell a trusted person how the day went']],
      soc: [['a1', 'Check in with one friend or family member'], ['a2', 'Sit with someone new at lunch once a week'], ['a3', 'Offer help to someone'], ['a4', 'Plan one screen-free hangout']],
      env: [['a1', 'Clear my study spot for 5 minutes'], ['a2', 'Spend 10 minutes outside'], ['a3', 'Use a refillable bottle'], ['a4', 'Keep my phone charging away from my bed']]
    },
    cues: [['c1', 'brush my teeth in the morning'], ['c2', 'get home from school'], ['c3', 'sit down to dinner'], ['c4', 'start my homework'], ['c5', 'pack my bag for the next day']],
    obs: [['o1', 'I am tired'], ['o2', 'I forget'], ['o3', 'my plans change'], ['o4', 'friends invite me out']],
    backs: [['b1', 'do the 2-minute version'], ['b2', 'move it to later the same day'], ['b3', 'ask someone to remind me'], ['b4', 'set a phone reminder']],
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    minDays: 3,
    ids: function (list) { return list.map(function (x) { return x[0]; }); },
    /* Sanitize a stored plan (never trust stored data). */
    clean: function (raw) {
      if (!raw || typeof raw !== 'object') return null;
      var self = W.PLAN, out = { rate: {}, dim: '', act: '', cue: '', obs: '', back: '', days: [], why: '', saved: raw.saved === true };
      var rate = raw.rate && typeof raw.rate === 'object' ? raw.rate : {};
      self.rate.forEach(function (r) { var v = rate[r[0]] | 0; if (v >= 1 && v <= 4) out.rate[r[0]] = v; });
      if (self.ids(self.dims).indexOf(raw.dim) >= 0) out.dim = raw.dim;
      if (out.dim && self.ids(self.acts[out.dim]).indexOf(raw.act) >= 0) out.act = raw.act;
      if (self.ids(self.cues).indexOf(raw.cue) >= 0) out.cue = raw.cue;
      if (self.ids(self.obs).indexOf(raw.obs) >= 0) out.obs = raw.obs;
      if (self.ids(self.backs).indexOf(raw.back) >= 0) out.back = raw.back;
      if (Array.isArray(raw.days)) raw.days.forEach(function (d) { d = d | 0; if (d >= 0 && d <= 6 && out.days.indexOf(d) < 0) out.days.push(d); });
      out.days.sort(function (a, b) { return a - b; });
      out.why = typeof raw.why === 'string' ? raw.why.slice(0, 300) : '';
      return out;
    },
    ready: function (p) {
      var self = W.PLAN; if (!p) return false;
      return self.rate.every(function (r) { return !!p.rate[r[0]]; }) && !!p.dim && !!p.act && !!p.cue && !!p.obs && !!p.back && p.days.length >= self.minDays;
    },
    label: function (list, id) { for (var i = 0; i < list.length; i++) if (list[i][0] === id) return list[i][1]; return ''; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
