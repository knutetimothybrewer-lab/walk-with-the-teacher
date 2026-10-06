/* content/index.js — assembles the assessment. To add or remove a station,
   edit the `stations` list. Station order is fixed for every student. */
import s1 from './s1.js';
import s2 from './s2.js';
import s3 from './s3.js';
import s4 from './s4.js';
import s5 from './s5.js';
import s6 from './s6.js';
import s7 from './s7.js';
import s8 from './s8.js';
import s9 from './s9.js';
import s10 from './s10.js';
import sources from './sources.js';

/** Lesson topics (used for the "worth another look" list and the teacher's Reteach tab). */
export const topics = {
  MH101: 'Mental Health 101: health vs. illness, the continuum, risk and protection, resilience',
  EH: 'Understanding Emotional Health: data, patterns, D.I.I.S., red flags',
  STRESS: 'Stress and the Brain',
  COMM: 'Communication: Listen → Validate → Ask → Connect',
  HELP: 'Help-Seeking: who can help and how to start',
  INFO: 'Infographic Project: putting it all together',
};

/** Short readings (80 to 150 words). Referenced by items with `passage: 'id'`. */
export const passages = {
  connect: {
    title: 'Reading: Connectedness as protection',
    text: 'School and family connectedness means feeling cared about, accepted, and supported by the people at school and at home. The CDC calls it one of the most powerful protective factors for teen health. In the 2023 Youth Risk Behavior Survey of U.S. high school students, students who felt connected at school were less likely to report poor mental health and risk behaviors such as substance use.\n\nFor example, about 14% of connected students said they had seriously considered attempting suicide, compared with about 27% of students who did not feel connected. Connection is not a cure-all, but it shows how caring relationships can protect.',
    cite: 'Source: CDC, Youth Risk Behavior Survey, 2023 (MMWR Supplement 73(4)). If this reading feels like too much, you can skip the question.',
  },
  phones: {
    title: 'Reading: Teens and phones',
    text: 'A 2024 Pew Research Center survey found that about 95% of U.S. teens have or have access to a smartphone, and about 44% said they at least sometimes feel anxious when they do not have their phone with them.\n\nThe CDC\'s 2023 Youth Risk Behavior Survey was the first to ask high schoolers how often they use social media. About 77% said they use it several times a day or more. Students who used social media this often were more likely to report persistent sadness or hopelessness than students who used it less.',
    cite: 'Sources: Pew Research Center (2024); CDC YRBS (2023).',
  },
  debate: {
    title: 'Reading: Two ways to read the evidence',
    text: '**Argument A ("major cause"):** Researchers such as Jonathan Haidt and Jean Twenge note that teen sadness and anxiety began rising around 2012, just as smartphones and social media spread. They argue that disrupted sleep, less in-person time, and social comparison make phones a major cause.\n\n**Argument B ("proceed with caution"):** Researchers such as Amy Orben and Andrew Przybylski found only very small statistical links between technology use and well-being in very large studies. They note that other factors, like academic pressure and changes in how surveys measure mood, could also play a role.',
    cite: 'Summaries of published research views; not direct quotes.',
  },
};

export default {
  topics, passages, sources,
  stations: [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10],
};
