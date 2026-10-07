// MISSION 3: MOVEMENT LAB (Physical Activity & FITT)  -  domain "activity"  -  16 points
const FITT = [['f', 'Frequency'], ['in', 'Intensity'], ['t', 'Time'], ['ty', 'Type']];
const applyItem = (id, text, ans, why, hint) => ({ kind: 'q', block: 'm3a', q: {
  id: 'a-apply-' + id, slot: 'a-apply', domain: 'activity', concept: 'fitt-apply', skill: 'diagnose', difficulty: 2, qt: 'scenario multiple choice', lvl: 'AP', pts: 1, sec: 50,
  type: 'mc', fixedOrder: true, prompt: text, opts: FITT, ans, hints: [hint, 'Match what the routine lacks to the FITT part that describes it: how often, how hard, how long, or what kind.'], explain: why
} });

export default {
  id: 'm3', num: 3, title: 'Movement Lab', theme: 'move', est: 9, kicker: 'MISSION 3',
  blurb: 'FITT, intensity and weekly plans. Read the body\'s signals and fix a routine.',
  stages: [
    { kind: 'q', block: 'm3a', q: {
      id: 'a-fitt-id', domain: 'activity', concept: 'fitt-variables', skill: 'classify', difficulty: 1, qt: 'matching', lvl: 'K', pts: 2, sec: 60,
      type: 'match', prompt: 'Each change below adjusts one part of the FITT principle. Match each change to the FITT variable it changes.',
      items: [['i1', 'Adding 15 minutes to each walk'], ['i2', 'Switching from walking to swimming'], ['i3', 'Going from 3 days a week to 5 days a week'], ['i4', 'Jogging at a pace where only a few words fit between breaths']],
      choices: [['f', 'Frequency'], ['in', 'Intensity'], ['t', 'Time'], ['ty', 'Type']],
      ans: { i1: 't', i2: 'ty', i3: 'f', i4: 'in' },
      hints: ['FITT stands for how often, how hard, how long and what kind. Decide which question each change answers.'],
      explain: 'Adding minutes changes Time. Swimming instead of walking changes Type. More days changes Frequency. Working at a pace where talking is hard changes Intensity.'
    } },
    { kind: 'pool', id: 'a-apply-pool', groups: [{ pick: 1, items: [
      applyItem('1', 'Jordan exercises four days per week for 30 minutes but never works above light intensity. Which FITT variable would most directly need adjustment to increase the challenge of the sessions?', 'in', 'The sessions already have a good Frequency and Time; the challenge is limited by how hard Jordan works, which is Intensity.', 'Frequency and Time are already fixed in the description. What is the only part that says how hard the body works?'),
      applyItem('2', 'Priya swims hard for 45 minutes, but only once a week. She wants her activity spread across the week so she is active on most days. Which FITT variable most directly needs adjustment?', 'f', 'Priya\'s intensity, time and type are fine. Being active on more days means increasing Frequency.', 'Her effort, session length and activity are not the issue. What describes how many days per week she is active?'),
      applyItem('3', 'Devon bikes at a moderate pace five days a week, but each ride lasts only 10 minutes. Devon wants to get closer to 60 minutes of activity on those days. Which FITT variable most directly needs adjustment?', 't', 'Frequency and Intensity are already in place. The ride length is short, so Time is what needs to increase.', 'Devon already rides often and at a moderate pace. Which part describes how long each session lasts?'),
      applyItem('4', 'Amara runs 60 minutes at a steady pace five days a week and wants to also meet the guideline for muscle-strengthening activity. Which FITT variable most directly needs adjustment?', 'ty', 'Running is aerobic. Adding muscle-strengthening activity means changing the Type of activity in the week.', 'More running will not add muscle-strengthening. Which part of FITT describes what kind of activity is done?')
    ] }] },
    { kind: 'scene', scene: 'intensity', id: 'intensity', title: 'Exercise Intensity Simulator', block: 'm3b',
      lead: 'Choose different activities and watch the body respond: breathing, what you can say, and perceived effort on a 0 to 10 scale. Try at least four activities to unlock the questions.',
      qs: [
        { id: 'a-talk', domain: 'activity', concept: 'intensity-talk', skill: 'classify', difficulty: 2, qt: 'simulation: drag-and-drop sort', lvl: 'AP', pts: 2, sec: 100, major: true, after: '@sim',
          type: 'sort', prompt: 'Using the talk test, sort each observation into the intensity level it best matches.',
          bins: [['light', 'Light'], ['mod', 'Moderate'], ['vig', 'Vigorous']],
          items: [['a', 'Maya jogs and can say only a few words between breaths'], ['b', 'Leo cycles and can chat in full sentences but could not sing'], ['c', 'Ana walks her dog and hums along to her playlist'], ['d', 'Sam plays a fast basketball game and can answer only in single words'], ['e', 'Kai power-walks; talking takes some effort, but full sentences are possible'], ['f', 'Ren stretches and could easily sing a whole song']],
          ans: { a: 'vig', b: 'mod', c: 'light', d: 'vig', e: 'mod', f: 'light' },
          hints: ['Use the talk test: sing = light, talk but not sing = moderate, only a few words = vigorous.', 'Single words between breaths is a stronger signal than a few words.'],
          explain: 'Light: you can sing or hum. Moderate: you can talk in sentences but not sing. Vigorous: you can say only a few words before needing a breath.' },
        { id: 'a-conflict', domain: 'activity', concept: 'effort-scale', skill: 'evaluate', difficulty: 3, qt: 'simulation: evaluate conflicting signals', lvl: 'AN', pts: 1, sec: 70, major: true, after: '@sim',
          type: 'mc', stim: { title: 'Three observations from one workout', table: { cap: 'One student, one workout', cols: ['Signal', 'Observation'], rows: [['Breathing', 'Fast and deep; hard to catch breath'], ['Talk test', 'Could sing a whole verse easily'], ['Effort rating (0 to 10)', '7']] } },
          prompt: 'Two signals point to vigorous effort and one does not. Which observation does NOT fit with the others?',
          opts: [['a', 'Breathing'], ['b', 'Talk test'], ['c', 'Effort rating'], ['d', 'None; all three point to the same intensity']], fixedOrder: true,
          ans: 'b', hints: ['Which observation describes a light, easy level of effort even though the other two describe hard work?'],
          explain: 'Fast, deep breathing and a rating of 7 suggest vigorous effort, but being able to sing suggests light effort. The talk test does not match the other two signals, so the student should recheck how they are measuring their effort.' },
        { id: 'a-rpe', domain: 'activity', concept: 'effort-scale', skill: 'apply', difficulty: 2, qt: 'simulation: slider', lvl: 'AP', pts: 1, sec: 45, major: false, after: '@sim',
          type: 'slider', range: [0, 10, 1], unit: 'effort',
          prompt: 'Dev wants a MODERATE-intensity bike ride. On the 0 to 10 effort scale (0 = sitting, 10 = maximum effort), move the marker to a rating that fits moderate intensity.',
          ans: [5, 6], hints: ['Use the effort bands shown in the simulator: easy effort is low on the scale, hard effort is high.'],
          explain: 'On the 0 to 10 scale, moderate-intensity activity is about 5 to 6, and vigorous is about 7 to 8.' }
      ] },
    { kind: 'q', block: 'm3c', q: {
      id: 'a-rec', domain: 'activity', concept: 'activity-recs', skill: 'recall', difficulty: 2, qt: 'multi-select', lvl: 'K', pts: 2, sec: 60,
      type: 'multi', prompt: 'Select ALL statements that are part of the national physical-activity recommendations for teens (ages 6 to 17).',
      opts: [['a', 'At least 60 minutes of moderate-to-vigorous activity every day'], ['b', 'Vigorous-intensity activity on at least 3 days a week'], ['c', 'Muscle-strengthening activity on at least 3 days a week'], ['d', 'Bone-strengthening activity on at least 3 days a week'], ['e', '150 minutes of activity per week, the same target as adults'], ['f', 'All 60 minutes must be done in one continuous block'], ['g', 'Only organized sports count toward the recommendation']],
      ans: ['a', 'b', 'c', 'd'], hints: ['The teen recommendation has a daily part and three "at least 3 days a week" parts.', 'Think about which statements describe adults or add rules that are not part of the guideline.'],
      explain: 'Teens should get at least 60 minutes of moderate-to-vigorous activity daily, including vigorous, muscle-strengthening and bone-strengthening activity on at least 3 days a week. The 150-minute target is for adults. Activity can be broken up, and any activity counts, not only organized sports.'
    } },
    { kind: 'q', block: 'm3c', q: {
      id: 'a-type', domain: 'activity', concept: 'activity-types', skill: 'classify', difficulty: 2, qt: 'matching', lvl: 'K', pts: 2, sec: 80,
      type: 'match', prompt: 'Match each activity to the category that describes it best.',
      items: [['a', 'Swimming laps'], ['b', 'Push-ups'], ['c', 'Jump rope'], ['d', 'Cycling on a flat path'], ['e', 'Resistance-band rows'], ['f', 'Basketball game']],
      choices: [['aer', 'Aerobic only'], ['mus', 'Muscle-strengthening'], ['bone', 'Aerobic AND bone-strengthening (impact)']],
      ans: { a: 'aer', b: 'mus', c: 'bone', d: 'aer', e: 'mus', f: 'bone' },
      hints: ['Bone-strengthening activities create impact: jumping or running on your feet. Which activities are low impact?'],
      explain: 'Swimming and flat-path cycling raise heart rate but are low impact. Push-ups and band rows build muscle strength. Jump rope and basketball are aerobic and involve jumping and landing, which strengthens bones.'
    } },
    { kind: 'q', block: 'm3c', q: {
      id: 'a-plan', domain: 'activity', concept: 'plan-build', skill: 'design', difficulty: 3, qt: 'FITT plan builder', lvl: 'SY', pts: 3, sec: 180, major: true,
      type: 'plan', plan: { fixed: { Mon: ['soccer'], Fri: ['soccer'] }, max: 3,
        blocks: ['walk', 'stroll', 'yoga', 'bike', 'dance', 'swim', 'run', 'rope', 'hoops', 'bands', 'body', 'climb'] },
      prompt: 'Alex (age 15) has soccer practice on Monday and Friday (already in the plan). Using up to three activity blocks per day, complete the week so that Alex meets ALL of the national teen recommendations. Use "Check answer" when your plan is ready.',
      hints: ['Audit your plan against each recommendation one at a time: daily minutes, vigorous days, muscle-strengthening days and bone-strengthening days.', 'Light activities (easy strolls, gentle stretching) do not count toward the daily moderate-to-vigorous minutes.'],
      explain: 'A plan that meets the recommendations has at least 60 minutes of moderate-to-vigorous activity every day, vigorous activity on at least 3 days, muscle-strengthening on at least 3 days and bone-strengthening on at least 3 days. Light activity does not count toward the daily minutes.'
    } },
    { kind: 'q', block: 'm3c', q: {
      id: 'a-graph', domain: 'activity', concept: 'activity-data', skill: 'interpret graph', difficulty: 2, qt: 'graph interpretation', lvl: 'AP', pts: 2, sec: 90,
      type: 'multi', stim: { chart: 'activity' },
      prompt: 'Select ALL conclusions that the graph supports.',
      opts: [['a', 'In 2023, male students were nearly twice as likely as female students to meet the daily activity guideline.'], ['b', 'In 2023, about 1 in 4 high school students were active for 60 minutes every day of the week.'], ['c', 'The overall percentage of students meeting the guideline was not higher in 2023 than in 2013.'], ['d', 'Female students are active less because they enjoy exercise less.'], ['e', 'The guideline should be lowered because most students cannot meet it.'], ['f', 'Activity levels rose sharply between 2013 and 2023.']],
      ans: ['a', 'b', 'c'], hints: ['Choose only statements you can confirm with the numbers on the graph. Statements about reasons or what should change need other evidence.'],
      explain: 'The graph shows 32% of males versus 17% of females in 2023 (nearly twice), about 25% overall in 2023 (1 in 4), and 27% in 2013, so the overall percentage did not rise. The graph cannot explain why differences exist or show what the guideline should be.'
    } }
  ]
};
