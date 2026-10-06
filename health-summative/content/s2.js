import { mc, multi, sort, match } from './dsl.js';

const A = 'A · Mental Health 101 (Guided Notes)';

export default {
  id: 's2', title: 'Risk, Protection & Resilience', short: 'Risk & protection', topic: 'MH101',
  blurb: 'Everyone carries some of both: things that raise risk and things that protect. Resilience is a skill set you can build.',
  what: ['Sort risk factors from protective factors', 'Tell acute stressors from chronic ones', 'Name the four building blocks of resilience'],
  farewell: 'Risk is not destiny. Protective factors and skills can balance it out.',
  entries: [
    sort('s2-01', {
      level: 'apply', src: `${A} › Risk factors vs. protective factors`,
      prompt: 'Does each item raise risk or protect mental health?',
      slots: [['r', 'Risk factor', 'Can make things harder'], ['p', 'Protective factor', 'Can buffer and help']],
      cards: [
        ['Ongoing conflict at home', 'r'],
        ['Being bullied or left out again and again', 'r'],
        ['Using alcohol or other drugs to cope', 'r'],
        ['A group of trusted friends', 'p'],
        ['Healthy ways to cope, like exercise or music', 'p'],
        ['A caring teacher or coach who knows you', 'p'],
      ],
      hint: 'Risk factors make coping harder. Protective factors are the people, skills, and supports that cushion stress.',
      explain: 'Risk factors raise the odds of struggling; protective factors lower them. Other risk factors include chronic illness or pain, and academic or money pressure. Other protective factors include a supportive family, a sense of purpose, and access to care. Having a risk factor does not mean someone will struggle.',
    }),
    sort('s2-02', {
      level: 'apply', src: `${A} › Acute vs. chronic stressors`,
      prompt: 'Is each stressor acute (short-term) or chronic (ongoing)?',
      slots: [['a', 'Acute', 'Short-term, has an end'], ['c', 'Chronic', 'Ongoing, keeps going']],
      cards: [
        ['A big test tomorrow', 'a'],
        ['One argument with a friend', 'a'],
        ['Conflict at home that goes on for months', 'c'],
        ['Being bullied or treated unfairly again and again', 'c'],
      ],
      hint: 'Ask: does this stressor have a clear end point, or does it keep coming back?',
      explain: 'Acute stressors come and go (a test, a tryout, one argument). Chronic stressors are ongoing (long-term family conflict, financial hardship, repeated bullying or discrimination) and are harder because recovery time is short.',
    }),
    match('s2-04', {
      level: 'apply', src: `${A} › Resilience: four building blocks`,
      prompt: 'Match each resilience building block to the example that shows it.',
      pairs: [
        ['Relationships', 'Leaning on a friend after a setback'],
        ['Coping skills', 'Using slow breathing before a presentation'],
        ['Growth mindset', 'Thinking "I can\'t do this yet" and trying a new study method'],
        ['Purpose', 'Volunteering at an animal shelter because it matters to you'],
      ],
      hint: 'Relationships = people. Coping skills = tools. Growth mindset = how you think about setbacks. Purpose = what matters to you.',
      explain: 'The four building blocks of resilience are Relationships (connection), Coping Skills, Growth Mindset, and Purpose. You can build all four.',
    }),
    mc('s2-05', {
      level: 'recall', src: `${A} › Resilience is a skill set, not a fixed trait`,
      prompt: 'Which statement describes resilience best?',
      right: 'A set of skills and supports that you can build over time.',
      wrong: [
        ['A trait some people are born with and others never get.', 'Resilience is built, not handed out at birth.'],
        ['Never feeling sad or stressed.', 'Resilient people still feel hard things. They recover and adapt.'],
        ['Handling everything alone without help.', 'Relationships are one of the four building blocks. Help is part of resilience.'],
      ],
      hint: 'Think about the four building blocks. Could someone practice each of them?',
      explain: 'Resilience is a set of skills and supports (relationships, coping skills, growth mindset, purpose) you can build. It is not a fixed trait.',
    }),
    mc('s2-08', {
      level: 'analyze', src: `${A} › Risk, protection, and balance`,
      prompt: 'Two students face the same stress: a parent lost a job. Lena has close friends, a mentor, and uses exercise to cope. Sam has no one to talk to and has no outlets. Why might they do differently?',
      right: 'Protective factors such as support and healthy coping can outweigh risk, and Lena has more of them.',
      wrong: [
        ['Lena must care less about her family than Sam does.', 'The difference is in the supports around them, not how much they care.'],
        ['The same event always has the same effect on everyone.', 'Protective factors change how a stressor lands.'],
        ['Risk factors do not matter once someone has friends.', 'Risk still matters. Protective factors help balance it.'],
      ],
      hint: 'Compare the supports each student has. What is different about the protective side?',
      explain: 'The same stressor does not have the same effect on everyone. Supports and coping skills (protective factors) can balance risk.',
    }),
  ],
};
