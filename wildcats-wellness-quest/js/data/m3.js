/* Mission 3 — Habit Workshop (18 points)
 *  ratings analysis 2 + loop repair 3 + 3 strategy items 3 + SMART repair 5 + SMART builder 5
 * Source: Day3_Self_Assessment_Habit_Change deck + curriculum spec (Self-assessment, habits, goals).
 * Habit-timing research (Lally et al. 2009/2010; Singh et al. 2024) is context: no exact number is graded.
 * Text is deliberately concise for the 5-minute budget (tools/pacing.js).
 */
(function (root) {
  'use strict';
  var W = root.WWQ, P = W.P, V = W.V;

  var DOMS = ['phys', 'ment', 'emo', 'soc', 'env'];
  var DNAME = { phys: 'Physical', ment: 'Mental', emo: 'Emotional', soc: 'Social', env: 'Environmental' };

  /* ---------- 3.1 Ratings analysis ---------- */
  function ratings(id, who, notes, vals, growthOpts, strengthKeys) {
    var strengthOpts = DOMS.map(function (d) { return [d, DNAME[d], strengthKeys.indexOf(d) >= 0 ? 1 : 0]; });
    return V(id, who + '\n\n' + notes, [
      P('strength', 'Clearest strength?', 'radio', strengthOpts, { fixed: true, hint: 'A strength is a high rating. If two tie for highest, either is defensible.' }),
      P('growth', 'Growth focus AND the reason that best supports it', 'radio', growthOpts, { hint: 'Use BOTH the rating and the notes, and pick a realistic next step. A low rating is information, not a judgment.' })
    ], { vis: { type: 'ratings', vals: vals, who: who } });
  }
  W.defItem({ id: 'm3.ratings', m: 3, st: '3.1', pts: 2, cls: 'complex', d: 'A', topic: 'Self-assessment: strengths, growth areas, realistic next step', src: 'Day3_Self_Assessment_Habit_Change deck + curriculum spec', kind: 'form',
    hint: 'Use the numbers (1 = needs attention, 3 = doing okay, 5 = thriving) and the character’s notes.',
    why: 'Ratings are information, not judgments. A strength is a high rating; a good growth focus uses the rating AND the notes to choose a realistic next step.',
    variants: [
      ratings('m3.ratings.a', '**Alex** (fictional) rated each dimension from 1 (needs attention) to 5 (thriving).',
        '“I run most mornings. Tests stress me but I cope. I eat lunch alone and wish I knew people in class. I name my feelings and talk to my brother. My room is cluttered.”',
        { phys: 4, ment: 3, emo: 4, soc: 2, env: 3 },
        [['a', 'Social: lowest rating, wants connection; joining one study group is realistic.', 1], ['b', 'Physical: rated 4, so it needs the most points.', 0], ['c', 'Social: low ratings mean Alex is doing something wrong.', 0.5], ['d', 'Mental: rated 3, so ignore the test stress.', 0], ['e', 'Environmental: a messy room is the whole problem.', 0]], ['phys', 'emo']),
      ratings('m3.ratings.b', '**Sam** (fictional) rated each dimension from 1 (needs attention) to 5 (thriving).',
        '“My friends and I talk daily and I belong. I stay up late, I’m tired most mornings and skip breakfast. I stay calm on tests and name my feelings. My desk is organized.”',
        { phys: 2, ment: 4, emo: 4, soc: 5, env: 4 },
        [['a', 'Physical: lowest rating; late nights and skipped breakfast; set a lights-out time.', 1], ['b', 'Social: rated 5, so it needs more points.', 0], ['c', 'Physical: because Sam is lazy.', 0.5], ['d', 'Emotional: rated 4, so ignore feelings.', 0], ['e', 'Mental: rated 4, so drop all friendships.', 0]], ['soc']),
      ratings('m3.ratings.c', '**Rin** (fictional) rated each dimension from 1 (needs attention) to 5 (thriving).',
        '“I eat well and walk to school. I have a quiet study corner and I recycle. I have two close friends. My feelings are okay. I forget what I read and struggle to start big assignments.”',
        { phys: 3, ment: 2, emo: 3, soc: 4, env: 5 },
        [['a', 'Mental: lowest rating; forgetting and trouble starting; try a 10-minute start timer.', 1], ['b', 'Environmental: rated 5, so it needs more attention.', 0], ['c', 'Mental: low ratings mean Rin cannot learn.', 0.5], ['d', 'Social: rated 4, so stop seeing friends.', 0], ['e', 'Physical: rated 3, so it is the problem.', 0]], ['env'])
    ]
  });

  /* ---------- 3.2 Habit-loop repair ---------- */
  function loop(id, story, brokenLoop, cues, routines, rewards, hints) {
    return V(id, story, [
      P('cue', 'Fix the CUE', 'radio', cues, { hint: hints[0] }),
      P('routine', 'Fix the ROUTINE', 'radio', routines, { hint: hints[1] }),
      P('reward', 'Fix the REWARD', 'radio', rewards, { hint: hints[2] })
    ], { vis: { type: 'loop', broken: brokenLoop } });
  }
  W.defItem({ id: 'm3.loop', m: 3, st: '3.2', pts: 3, cls: 'complex', d: 'A', topic: 'Habit loop: cue → routine → reward', src: 'Day3_Self_Assessment_Habit_Change deck + curriculum spec (habit loop)', kind: 'form',
    hint: 'A loop works best with a clear, consistent cue, a small routine that matches the goal, and a quick connected reward.',
    why: 'Cue → routine → reward is the classroom habit model. Clear cues, small matching routines and quick, connected rewards help repetition make behavior more automatic. It is a teaching model, not a claim that every behavior works identically.',
    variants: [
      loop('m3.loop.a', '**Riley** (fictional) wants to read 10 minutes before bed instead of scrolling. The loop is broken.', { cue: 'When I feel like it', routine: 'Scroll my phone', reward: 'Nothing' },
        [['a', 'After I plug my phone in across the room', 1], ['b', 'Sometime after dinner', 0], ['c', 'When I’m bored', 0], ['d', 'After I brush my teeth', 1]],
        [['a', 'Read 10 pages', 1], ['b', 'Read the feed on a tablet', 0], ['c', 'Read for two hours', 0], ['d', 'Read one paragraph', 0.5]],
        [['a', 'Check off a calendar and enjoy quiet', 1], ['b', 'A big prize after 100 days', 0], ['c', 'No reward', 0], ['d', 'Scroll as a reward', 0]],
        ['A clear cue is a specific, consistent moment.', 'Small, doable, and matching the goal (reading, not scrolling).', 'Quick and connected to the routine.']),
      loop('m3.loop.b', '**Priya** (fictional) wants a glass of water each morning but forgets. The loop is broken.', { cue: 'At some point in the morning', routine: 'Hope to remember', reward: 'None' },
        [['a', 'When I fill my breakfast bowl', 1], ['b', 'Whenever I think of it', 0], ['c', 'At some point this morning', 0], ['d', 'When I get to school', 0.5]],
        [['a', 'Drink one glass of water', 1], ['b', 'Drink four litres at once', 0], ['c', 'Buy a drink at school', 0], ['d', 'Take two sips', 0.5]],
        [['a', 'Mark a tracker and enjoy feeling refreshed', 1], ['b', 'A prize at year’s end', 0], ['c', 'No reward', 0], ['d', 'Skip it; it was boring', 0]],
        ['Choose a moment that happens every day.', 'Small, doable, tied to the goal.', 'Quick and connected to what you just did.']),
      loop('m3.loop.c', '**Omar** (fictional) wants to practice guitar after school but keeps putting it off. The loop is broken.', { cue: 'Later, when I have time', routine: 'Phone for hours', reward: 'No reward' },
        [['a', 'After I hang my backpack on the hook', 1], ['b', 'Later, when I have time', 0], ['c', 'When I’m in the mood', 0], ['d', 'After my snack', 1]],
        [['a', 'Play for 10 minutes', 1], ['b', 'Practice for three hours', 0], ['c', 'Watch a guitar video', 0], ['d', 'Tune it and play one song', 0.5]],
        [['a', 'Mark a streak chart and play a favorite riff', 1], ['b', 'A new guitar after 200 days', 0], ['c', 'No reward', 0], ['d', 'Skip it; reward myself later', 0]],
        ['The cue should be something that already happens.', 'Short enough to begin.', 'Reward the routine right away.'])
    ]
  });

  /* ---------- 3.3 Strategy and roadblock items ---------- */
  function sv(id, text, opts, hint, label) { return V(id, text, [P('ans', label || 'Choose the best answer', 'radio', opts, { hint: hint })]); }
  W.defItem({ id: 'm3.strat.1', m: 3, st: '3.3', pts: 1, cls: 'short', d: 'F', topic: 'Habit strategies: habit stacking and environment design', src: 'Day3_Self_Assessment_Habit_Change deck + curriculum spec (strategies)', kind: 'form',
    hint: 'Is the plan tied to an existing routine, or does it change the surroundings?',
    why: 'Habit stacking links a new action to an existing routine ("after I ... I will ..."). Environment design changes surroundings so the desired action is easier and the unwanted one harder.',
    variants: [
      sv('m3.strat.1.a', 'Lena: “After I pour my cereal, I fill my water bottle.” Which strategy?', [['a', 'Habit stacking', 1], ['b', 'Environment design', 0], ['c', 'Tracking', 0], ['d', 'Waiting for motivation', 0]], 'The plan attaches a new action to an existing routine.', 'Which strategy?'),
      sv('m3.strat.1.b', 'Kai puts his running shoes by the door and charges his phone in another room. Which strategy?', [['a', 'Environment design', 1], ['b', 'Habit stacking', 0], ['c', 'Willpower only', 0], ['d', 'An all-or-nothing rule', 0]], 'The plan changes the surroundings.', 'Which strategy?')]
  });
  W.defItem({ id: 'm3.strat.2', m: 3, st: '3.3', pts: 1, cls: 'short', d: 'F', topic: 'Roadblocks: all-or-nothing thinking, missed days, motivation dips', src: 'Day3_Self_Assessment_Habit_Change deck + curriculum spec (roadblocks)', kind: 'form',
    hint: 'A missed day is a normal bump. Which response keeps the routine going?',
    why: 'All-or-nothing thinking treats one missed day as total failure. A missed day does not erase progress; return to the routine at the next cue. Motivation dips are normal, so lean on cues and small routines.',
    variants: [
      sv('m3.strat.2.a', 'Mia missed Tuesday’s walk and thinks, “Streak ruined, might as well quit.” Best response?', [['a', 'Spot the all-or-nothing thinking; return at the next cue.', 1], ['b', 'Start over from day one.', 0], ['c', 'Quit; the habit failed.', 0], ['d', 'Wait until motivated.', 0.5]], 'One missed day is not quitting.', 'Best response'),
      sv('m3.strat.2.b', 'Omar felt unmotivated Thursday and nearly skipped his 10-minute practice. Best response?', [['a', 'Use the usual cue and do the small routine anyway.', 1], ['b', 'Skip until motivation returns.', 0], ['c', 'Decide he is not a guitar person.', 0], ['d', 'Triple the goal for motivation.', 0]], 'Cues and small routines carry you through dips.', 'Best response')]
  });
  W.defItem({ id: 'm3.strat.3', m: 3, st: '3.3', pts: 1, cls: 'short', d: 'F', topic: 'Variation in habit formation; challenging the “21 days” claim', src: 'Day3 deck + Lally et al. (2009/2010), Singh et al. (2024) — docs/SOURCE_REGISTER.md', kind: 'form',
    hint: 'Research reports a wide range of times. Can one number apply to everyone?',
    why: 'Research shows wide variation in how long habits take, and different studies report different statistics. A study average is not a deadline for everyone: consistency matters more than a fixed number of days.',
    variants: [
      sv('m3.strat.3.a', 'A video: “Every habit is automatic after exactly 21 days.” Best-supported response?', [['a', 'Time varies a lot by person and habit; consistency beats a deadline.', 1], ['b', 'True for everyone; quit on day 22.', 0], ['c', 'Habits never become automatic.', 0], ['d', 'One study’s average is everyone’s deadline.', 0]], 'Think about variation across people and habits.', 'Best response'),
      sv('m3.strat.3.b', 'A coach: “Not automatic by day 66? You failed.” Best-supported response?', [['a', 'A study average is not a personal deadline; people vary, so stay consistent.', 1], ['b', 'Day 66 applies to every habit and person.', 0], ['c', 'Averages and medians are the same, so 66 fits all.', 0], ['d', 'Repetition has no effect on habits.', 0]], 'What can an average say about one person?', 'Best response')]
  });

  /* ---------- 3.4 SMART repair (5 pts) ---------- */
  function sm(id, who, clauses) {
    var parts = clauses.map(function (c) {
      var opts = [['keep', 'Keep it as written', c.fine ? 1 : 0]].concat(c.opts);
      return P(c.k, c.label + ': “' + c.cur + '”', 'select', opts, { hint: c.hint });
    });
    return V(id, who, parts, { vis: { type: 'goal', clauses: clauses.map(function (c) { return { k: c.k, cur: c.cur }; }) } });
  }
  W.defItem({ id: 'm3.smartfix', m: 3, st: '3.4', pts: 5, cls: 'complex', d: 'D', topic: 'SMART: identify which criteria are missing and repair them', src: 'Day3_Self_Assessment_Habit_Change deck + curriculum spec (SMART)', kind: 'form',
    hint: 'For each letter ask: is it already specific / measurable / achievable / relevant / time-bound? Fix only what is missing; keep what works.',
    why: 'A specific goal is not automatically fully SMART. Check each criterion: Specific, Measurable, Achievable, Relevant, Time-bound. Good repairs fix what is missing and keep what already works. SMART is a planning framework, not a guarantee of success.',
    variants: [
      sm('m3.smartfix.a', '**Jordan’s draft goal** (fictional). Jordan takes the 5:30 bus, works Thursday evenings, has no gym. Repair only what needs it.', [
        { k: 'S', label: 'Specific', cur: 'I will be more active', opts: [['x1', 'I will walk briskly 20 minutes after the bus', 1], ['x2', 'I will be a lot more active', 0], ['x3', 'I will do some exercise stuff', 0]], hint: 'Does it say exactly what Jordan will do?' },
        { k: 'M', label: 'Measurable', cur: 'I will mark a calendar each day I finish', fine: true, opts: [['x1', 'I will see how I feel', 0], ['x2', 'I will remember it in my head', 0], ['x3', 'A friend will guess how I did', 0]], hint: 'Could someone check that it happened?' },
        { k: 'A', label: 'Achievable', cur: 'for 90 minutes every day starting tomorrow', opts: [['x1', 'on four school days and one weekend day', 1], ['x2', 'for 3 hours every day', 0], ['x3', 'once, someday', 0.5]], hint: 'Does it fit the bus, the shift and no gym?' },
        { k: 'R', label: 'Relevant', cur: 'because my friend said I should', opts: [['x1', 'because I want more energy and less stress', 1], ['x2', 'because everyone online does it', 0], ['x3', 'because it’s a rule', 0]], hint: 'Does it connect to Jordan’s own reason?' },
        { k: 'T', label: 'Time-bound', cur: 'someday', opts: [['x1', 'for 4 weeks, checking in each Friday', 1], ['x2', 'forever starting tomorrow', 0], ['x3', 'until I get tired of it', 0]], hint: 'Is there a time frame and a review?' }]),
      sm('m3.smartfix.b', '**Priya’s draft goal** (fictional). Priya swims at 6 a.m. and has about 20 minutes before the bus. Repair only what needs it.', [
        { k: 'S', label: 'Specific', cur: 'I will drink a glass of water when I fill my breakfast bowl', fine: true, opts: [['x1', 'I will drink more water', 0], ['x2', 'I will try to hydrate', 0], ['x3', 'I will be healthy about drinks', 0]], hint: 'Does it say what and when?' },
        { k: 'M', label: 'Measurable', cur: 'and see if it works', opts: [['x1', 'and tick a box on a tracker each morning', 1], ['x2', 'and think about it', 0], ['x3', 'and hope it helps', 0]], hint: 'How will Priya know it happened?' },
        { k: 'A', label: 'Achievable', cur: 'every day for the rest of the year', opts: [['x1', 'on most school days, aiming for five a week', 1], ['x2', 'every day for life', 0], ['x3', 'one day', 0.5]], hint: 'Is it realistic for a busy morning?' },
        { k: 'R', label: 'Relevant', cur: 'to impress people', opts: [['x1', 'to feel more focused in morning classes', 1], ['x2', 'to match an influencer', 0], ['x3', 'because someone said so', 0]], hint: 'Does it fit Priya’s own needs?' },
        { k: 'T', label: 'Time-bound', cur: 'by next week', opts: [['x1', 'for 4 weeks, then review', 1], ['x2', 'one time', 0], ['x3', 'until I forget', 0]], hint: 'A week is short for judging a habit. Is there a review?' }]),
      sm('m3.smartfix.c', '**Omar’s draft goal** (fictional). Omar works after school, has no car and no money for classes. Repair only what needs it.', [
        { k: 'S', label: 'Specific', cur: 'I will practice guitar more', opts: [['x1', 'I will play guitar 10 minutes after hanging my backpack', 1], ['x2', 'I will practice sometimes', 0], ['x3', 'I will improve at music', 0]], hint: 'What exactly, and when?' },
        { k: 'M', label: 'Measurable', cur: 'and mark a streak chart each day', fine: true, opts: [['x1', 'and decide later how it went', 0], ['x2', 'and think about it at the end', 0], ['x3', 'and ask no one', 0]], hint: 'Is there a way to check?' },
        { k: 'A', label: 'Achievable', cur: 'using an expensive new teacher', opts: [['x1', 'using free online lessons and his own guitar', 1], ['x2', 'by hiring a pro every day', 0], ['x3', 'by waiting until he can afford it', 0.5]], hint: 'Does it fit Omar’s money and schedule?' },
        { k: 'R', label: 'Relevant', cur: 'because it’s on a list', opts: [['x1', 'because music helps him relax and he wants to join the band', 1], ['x2', 'because my cousin said so', 0], ['x3', 'because it was on a poster', 0]], hint: 'What is Omar’s own reason?' },
        { k: 'T', label: 'Time-bound', cur: 'for 6 weeks, reviewing on the last Friday', fine: true, opts: [['x1', 'forever', 0], ['x2', 'someday', 0], ['x3', 'until it is perfect', 0]], hint: 'Is the time frame clear?' }])
    ]
  });

  /* ---------- 3.5 SMART builder (5 pts) with compatibility matrix ---------- */
  function builder(id, story, caseNote, A, T, M, R, TF, matrices) {
    return V(id, story + '\n\n' + caseNote, [
      P('action', 'S · Specific action', 'select', A, { hint: 'Pick an action that is specific AND fits the case limits.' }),
      P('track', 'M · Tracking method', 'select', T, { dep: 'action', matrix: matrices.track, depCap: 0.5, hint: 'The tracking method has to measure THE action you chose.' }),
      P('amount', 'A · Feasible amount', 'select', M, { dep: 'action', matrix: matrices.amount, depCap: 0.5, hint: 'Fit the case limits: not too big, not trivial.' }),
      P('why', 'R · Purpose', 'select', R, { dep: 'action', matrix: matrices.why, depCap: 0.5, hint: 'The purpose should connect to what the action helps with.' }),
      P('time', 'T · Timeframe', 'select', TF, { hint: 'A clear time frame with a review point.' })
    ], { vis: { type: 'builder' } });
  }
  var timeOpts = [['t1', 'For 4 weeks, checking in each Friday', 1], ['t2', 'For 2 weeks, then adjust or continue', 1], ['t3', 'Someday', 0], ['t4', 'For life, starting tomorrow', 0], ['t5', 'Just one time', 0.5]];
  W.defItem({ id: 'm3.smartbuild', m: 3, st: '3.5', pts: 5, cls: 'complex', d: 'D', topic: 'SMART goal construction with compatible components', src: 'Day3_Self_Assessment_Habit_Change deck + curriculum spec (SMART)', kind: 'form',
    hint: 'Check compatibility: tracking, amount and purpose must fit the action you chose, and everything must fit the case limits.',
    why: 'This task assesses choosing compatible SMART components from a pre-authored set (several valid combinations exist); it does not assess unrestricted goal writing. A mismatched tracking method, an amount that ignores the case limits, or a vague action earns partial or no credit.',
    variants: [
      builder('m3.smartbuild.a', '**Build a SMART goal for Riley** (fictional).',
        'Riley is tired in the school week. Limits: noisy shared room, bus until 5:30, nightly homework, **no gym, no spending money**.',
        [['a1', 'Phone charging across the room; lights out by 10:30 p.m. on school nights', 1], ['a2', 'Walk briskly for 20 minutes after the bus', 1], ['a3', 'Refill my water bottle at lunch instead of an energy drink', 1], ['a4', 'Be healthier', 0], ['a5', 'Go to the gym seven days a week', 0]],
        [['k1', 'Mark a calendar each night I’m in bed by 10:30', 0], ['k2', 'Log minutes walked in a notes app', 0], ['k3', 'Tally bottle refills each school day', 0], ['k4', 'See how I feel', 0], ['k5', 'Ask someone to remember', 0]],
        [['m1', '5 school nights per week', 0], ['m2', '20 minutes, 3 school days per week', 0], ['m3', 'Refill at lunch, 4 school days per week', 0], ['m4', 'Two hours every day, no exceptions', 0], ['m5', 'One time this month', 0]],
        [['r1', 'So I can focus and keep my mood steadier in class', 0], ['r2', 'So I have more energy and handle stress better', 0], ['r3', 'So I have steadier afternoon energy', 0], ['r4', 'Because someone told me to', 0], ['r5', 'To get likes online', 0]],
        timeOpts,
        {
          track: { a1: { k1: 1 }, a2: { k2: 1 }, a3: { k3: 1 }, a4: { k1: 0.5, k2: 0.5, k3: 0.5 }, a5: { k2: 0.5 } },
          amount: { a1: { m1: 1, m5: 0.5 }, a2: { m2: 1, m5: 0.5 }, a3: { m3: 1, m5: 0.5 }, a4: { m5: 0.5 }, a5: { m5: 0.5 } },
          why: { a1: { r1: 1, r2: 0.5 }, a2: { r2: 1, r1: 0.5 }, a3: { r3: 1, r2: 0.5 }, a4: { r1: 0.5, r2: 0.5, r3: 0.5 }, a5: { r2: 0.5 } }
        }),
      builder('m3.smartbuild.b', '**Build a SMART goal for Priya** (fictional).',
        'Priya swims at 6 a.m., has about 20 minutes before the bus, uses her phone as an alarm, and has **limited money**.',
        [['a1', '10-minute no-screen stretch and music wind-down after practice', 1], ['a2', 'Pack a fruit-and-protein snack for the bus the night before', 1], ['a3', 'Charge my phone across the room after 9:30 p.m.; use a cheap alarm clock', 1], ['a4', 'Take care of myself better', 0], ['a5', 'Hire a personal trainer every day', 0]],
        [['k1', 'Tick a stretch tracker', 0], ['k2', 'Check off a snack list', 0], ['k3', 'Mark an “in bed by 10” calendar', 0], ['k4', 'Remember how it went', 0], ['k5', 'Ask someone to guess', 0]],
        [['m1', '10 minutes, 3 practice days per week', 0], ['m2', 'Pack the snack on 4 school days per week', 0], ['m3', 'Phone on the charger 5 school nights per week', 0], ['m4', 'Two hours daily with no breaks', 0], ['m5', 'Once, someday', 0]],
        [['r1', 'So my body recovers and feels less stiff', 0], ['r2', 'So I have steady energy for afternoon classes', 0], ['r3', 'So I fall asleep easier and wake rested', 0], ['r4', 'Because a trend said so', 0], ['r5', 'Because someone is watching', 0]],
        timeOpts,
        {
          track: { a1: { k1: 1 }, a2: { k2: 1 }, a3: { k3: 1 }, a4: { k1: 0.5, k2: 0.5, k3: 0.5 }, a5: { k1: 0.5 } },
          amount: { a1: { m1: 1, m5: 0.5 }, a2: { m2: 1, m5: 0.5 }, a3: { m3: 1, m5: 0.5 }, a4: { m5: 0.5 }, a5: { m5: 0.5 } },
          why: { a1: { r1: 1, r3: 0.5 }, a2: { r2: 1 }, a3: { r3: 1, r2: 0.5 }, a4: { r1: 0.5, r2: 0.5, r3: 0.5 }, a5: { r1: 0.5 } }
        }),
      builder('m3.smartbuild.c', '**Build a SMART goal for Omar** (fictional).',
        'Omar works after school, has no car, shares a small apartment and has **no money for classes or equipment**.',
        [['a1', 'Text one friend a quick hello each school day on the bus', 1], ['a2', 'Do a 15-minute bodyweight routine after dinner', 1], ['a3', 'Write three gratitudes on a sticky note before bed', 1], ['a4', 'Be happier', 0], ['a5', 'Join a paid club downtown daily', 0]],
        [['k1', 'Mark a calendar each day I send a text', 0], ['k2', 'Log reps and minutes in a notes app', 0], ['k3', 'Keep notes in a jar and count them', 0], ['k4', 'See how I feel', 0], ['k5', 'Ask someone to remember', 0]],
        [['m1', 'Send the text 4 school days per week', 0], ['m2', '15 minutes, 3 evenings per week', 0], ['m3', 'Write a note 5 nights per week', 0], ['m4', 'Every day for 3 hours', 0], ['m5', 'One time this month', 0]],
        [['r1', 'So I feel more connected to friends', 0], ['r2', 'So I have more energy and sleep better', 0], ['r3', 'So I keep perspective on hard days', 0], ['r4', 'Because everyone online does it', 0], ['r5', 'To get likes', 0]],
        timeOpts,
        {
          track: { a1: { k1: 1 }, a2: { k2: 1 }, a3: { k3: 1 }, a4: { k1: 0.5, k2: 0.5, k3: 0.5 }, a5: { k1: 0.5 } },
          amount: { a1: { m1: 1, m5: 0.5 }, a2: { m2: 1, m5: 0.5 }, a3: { m3: 1, m5: 0.5 }, a4: { m5: 0.5 }, a5: { m5: 0.5 } },
          why: { a1: { r1: 1, r3: 0.5 }, a2: { r2: 1, r3: 0.5 }, a3: { r3: 1, r1: 0.5 }, a4: { r1: 0.5, r2: 0.5, r3: 0.5 }, a5: { r1: 0.5 } }
        })
    ]
  });
})(typeof window !== 'undefined' ? window : globalThis);
