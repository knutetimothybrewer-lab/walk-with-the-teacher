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
      hint: 'The first smartphone came before the apps. Think about when each app became big.',
      explain: 'iPhone 2007 → Instagram 2010 → Facebook acquires Instagram 2012 → CDC YRBS first asks about social media use in 2023.',
    }),
    mc('s6-03', {
      level: 'analyze', passage: 'phones', src: `${B} › CDC: frequent vs. less frequent social media users`,
      prompt: 'The reading says students who used social media several times a day were more likely to report persistent sadness. What can we conclude from this survey alone?',
      right: 'The two are linked, but this alone cannot show which came first or whether something else explains both.',
      wrong: [
        ['Social media use caused the sadness.', 'A one-time survey cannot show cause. Something else might explain both.'],
        ['The sadness caused the social media use.', 'It could go that way, but this survey cannot tell either way.'],
        ['The link is a coincidence, so it means nothing.', 'The link is real in the survey. The question is what it means.'],
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
      keepOrder: false,
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
      explain: 'Experiments, long-term tracking, controlling for confounders, and replication are what turn a link into stronger evidence. Stories and one-time surveys cannot do it.',
    }),
    mc('s6-07', {
      level: 'analyze', visual: { name: 'thirdVar', a: 'Late-night scrolling', b: 'Low mood', c: 'Too little sleep', note: 'Late-night scrolling and low mood tend to show up together. Press the button to see one possible explanation.' }, visualSeconds: 12, src: `${B} › Third variables (confounders)`,
      prompt: 'Too little sleep is linked to both late-night scrolling and low mood. In this case, sleep could be:',
      right: 'A third variable that may help explain why the other two go together',
      wrong: [
        ['Proof that scrolling causes low mood', 'A third variable weakens, not proves, a simple cause story.'],
        ['Irrelevant, because only two things can be linked', 'Many links involve a third factor.'],
        ['A coincidence with no connection to either', 'Sleep is linked to both, so it may matter.'],
      ],
      hint: 'If something affects both A and B, A and B can move together without one causing the other.',
      explain: 'A third variable (confounder) can make two things move together. Sleep may play that role here, though it could also be part of the path between them. More evidence is needed.',
    }),
    mc('s6-08', {
      level: 'recall', src: `${B} › Bottom line: part of the picture, size still being studied`,
      prompt: 'Which statement best matches where most researchers currently stand?',
      right: 'Phones and social media are probably part of the picture, but how big a role they play is still being studied.',
      wrong: [
        ['It is settled: phones are the single cause.', 'Researchers disagree about size, and other factors matter.'],
        ['It is settled: phones have no effect at all.', 'Most researchers think they are part of the picture.'],
        ['No one has studied this yet.', 'It has been studied a lot, and research continues.'],
      ],
      hint: 'The honest answer sits between the two extremes.',
      explain: 'Most researchers agree phones and social media are part of the picture. The size of the role is still being studied.',
    }),
  ],
};
