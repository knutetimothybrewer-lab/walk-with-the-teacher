import { mc, multi, sort, order, explore } from './dsl.js';

const C = 'C · Stress and the Brain (slides)';

export default {
  id: 's4', title: 'Stress & the Brain', short: 'Stress & brain', topic: 'STRESS',
  blurb: 'See how the brain and body react to stress, and how recovery works. It is a whole-body story.',
  what: ['Follow the stress pathway through the brain and body', 'Compare the "gas pedal" and the "brake pedal"', 'Use the Recovery Dial and apply the coping loop'],
  farewell: 'The question is not "Do I have stress?" It is "Am I recovering?"',
  entries: [
    explore('s4-x1', { title: 'Explore the stress pathway', text: 'Step through it (or press Play). The next questions use what you see. This part is not scored.', visual: { name: 'brain' } }),
    mc('s4-01', {
      level: 'recall', src: `${C} › What is a stressor?`,
      prompt: 'Which best describes a stressor?',
      right: 'Anything your brain reads as a demand on you',
      wrong: [
        ['Only a dangerous or negative event, like an accident or a fight', 'Even exciting things, like a big game, can be stressors.'],
        ['Any strong feeling, such as sadness or anger, that lasts a while', 'A stressor is a demand, not a feeling.'],
        ['Something that always harms your health and should be avoided completely', 'Stress is not always bad. Short bursts can help you perform.'],
      ],
      hint: 'A stressor is whatever your brain reads as a demand.',
      explain: 'A stressor is anything the brain reads as a demand. It can be physical, social, academic, or internal, and it is not always bad.',
    }),
    order('s4-02', {
      src: `${C} › Stress pathway: amygdala → hypothalamus → adrenals`,
      prompt: 'Put the stress response in order.',
      steps: ['A stressor appears and the brain reads it as a demand', 'The amygdala sounds the alarm', 'The hypothalamus signals the body', 'The adrenal glands release adrenaline and cortisol', 'The body is ready: heart faster, breathing quicker'],
      hint: 'Alarm → command center → chemical messengers → body ready.',
      explain: 'Stressor → brain interprets → amygdala (alarm) → hypothalamus (command center) → adrenal glands (adrenaline and cortisol) → body ready.',
    }),
    sort('s4-03', {
      level: 'recall', src: `${C} › Sympathetic "gas pedal" vs. parasympathetic "brake pedal"`,
      prompt: 'Which changes belong to the "gas pedal" (stress response) and which to the "brake pedal" (recovery)?',
      slots: [['g', 'Gas pedal', 'Sympathetic: get ready'], ['b', 'Brake pedal', 'Parasympathetic: recover']],
      cards: [['Heart beats faster', 'g'], ['Digestion slows down', 'g'], ['Heart rate settles', 'b'], ['Breathing slows and deepens', 'b']],
      hint: 'The gas pedal gets you ready to act. The brake pedal slows things down again.',
      explain: 'Sympathetic activation (gas): heart faster, breathing quicker, muscles prepare, digestion slows, and attention locks onto the threat. Parasympathetic recovery (brake) settles it all.',
    }),
    mc('s4-04', {
      level: 'analyze', visual: 'stressDays', visualSeconds: 18, src: `${C} › Acute vs. chronic stress over time`,
      prompt: 'Try both lines. Which line shows chronic stress?',
      right: 'The dashed line, which keeps climbing with no recovery',
      wrong: [
        ['The solid line that spikes on hard days and then comes back down', 'That line recovers. It shows acute stress.'],
        ['Neither line. Any stress that lasts through a school week is chronic.', 'The chart shows two different patterns.'],
        ['Both lines, because both show stress', 'One recovers and one does not. That is the difference.'],
      ],
      hint: 'Chronic means it keeps going. Which line never gets a chance to come back down?',
      explain: 'Acute stress rises and then falls when the demand passes. Chronic stress stays high or builds because recovery is missing.',
    }),
    multi('s4-06', {
      level: 'apply', visual: 'gauges', visualSeconds: 10, src: `${C} › Recovery: coping reduces the demand or improves recovery`,
      prompt: 'Noor has been in "gas pedal" mode all week. Choose the actions that help the brake work. Watch the gauges.',
      options: [
        { t: 'Slow breathing with a longer exhale', ok: true, fx: [-20, 25] },
        { t: 'A short walk or other movement', ok: true, fx: [-15, 20] },
        { t: 'Talking with a trusted friend', ok: true, fx: [-15, 20] },
        { t: 'Getting a full night of sleep (8 to 10 hours)', ok: true, fx: [-20, 25] },
        { t: 'Scrolling for hours to "switch off"', ok: false, fx: [5, -10] },
        { t: 'Skipping meals and pushing through', ok: false, fx: [15, -10] },
        { t: 'Staying up late to finish everything', ok: false, fx: [15, -15] },
      ],
      hint: 'Pick actions that bring the gas down and the brake up. Some choices push the gas pedal harder.',
      explain: 'Good coping either reduces the demand or improves recovery. Slow breathing, movement, support, and sleep (teens need 8 to 10 hours) all help the brake. Scrolling can feel like a break, but it often does not give the body real recovery. Coping is not pretending everything is fine.',
    }),
    order('s4-07', {
      src: `${C} › Coping loop: Notice → Regulate → Choose → Recover`,
      prompt: 'Put the coping loop in order.',
      steps: ['Notice what your body and mind are telling you', 'Regulate: slow your body down', 'Choose: lower the demand or get support', 'Recover: sleep, rest, connection'],
      hint: 'Start by noticing. Recovery is the last step of the loop.',
      explain: 'Notice → Regulate → Choose → Recover. You cannot choose well until your body has calmed a bit.',
    }),
    mc('s4-08', {
      level: 'apply', src: `${C} › Practice situation 1: presentation jitters`,
      prompt: 'Before a class presentation, Nia\'s heart pounds and her hands feel shaky. An hour afterward she feels fine again. What best describes this?',
      right: 'A normal acute stress response that ended with the demand',
      wrong: [
        ['A sign that something is wrong with her and she should avoid presenting', 'A pounding heart before a presentation is the body getting ready. It is normal.'],
        ['Chronic stress that a doctor needs to diagnose and treat', 'It eased within an hour. Chronic stress keeps going.'],
        ['Proof that she is not cut out for speaking in front of people', 'The response is normal, and skills can help.'],
      ],
      hint: 'Did the stress end when the demand ended?',
      explain: 'Acute stress rises with a demand and falls once it is over. This is the gas pedal doing its job.',
    }),
    mc('s4-09', {
      level: 'apply', src: `${C} › Practice situation 2: 4 hours of sleep, always on edge`,
      prompt: 'For two weeks, Mateo has slept about 4 hours a night and says he is "always on edge." What is the most useful insight?',
      right: 'Stress may be building without recovery. Sleep is a good start, and a trusted adult can help.',
      wrong: [
        ['He should push through, since everyone is tired during the school year.', 'Pushing through skips recovery, which is the problem.'],
        ['This is acute stress, so it will fade on its own without any changes.', 'Two weeks without enough recovery points toward stress that is building up.'],
        ['Sleep has little to do with stress, so it is not worth changing.', 'Sleep is one of the main ways the brake pedal does its work.'],
      ],
      hint: 'Ask "Is he recovering?" Teens need about 8 to 10 hours of sleep.',
      explain: 'Chronic stress is stress without enough recovery. Sleep is a major recovery tool, and teens need 8 to 10 hours. If it goes on for weeks, talking with a trusted adult is a good next step too.',
    }),
    mc('s4-10', {
      level: 'apply', src: `${C} › Practice situation 3: scrolling after an argument`,
      prompt: 'After a big argument, Kai scrolls for hours but still cannot calm down. Why might scrolling not be helping?',
      right: 'It may keep his body on alert instead of letting it recover.',
      wrong: [
        ['Scrolling always calms the body, so he should keep scrolling longer.', 'The body can stay on alert even when you are distracted.'],
        ['He has not scrolled for long enough yet for it to take effect.', 'More of the same will not trigger recovery.'],
        ['Stress only affects mood and thoughts, so the body is not involved at all.', 'Stress changes the whole body, not just mood.'],
      ],
      hint: 'Which actions switch on the brake pedal?',
      explain: 'Distraction is not the same as recovery. Breathing, movement, sleep, support, and time engage the brake pedal.',
    }),
  ],
};
