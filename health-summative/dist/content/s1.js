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
      right: 'Everyone has mental health; a mental illness is a specific condition some people have.',
      wrong: [
        ['Only people who have a diagnosed mental illness have mental health to think about.', 'Do you need an illness to have physical health?'],
        ['Mental health and mental illness are two words for exactly the same condition.', 'They are connected, but they are not the same thing.'],
        ['Having a mental illness means a person is weak and should be able to fix it alone.', 'Illness is not about weakness. Many health conditions can be treated or managed with support.'],
      ],
      hint: 'Compare it with physical health. Who has physical health? Who has a broken arm?',
      explain: 'Mental health is part of overall health for everyone, like physical health. A mental illness is a specific condition that some people have. Many mental illnesses can be treated, and illness is only part of the bigger continuum.',
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
        ['For weeks, Priya has slept badly, quit her clubs, and struggles to keep up her grades, but she still goes to school.', 'i'],
        ['For over two weeks Leo has been unable to get out of bed, go to school, or eat regular meals, even when family urges him.', 'l'],
      ],
      hint: 'Ask what the person can still do each day, as well as how long it has lasted.',
      explain: 'The zones run from coping well to needing help now. The big clues are how long it lasts and how much it interferes with daily life. Being in Struggling or Injured does not mean something is wrong with you. It means you may need extra support.',
    }),
    mc('s1-03', {
      level: 'apply', src: `${A} › Continuum: struggling or injured ≠ something wrong with you`,
      prompt: 'A student says, "I\'m in the Struggling zone, so something must be wrong with me." What is the best response?',
      right: 'No. It means you may need extra support, and support helps.',
      wrong: [
        ['You are right. Only people in the Healthy zone are okay.', 'Everyone moves through the zones at times. It is about support, not worth.'],
        ['Zones are permanent, so a person in Struggling will always stay there.', 'Mental health changes over time, and support helps people move toward Healthy.'],
        ['Keep it hidden from everyone so nobody finds out you are struggling.', 'Hiding it makes it harder to get support. The goal is connecting with someone you trust.'],
      ],
      hint: 'The notes say these zones describe where you are right now, not who you are.',
      explain: 'Landing in Struggling or Injured is common and does not mean something is wrong with you. It is a signal that extra support could help.',
    }),
    multi('s1-05', {
      level: 'recall', src: `${A} › What moves you along the continuum`,
      prompt: 'Which of these can move someone along the mental health continuum?',
      right: ['Getting much less sleep for weeks', 'Ongoing stress with no time to recover', 'Supportive relationships and healthy coping', 'A big life change, like a move or a family change'],
      wrong: ['One bad day, by itself, permanently locks in your zone', 'Your zone is fixed from birth'],
      hint: 'Ask of each one: could this change over time, or does it treat your zone as permanent?',
      explain: 'Sleep, stress, relationships, big changes, support, and coping all move the needle. One bad day does not set your zone for good, and your zone is not fixed.',
    }),
  ],
};
