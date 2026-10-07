// MISSION 5: GOAL BUILDER (SMART Goals & Behavior Change)  -  domain "goals"  -  10 points
const repair = (id, weak, s1, s2, s3, s4, why) => ({ kind: 'q', block: 'm5b', q: {
  id: 'g-repair-' + id, slot: 'g-repair', domain: 'goals', concept: 'goal-repair', skill: 'create', difficulty: 3, qt: 'SMART-goal repair challenge', lvl: 'AP', pts: 3, sec: 120, major: true,
  type: 'slots', goalPreview: true,
  stim: { title: 'A fictional student\'s weak goal', quote: { who: '{N1}', text: weak } },
  prompt: 'Repair {N1}\'s goal so it is Specific, Measurable, Achievable, Relevant and Time-bound. Choose one piece for each part. Your finished goal appears below.',
  slots: [
    { k: 'what', label: 'WHAT will {N1} do?', opts: [['w1', s1[0]], ['w2', s1[1]], ['w3', s1[2]]] },
    { k: 'much', label: 'HOW MUCH or HOW OFTEN?', opts: [['m1', s2[0]], ['m2', s2[1]], ['m3', s2[2]]] },
    { k: 'why', label: 'WHY does it matter to {N1}?', opts: [['y1', s3[0]], ['y2', s3[1]], ['y3', s3[2]]] },
    { k: 'when', label: 'FOR HOW LONG?', opts: [['t1', s4[0]], ['t2', s4[1]], ['t3', s4[2]]] }
  ],
  ans: { what: 'w1', much: 'm1', why: 'y1', when: 't1' },
  hints: ['Check each part against one SMART letter: what is specific, how much is measurable AND achievable, why is relevant, for how long is time-bound.', 'A goal part fails if it is vague, impossible to keep up, driven by someone else, or has no end point.'],
  explain: why
} });

export default {
  id: 'm5', num: 5, title: 'Goal Builder', theme: 'plan', est: 6, kicker: 'MISSION 5',
  blurb: 'Repair weak goals and plan around real barriers, using fictional students.',
  stages: [
    { kind: 'q', block: 'm5a', q: {
      id: 'g-match', domain: 'goals', concept: 'smart-components', skill: 'diagnose', difficulty: 2, qt: 'matching', lvl: 'AP', pts: 2, sec: 90,
      type: 'match', prompt: 'Each goal below is missing or weak in exactly one SMART part. Match each goal to the part that needs the most improvement.',
      items: [['g1', '"I will add one serving of vegetables to dinner more often during the next 4 weeks."'], ['g2', '"I will run a full marathon next weekend, even though I have never run more than a mile."'], ['g3', '"I will drink water instead of soda at lunch on every school day."'], ['g4', '"I will practice free throws 20 minutes a day, 3 days a week, for 5 weeks, even though I have no interest in basketball."']],
      choices: [['s', 'Specific'], ['m', 'Measurable'], ['a', 'Achievable'], ['r', 'Relevant'], ['t', 'Time-bound']],
      ans: { g1: 'm', g2: 'a', g3: 't', g4: 'r' },
      hints: ['For each goal, find the SMART part that is missing, then check it is the one the goal is weakest on.'],
      explain: '"More often" is not measurable. A marathon next weekend is not achievable for someone who has never run more than a mile. The water goal has no end date, so it is not time-bound. Practicing free throws with no interest in basketball is not relevant to the person\'s own priorities.'
    } },
    { kind: 'pool', id: 'g-repair-pool', groups: [{ pick: 1, items: [
      repair('act', 'I want to be more active.', ['Take a 20-minute brisk walk after school', 'Try to be more active', 'Exercise a lot when I can'], ['on 4 days each week', 'every day, with no rest days, for 3 hours', 'more often than before'], ['because I want more energy for practice and to feel less stressed', 'because an ad said I should', 'because other people exercise more than I do'], ['for the next 6 weeks, with a check-in at week 3', 'until I feel like stopping', 'someday soon'], 'The repaired goal names a specific action, uses a number that is achievable (4 days), gives a personal reason, and sets an end point with a check-in.'),
      repair('veg', 'I want to eat better.', ['Add one vegetable to dinner', 'Eat better foods', 'Stop eating the wrong foods'], ['on 5 nights each week', 'on every meal of every day starting tomorrow', 'when I remember'], ['because vegetables add fiber and vitamins that support my energy', 'because a video said vegetables are magic', 'because my friend does it'], ['for the next 4 weeks, then review', 'forever starting right now', 'until it gets boring'], 'The repaired goal is a specific behavior, the target (5 nights) is measurable and achievable, the reason is personal, and the 4-week review makes it time-bound.'),
      repair('sleep', 'I should sleep better.', ['Start my bedtime routine at 9:45 p.m. with screens off', 'Sleep more', 'Never be tired again'], ['on school nights, aiming for 8 to 10 hours', 'every night of the year with no exceptions', 'whenever it works out'], ['because enough sleep helps me concentrate and recover from practice', 'because I read a trend online', 'because someone told me to'], ['for the next 3 weeks, checking my progress each Sunday', 'for as long as I can', 'by next year maybe'], 'The repaired goal names a specific routine, a measurable and achievable target, a personal reason, and a 3-week time frame with a weekly check.')
    ] }] },
    { kind: 'q', block: 'm5c', q: {
      id: 'g-barrier', domain: 'goals', concept: 'barriers-strategies', skill: 'match', difficulty: 2, qt: 'matching', lvl: 'AP', pts: 2, sec: 90,
      type: 'match', prompt: 'Match each barrier to the strategy that would help most.',
      items: [['b1', 'No time to cook after practice'], ['b2', 'Fresh produce seems expensive'], ['b3', 'Friends do not want to be active'], ['b4', 'Keeps forgetting the new habit']],
      choices: [['x1', 'Prepare ingredients or cook a big batch on the weekend and keep quick backup options'], ['x2', 'Buy frozen or canned vegetables (no added salt) or produce that is in season'], ['x3', 'Invite a friend to join, or join a team or class to meet others who are active'], ['x4', 'Set a phone reminder and tie the habit to something already in the routine'], ['x5', 'Wait to start until motivation returns on its own']],
      ans: { b1: 'x1', b2: 'x2', b3: 'x3', b4: 'x4' },
      hints: ['Choose the strategy that directly removes or reduces each barrier, not one that avoids the goal.'],
      explain: 'Batch preparation saves time, frozen and canned vegetables lower cost, a friend or team provides social support, and reminders tied to routines help with forgetting. Waiting for motivation does not address any of the barriers.'
    } },
    { kind: 'q', block: 'm5c', q: {
      id: 'g-eval', domain: 'goals', concept: 'goal-eval', skill: 'evaluate', difficulty: 3, qt: 'scenario multiple choice', lvl: 'AN', pts: 2, sec: 70,
      type: 'mc', stim: { title: 'Scenario', paras: ['{N1} has been mostly inactive and wants better stamina for soccer tryouts in two months.'] },
      prompt: 'Which goal is the best SMART goal for {N1}?',
      opts: [['a', 'I will jog and walk in intervals for 20 minutes, 3 days a week, for 6 weeks so I have more stamina for tryouts.'], ['b', 'I will run for 90 minutes every day starting tomorrow, with no rest days, until tryouts.'], ['c', 'I will get in shape soon so I can do well at tryouts.'], ['d', 'I will copy the workout that is trending this month because the influencers I follow all do it.']],
      ans: 'a', hints: ['Check each choice against all five letters. Which options are vague, unrealistic, or based on someone else\'s priorities?'],
      explain: 'Choice A is specific, measurable (20 minutes, 3 days), achievable for a beginner, relevant to tryouts, and time-bound (6 weeks). The others are unrealistic, vague, or based on trends rather than {N1}\'s own purpose.'
    } },
    { kind: 'q', block: 'm5c', q: {
      id: 'g-plan', domain: 'goals', concept: 'goal-process', skill: 'sequence', difficulty: 2, qt: 'ranking', lvl: 'K', pts: 1, sec: 60,
      type: 'seq', prompt: 'Put the steps of a behavior-change plan in a sensible order.',
      steps: [['p1', 'Choose one specific behavior to change'], ['p2', 'Set a measurable target and a deadline'], ['p3', 'Predict barriers that could get in the way'], ['p4', 'Plan strategies for each barrier'], ['p5', 'Track progress, then review and adjust']],
      ans: ['p1', 'p2', 'p3', 'p4', 'p5'], hints: ['A plan starts with what you will do, ends with checking how it went, and plans for problems before they happen.'],
      explain: 'Start with one specific behavior, set a measurable target and deadline, predict barriers, plan strategies for them, and then track progress and adjust.'
    } }
  ]
};
