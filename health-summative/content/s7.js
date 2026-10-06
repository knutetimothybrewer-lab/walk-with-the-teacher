import { mc, multi, sort } from './dsl.js';

const B = 'B · Understanding Emotional Health (Guided Notes + slides)';

export default {
  id: 's7', title: 'Red Flags & Safety', short: 'Red flags', topic: 'EH', alert: true,
  blurb: 'Some signs mean get an adult involved now. You do not need to know the cause or the diagnosis first. Safety comes before certainty.',
  what: ['Sort red flags from "worth noticing" and "typical bad day"', 'Practice what to do (and what not to do)', 'See why safety overrides uncertainty'],
  callout: 'This station is about recognizing signs and getting an adult. It does not describe how anyone would hurt themselves. You can skip any question, and the Need help? button is always at the top.',
  farewell: 'Noticing and telling a trusted adult is always the right call.',
  entries: [
    sort('s7-01', {
      level: 'apply', sensitive: true, skin: 'radar', alert: true, src: `${B} › Red flags (safety overrides uncertainty)`,
      prompt: 'Red Flags Radar: sort each sign.',
      slots: [['r', 'Red flag: get an adult now', ''], ['w', 'Worth noticing: check in', ''], ['t', 'Typical bad day', '']],
      cards: [
        ['Talks about wanting to die or to disappear', 'r'],
        ['Gives away favorite belongings or says goodbye as if it were final', 'r'],
        ['Suddenly seems calm right after a long stretch of deep distress', 'r'],
        ['Has been withdrawn and skipping lunch for a couple of weeks', 'w'],
        ['Is grumpy after a bad grade but joking with friends by lunch', 't'],
        ['Is nervous the night before a tryout', 't'],
      ],
      hint: 'Red flags are about safety. If safety might be at risk, get an adult. Longer patterns need a check-in. One tough moment is a typical bad day.',
      explain: 'Red flags include: talking about wanting to die or disappear; giving away belongings or saying goodbye; sudden calm after deep distress; signs of self-harm or talk of hurting self or others; and a drastic, rapid change in behavior or mood. Safety overrides uncertainty.',
    }),
    mc('s7-02', {
      level: 'apply', sensitive: true, alert: true, src: `${B} › You don't need the diagnosis before getting an adult involved`,
      prompt: 'You are not sure what is going on, but a friend said something that sounded like wanting to disappear. What should you do?',
      right: 'Get a trusted adult involved now; you do not need to know the cause first.',
      wrong: [
        ['Wait and see if it gets worse so that you can be sure it is serious.', 'Waiting can be risky. Safety overrides uncertainty.'],
        ['Figure out exactly what is wrong first.', 'You are not the investigator. Getting an adult is the first step.'],
        ['Keep it between you two so you do not betray their trust.', 'A friend\'s safety matters more than keeping this private.'],
      ],
      hint: 'Safety overrides uncertainty.',
      explain: 'You do not have to know the diagnosis or the cause. If there is a red flag, tell a trusted adult or the counselor, and stay with your friend if you can. Call or text 988 together, or call 911 if someone is in immediate danger.',
    }),
    mc('s7-04', {
      level: 'apply', sensitive: true, alert: true, src: `${B} › Do not keep it a secret, even if asked`,
      prompt: 'A friend tells you something that makes you worry they might be unsafe, and says, "Promise you will not tell anyone." What is the best response?',
      right: '"I care too much to keep this secret. Let me go with you to talk to someone."',
      wrong: [
        ['"I promise. I will not tell anyone, no matter what you say."', 'A promise of total secrecy can leave you the only helper, and that is not safe.'],
        ['Say nothing, give your friend some space, and hope it gets better soon.', 'Silence leaves your friend without support.'],
        ['Tell everyone in your friend group so they can all help.', 'Spreading it around can hurt your friend. Go to a trusted adult.'],
      ],
      hint: 'You can care about their privacy and still need help to keep them safe.',
      explain: 'Do not promise absolute secrecy. Be warm, say why you need help, and connect them to a trusted adult or counselor.',
    }),
    mc('s7-06', {
      level: 'analyze', sensitive: true, alert: true, src: `${B} › Sudden calm after deep distress`,
      prompt: 'Why might "suddenly calm after a long stretch of deep distress" be on the red flag list?',
      right: 'A sudden, unexplained shift like this is a reason to check in and bring in an adult.',
      wrong: [
        ['Because being calm is always a bad sign.', 'Calm is usually good. The warning is about a sudden, unexplained change after deep distress.'],
        ['Because it proves a diagnosis.', 'Red flags are not diagnoses. They tell you when to get an adult.'],
        ['Because calm is simply a good sign and there is nothing to act on.', 'A sudden change can be a warning sign, so check in.'],
      ],
      hint: 'Think about how much it changed and how fast.',
      explain: 'Drastic, rapid changes, including sudden calm after deep distress, are red flags. They are a reason to check in and bring in an adult.',
    }),
  ],
};
