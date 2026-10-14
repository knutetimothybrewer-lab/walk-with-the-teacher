import { mc, multi, tag, order } from './dsl.js';

const B = 'B · Understanding Emotional Health (Guided Notes + slides)';

export default {
  id: 's6', title: 'Phones, Teens & Evidence', short: 'Phones & evidence', topic: 'EH',
  blurb: 'Phones and social media are a big topic. Practice judging evidence: what do the studies show, and what would it take to show cause?',
  what: ['Build a timeline of smartphones and social media', 'Read two different arguments', 'Decide what evidence would test causation'],
  farewell: 'Correlation is not causation. Good thinkers ask what else could explain a link.',
  entries: [
    order('s6-01', {
      level: 'recall', src: `${B} › Smartphone and social media timeline`,
      prompt: 'Put these events in order, from earliest to latest.',
      steps: ['The first iPhone is released (2007)', 'Instagram launches (2010)', 'Facebook acquires Instagram (2012)', 'CDC\'s YRBS asks high schoolers about social media use for the first time (2023)'],
      hint: 'Think about which came first: the phone that ran apps, the apps built for it, or the survey question about them.',
      explain: 'iPhone 2007 → Instagram 2010 → Facebook acquires Instagram 2012 → CDC YRBS first asks about social media use in 2023.',
    }),
    mc('s6-03', {
      level: 'analyze', passage: 'phones', src: `${B} › CDC: frequent vs. less frequent social media users`,
      prompt: 'The reading says students who used social media several times a day were more likely to report persistent sadness. What can we conclude from this survey alone?',
      right: 'The two are linked, but this survey cannot show which came first or what else is involved.',
      wrong: [
        ['Social media use caused the sadness, since heavy users reported more of it.', 'A one-time survey cannot show cause. Something else might explain both.'],
        ['The sadness caused the heavy social media use, since sad students go online more.', 'It could go that way, but this survey cannot tell either way.'],
        ['The link is probably a coincidence, so it tells us nothing at all.', 'The link is real in the survey. The question is what it means.'],
      ],
      hint: 'A survey taken at one point in time shows what goes together, not what causes what.',
      explain: 'This is a correlation. It could be that social media affects mood, that mood affects use, or that something else (like sleep or stress) affects both.',
    }),
    mc('s6-05', {
      level: 'analyze', passage: 'debate', src: `${B} › Which argument makes the stronger causal claim?`,
      prompt: 'Which argument makes the stronger causal claim?',
      right: 'Argument A: phones and social media are a major cause of the rise',
      wrong: [
        ['Argument B: the links are small and may have other explanations', 'Argument B is the cautious one. It warns against jumping to cause.'],
        ['Both make equally strong causal claims', 'One says "major cause." The other says "proceed with caution."'],
        ['Neither makes a causal claim', 'Argument A states a cause directly.'],
      ],
      hint: 'Which argument says one thing causes the other?',
      explain: 'Argument A claims cause. Argument B advises caution because of small effects and other possible explanations. A strong causal claim needs strong causal evidence.',
    }),
    multi('s6-06', {
      level: 'analyze', src: `${B} › What evidence would establish causation?`,
      prompt: 'Which kinds of evidence would help test whether social media use affects mood?',
      right: [
        'Experiments where some teens are randomly assigned to reduce their use',
        'Following the same teens over time to see which change comes first',
        'Accounting for other factors like sleep, school pressure, and bullying',
        'Results that repeat across different studies and research teams',
      ],
      wrong: ['One teen\'s story that went viral', 'A one-time survey comparing two groups'],
      hint: 'Stronger evidence can sort out what came first and rule out other explanations.',
      explain: 'Experiments, tracking the same teens over time, accounting for other factors (called confounders), and repeating the results in other studies turn a link into stronger evidence. Stories and one-time surveys cannot do it.',
    }),
    mc('s6-07', {
      level: 'analyze', visual: { name: 'thirdVar', a: 'Late-night scrolling', b: 'Low mood', c: 'Too little sleep', note: 'Late-night scrolling and low mood tend to show up together. Press the button to see one possible explanation.' }, visualSeconds: 12, src: `${B} › Third variables (confounders)`,
      prompt: 'Too little sleep is linked to both late-night scrolling and low mood. In this case, sleep could be:',
      right: 'A third variable that may help explain why the two go together',
      wrong: [
        ['Proof that late-night scrolling causes the low mood', 'A third variable weakens, not proves, a simple cause story.'],
        ['Irrelevant, because only two things can ever be linked to each other', 'Many links involve a third factor.'],
        ['A coincidence with no real connection to scrolling or mood', 'Sleep is linked to both, so it may matter.'],
      ],
      hint: 'If something affects both A and B, A and B can move together without one causing the other.',
      explain: 'A third variable (confounder) can make two things move together. Sleep may play that role here, though it could also be part of the path between them. More evidence is needed.',
    }),
    mc('s6-08', {
      level: 'recall', src: `${B} › Bottom line: part of the picture, size still being studied`,
      prompt: 'Which statement is the most accurate summary of the evidence so far?',
      right: 'Studies find links, but experts disagree about the size of the effect and its cause.',
      wrong: [
        ['It is settled: phones are the single cause of the rise in teen sadness.', 'Researchers disagree about size, and other factors matter.'],
        ['It is settled: phones and social media have no effect on teen well-being at all.', 'Most researchers think they are part of the picture.'],
        ['Researchers have not studied this yet, so nothing can be said either way.', 'It has been studied a lot, and research continues.'],
      ],
      hint: 'Look for the answer that does not claim more certainty than the studies show.',
      explain: 'Studies link heavy social media use with lower well-being, and many researchers think phones and social media are part of the picture. How big the role is, and whether it is the cause, is still being studied and debated.',
    }),
    mc('s6-k1', {
      points: 0, person: { who: 'Eli', mood: 'worried', says: 'Phones near the bed cause anxiety. I bet.', after: 'quiet' },
      level: 'analyze', src: `${B} › Checkpoint: what would test a causal claim`,
      prompt: 'Eli says, "Students who keep their phone by the bed feel more anxious, so phones cause anxiety." Which question would best test that claim?',
      right: 'What happens to anxiety when similar students change only where they keep the phone at night?',
      wrong: [
        ['How many students in the school own a phone?', 'Owning a phone does not test whether it changes anxiety.'],
        ['Which phone brand do anxious students use?', 'Brand has nothing to do with whether the phone changes mood.'],
        ['How many posts about phones did Eli see this week?', 'Posts are opinions. They are not evidence about cause.'],
      ],
      hint: 'To test cause, what should change and what should stay the same?',
      explain: 'To test cause you change one thing and keep other things similar. Surveys can show a link, but a comparison like this gets closer to showing cause.',
    }),
    multi('s6-k2', {
      points: 0, level: 'analyze', src: `${B} › Checkpoint: careful claims`,
      prompt: 'A survey found that students who sleep less also report lower mood. Select all the statements that are careful (they do not overclaim).',
      right: ['Less sleep and lower mood are linked in this survey.', 'This survey alone cannot show which one causes the other.', 'Other factors, like stress, could affect both sleep and mood.'],
      wrong: ['Less sleep definitely causes low mood in every student.', 'Low mood is proven to be the only reason students sleep less.'],
      hint: 'Careful claims say "linked" or "might," not "proves" or "always."',
      explain: 'A survey can show a link. It cannot show the direction or rule out a third variable. Claims with "definitely" or "proven" go further than the evidence.',
    }),
  ],
};
