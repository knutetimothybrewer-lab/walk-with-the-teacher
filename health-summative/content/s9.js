import { mc, multi, sort, match } from './dsl.js';

const E = 'E · Help-Seeking Mini-Lesson (slides)';

export default {
  id: 's9', title: 'Who Can Help?', short: 'Who can help', topic: 'HELP',
  blurb: 'Help comes in layers. Learn who does what, what gets in the way, and how to take a first step.',
  what: ['Place people and services in the circle of support', 'Send situations to the right helper', 'Bust the barriers that keep people from asking'],
  farewell: 'Asking for help is a strength, and starting small counts.',
  entries: [
    sort('s9-01', {
      level: 'recall', src: `${E} › Circle of support: 4 tiers`,
      prompt: 'Circle of Support: put each person or service in its tier.',
      slots: [['e', 'Everyday support', 'People around you'], ['s', 'School support team', 'Free at school'], ['h', 'Health care', ''], ['x', 'Emergency or crisis', 'Right now']],
      cards: [
        ['Parent or caregiver', 'e'], ['Trusted teacher or coach', 'e'],
        ['School counselor', 's'], ['School psychologist', 's'],
        ['Primary care provider', 'h'], ['Psychiatrist', 'h'],
        ['988 Lifeline', 'x'], ['911', 'x'],
      ],
      hint: 'Start close to home, move to school, then health care. The crisis tier is for urgent help.',
      explain: 'Everyday: parent or caregiver, trusted teacher or coach. School support team (free): counselor, school psychologist, school social worker. Health care: primary care provider, therapist, psychologist, psychiatrist (a medical doctor who can prescribe). Emergency or crisis: 988, 911, Crisis Text Line.',
    }),
    sort('s9-02', {
      level: 'apply', skin: 'navigator', src: `${E} › "Who do I go to?" matching`,
      prompt: 'Circle of Support Navigator: send each situation to the best first stop.',
      slots: [['c', 'School counselor', ''], ['p', 'Primary care provider or therapist', ''], ['y', 'Psychologist', 'Testing and assessment'], ['d', 'Psychiatrist', 'Medical doctor'], ['k', '988 or 911', 'Right now']],
      cards: [
        ['Stress about grades and friendship drama', 'c'],
        ['Weeks of sadness or anxiety that are not easing up', 'p'],
        ['You want testing for ADHD or learning differences', 'y'],
        ['You want an evaluation to see whether medication could help', 'd'],
        ['Someone\'s safety is at risk right now', 'k'],
      ],
      hint: 'Think: who is closest and free for everyday stress, who does testing, who can prescribe, and who handles emergencies?',
      explain: 'School counselor: everyday school and friendship stress. Primary care provider or therapist: weeks of sadness or anxiety. Psychologist: therapy plus testing and assessment. Psychiatrist: a medical doctor who can prescribe medicine. 988 or 911: safety at risk now.',
    }),
    match('s9-04', {
      level: 'apply', src: `${E} › Barriers and reframes`,
      prompt: 'Barrier Buster: match each barrier to the best reframe.',
      pairs: [
        ['"People will think I am weak." (stigma)', 'Asking for help is a strength. Mental health care is health care.'],
        ['"What if everything I say gets repeated?" (privacy)', 'Ask about privacy up front. Counselors can explain what stays private.'],
        ['"I would not know where to go." (or cost or rides)', 'Start free at school with one trusted person or your counselor.'],
        ['"It is not serious enough." (minimizing)', 'You do not have to wait until it is severe. Early support helps.'],
      ],
      hint: 'Pick the reframe that answers the worry directly and offers a next step.',
      explain: 'Each barrier has a reframe and a practical next step: help is a strength, ask about privacy and exceptions, start free at school with one trusted person (cost, transportation, and not knowing where to go are real barriers), and do not wait for things to be severe.',
    }),
    multi('s9-06', {
      level: 'recall', src: `${E} › CDC WSCC model (10 components)`,
      prompt: 'CDC\'s WSCC model (Whole School, Whole Community, Whole Child) has 10 components. Which of these are among them?',
      right: ['Health services', 'Counseling, psychological, and social services', 'Social and emotional climate', 'Family engagement'],
      wrong: ['Standardized test prep', 'Team sports rankings'],
      hint: 'WSCC covers the whole child, not just academics. Look for the ones about health, support, and community.',
      explain: 'WSCC components: health education; physical education and physical activity; nutrition environment and services; health services; counseling, psychological, and social services; social and emotional climate; physical environment; employee wellness; community involvement; family engagement.',
    }),
    mc('s9-07', {
      level: 'apply', src: `${E} › First step: one trusted person, low-pressure moment, an opener`,
      prompt: 'Which is the best way to take a first step toward getting support?',
      right: 'Pick one trusted person, choose a low-pressure moment, and try an opener like "Can I talk to you about something that has been on my mind?"',
      wrong: [
        ['Wait until you are completely sure what is wrong.', 'You do not need to know what is wrong to ask for help.'],
        ['Post about it and see who replies.', 'A trusted person you pick is safer and more reliable.'],
        ['Tell everyone at once so someone helps.', 'Start with one trusted person.'],
      ],
      hint: 'Small and specific beats big and vague.',
      explain: 'One trusted person, a low-pressure moment (walking, car ride, after class), and a simple opener make the first step easier.',
    }),
    mc('s9-08', {
      level: 'recall', src: `${E} › 988 facts`,
      prompt: 'Which statement about the 988 Suicide & Crisis Lifeline is accurate?',
      right: 'You can call, text, or chat any time of day. It is free and confidential.',
      wrong: [
        ['It is only open on school days.', 'It is open 24/7.'],
        ['It costs money and always tells your parents.', 'It is free and confidential.'],
        ['Only people with a diagnosis can contact it.', 'Anyone can contact it, whether they are in crisis or just need support.'],
      ],
      hint: 'Think "any time, free, private."',
      explain: '988 can be reached by call, text, or chat, 24/7. It is free and confidential (with legal exceptions when someone\'s safety is at risk).',
    }),
  ],
};
