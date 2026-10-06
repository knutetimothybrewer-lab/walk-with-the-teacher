import { mc, tag, match, scene } from './dsl.js';

const B = 'B · Understanding Emotional Health (Guided Notes + slides)';
const DIIS = [
  ['d', 'Duration', 'How long?', { short: 'Duration' }],
  ['n', 'Intensity', 'How strong?', { short: 'Intensity' }],
  ['f', 'Interference', 'Getting in the way?', { short: 'Interference' }],
  ['s', 'Safety', 'Anyone at risk?', { short: 'Safety' }],
  ['b', 'Background', 'Context or reassuring', { short: 'Background' }],
];

export default {
  id: 's5', title: 'Patterns, Not Labels', short: 'Patterns', topic: 'EH',
  blurb: 'We notice patterns. We do not diagnose. Use D.I.I.S. (Duration, Intensity, Interference, Safety) to decide what to do next.',
  what: ['Use D.I.I.S. as a noticing framework', 'Match short vignettes to pattern clues', 'Decide when to check in, keep watching, or get an adult'],
  callout: 'Only trained professionals can diagnose. In this station, "pattern" names describe clues, never a person. In the detective cases, "Background" means context or reassuring facts.',
  farewell: 'A pattern across time and daily life says more than one isolated symptom.',
  entries: [
    tag('s5-03', {
      level: 'apply', sensitive: true, skin: 'patterns', src: `${B} › Patterns, not labels: six patterns`,
      prompt: 'Match each description to the pattern clue it shows. We match patterns, not people.',
      slots: [
        ['st', 'Stress', 'Clear trigger; eases', { short: 'Stress' }],
        ['an', 'Anxiety', 'Future-focused worry', { short: 'Anxiety' }],
        ['de', 'Depression', 'Low mood, 2+ weeks', { short: 'Depression' }],
        ['pa', 'Panic', 'Sudden surge', { short: 'Panic' }],
        ['gr', 'Grief', 'Tied to a loss', { short: 'Grief' }],
        ['di', 'Emotional distress', 'Warning bell', { short: 'Distress' }],
        ['no', 'Not enough information yet', '', { short: 'Not enough info' }],
      ],
      rows: [
        ['Ellis is tense and sleeping badly the week before a huge exam. After it ends, things return to normal.', 'st'],
        ['Rosa keeps worrying about what might go wrong next, even on calm days. The "what ifs" have continued for weeks.', 'an'],
        ['For about a month, Dev has felt down nearly all day, every day, and nothing feels fun.', 'de'],
        ['Mina\'s heart suddenly pounds and she feels dizzy and terrified. It seems to come from nowhere and peaks within minutes.', 'pa'],
        ['Since his grandfather died, Theo has okay days, then waves of sadness when something reminds him.', 'gr'],
        ['For the past few weeks Alex has seemed "off": quieter, more irritable, more tired. No one can name one cause.', 'di'],
        ['Sam was quiet in class today.', 'no'],
      ],
      hint: 'Look for clues: a clear trigger, future worry, how long it lasts, how quickly it peaks, a specific loss, or too little information.',
      explain: 'Stress has a clear trigger and eases. Anxiety is future-focused worry that can persist without a trigger. Depression-like patterns are low mood most of the day, nearly every day, for 2+ weeks. Panic is a sudden surge of intense fear that usually peaks within about 10 minutes. Grief is tied to a loss and comes in waves. Emotional distress is a general warning bell before a pattern is clear. One quiet day is not enough information.',
    }),
    match('s5-04', {
      level: 'recall', src: `${B} › "Most useful clue" matching table`,
      prompt: 'Match each situation to the most useful clue for noticing what is going on.',
      pairs: [
        ['Tense the week before a big exam', 'A clear trigger that ends'],
        ['Worrying about what might go wrong, even on calm days', 'Future-focused worry with no clear trigger'],
        ['Lost interest in everything for weeks, and it affects school', 'How long it lasts, plus interference'],
        ['A loved one died', 'A specific loss'],
      ],
      hint: 'Each situation has one clue that stands out most.',
      explain: 'A big test gives a clear trigger. Worry with no trigger is future-focused. Weeks of lost interest point to duration plus interference. A death is a specific loss.',
    }),
    scene('s5-sc1', [
      tag('s5-06', {
        level: 'analyze', skin: 'detective', src: `${B} › D.I.I.S. in practice: scenario 1 (skipped lunch for 3 weeks)`,
        prompt: 'D.I.I.S. Detective: your friend Maya. Tag each sentence with the kind of evidence it gives.',
        slots: DIIS,
        rows: [
          ['Maya has skipped lunch most days for the past three weeks.', 'd'],
          ['She says she has never felt this overwhelmed and sometimes cries without knowing why.', 'n'],
          ['She snapped at you over something small and now sits alone in the library.', 'f'],
          ['You have been friends since sixth grade.', 'b'],
        ],
        hint: 'Duration is how long. Intensity is how strong. Interference is how it affects daily life and relationships. Background is context.',
        explain: 'Three weeks is Duration. Feeling this overwhelmed shows Intensity. Snapping and sitting alone show Interference. The friendship history is Background.',
      }),
      mc('s5-07', {
        level: 'apply', src: `${B} › D.I.I.S. in practice: next step for scenario 1`,
        prompt: 'Based on the evidence about Maya, what is the best next step?',
        right: 'Check in privately, listen without judging, and help her connect with a counselor or trusted adult.',
        wrong: [
          ['Tell her what you think she has so she can start getting better.', 'Noticing is not diagnosing. Leave naming conditions to professionals.'],
          ['Wait a few more weeks to see whether it passes on its own before saying anything.', 'Three weeks with interference is a pattern worth acting on.'],
          ['Ask other students what they know about what is going on with her.', 'Gossip can hurt her and does not connect her to help.'],
        ],
        hint: 'A good next step is caring and connects her to support, without labeling.',
        explain: 'A pattern over weeks that interferes with life calls for a caring check-in and connecting her to a counselor or trusted adult. You do not need to know the cause. If you stay worried, get an adult involved.',
      }),
    ]),
    scene('s5-sc2', [
      tag('s5-08', {
        level: 'analyze', skin: 'detective', src: `${B} › D.I.I.S. in practice: scenario 2 (quiet for a week)`,
        prompt: 'D.I.I.S. Detective: your classmate Jordan. Tag each sentence.',
        slots: DIIS,
        rows: [
          ['Jordan, usually outgoing, has been quiet for about a week.', 'd'],
          ['He missed two practices and says he is "just tired."', 'f'],
          ['He is still turning in all of his homework on time.', 'b'],
          ['At lunch, he still laughs when friends joke around.', 'b'],
        ],
        slotKey: 'Tip: "Background" also covers reassuring signs that he is still functioning.',
        hint: 'Remember: some sentences are reassuring context, not evidence of a problem.',
        explain: 'A week of quiet is short Duration. Missed practices show some Interference. Homework and laughing show he is still functioning.',
      }),
      mc('s5-09', {
        level: 'analyze', src: `${B} › D.I.I.S. in practice: "not enough evidence yet"`,
        prompt: 'What is the best next step for Jordan?',
        right: 'Not enough evidence yet: check in casually, keep watching, and tell an adult if it lasts.',
        wrong: [
          ['Report it to the counselor as an emergency right away, since he missed practices.', 'Nothing here points to an emergency. A casual check-in fits better.'],
          ['Ignore it completely, since a week of quiet is never worth noticing.', 'A week is short, but keep an eye out. Patterns can build.'],
          ['Tell him he needs to see a therapist and offer to book the appointment.', 'There is not enough evidence for that. Start by checking in.'],
        ],
        hint: 'Not every situation is a red flag. What does the evidence honestly support?',
        explain: 'Not every scenario calls for alarm. A short, mild change with signs he is still functioning means check in and keep watching. If duration grows, interference grows, or a red flag appears, bring in an adult.',
      }),
    ]),
    mc('s5-10', {
      level: 'analyze', src: `${B} › Comparing the two scenarios`,
      prompt: 'Both Maya and Jordan seem tired. Why do the best next steps for them differ?',
      right: 'Duration, Intensity, and Interference differ. A pattern matters more than one symptom.',
      wrong: [
        ['Because Maya is a closer friend than Jordan, so she deserves more attention.', 'The evidence, not the friendship, shapes the next step.'],
        ['Because tiredness always means a diagnosis, and Maya\'s is more serious.', 'Tiredness alone does not mean anything specific.'],
        ['They should not differ. Always report everything the same way.', 'The framework helps you match your response to the evidence.'],
      ],
      hint: 'Compare how long, how strong, and how much interference in each scenario.',
      explain: 'D.I.I.S. helps you match your response to the evidence: casual check-in and watching for a short, mild change; a caring conversation and connecting to an adult for a longer pattern that interferes.',
    }),
  ],
};
