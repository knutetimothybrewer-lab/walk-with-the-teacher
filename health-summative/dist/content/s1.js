import { mc, multi, sort, match } from './dsl.js';

const A = 'A · Mental Health 101 (Guided Notes)';

export default {
  id: 's1', title: 'Mental Health Basics', short: 'Basics', topic: 'MH101',
  blurb: 'Start here: what mental health is, how it differs from mental illness, and how it moves over time.',
  what: ['Tell mental health from mental illness', 'Place situations on the mental health continuum', 'See why one hard week is not a permanent state'],
  farewell: 'Everyone has mental health, and it can change. That is good news.',
  entries: [
    mc('s1-01', {
      level: 'recall', src: `${A} › Mental health vs. mental illness`,
      prompt: 'Which statement about mental health and mental illness is accurate?',
      right: 'Everyone has mental health. A mental illness is a specific condition that some people have.',
      wrong: [
        ['Only people with a mental illness have mental health.', 'Think about the word "everyone." Do you need an illness to have physical health?'],
        ['Mental health and mental illness mean exactly the same thing.', 'They overlap, but one is about everybody and the other is about a specific condition.'],
        ['Having a mental illness means someone is weak.', 'Illness is not about weakness. Any health condition can be treated with the right support.'],
      ],
      hint: 'Compare it to physical health: everyone has it, but only some people have a specific illness.',
      explain: 'Mental health is part of overall health for everyone, like physical health. A mental illness is a specific condition that some people have. It is one point on the continuum, and it can be treated.',
    }),
    sort('s1-02', {
      level: 'apply', skin: 'continuum', src: `${A} › Mental Health Continuum (4 zones)`,
      prompt: 'Place each situation in the zone that fits best right now.',
      slots: [
        ['h', 'Healthy', 'Coping well and feeling good'],
        ['s', 'Struggling', 'Low mood and more stress'],
        ['i', 'Injured', 'Symptoms get in the way of daily life'],
        ['l', 'Ill', 'Unable to function; needs help now'],
      ],
      cards: [
        ['Dana is nervous before tryouts but sleeps fine, eats normally, and enjoys her friends.', 'h'],
        ['Marcus has felt down and stressed for a few days after a breakup, but still goes to school.', 's'],
        ['For weeks, Priya has barely slept, quit her clubs, and cannot focus enough to keep up her grades.', 'i'],
        ['For several days Leo has been unable to get out of bed, go to school, or eat regular meals.', 'l'],
      ],
      hint: 'Ask two questions: how long has it lasted, and is it getting in the way of daily life? The more interference, the further along the continuum.',
      explain: 'The zones run from coping well to needing help now. The big clues are how long it lasts and how much it interferes with daily life. Being in Struggling or Injured does not mean something is wrong with you. It means you may need extra support.',
    }),
    mc('s1-03', {
      level: 'apply', src: `${A} › Continuum: struggling or injured ≠ something wrong with you`,
      prompt: 'A student says, "I\'m in the Struggling zone, so something must be wrong with me." What is the best response?',
      right: 'Not at all. Struggling means you may need extra support, and support works.',
      wrong: [
        ['You are right. Only people in the Healthy zone are okay.', 'Everyone moves through the zones at times. It is about support, not worth.'],
        ['Zones are permanent, so nothing will change.', 'Mental health changes over time, and support helps people move toward Healthy.'],
        ['Keep it hidden so people do not find out.', 'Hiding it makes it harder to get support. The goal is connecting with someone you trust.'],
      ],
      hint: 'The notes say these zones describe where you are right now, not who you are.',
      explain: 'Landing in Struggling or Injured is common and does not mean something is wrong with you. It is a signal that extra support could help.',
    }),
    multi('s1-05', {
      level: 'recall', src: `${A} › What moves you along the continuum`,
      prompt: 'Which of these can move someone along the mental health continuum?',
      right: ['Getting much less sleep for weeks', 'Ongoing stress with no time to recover', 'Supportive relationships and healthy coping', 'A big life change, like a move or a family change'],
      wrong: ['One bad day, by itself, permanently locks in your zone', 'Your zone is fixed from birth'],
      hint: 'Four of the six are things that really do change over time. The other two treat your zone as permanent.',
      explain: 'Sleep, stress, relationships, big changes, support, and coping all move the needle. One bad day does not set your zone for good, and your zone is not fixed.',
    }),
  ],
};
