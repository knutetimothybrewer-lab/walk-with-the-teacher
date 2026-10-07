// Simulation D: branching social-pressure conversation (fictional). The graph is public (it has to run in the
// browser); what the build keeps secret is only WHICH completed paths earn credit (as hashes).
export default {
  title: 'Saturday night at Marcus’s',
  start: 'n1',
  meters: { safety: 60, pressure: 40, options: 50, support: 30 },
  pass: { minSafety: 85, minSupport: 55, maxPressure: 45 },
  nodes: {
    n1: {
      place: 'Kitchen, 9:10 p.m.',
      msgs: [
        { who: 'Jules', text: 'You made it! Marcus’s brother left a vape and some pills out. Everyone’s trying them.' },
        { who: 'Jules', text: 'Come on. You’re the only one just standing there.' }
      ],
      choices: [
        { id: 'c1a', tag: 'passive', text: '“Uh… okay. Maybe just a little.”', fx: { safety: -30, pressure: -10, options: -20, support: -10 }, flag: 'unsafe', next: 'n2' },
        { id: 'c1b', tag: 'aggressive', text: '“That’s so dumb. You’re all idiots.”', fx: { safety: -5, pressure: 25, options: -10, support: -15 }, next: 'n2' },
        { id: 'c1c', tag: 'assertive', text: '“No thanks, I’m good.”', fx: { safety: 10, pressure: 5, options: 5, support: 5 }, next: 'n2' },
        { id: 'c1d', tag: 'delay', text: '“Maybe later…”', fx: { safety: -10, pressure: 15, options: -10, support: 0 }, next: 'n2' },
        { id: 'c1e', tag: 'alternative', text: '“Nah. Is there food? Let’s go see what’s in the other room.”', fx: { safety: 10, pressure: -5, options: 10, support: 5 }, next: 'n2' }
      ]
    },
    n2: {
      place: 'Hallway, 9:25 p.m.',
      msgs: [
        { who: 'Jules', text: 'Seriously? One time won’t hurt. Don’t be lame.' },
        { who: 'Marcus', text: 'He’s gonna judge us all night, lol.', ifTag: ['aggressive'] },
        { who: 'Marcus', text: 'Maybe later turned into never, huh?', ifTag: ['delay'] },
        { who: 'Priya', text: 'I’m getting kind of tired of this party, honestly.', ifTag: ['assertive', 'alternative'] }
      ],
      choices: [
        { id: 'c2a', tag: 'assertive', text: '“I said I’m good. I’m not doing it.”', fx: { safety: 10, pressure: -10, options: 5, support: 0 }, next: 'n3' },
        { id: 'c2b', tag: 'passive', text: '“Fine. Give it here.”', fx: { safety: -30, pressure: -15, options: -20, support: -10 }, flag: 'unsafe', next: 'n3' },
        { id: 'c2c', tag: 'exit', text: '“I’m heading out. See you at school.”', fx: { safety: 15, pressure: -15, options: 10, support: 0 }, next: 'n3' },
        { id: 'c2d', tag: 'support', text: '“Priya, want to walk out with me? I’m texting my mom for a ride.”', fx: { safety: 10, pressure: -15, options: 10, support: 25 }, next: 'n3' },
        { id: 'c2e', tag: 'deflect', text: '“Ha, you’re hilarious. Stop.”', fx: { safety: 0, pressure: 5, options: 0, support: 0 }, next: 'n3' }
      ]
    },
    n3: {
      place: 'Driveway, 9:40 p.m.',
      msgs: [
        { who: 'Rin', text: 'I’m leaving. I had like three beers but I’m fine. Need a ride? I’m right here.' }
      ],
      choices: [
        { id: 'c3a', tag: 'unsafe', text: '“Sure, thanks.”', fx: { safety: -35, pressure: -10, options: -25, support: -10 }, flag: 'unsafe', end: true },
        { id: 'c3b', tag: 'assertive', text: '“I’ll pass on the ride. I’m getting another way home.”', fx: { safety: 15, pressure: -5, options: 5, support: 5 }, next: 'n4' },
        { id: 'c3c', tag: 'aggressive', text: '“You’re so irresponsible. You can’t drive!”', fx: { safety: 5, pressure: 20, options: -5, support: -10 }, next: 'n4' },
        { id: 'c3d', tag: 'alternative', text: '“Let’s call a parent or a rideshare for both of us. I’ll wait with you.”', fx: { safety: 15, pressure: -5, options: 10, support: 15 }, next: 'n4' }
      ]
    },
    n4: {
      place: 'Curb, 9:48 p.m.',
      msgs: [{ who: 'You', text: 'You still need a safe way home. What do you do?', system: true }],
      choices: [
        { id: 'c4a', tag: 'support', text: 'Text a parent: “I’m at Marcus’s on Elm St. Can you pick me up now? I’ll explain in the car.”', fx: { safety: 15, pressure: -10, options: 10, support: 25 }, end: true },
        { id: 'c4b', tag: 'avoid', text: 'Text “never mind, I’m fine” and wait on the curb alone.', fx: { safety: -5, pressure: 0, options: -10, support: -10 }, flag: 'unsafe', end: true },
        { id: 'c4c', tag: 'passive', text: 'Post in the group chat: “someone drive me home plz.”', fx: { safety: -10, pressure: 5, options: -10, support: 0 }, flag: 'unsafe', end: true },
        { id: 'c4d', tag: 'unsafe', text: 'Start walking home alone in the dark.', fx: { safety: -15, pressure: 0, options: -15, support: -5 }, flag: 'unsafe', end: true }
      ]
    }
  }
};
