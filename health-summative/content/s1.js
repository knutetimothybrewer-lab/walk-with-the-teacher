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
      person: { who: 'Student', mood: 'worried', says: 'Maybe something is wrong with me.' },
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
    mc('s1-k1', {
      points: 0, person: { who: 'Dev', mood: 'worried', says: 'Monday was rough.', after: 'happy' },
      level: 'apply', topic: 'MH101', src: `${A} › Checkpoint: the continuum can move`,
      prompt: 'Dev felt "Struggling" on Monday after a rough week. By Friday, after more sleep and a good talk with a friend, Dev felt "Doing well." What does this best show?',
      right: 'A person\'s place on the continuum can move, and sleep and support can help it shift.',
      wrong: [
        ['Dev must have had a mental illness that went away by Friday.', 'The continuum is about how someone is doing right now. It is not a diagnosis.'],
        ['Dev\'s Monday feelings were not real because Friday felt better.', 'Both days were real. Feelings change with what is happening.'],
        ['Where you are on the continuum on one day stays the same all year.', 'People move along the continuum over time.'],
      ],
      hint: 'Think about what changed for Dev between Monday and Friday.',
      explain: 'Sleep, stress, relationships, and support can all move a person along the continuum. One hard week does not fix someone in the Struggling zone for good.',
    }),
    sort('s1-k2', {
      points: 0, level: 'apply', skin: 'continuum', src: `${A} › Checkpoint: more continuum practice`,
      prompt: 'Place each situation in the zone that fits best right now.',
      slots: [
        ['h', 'Healthy', 'Coping well and feeling good'],
        ['s', 'Struggling', 'Low mood and more stress'],
        ['i', 'Injured', 'Symptoms get in the way of daily life'],
        ['l', 'Ill', 'Unable to function; needs help now'],
      ],
      cards: [
        ['Nico is excited and a little nervous about a new school year, and sleeps and eats as usual.', 'h'],
        ['Rosa has been irritable and tired for a few days during finals but still sees her friends.', 's'],
        ['For several weeks, Theo has stopped hanging out with friends, skips his team practices, and cannot focus in class.', 'i'],
        ['For weeks, Jada has been unable to leave her room, eat regular meals, or go to school, even with family encouraging her.', 'l'],
      ],
      hint: 'Ask: how long, how strong, and how much is it getting in the way of daily life?',
      explain: 'The zones describe how a person is doing right now. Short, mild stress is Struggling. Weeks of interference is Injured. Being unable to function and needing help now is Ill.',
    }),
  ],
};
