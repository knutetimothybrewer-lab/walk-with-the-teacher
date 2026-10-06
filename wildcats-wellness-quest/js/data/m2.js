/* Mission 2 — Know Your Numbers (16 points)
 *  5 metric-meaning items (1 pt each, short)          = 5
 *  3 reading/follow-up judgments (2 pts, complex)     = 6   (reading category + follow-up)
 *  3 lifestyle connections (1 pt each, short)         = 3
 *  2 intake/follow-up selections (1 pt each, short)   = 2
 * All cases are fictional ADULTS (age 20+). Adult reference values are never applied to teens.
 * Reference values: see W.REFERENCE (AHA / NIDDK / MedlinePlus / CDC; retrieval notes in docs/SOURCE_REGISTER.md).
 * Text is deliberately concise: the whole mission is budgeted for about 5 minutes (see tools/pacing.js).
 */
(function (root) {
  'use strict';
  var W = root.WWQ, P = W.P, V = W.V;

  W.REFERENCE = {
    note: 'General ADULT (age 20+) reference examples. Screening information, never a diagnosis.',
    rows: [
      { id: 'bp', name: 'Blood pressure', unit: 'mmHg', what: 'Force of blood on artery walls (top: heart beating; bottom: heart resting).',
        ranges: ['Normal: top below 120 AND bottom below 80', 'Elevated: top 120–129 AND bottom below 80', 'Stage 1 category: top 130–139 OR bottom 80–89', 'Stage 2 category: top 140+ OR bottom 90+'],
        cond: 'Seated, rested ~5 minutes. One reading is a category, not a confirmed diagnosis.', src: 'American Heart Association' },
      { id: 'hr', name: 'Resting heart rate', unit: 'beats per minute', what: 'Heartbeats in one minute while calm and resting.',
        ranges: ['General adult range: 60–100 when calm and resting'],
        cond: 'Activity, emotions, caffeine, medicines and fitness change it. Lower is not automatically healthier.', src: 'American Heart Association' },
      { id: 'bmi', name: 'BMI', unit: 'kg/m²', what: 'A number calculated from height and weight; one screening starting point.',
        ranges: ['Adult reference example: 18.5–24.9'],
        cond: 'Not a complete picture of health. Teens (ages 2–19) use sex-specific BMI-for-age percentiles, never adult cutoffs.', src: 'CDC; slide deck example' },
      { id: 'glu', name: 'Fasting blood glucose', unit: 'mg/dL', what: 'Blood sugar after not eating for at least 8 hours.',
        ranges: ['Normal: 99 or below', 'Prediabetes range: 100–125', 'Diabetes range: 126+'],
        cond: 'Lab test, usually repeated to confirm. A one-sided limit does not make every low value safe.', src: 'NIDDK' },
      { id: 'chol', name: 'Total cholesterol', unit: 'mg/dL', what: 'Total blood fats related to heart and artery health.',
        ranges: ['Adults 20+: below 200', '(Age 19 and under use a different reference; not used here)'],
        cond: 'Read with family history, other lipid numbers and a clinician’s advice.', src: 'MedlinePlus' }
    ],
    measurements: ['Height', 'Weight', 'Temperature', 'Pulse / resting heart rate', 'Breathing', 'Blood pressure', 'BMI', 'Fasting blood glucose', 'Total cholesterol']
  };

  /* ---------- 2.1 Metric meaning ---------- */
  var METRICS = [['bp', 'Blood pressure'], ['hr', 'Resting heart rate'], ['bmi', 'BMI'], ['glu', 'Fasting blood glucose'], ['chol', 'Total cholesterol'], ['temp', 'Body temperature']];
  function mOpts(key) { return METRICS.map(function (m) { return [m[0], m[1], m[0] === key ? 1 : 0]; }); }
  function mv(id, text, key, hint) { return V(id, text, [P('metric', 'Which measurement is this?', 'radio', mOpts(key), { fixed: true, hint: hint })], { key: key }); }
  var MM = [
    ['m2.match.bp', 'bp', 'A nurse puts a cuff on Mr. Okafor’s arm to check how hard blood pushes on artery walls. Two numbers, in mmHg.',
      'Dr. Chen wants the force in the arteries while the heart beats and rests, such as 118 over 76.', 'Two numbers in mmHg is a clue.'],
    ['m2.match.hr', 'hr', 'Jamal sits calmly for five minutes while a nurse counts the beats at his wrist for one minute.',
      'Elena lies quietly, counts her pulse for 30 seconds, then doubles it.', 'It is counted per minute while resting.'],
    ['m2.match.bmi', 'bmi', 'A clinic enters Mr. Lopez’s height and weight to get one screening number, only one piece of the picture.',
      'Software divides weight by height squared to give one number, read differently for teens than adults.', 'It is calculated from two other measurements.'],
    ['m2.match.glu', 'glu', 'A lab draws Rosa’s blood after 10 hours without food and reports sugar in mg/dL.',
      'An overnight-fast blood test reports sugar in the blood in mg/dL.', 'Fasting and blood sugar are the clues.'],
    ['m2.match.chol', 'chol', 'Hal’s blood report shows the total of fats linked to heart and artery health, in mg/dL.',
      'A lab lists total blood fats in mg/dL as one factor for heart health.', 'Blood fats related to the heart and arteries.']
  ];
  MM.forEach(function (r) {
    W.defItem({ id: r[0], m: 2, st: '2.1', pts: 1, cls: 'short', d: 'F', topic: 'What the five main metrics measure', src: 'Wildcats_Health_Metrics deck + curriculum spec (Health metrics and intake)', kind: 'metric', hint: r[4],
      why: 'Blood pressure = force on artery walls; resting heart rate = beats per minute at rest; BMI = calculated from height and weight; fasting glucose = blood sugar after fasting; total cholesterol = blood fats.',
      variants: [mv(r[0] + '.a', r[2], r[1], r[4]), mv(r[0] + '.b', r[3], r[1], r[4])] });
  });

  /* ---------- 2.2 Reading and follow-up judgments ---------- */
  function z(from, to, label, tone) { return { from: from, to: to, label: label, tone: tone }; }
  function gaugeBP(sys, dia) {
    return [
      { label: 'Top number (systolic)', value: sys, unit: 'mmHg', min: 90, max: 170, zones: [z(90, 120, 'Normal', 'ok'), z(120, 130, 'Elevated', 'warn'), z(130, 140, 'Stage 1 category', 'high'), z(140, 170, 'Stage 2 category', 'high2')] },
      { label: 'Bottom number (diastolic)', value: dia, unit: 'mmHg', min: 50, max: 110, zones: [z(50, 80, 'Normal', 'ok'), z(80, 90, 'Stage 1 category', 'high'), z(90, 110, 'Stage 2 category', 'high2')] }
    ];
  }
  function gaugeHR(v) { return [{ label: 'Resting heart rate', value: v, unit: 'beats/min', min: 40, max: 130, zones: [z(40, 60, 'Below general range', 'low'), z(60, 100, 'General adult range', 'ok'), z(100, 130, 'Above general range', 'high')] }]; }
  function gaugeGlu(v) { return [{ label: 'Fasting blood glucose', value: v, unit: 'mg/dL', min: 70, max: 140, zones: [z(70, 100, 'Normal (99 or below)', 'ok'), z(100, 126, 'Prediabetes range', 'warn'), z(126, 140, 'Diabetes range', 'high')] }]; }
  function gaugeChol(v) { return [{ label: 'Total cholesterol', value: v, unit: 'mg/dL', min: 120, max: 260, zones: [z(120, 200, 'Below 200 (adult reference)', 'ok'), z(200, 260, '200 or above', 'warn')] }]; }
  function gaugeBMI(v) { return [{ label: 'BMI (adult)', value: v, unit: 'kg/m²', min: 15, max: 35, zones: [z(15, 18.5, 'Below example range', 'low'), z(18.5, 25, 'Example range 18.5–24.9', 'ok'), z(25, 35, 'Above example range', 'high')] }]; }

  function rv(id, who, ctxText, gauges, p1, p2) {
    return V(id, ctxText, [
      P('cat', 'What does the reading show?', 'radio', p1, { hint: 'Compare the number to the reference ranges and read the conditions first.' }),
      P('next', 'Best next step?', 'radio', p2, { hint: 'An unusual reading calls for follow-up, not an automatic diagnosis. Context and a clinician matter.' })
    ], { vis: { type: 'reading', who: who, gauges: gauges } });
  }
  var J = function (id, topic, variants) {
    W.defItem({ id: id, m: 2, st: '2.2', pts: 2, cls: 'complex', d: 'A', topic: topic, src: 'Wildcats_Health_Metrics deck + AHA / NIDDK / MedlinePlus / CDC (docs/SOURCE_REGISTER.md)', kind: 'form', hint: 'Read the reading, units and conditions. Use the reference panel for the category, then think about what a clinician would want next.',
      why: 'Readings are interpreted against a reference AND in context (conditions, trends, family history, a clinician’s interpretation). An unusual reading prompts follow-up; it does not diagnose. Lower is not always better.', variants: variants });
  };

  J('m2.read.1', 'Blood pressure categories and follow-up', [
    rv('m2.read.1.a', 'Marcus, 34 (fictional adult)', 'Marcus, 34, rested 5 minutes, arm supported. Blood pressure: **128/76 mmHg**. He feels well.', gaugeBP(128, 76),
      [['n', 'Normal', 0], ['e', 'Elevated', 1], ['s1', 'Stage 1 category', 0], ['s2', 'Stage 2 category', 0]],
      [['a', 'Recheck at later visits and discuss habits with a clinician.', 1], ['b', 'Cut all salt tonight and skip the clinician.', 0.5], ['c', 'He has hypertension and needs medicine now.', 0], ['d', 'Ignore it; only 130+ ever matters.', 0]]),
    rv('m2.read.1.b', 'Priya, 41 (fictional adult)', 'Priya, 41, seated and rested 5 minutes. Blood pressure: **118/84 mmHg**. No symptoms.', gaugeBP(118, 84),
      [['n', 'Normal', 0], ['e', 'Elevated', 0], ['s1', 'Stage 1 category', 1], ['s2', 'Stage 2 category', 0]],
      [['a', 'Recheck on other days; review habits and history with a clinician.', 1], ['b', 'Skip follow-up: the top number is below 120.', 0], ['c', 'She definitely has a disease; medicine today.', 0], ['d', 'Overhaul her routine without telling anyone.', 0.5]]),
    rv('m2.read.1.c', 'Samuel, 52 (fictional adult)', 'Samuel, 52, seated and rested 5 minutes. First clinic reading: **142/88 mmHg**.', gaugeBP(142, 88),
      [['n', 'Normal', 0], ['e', 'Elevated', 0], ['s1', 'Stage 1 category', 0], ['s2', 'Stage 2 category', 1]],
      [['a', 'A clinician confirms with repeated readings and plans next steps.', 1], ['b', 'Wait a year and see if he feels anything.', 0], ['c', 'Treat this one reading as a final diagnosis.', 0], ['d', 'Borrow a friend’s blood pressure medicine.', 0]])
  ]);

  J('m2.read.2', 'Resting heart rate in context', [
    rv('m2.read.2.a', 'Elena, 29 (fictional adult)', 'Elena, 29, a distance runner. Calm and seated: **54 beats/min**. No dizziness or fainting.', gaugeHR(54),
      [['in', 'Within 60–100', 0], ['lowfit', 'Below range; can be normal for a very fit person with no symptoms', 1], ['hi', 'Above range', 0], ['em', 'A medical emergency', 0]],
      [['a', 'Mention it at a routine check-up; seek care if dizzy or faint.', 1], ['b', 'Perfect: lower is always healthier.', 0], ['c', 'Stop exercising until it is above 60.', 0], ['d', 'Never tell anyone.', 0]]),
    rv('m2.read.2.b', 'Tom, 45 (fictional adult)', 'Tom, 45, drank two large coffees and rushed in. Sitting nervously: **104 beats/min**.', gaugeHR(104),
      [['in', 'Within 60–100', 0], ['lo', 'Below range', 0], ['hi', 'Above range, but caffeine and nerves matter', 1], ['dx', 'A confirmed heart condition', 0]],
      [['a', 'Rest, recheck when calm, and mention the caffeine.', 1], ['b', 'Diagnose a heart problem now.', 0], ['c', 'Ignore it: caffeine never affects pulse.', 0], ['d', 'Drink more coffee to calm down.', 0]]),
    rv('m2.read.2.c', 'Dana, 38 (fictional adult)', 'Dana, 38, calm for 5 minutes: **88 beats/min**. Sleeps well, no symptoms.', gaugeHR(88),
      [['in', 'Within 60–100', 1], ['lo', 'Below range', 0], ['hi', 'Above range', 0], ['dx', 'Too high: lower is always better', 0]],
      [['a', 'No follow-up for this number alone; keep routine check-ups.', 1], ['b', 'Panic: anything above 60 is unhealthy.', 0], ['c', 'Skip all future check-ups.', 0], ['d', 'Start medicine to get below 60.', 0]])
  ]);

  J('m2.read.3', 'Glucose, cholesterol and BMI in context', [
    rv('m2.read.3.a', 'Rosa, 47 (fictional adult)', 'Rosa, 47, fasted 10 hours. Fasting glucose: **108 mg/dL**.', gaugeGlu(108),
      [['n', 'Normal (99 or below)', 0], ['p', 'Prediabetes range; needs professional confirmation', 1], ['d', 'Diabetes range', 0], ['x', 'A confirmed diabetes diagnosis', 0]],
      [['a', 'Follow up with a clinician: confirm, repeat, discuss habits.', 1], ['b', 'Cut every food group on her own.', 0], ['c', 'Ignore it; it was only one test.', 0.5], ['d', 'Call herself diabetic and follow an internet diet.', 0]]),
    rv('m2.read.3.b', 'Hal, 36 (fictional adult)', 'Hal, 36: total cholesterol **214 mg/dL**. His father had heart disease in his fifties.', gaugeChol(214),
      [['below', 'Below the adult reference of 200', 0], ['above', 'Above 200; family history makes follow-up worthwhile', 1], ['teen', 'Fine: teens have a lower number', 0], ['dx', 'Proof he will get heart disease', 0]],
      [['a', 'Discuss it with a clinician with family history and other lipid numbers.', 1], ['b', 'Panic: heart disease is guaranteed.', 0], ['c', 'Say nothing; family history never matters.', 0], ['d', 'Buy a supplement from an online ad.', 0]]),
    rv('m2.read.3.c', 'Nina, 31 (fictional adult)', 'Nina, 31: BMI **27.1**. Active, sleeps well, normal blood pressure and glucose.', gaugeBMI(27.1),
      [['in', 'Within 18.5–24.9', 0], ['above', 'Above the example range; BMI is only a screening tool', 1], ['dx', 'A diagnosis that she is unhealthy', 0], ['low', 'Below the example range', 0]],
      [['a', 'Discuss it with a clinician with habits, history and other measures.', 1], ['b', 'Treat BMI as the only measure of her health.', 0], ['c', 'Start an extreme diet right away.', 0], ['d', 'Ignore all other measurements.', 0]])
  ]);

  /* ---------- 2.3 Lifestyle connections ---------- */
  function lv(id, text, opts, hint) { return V(id, text, [P('link', 'Best-supported statement?', 'radio', opts, { hint: hint })]); }
  var L = [
    ['m2.life.1', 'Activity and heart health', 'Regular physical activity helps the heart and blood vessels over time.',
      lv('m2.life.1.a', 'Jamal starts brisk walks with friends most days. Which statement is best supported?', [['a', 'Regular activity can support heart health and blood pressure over time.', 1], ['b', 'It will drop his blood pressure exactly 10 points in two weeks.', 0], ['c', 'It has no effect on the heart.', 0], ['d', 'It only matters for athletes.', 0]], 'Look for support without a guaranteed number.'),
      lv('m2.life.1.b', 'Elena swaps long sitting for short movement breaks. Which statement is best supported?', [['a', 'Less sitting and more movement can support heart and metabolic health.', 1], ['b', 'Breaks guarantee perfect cholesterol by Friday.', 0], ['c', 'Sitting all day is protective.', 0], ['d', 'Only a gym membership helps.', 0]], 'Choose behavior-to-outcome language without a promise.')],
    ['m2.life.2', 'Tobacco, alcohol and health', 'Tobacco use and excessive alcohol raise health risks, including for the heart and blood pressure.',
      lv('m2.life.2.a', 'Which statement about tobacco and heart health is best supported?', [['a', 'Tobacco raises heart and vessel risk; quitting lowers it over time.', 1], ['b', 'Tobacco has no link to blood pressure or the heart.', 0], ['c', 'Only 40-year smokers are affected.', 0], ['d', 'Secondhand smoke is always harmless.', 0]], 'Look for risk language that is supported, not absolute.'),
      lv('m2.life.2.b', 'Which statement about excessive alcohol is best supported?', [['a', 'Heavy drinking can raise blood pressure and risk of liver and other problems.', 1], ['b', 'Heavy drinking improves heart health.', 0], ['c', 'Alcohol has no effect on blood pressure.', 0], ['d', 'One drink can always cause illness.', 0]], 'Pick the statement that is supported without exaggerating.')],
    ['m2.life.3', 'Nutrition, sleep, stress and routine care', 'Balanced nutrition, sleep, stress management and routine care support health measurements.',
      lv('m2.life.3.a', 'Which statement about balanced eating and blood measures is best supported?', [['a', 'Balanced eating can support healthier blood sugar and cholesterol over time.', 1], ['b', 'One healthy meal fixes cholesterol tonight.', 0], ['c', 'Nutrition has no link to blood sugar.', 0], ['d', 'Skipping meals improves every number.', 0]], 'Think about what is supported over time versus promised overnight.'),
      lv('m2.life.3.b', 'Which statement about check-ups, stress and sleep is best supported?', [['a', 'Routine care can catch changes early; stress and sleep can affect readings.', 1], ['b', 'Check-ups are only for people who feel sick.', 0], ['c', 'Stress never affects blood pressure.', 0], ['d', 'Skipping sleep lowers blood pressure.', 0]], 'Look for balanced language that supports routine care.')]
  ];
  L.forEach(function (r) {
    W.defItem({ id: r[0], m: 2, st: '2.3', pts: 1, cls: 'short', d: 'F', topic: r[1], src: 'Wildcats_Health_Metrics deck + curriculum spec (lifestyle connections)', kind: 'form', hint: r[4].parts[0].hint,
      why: r[2] + ' Good health statements describe likely effects over time without guaranteeing numbers.', variants: [r[3], r[4]] });
  });

  /* ---------- 2.4 Intake and follow-up ---------- */
  function iv(id, ctxText, opts, hint, pick, label) { return V(id, ctxText, [P('q', label, pick > 1 ? 'multi' : 'radio', opts, { pick: pick, hint: hint })]); }
  W.defItem({ id: 'm2.intake.1', m: 2, st: '2.4', pts: 1, cls: 'short', d: 'A', topic: 'Intake questions: metric purpose, habits, family history, lifestyle factor', src: 'Wildcats_Health_Metrics deck + curriculum spec (intake)', kind: 'form',
    hint: 'Good intake questions give context: daily habits, family history, a relevant lifestyle factor. Avoid judging or unrelated private details.',
    why: 'Helpful intake questions gather context for the reading (daily habits, family history, a relevant lifestyle factor) without judging or asking for unrelated private information.',
    variants: [
      iv('m2.intake.1.a', 'A nurse will explain a fictional adult’s blood pressure. Choose the **two** best questions.', [
        ['a', 'What does a typical week of physical activity look like?', 1], ['b', 'Has family had high blood pressure or heart disease?', 1], ['c', 'What are your religion and politics?', 0], ['d', 'Do you think your body looks healthy?', 0], ['e', 'Want to skip the explanation?', 0], ['f', 'Exactly how many grams did you eat yesterday?', 0]], 'Pick the two that give useful context for the reading.', 2, 'Pick exactly 2'),
      iv('m2.intake.1.b', 'An assistant will discuss a fictional adult’s fasting glucose. Choose the **two** best questions.', [
        ['a', 'What do typical meals and drinks look like?', 1], ['b', 'Has family had high blood sugar or diabetes?', 1], ['c', 'What are your social media passwords?', 0], ['d', 'Should we judge you on your weight?', 0], ['e', 'Skip explaining what the test measures?', 0], ['f', 'How much money do you earn?', 0]], 'Choose the two that help interpret the result without judging.', 2, 'Pick exactly 2')]
  });
  W.defItem({ id: 'm2.intake.2', m: 2, st: '2.4', pts: 1, cls: 'short', d: 'A', topic: 'Appropriate follow-up question after an unusual reading', src: 'Wildcats_Health_Metrics deck + curriculum spec (intake)', kind: 'form',
    hint: 'After an unusual reading, ask about context, repeat measures and next steps, not for an instant diagnosis.',
    why: 'An unusual reading is a reason for follow-up. The best question asks what else is needed to interpret it (repeat readings, conditions, history), not for an instant diagnosis.',
    variants: [
      iv('m2.intake.2.a', 'A fictional adult’s blood pressure was above the reference. Best question for the clinician?', [
        ['a', 'What repeat readings or other information would help interpret this?', 1], ['b', 'Can you diagnose me from this one number?', 0], ['c', 'Can I get a prescription without other tests?', 0], ['d', 'Why does one number never matter?', 0]], 'The best question asks what else is needed.', 1, 'Choose the best follow-up'),
      iv('m2.intake.2.b', 'A fictional adult’s cholesterol was above the reference. Best question for the clinician?', [
        ['a', 'What family history and repeat testing would help, and what are next steps?', 1], ['b', 'Is this a guaranteed prediction of my future?', 0], ['c', 'Can I buy a supplement instead of talking?', 0], ['d', 'Can you say the number is always wrong?', 0]], 'Pick the question that gathers context.', 1, 'Choose the best follow-up')]
  });
})(typeof window !== 'undefined' ? window : globalThis);
