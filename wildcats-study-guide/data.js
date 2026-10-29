/* Wildcats Wellness Quest study guide: all authored content.
 * Zones mirror the seven quest missions. Every person, post and number below is fictional.
 * Practice questions are NEW (not the graded quest items), so the guide teaches the ideas, not the answer key.
 * Reference ranges are the general ADULT examples the unit teaches (AHA, NIDDK, MedlinePlus, CDC). Not medical advice.
 */
(function (root) {
  'use strict';
  var G = root.GUIDE = {};

  G.DIMS = [
    { id: 'phys', name: 'Physical', color: '#d9482b', soft: '#fde8e2', what: 'Your body: sleep, food, water, movement, routine care.', ex: 'Sleeping enough, eating regular meals, walking to school.', ico: '🏃' },
    { id: 'ment', name: 'Mental', color: '#6544c2', soft: '#ece6fa', what: 'Thinking: focus, learning, managing stress, screen use, downtime.', ex: 'Starting homework with a 10-minute timer, taking a screen break.', ico: '🧠' },
    { id: 'emo', name: 'Emotional', color: '#cc2f7d', soft: '#fce6f1', what: 'Feelings: naming them, self-talk, handling setbacks, gratitude.', ex: 'Naming a feeling, bouncing back after a lost game.', ico: '💗' },
    { id: 'soc', name: 'Social', color: '#0b8585', soft: '#dff3f3', what: 'Relationships: connection, conflict, peer pressure, kindness.', ex: 'Joining a study group, resolving an argument calmly.', ico: '🤝' },
    { id: 'env', name: 'Environmental', color: '#2c8a3a', soft: '#e2f3e4', what: 'Surroundings: personal space, nature, study place, sustainable choices.', ex: 'Clearing a quiet study corner, recycling, time outdoors.', ico: '🌿' }
  ];

  /* ---------------------------------------------------------------- zones */
  G.ZONES = [
    /* ------------------------------------------------ 1 HUB */
    {
      id: 'hub', est: 2, n: 1, mission: 'Mission 1', name: 'Whole-Health Hub', sub: 'Five dimensions and ripple effects', color: '#0b8585',
      pounce: 'Wellness is active and ongoing, not just the absence of illness.',
      notes: [
        { h: 'Wellness is a process', p: 'Wellness means making choices, over and over, that move you toward a full, healthy life. It is more than “not being sick.”' },
        { h: 'Five dimensions', p: 'Physical, Mental, Emotional, Social, Environmental. Flip each card below to see what it covers.', dims: true },
        { h: 'Pick the MOST direct dimension', p: 'Many situations touch several dimensions. When you sort a situation, choose the dimension most directly involved in the action described. Use the action, not the side effects.' },
        { h: 'Dimensions overlap (ripple effects)', p: 'A change in one dimension can travel to others, one link at a time, and can help or strain. Strong answers name a different dimension and the mechanism linking them. Strength in one dimension can sit next to difficulty in another.' }
      ],
      keyTerms: [['Wellness', 'Active, ongoing choices toward overall health'], ['Dimension', 'One of five parts of wellness'], ['Ripple effect', 'A change in one dimension that spreads to others'], ['Primary dimension', 'The one most directly involved']],
      lab: { type: 'ripple' },
      quiz: [
        { q: 'Luis joins a study group to meet classmates and feel less alone at lunch. Which dimension is MOST directly involved?', o: ['Physical', 'Social', 'Environmental', 'Mental'], a: 1, why: 'Building connection with others is Social, even though it may help focus too.' },
        { q: 'Marcus skips breakfast (Physical). By third period he cannot concentrate and he snaps at a friend. What does this show?', o: ['Dimensions are separate and never affect each other', 'A ripple effect: Physical change spread to Mental and Social', 'Only Environmental choices spread', 'Marcus has a weak Emotional dimension forever'], a: 1, why: 'A change in one dimension ripples into others, one link at a time.' },
        { q: 'A student is thriving socially but has little time outdoors and a cluttered study space. Which is true?', o: ['Wellness is perfect if one dimension is high', 'Strength in one dimension can coexist with difficulty in another', 'Social strength cancels Environmental problems', 'Nothing can be improved'], a: 1, why: 'Overall wellness needs attention across dimensions; a strong one can hide a weak one.' }
      ]
    },
    /* ------------------------------------------------ 2 NUMBERS */
    {
      id: 'numbers', est: 4, n: 2, mission: 'Mission 2', name: 'Know Your Numbers', sub: 'Health metrics and reference ranges', color: '#cc4a3a',
      pounce: 'Lower is not always better. An unusual reading means follow up, not panic.',
      notes: [
        { h: 'Nine things a check-up can measure', p: 'Height, weight, temperature, pulse (resting heart rate), breathing, blood pressure, BMI, fasting blood glucose, total cholesterol. The quest focuses on the last five.' },
        { h: 'The five main metrics', table: [
          ['Blood pressure (mmHg)', 'Force of blood on artery walls: top number when the heart beats, bottom when it rests.', 'Normal: top below 120 AND bottom below 80. Elevated: 120–129 AND below 80. Stage 1 category: 130–139 OR 80–89. Stage 2 category: 140+ OR 90+.'],
          ['Resting heart rate (beats/min)', 'Heartbeats in one minute while calm and resting.', 'General adult range 60–100. Fitness, caffeine, emotions and medicines change it.'],
          ['BMI (kg/m²)', 'A number calculated from height and weight. One screening starting point, not the whole picture.', 'Adult example: 18.5–24.9. Teens use sex-specific BMI-for-age percentiles, never adult cutoffs.'],
          ['Fasting blood glucose (mg/dL)', 'Blood sugar after not eating for at least 8 hours.', 'Normal: 99 or below. Prediabetes range: 100–125. Diabetes range: 126+. Usually repeated to confirm.'],
          ['Total cholesterol (mg/dL)', 'Total blood fats linked to heart and artery health.', 'Adults 20+: below 200. Read with family history, other lipid numbers and a clinician’s advice.']
        ], head: ['Metric', 'What it measures', 'Adult reference example'] },
        { h: 'How to read a number', p: 'A single unusual reading is a reason for follow-up, not a diagnosis. Look at context (rested? fasting? medicines?), trends over time, family history, and talk to a clinician. Both BP numbers count: a bottom number of 80–89 puts a reading in the Stage 1 category even if the top is under 130. A one-sided limit does not make every low value safe, and lower is not automatically healthier.' },
        { h: 'Habits and health measures', p: 'Regular activity, balanced nutrition, enough sleep, stress management, routine care and avoiding tobacco and heavy alcohol are linked to healthier measures over time. Use hedged language: “linked to,” “can help.” Never promise exact numbers.' },
        { h: 'Safety note', p: 'These are general adult teaching examples. All people in the quest are fictional adults. Adult ranges are never applied to teens. Very high blood pressure readings (180/120 or higher) need urgent medical attention.' }
      ],
      keyTerms: [['Systolic / diastolic', 'Top / bottom blood-pressure number'], ['Fasting', 'No food for at least 8 hours before the test'], ['Screening', 'A starting point that suggests follow-up, not a diagnosis'], ['Percentile', 'How a teen’s BMI compares with others of the same age and sex']],
      lab: { type: 'dials' },
      quiz: [
        { q: 'An adult’s reading is 126/82. Which category fits?', o: ['Normal', 'Elevated', 'Stage 1 category', 'Stage 2 category'], a: 2, why: 'A bottom number of 80–89 means the Stage 1 category, even though the top is under 130. Use both numbers.' },
        { q: 'A calm, regularly active adult with no symptoms has a resting heart rate of 54. What is the best interpretation?', o: ['It is always dangerous', 'Lower is always healthier, so it is perfect', 'Context matters; fitness can lower heart rate, and any symptoms deserve follow-up', 'It cannot be measured'], a: 2, why: 'Lower is not automatically healthier or unhealthy. Consider fitness, symptoms and context.' },
        { q: 'How should a 15-year-old’s BMI be read?', o: ['With the adult 18.5–24.9 range', 'With sex-specific BMI-for-age percentiles', 'BMI cannot be used for anyone', 'With the adult cholesterol range'], a: 1, why: 'Teens use BMI-for-age percentiles. BMI is also only a limited screening tool.' },
        { q: 'A fictional adult’s fasting glucose is 112 mg/dL. Best response?', o: ['Diagnosis of diabetes', 'In the prediabetes range, so follow up and confirm with a clinician', 'Normal, nothing to do', 'Panic and change everything today'], a: 1, why: '100–125 is the prediabetes range. One reading is a reason for follow-up, not a diagnosis.' }
      ]
    },
    /* ------------------------------------------------ 3 HABITS */
    {
      id: 'habits', est: 4, n: 3, mission: 'Mission 3', name: 'Habit Workshop', sub: 'Habit loops, strategies and SMART goals', color: '#c98a0a',
      pounce: 'A missed day does not erase progress. Habit timing varies by person.',
      notes: [
        { h: 'Ratings are information', p: 'In a self-assessment (1 = needs attention, 5 = thriving) a high rating is a strength and a low rating is a growth area. A good next step uses the rating AND the notes, and is realistic. Ratings are never a judgment of the person.' },
        { h: 'The habit loop (classroom model)', loop: true, p: 'Cue → Routine → Reward. A clear cue starts a small routine, and a quick, connected reward makes repeating it easier. This is a teaching model, not a claim that every behavior works identically.' },
        { h: 'Strategies that help', list: ['Start small: a version so easy you can do it on a bad day.', 'Habit stacking: “After I [existing routine], I will [new tiny action].”', 'Environment design: make the good choice easier and the unwanted one harder.', 'Tracking: a calendar, checklist or app that matches the goal.'] },
        { h: 'Roadblocks', list: ['All-or-nothing thinking: one missed day is not total failure. Return at the next cue.', 'Motivation dips are normal: lean on cues and small routines.', 'Unclear cues: pick a specific time or trigger.', 'Oversized goals: shrink them to something feasible.'] },
        { h: 'The “21 days” claim', p: 'Research shows wide variation in how long habits take (for example Lally et al. 2009/2010; Singh et al. 2024). A study average is not a deadline for everyone. Consistency matters more than a fixed number of days.' },
        { h: 'SMART goals', smart: true, p: 'Specific, Measurable, Achievable, Relevant, Time-bound. Check each criterion separately: a goal can be specific without being fully SMART. SMART is a planning framework, not a guarantee. When repairing a goal, fix what is missing and keep what already works.' }
      ],
      keyTerms: [['Cue', 'The trigger that starts a habit'], ['Habit stacking', 'Attaching a new action to an existing routine'], ['Environment design', 'Changing surroundings to make the choice easier'], ['SMART', 'Specific, Measurable, Achievable, Relevant, Time-bound']],
      lab: { type: 'habitlab' },
      quiz: [
        { q: 'Every time the phone buzzes, Dani opens an app and gets a quick burst of fun. In the habit loop, the buzz is the…', o: ['Routine', 'Reward', 'Cue', 'Goal'], a: 2, why: 'The cue is the trigger that starts the routine.' },
        { q: 'Sam misses two days of a new routine and thinks, “I ruined it.” This is…', o: ['Environment design', 'All-or-nothing thinking', 'A SMART goal', 'A strong cue'], a: 1, why: 'A missed day does not erase progress. Return at the next cue.' },
        { q: 'A post says “habits take exactly 21 days.” The best response is…', o: ['It is proven for everyone', 'Research shows wide variation; an average is not a deadline', 'Habits can never form', 'Skip tracking'], a: 1, why: 'Habit timing varies by person and by behavior.' },
        { q: '“I will drink more water” is missing which SMART parts?', o: ['Nothing, it is fully SMART', 'Measurable and Time-bound (and probably more specific)', 'Only Relevant', 'It is already measurable'], a: 1, why: 'It does not say how much, how it will be tracked, or for how long.' }
      ]
    },
    /* ------------------------------------------------ 4 MEDIA LAB */
    {
      id: 'media', est: 3, n: 4, mission: 'Mission 4', name: 'Fact or Fiction Media Lab', sub: 'Evaluating health claims', color: '#6a3fc0',
      pounce: 'A sales motive deserves scrutiny but does not prove a claim false.',
      notes: [
        { h: 'Four questions for every claim', fourtabs: true, p: 'Open every tab before you rate a post.' },
        { h: 'Five post types in the lab', list: ['Fad diet', 'Supplement ad', 'Influencer claim', 'Before/after photo (can be manipulated)', 'AI-generated or deepfake advice'] },
        { h: 'Red flags', list: ['Miracle, instant or guaranteed wording', 'Testimonials instead of research', 'Product or affiliate incentives', 'Fear or urgency (“today only!”)', 'Sources you cannot verify', 'Polish that looks professional but adds no evidence'] },
        { h: 'Rating scale', p: 'Credible, Questionable, or Not Credible. Every post type has a credible version, a questionable one and a not-credible one, so do not assume. Adjacent ratings (Questionable vs Not Credible) are close calls; weigh all four tabs.' },
        { h: 'Things that do NOT decide credibility alone', list: ['A sales motive (it warrants scrutiny, not automatic rejection).', 'AI generation or a polished look.', 'A credential with no evidence behind the claim.', 'Popularity or many reposts. Copies of one post are not independent verification.'] }
      ],
      keyTerms: [['Independent verification', 'Separate sources that confirm a claim, not copies of it'], ['Affiliate incentive', 'A seller pays the poster for sales'], ['Testimonial', 'A personal story, not research'], ['Deepfake', 'AI-made media that imitates a real person']],
      lab: { type: 'inspector' },
      quiz: [
        { q: 'A post sells a product and says its claim is backed by a published trial of 120 people with limits explained. What is the best conclusion?', o: ['False, because it sells something', 'The sales motive deserves scrutiny, but checkable evidence can still make it credible', 'True, because it is polished', 'Ignore evidence'], a: 1, why: 'A sales motive alone does not decide credibility. Check the evidence.' },
        { q: 'Ten accounts repost the same miracle-cure ad word for word. Is that independent verification?', o: ['Yes, popularity proves it', 'No, copies of one post are not independent sources', 'Yes, if they are verified accounts', 'Only if it has photos'], a: 1, why: 'Independent means separate sources that can confirm the claim.' },
        { q: 'Which wording is the biggest red flag?', o: ['“A trial found small improvements in sleep.”', '“Guaranteed to melt fat in 3 days. Today only!”', '“Talk with your clinician about your options.”', '“Results vary.”'], a: 1, why: 'Miracle, instant and guaranteed wording plus urgency are classic red flags.' }
      ]
    },
    /* ------------------------------------------------ 5 STOP */
    {
      id: 'stop', est: 3, n: 5, mission: 'Mission 5', name: 'STOP Crossroads', sub: 'Personal responsibility and decision-making', color: '#2a8a4a',
      pounce: 'Responsibility is not perfection. Asking for support is a responsible choice.',
      notes: [
        { h: 'The STOP model', stop: true },
        { h: 'Key ideas', list: ['More than one choice can be responsible when it is safe, honest and feasible.', 'Personal responsibility does not mean perfect decisions or total control over every resource.', 'Setting a limit or speaking up about a warning sign is part of responsibility, not a failure of it.', 'Asking a trusted adult for support is part of a responsible choice.', 'Observe consequences right away AND repeated over time.'] },
        { h: 'Scenarios you practiced', p: 'Late-night gaming before a test, skipping meals, school stress, endless scrolling, an energy drink or water, responding after an argument, peer pressure to vape or use drugs, and a ride from someone who has been drinking (find a safe alternative ride and get support).' },
        { h: 'Defending a choice', p: 'A defensible choice uses relevant evidence from the case and an explanation that links it to health, safety or feasibility. A correct choice with a mismatched fact or reason does not earn full credit.' }
      ],
      keyTerms: [['STOP', 'State, Think, Observe, Pick'], ['Consequence', 'What follows a choice, right away or later'], ['Responsible choice', 'Safe, honest, feasible and health-enhancing'], ['Support', 'A trusted adult or resource you can ask for help']],
      lab: { type: 'stoplab' },
      quiz: [
        { q: 'What does the “O” in STOP stand for?', o: ['Organize', 'Observe possible consequences', 'Object', 'Obey'], a: 1, why: 'State the problem, Think of options, Observe consequences, Pick a responsible choice.' },
        { q: 'A friend who has been drinking offers you a ride. Which pick is most responsible?', o: ['Accept to avoid awkwardness', 'Decline and arrange a safe ride, such as calling a parent or guardian', 'Drive yourself without a license', 'Say nothing'], a: 1, why: 'Riding with a driver who has been drinking has immediate serious risks. Choose a safe alternative and seek support.' },
        { q: 'Is more than one choice ever “responsible”?', o: ['No, only one right answer exists', 'Yes, when each is safe, honest and feasible', 'Only if it is the easiest', 'Only if an adult chooses'], a: 1, why: 'Several choices can be responsible. The reasons must match the facts.' }
      ]
    },
    /* ------------------------------------------------ 6 SIMULATOR */
    {
      id: 'sim', est: 4, n: 6, mission: 'Mission 6', name: 'Thousand Choices Simulator', sub: 'Small choices, big sums', color: '#3f4ec0',
      pounce: 'These points are fictional teaching weights, not a health score.',
      notes: [
        { h: 'Twenty categories in five domains', cats: true },
        { h: 'How scoring works', list: ['Each daily choice is graded A, B or C: A = +weight, B = 0, C = −weight.', 'Domain subtotal = add that domain’s categories for the day.', 'Daily total = add the five domain subtotals. The daily range is −35 to +35.', 'Running total = add the daily totals. The week range is −245 to +245.', 'Weekly domain limits: Physical ±56, Mental ±49, Emotional ±49, Social ±56, Environmental ±35.'] },
        { h: 'Reading a week', list: ['The running total shows accumulation, but not which domains are weak.', 'The greatest daily effect is the day with the largest daily total in size (up or down).', 'Domains have different maximums, so compare each domain against ITS OWN maximum (percent of maximum) before calling one “overlooked.”', 'A positive overall total can hide a weak domain; a low total can reflect real limits like time and money.'] },
        { h: 'Small choices accumulate', p: 'A ±1 choice repeated on several days changes the weekly total by several points. The lesson is accumulation, not predicting real health. Points never convert into assessment points.' },
        { h: 'STOP revision', p: 'A strong revision fits the person’s constraints (money, time, space), targets the part of the week that most needs it, and has a predicted effect you compute using the category weight.' },
        { h: 'Worksheet vs. guidance', p: 'The worksheet’s sleep (7–9 h) and movement (30 min) examples are scoring rules. CDC guidance lists 8–10 hours of sleep for ages 13–17 and 60+ minutes of daily activity for ages 6–17.' }
      ],
      keyTerms: [['Weight', 'How many points a category is worth (1–3)'], ['Domain subtotal', 'Sum of a domain’s categories for a day'], ['Running total', 'Daily totals added up through the week'], ['Normalize', 'Compare a score with its own maximum']],
      lab: { type: 'calc' },
      quiz: [
        { q: 'Sleep has weight 3. A student earns a C. How many points?', o: ['+3', '0', '−3', '−1'], a: 2, why: 'C = −weight, so −3.' },
        { q: 'One day: Sleep A, Nutrition B, Hydration C, Movement A. (Weights 3, 2, 1, 2.) What is the Physical subtotal?', o: ['+4', '+5', '+8', '+2'], a: 0, why: '+3 + 0 − 1 + 2 = +4.' },
        { q: 'A student repeats a +1 choice on 5 days. What happens to the weekly total?', o: ['No change', '+5', '+1', '+35'], a: 1, why: 'Small repeated choices accumulate.' },
        { q: 'Soc is −21 of a possible 56 for the week. Env is −14 of a possible 35. Which domain is weakest relative to its own maximum?', o: ['Social (−37.5%)', 'Environmental (−40%)', 'They are equal', 'Cannot compare'], a: 1, why: 'Normalize: −21/56 = −37.5%; −14/35 = −40%. The raw lowest (Social) is not the weakest relative to its maximum.' }
      ]
    },
    /* ------------------------------------------------ 7 FINAL */
    {
      id: 'final', est: 3, n: 7, mission: 'Mission 7', name: 'Final Transfer Challenge', sub: 'Put it all together', color: '#1f2b6b',
      pounce: 'Use facts from the case. Your evidence and reasoning must match your claim.',
      notes: [
        { h: 'A new, integrated case', p: 'Expect a misleading post, conflicting responsibilities, a wellness pattern and a goal. Use what you know from all six earlier zones.' },
        { h: 'Claim – Evidence – Reasoning', cer: true },
        { h: 'A strong answer', list: ['Connects at least TWO wellness dimensions (a ripple).', 'Uses a fact that is actually in the case, not an invented one.', 'Justifies a feasible action with STOP and states a SMART goal.', 'Several claims are defensible, but the evidence and reasoning must match the claim you made.'] },
        { h: 'Your 7-day plan', p: 'In the last stage you build a plan and a guided self-check. There are no right answers, only a plan that is specific, measurable, achievable, relevant and time-bound for you.' },
        { h: 'Tools to bring with you', list: ['Dimensions and ripple effects (Zone 1)', 'Reading numbers with context (Zone 2)', 'Habit loop, strategies, SMART (Zone 3)', 'Author, Evidence, Purpose, Independent (Zone 4)', 'STOP (Zone 5)', 'Accumulation and normalizing (Zone 6)'] }
      ],
      keyTerms: [['Claim', 'Your answer or position'], ['Evidence', 'A fact from the case that supports it'], ['Reasoning', 'The “because” that connects evidence to claim'], ['Transfer', 'Using a skill in a new situation']],
      lab: { type: 'cer' },
      quiz: [
        { q: 'In claim-evidence-reasoning, what is the “reasoning”?', o: ['A random fact', 'The explanation of why the evidence supports the claim', 'The final grade', 'A hashtag'], a: 1, why: 'Reasoning links the evidence to the claim.' },
        { q: 'Which is the best evidence for “skipping lunch is affecting Maya’s mood and focus” when the case says she had a headache and snapped at a friend?', o: ['“Everyone knows lunch matters.”', '“She had a headache and snapped at a friend after skipping lunch.”', '“She is probably failing math.”', '“Her phone is old.”'], a: 1, why: 'Evidence must be a fact actually in the case.' },
        { q: 'Which makes a plan more than a wish?', o: ['“I will be healthier.”', '“I will walk 15 minutes after lunch on school days for 3 weeks and mark a calendar.”', '“I will try.”', '“Someday.”'], a: 1, why: 'Specific, measurable, achievable, relevant, time-bound.' }
      ]
    }
  ];

  /* ---------------------------------------------------------------- lab data */
  G.RIPPLES = [
    { id: 'sleep', start: 'Jordan games until 2 a.m. and sleeps a few hours before a test.', main: 'phys',
      chain: [['ment', 'Focus and memory get harder, so studying is less effective.'], ['emo', 'Mood is harder to manage and stress feels bigger.'], ['soc', 'Patience with friends drops and conflict is more likely.']],
      fix: 'A small, feasible fix: set a lights-out time on school nights. The ripple can run the other way too.' },
    { id: 'walk', start: 'Marcus walks 15 minutes to school with a neighbor each morning.', main: 'phys',
      chain: [['ment', 'Morning movement helps him feel alert and ready to focus.'], ['emo', 'Fresh air and a steady routine lift his mood.'], ['soc', 'The daily conversation builds a friendship.']],
      fix: 'Ripples can help: one habit can support several dimensions.' },
    { id: 'argument', start: 'Rin has a big argument with a friend at lunch.', main: 'soc',
      chain: [['emo', 'Anger or worry builds and lingers.'], ['ment', 'Concentration drops in afternoon classes.'], ['phys', 'Sleep or appetite can slip that night.']],
      fix: 'Using STOP and talking with a trusted person can interrupt the chain.' },
    { id: 'band', start: 'Maya joins band and rehearses after school.', main: 'emo',
      chain: [['ment', 'Learning new music builds focus and memory.'], ['soc', 'She belongs to a group of friends.'], ['phys', 'Late rehearsals push dinner and homework later, so sleep can shrink.']],
      fix: 'A good choice can still strain another dimension, so plan for it (for example, prep dinner earlier).' }
  ];

  G.POSTS = [
    { id: 'p1', handle: '@NightTeaNation', platform: 'FictionGram', text: '“This tea fixes sleep forever. Doctors are shocked. Order at the link in my bio. Today only!”',
      tabs: { author: 'No name, no credentials listed. Bio says “wellness lover.”', evidence: 'No studies cited. Only “doctors are shocked” with no names.', purpose: 'Paid link in bio: sells the tea. Urgent deadline.', indep: 'No independent source found. Official sleep guidance does not mention it.' },
      answer: 'not', why: 'Miracle wording, no checkable author, no evidence, urgent sales pressure and nothing independent to confirm it.' },
    { id: 'p2', handle: '@OfficeWell', platform: 'FictionBlog', text: '“Stretch breaks help desk workers move more. Our trial of 120 employees is linked to more movement, with limits explained.”',
      tabs: { author: 'Named workplace-health researcher at a university; credentials are checkable.', evidence: 'Cites a 120-person trial with methods, limits and a link to the paper.', purpose: 'Share findings. No product is sold.', indep: 'A second, separate team reported similar results.' },
      answer: 'cred', why: 'Checkable author, real evidence with limits, no sales motive, independently confirmed.' },
    { id: 'p3', handle: '@FitFuel', platform: 'FictionTube', text: '“I drink this powder every day and feel amazing. 4 weeks, new body! Use my code for 20% off.”',
      tabs: { author: 'A popular fitness influencer. No health training listed.', evidence: 'Personal story and before/after photos. No research.', purpose: 'Affiliate code: earns money from each sale.', indep: 'Other influencers post similar lines, but none cite studies.' },
      answer: 'quest', why: 'A real person with a real story, but only testimonials, an affiliate incentive and no independent evidence. Questionable: not proven false, not credible either.' }
  ];

  G.CATS = [
    { id: 'sleep', n: 'Sleep', dom: 'phys', w: 3 }, { id: 'nutrition', n: 'Nutrition', dom: 'phys', w: 2 }, { id: 'hydration', n: 'Hydration', dom: 'phys', w: 1 }, { id: 'movement', n: 'Movement', dom: 'phys', w: 2 },
    { id: 'screens', n: 'Screens/Media Use', dom: 'ment', w: 2 }, { id: 'stress', n: 'Stress Management', dom: 'ment', w: 2 }, { id: 'focus', n: 'Focus & Follow-Through', dom: 'ment', w: 2 }, { id: 'rest', n: 'Mental Rest/Downtime', dom: 'ment', w: 1 },
    { id: 'selftalk', n: 'Self-Talk', dom: 'emo', w: 2 }, { id: 'express', n: 'Emotional Expression', dom: 'emo', w: 2 }, { id: 'setbacks', n: 'Handling Setbacks', dom: 'emo', w: 2 }, { id: 'gratitude', n: 'Gratitude/Perspective', dom: 'emo', w: 1 },
    { id: 'peer', n: 'Peer Pressure/Social Choices', dom: 'soc', w: 3 }, { id: 'connect', n: 'Quality Connection Time', dom: 'soc', w: 2 }, { id: 'conflict', n: 'Conflict Resolution', dom: 'soc', w: 2 }, { id: 'kindness', n: 'Kindness/Helping Others', dom: 'soc', w: 1 },
    { id: 'space', n: 'Personal Space', dom: 'env', w: 1 }, { id: 'outdoors', n: 'Time Outdoors/Nature', dom: 'env', w: 1 }, { id: 'studyenv', n: 'Study/Work Environment', dom: 'env', w: 2 }, { id: 'sustain', n: 'Sustainable Choices', dom: 'env', w: 1 }
  ];

  /* Example week for the "maxima trap" demo: raw lowest (Social) is not the weakest relative to its own maximum (Environmental). */
  G.TRAP = [
    { dom: 'phys', val: 10, max: 56 }, { dom: 'ment', val: 5, max: 49 }, { dom: 'emo', val: 8, max: 49 }, { dom: 'soc', val: -21, max: 56 }, { dom: 'env', val: -14, max: 35 }
  ];

  G.SMART_GOALS = [
    { text: 'Be healthier.', has: { S: 0, M: 0, A: 0, R: 0, T: 0 }, why: 'Nothing here says what, how much, how it will be tracked, or when.' },
    { text: 'I will go to bed by 10:30 p.m. on school nights and mark each night on a calendar.', has: { S: 1, M: 1, A: 1, R: 0, T: 0 }, why: 'Specific, measurable and achievable. Missing why it matters to you (Relevant) and how long (Time-bound). Repair: add “so I have energy for morning practice, for the next 3 weeks.”' },
    { text: 'For the next 3 weeks, I will walk 15 minutes after lunch on school days so I have more energy in afternoon classes, and mark a calendar.', has: { S: 1, M: 1, A: 1, R: 1, T: 1 }, why: 'All five: specific action, tracked on a calendar, a feasible amount, a relevant purpose and a time frame.' }
  ];

  G.HABIT_STACK = {
    anchors: ['brush my teeth', 'put my phone on the charger', 'sit down at my desk', 'finish dinner'],
    actions: ['stretch for 2 minutes', 'drink a glass of water', 'write one thing I am grateful for', 'open my planner'],
    rewards: ['check a box on my calendar', 'play one favorite song', 'tell a friend I did it', 'take 3 slow breaths']
  };

  G.STOP_CASE = {
    title: 'Late-night gaming before a test',
    story: 'Riley (fictional) has a big test tomorrow. It is 10:45 p.m. and friends invite Riley to one more game round.',
    steps: [
      { k: 'S', t: 'State', q: 'Which best states the decision?', o: ['“My friends are annoying.”', '“I need to decide whether to keep playing or stop and sleep before my test.”', '“I will pass no matter what.”'], a: 1, why: 'State the decision or problem clearly, with no blame.' },
      { k: 'T', t: 'Think', q: 'Which set lists real options?', o: ['Play one more round, stop now and tell friends why, play 20 minutes with a hard stop alarm', 'Pass, fail, quit school', 'Whatever'], a: 0, why: 'Think of at least two real, feasible options.' },
      { k: 'O', t: 'Observe', q: 'Which observes consequences right away AND later?', o: ['“It will be fun.”', '“Playing late is fun now, but short sleep can hurt focus on the test and mood tomorrow, and repeat late nights add up.”', '“Nothing happens.”'], a: 1, why: 'Observe immediate and long-term consequences.' },
      { k: 'P', t: 'Pick', q: 'Which pick is responsible and well explained?', o: ['“Stop now and tell friends I will play after the test, because sleep protects my focus and I still keep the friendship.”', '“Play until 2 a.m.”', '“Ignore the test.”'], a: 0, why: 'A responsible pick is safe, feasible, health-enhancing and explained. (Other choices could also be responsible.)' }
    ]
  };

  G.CER_CASE = {
    story: 'Maya (fictional) skips lunch every day to finish a project in the library. By afternoon she has a headache, finds it hard to focus, and snapped at a friend yesterday.',
    claim: [['a', 'Skipping lunch (Physical) is rippling into Mental and Social wellness.', 1], ['b', 'Maya just needs a new phone.', 0], ['c', 'Only the library (Environmental) is the problem, so food is not involved.', 0]],
    evidence: [['a', 'She has a headache and trouble focusing by afternoon, and snapped at a friend.', 1], ['b', 'Everyone her age skips meals.', 0], ['c', 'She likes the library.', 0]],
    reasoning: [['a', 'Not eating affects energy and concentration (Physical → Mental) and can shorten patience (Social), so the choice has effects beyond the body.', 1], ['b', 'Headaches always mean she is sick.', 0], ['c', 'Friends should never be snapped at.', 0]],
    plan: 'Next step: use STOP, then a SMART goal such as “Eat lunch in the cafeteria on school days for the next 2 weeks and bring a snack for study sessions, tracking it in my planner.”'
  };

  G.METRIC_NOTES = {
    bp: function (s, d) {
      var cat, tone = 'ok', msg;
      if (s >= 180 || d >= 120) { cat = 'Very high'; tone = 'bad'; msg = 'Readings this high need urgent medical attention.'; }
      else if (s >= 140 || d >= 90) { cat = 'Stage 2 category'; tone = 'bad'; msg = 'Follow up with a clinician. One reading is a category, not a confirmed diagnosis.'; }
      else if (s >= 130 || d >= 80) { cat = 'Stage 1 category'; tone = 'warn'; msg = 'Follow up and repeat the measurement. One reading is not a diagnosis.'; }
      else if (s >= 120) { cat = 'Elevated'; tone = 'warn'; msg = 'Healthy habits and re-checking matter. Top 120–129 AND bottom below 80.'; }
      else { cat = 'Normal'; msg = 'Top below 120 AND bottom below 80.'; }
      return { cat: cat, tone: tone, msg: msg };
    },
    hr: function (v) {
      if (v < 60) return { cat: 'Below the general range', tone: 'warn', msg: 'Lower is not automatically unhealthy: fitness lowers heart rate. Symptoms (dizziness, fainting) deserve follow-up.' };
      if (v <= 100) return { cat: 'Within the general adult range (60–100)', tone: 'ok', msg: 'Activity, caffeine, emotions and medicines change it.' };
      return { cat: 'Above the general range', tone: 'warn', msg: 'Was the person calm and rested? Caffeine, stress and activity raise it. Repeated high readings deserve follow-up.' };
    },
    glu: function (v) {
      if (v >= 126) return { cat: 'Diabetes range', tone: 'bad', msg: 'Usually confirmed with repeat testing. One reading is not a diagnosis; follow up with a clinician.' };
      if (v >= 100) return { cat: 'Prediabetes range', tone: 'warn', msg: 'Follow up and confirm. Habits matter. One reading is not a diagnosis.' };
      return { cat: 'Normal (99 or below)', tone: 'ok', msg: 'A one-sided limit does not make every low value safe; very low values can need care too.' };
    }
  };
})(window);
