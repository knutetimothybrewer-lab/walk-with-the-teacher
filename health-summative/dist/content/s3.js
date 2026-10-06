import { mc, multi, tag } from './dsl.js';

const A = 'A · Mental Health 101 (Guided Notes)';
const B = 'B · Understanding Emotional Health (Guided Notes + slides)';

export default {
  id: 's3', title: 'Connectedness & the Data', short: 'Data', topic: 'EH',
  blurb: 'Read real survey data and decide what it does and does not show.',
  what: ['Use a CDC reading about school connectedness', 'Read a 10-year trend chart', 'Decide which conclusions the data supports'],
  callout: 'The numbers here come from large national surveys of U.S. high school students. They describe groups, not any one person. You can skip any question.',
  farewell: 'Good data detectives ask: what does this show, and what does it not show?',
  entries: [
    mc('s3-01', {
      level: 'apply', topic: 'MH101', passage: 'connect', src: `${A} › School and family connectedness (CDC YRBS)`,
      prompt: 'According to the reading, which statement is best supported?',
      right: 'Connected students were less likely to report poor mental health and risk behaviors.',
      wrong: [
        ['Connectedness cures mental health problems, so connected students never struggle.', 'The reading says connection is protective, not a cure.'],
        ['Only students with a large group of friends can ever feel connected at school.', 'The reading describes feeling cared about, accepted, and supported. It does not mention friend counts.'],
        ['Connection matters at home, but feeling connected at school makes no difference.', 'The reading names both school and family connectedness.'],
      ],
      hint: 'Find the sentence about students who felt connected at school. What was less likely for them?',
      explain: 'CDC describes school connectedness as a strong protective factor. It lowers the odds of poor mental health and risk behaviors, but it is not a cure-all. For help with anything heavy, the Need help? button is always at the top.',
    }),
    tag('s3-03', {
      level: 'analyze', visual: 'yrbs', visualSeconds: 15, src: `${B} › Data literacy: what the data supports and does not`,
      prompt: 'Use the chart. Does the data support each statement, show otherwise, or leave it unknown?',
      slots: [['y', 'Supported', 'The chart shows this', { short: 'Supported' }], ['n', 'Not supported', 'The chart shows otherwise', { short: 'Not supported' }], ['c', "Can't tell", 'Needs more than this chart', { short: "Can't tell" }]],
      rows: [
        ['The percent rose from 2013 to 2021.', 'y'],
        ['The percent dropped every year since 2013.', 'n'],
        ['Phones and social media caused the rise.', 'c'],
        ['The percent eased from 2021 to 2023 and was lower again in 2025.', 'y'],
        ['In 2023, more than half of students reported persistent sadness or hopelessness.', 'n'],
      ],
      hint: 'A chart can show a trend. It cannot show why, and it cannot predict the future.',
      explain: 'The chart shows a rise to a peak in 2021 (about 42%), then a decline: about 4 in 10 in 2023 and about 1 in 3 in 2025. It cannot show why the numbers changed, and it cannot predict the next survey.',
    }),
    mc('s3-04', {
      level: 'recall', visual: 'yrbs', visualSeconds: 8, src: `${B} › 2013–2023 trend: rose, peaked, eased`,
      prompt: 'In which year was the percent of students reporting persistent sadness or hopelessness highest on this chart?',
      right: '2021',
      wrong: [['2013', 'Look at the line. 2013 is the starting point.'], ['2019', 'The line kept rising after 2019.'], ['2023', 'The line eased a little after its peak.']],
      hint: 'Find the highest point on the line.',
      explain: 'The percent rose from about 30% in 2013 to a peak of about 42% in 2021, then fell to about 40% in 2023 and about 33% in 2025.',
    }),
    mc('s3-06', {
      level: 'recall', src: `${B} › The 2023 measures (39.7% sadness; 28.5% poor mental health)`,
      prompt: 'In 2023, 39.7% of U.S. high schoolers reported persistent sadness or hopelessness. On this survey, what does "persistent" mean?',
      right: 'Almost every day for at least 2 weeks in a row, enough to stop some usual activities',
      wrong: [
        ['Feeling very sad for one full day after something bad happens', 'Persistent means it lasts. Think about how long.'],
        ['Being told by a doctor that you have a mental illness', 'This is a survey question about feelings, not a diagnosis.'],
        ['Feeling sad at some point during the school year, even for a short time', 'Think about how often and for how long.'],
      ],
      hint: 'Duration is one of the key clues in this unit.',
      explain: 'The survey asks whether students felt so sad or hopeless almost every day for two weeks or more that they stopped doing usual activities. It is about duration and interference, not a diagnosis.',
    }),
    mc('s3-07', {
      level: 'analyze', src: `${B} › Why different measures give different numbers`,
      prompt: 'In 2023, about 40% of students reported persistent sadness or hopelessness (past 12 months), and about 28.5% reported poor mental health most or all of the time (past 30 days). Why are these two numbers different?',
      right: 'They measure different things over different time periods.',
      wrong: [
        ['One of the numbers must be a mistake, because the same students answered both.', 'Both come from the same survey. They answer different questions.'],
        ['Students probably answered the second question less honestly than the first one.', 'Large national surveys are designed to be reliable.'],
        ['The two numbers come from different grades of students, so they cannot match.', 'The same students answered both questions.'],
      ],
      hint: 'Look at the words in each description. What is different about them?',
      explain: 'Measures differ in what they ask and how far back they look. Always check the definition before comparing numbers.',
    }),
  ],
};
