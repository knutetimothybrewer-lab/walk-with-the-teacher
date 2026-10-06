import { mc, multi, tag } from './dsl.js';

const A = 'A · Mental Health 101 (Guided Notes)';
const B = 'B · Understanding Emotional Health (Guided Notes + slides)';

export default {
  id: 's3', title: 'Connectedness & the Data', short: 'Data', topic: 'EH',
  blurb: 'Read real survey data and decide what it does and does not show.',
  what: ['Use a CDC reading about school connectedness', 'Read a 10-year trend chart', 'Decide which conclusions the data supports'],
  callout: 'The numbers here come from large national surveys of U.S. high school students. They describe groups, not any one person. If a reading feels like too much, you can skip it.',
  farewell: 'Good data detectives ask: what does this show, and what does it not show?',
  entries: [
    mc('s3-01', {
      level: 'apply', topic: 'MH101', passage: 'connect', sensitive: true, src: `${A} › School and family connectedness (CDC YRBS)`,
      prompt: 'According to the reading, which statement is best supported?',
      right: 'Students who felt connected at school were less likely to report poor mental health and risk behaviors.',
      wrong: [
        ['Connectedness cures mental health problems.', 'The reading says connection is protective, not a cure.'],
        ['Only students with a lot of friends feel connected.', 'The reading describes feeling cared about, accepted, and supported. It does not mention friend counts.'],
        ['Connection matters at home but not at school.', 'The reading names both school and family connectedness.'],
      ],
      hint: 'Find the sentence that compares connected students with students who did not feel connected.',
      explain: 'CDC describes school connectedness as a strong protective factor. It lowers the odds of poor mental health and risk behaviors, but it is not a cure-all.',
    }),
    tag('s3-03', {
      level: 'analyze', visual: 'yrbs', visualSeconds: 15, src: `${B} › Data literacy: what the data supports and does not`,
      prompt: 'Use the chart. Does the data support each statement, show otherwise, or leave it unknown?',
      slots: [['y', 'Supported', 'The chart shows this', { short: 'Supported' }], ['n', 'Not supported', 'The chart shows otherwise', { short: 'Not supported' }], ['c', "Can't tell", 'Needs more than this chart', { short: "Can't tell" }]],
      rows: [
        ['The percent rose from 2013 to 2021.', 'y'],
        ['The percent dropped every year since 2013.', 'n'],
        ['Phones and social media caused the rise.', 'c'],
        ['The percent eased slightly from 2021 to 2023.', 'y'],
        ['In 2023, more than half of students reported persistent sadness or hopelessness.', 'n'],
      ],
      hint: 'A chart can show a trend. It cannot show why, and it cannot predict the future.',
      explain: 'The chart shows a rise to a peak in 2021 and a slight easing by 2023 (about 4 in 10). It cannot show what caused the change, and it cannot predict the next survey.',
    }),
    mc('s3-04', {
      level: 'recall', visual: 'yrbs', visualSeconds: 8, src: `${B} › 2013–2023 trend: rose, peaked, eased`,
      prompt: 'In which year was the percent of students reporting persistent sadness or hopelessness highest on this chart?',
      right: '2021',
      wrong: [['2013', 'Look at the line. 2013 is the starting point.'], ['2019', 'The line kept rising after 2019.'], ['2023', 'The line eased a little after its peak.']],
      hint: 'Find the highest point on the line.',
      explain: 'The percent rose from about 30% in 2013 to a peak of about 42% in 2021, then eased to about 40% in 2023.',
    }),
    mc('s3-06', {
      level: 'recall', src: `${B} › The 2023 measures (39.7% sadness; 28.5% poor mental health)`,
      prompt: 'In 2023, 39.7% of U.S. high schoolers reported persistent sadness or hopelessness. On this survey, what does "persistent" mean?',
      right: 'Feeling so sad or hopeless almost every day for at least 2 weeks in a row that you stopped doing some usual activities',
      wrong: [
        ['Feeling sad for a single day', 'Persistent means it lasts. Think about how long.'],
        ['Being diagnosed with a mental illness', 'This is a survey question about feelings, not a diagnosis.'],
        ['Feeling sad during any part of the school year', 'It is about feeling this way nearly every day for two weeks or more.'],
      ],
      hint: 'Duration is one of the key clues in this unit.',
      explain: 'The survey asks whether students felt so sad or hopeless almost every day for two weeks or more that they stopped doing usual activities. It is about duration and interference, not a diagnosis.',
    }),
    mc('s3-07', {
      level: 'analyze', src: `${B} › Why different measures give different numbers`,
      prompt: 'In 2023, about 40% of students reported persistent sadness or hopelessness (past 12 months), and about 28.5% reported poor mental health most or all of the time (past 30 days). Why are these two numbers different?',
      right: 'They measure different things over different time periods.',
      wrong: [
        ['One of the numbers must be a mistake.', 'Both come from the same survey. They answer different questions.'],
        ['Students answered randomly.', 'Large national surveys are designed to be reliable.'],
        ['The survey asked different grades.', 'The same students answered both questions.'],
      ],
      hint: 'Compare what each question asks and how far back it looks.',
      explain: 'Measures differ in what they ask and how far back they look. Always check the definition before comparing numbers.',
    }),
  ],
};
