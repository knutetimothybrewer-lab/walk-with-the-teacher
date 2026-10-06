/* Mission 6 data: three fictional case weeks (baseline) + Jordan's 12 playable decisions.
 * Baseline weeks are fixed so scored questions stay valid no matter what the student chooses while playing.
 * Grades follow the worksheet: A = +weight, B = 0, C = -weight.  All characters and numbers are fictional.
 */
(function (root) {
  'use strict';
  var W = root.WWQ = root.WWQ || {};

  W.CASEWEEKS = {
    jordan: {
      id: 'jordan', name: 'Jordan', rows: {
        sleep: 'CCBCBAB', nutrition: 'BCCBBAB', hydration: 'CBCCBBA', movement: 'BCCCBAB',
        screens: 'CCCBCBC', stress: 'CBCCBBA', focus: 'BCBCBBA', rest: 'CCBCBAB',
        selftalk: 'BCBCBBA', express: 'BBCBBBB', setbacks: 'BBBCCBB', gratitude: 'BBBBCBA',
        peer: 'BBBBBBB', connect: 'BBCBAAA', conflict: 'BBBCBBA', kindness: 'BABBBAA',
        space: 'CCCBCBB', outdoors: 'CBCCBAB', studyenv: 'CCCCCBB', sustain: 'BBBBBBA'
      },
      bio: 'Jordan shares a room with a younger sibling and rides the bus. Money is tight.',
      constraints: ['noisy shared room', 'bus leaves at 5:30', 'works Thursday evening', 'little money'],
      revisions: [
        { id: 'r1', feasible: true, targets: 'env', cat: 'studyenv', days: [0, 1, 2], to: 'A', t: 'Use the free library quiet hour Mon–Wed, then take the 5:30 bus.' },
        { id: 'r2', feasible: true, targets: 'env', cat: 'studyenv', days: [0, 1, 2, 3], to: 'B', t: 'Borrow headphones and use a study checklist Mon–Thu.' },
        { id: 'r3', feasible: true, targets: 'phys', cat: 'sleep', days: [0], to: 'A', t: 'Set a Monday lights-out and skip the late game.' },
        { id: 'r4', feasible: false, targets: 'env', cat: 'studyenv', days: [0, 1, 2], to: 'A', t: 'Rent a private study room across town daily (about $15).' }
      ],
      state: 'Jordan needs a study plan that works despite the noisy room and tight money.',
      wrongState: ['Jordan should just try harder and ignore the noise.', 'Jordan should earn maximum points everywhere.', 'Jordan should avoid the sibling.']
    },
    maya: {
      id: 'maya', name: 'Maya', rows: {
        sleep: 'AABABAB', nutrition: 'ABABAAB', hydration: 'AAABABA', movement: 'AAAAABA',
        screens: 'BCBCBCC', stress: 'BCCBBCB', focus: 'BBABABB', rest: 'CCBCCBB',
        selftalk: 'BBCBBBB', express: 'CBBCBBB', setbacks: 'BBBBCBB', gratitude: 'BABBBBA',
        peer: 'BCBBBBB', connect: 'CCBCBCB', conflict: 'BBCBBBB', kindness: 'BBBABBB',
        space: 'ABBABBA', outdoors: 'ABABBAB', studyenv: 'BABABBB', sustain: 'BBABBBB'
      },
      bio: 'Maya swims early, works weekends and uses her phone as alarm, music and planner. Sleep, food and movement are strong.',
      constraints: ['6 a.m. practice; phone is her alarm', 'about 20 minutes before the bus', 'cannot drop weekend shifts'],
      revisions: [
        { id: 'r1', feasible: true, targets: 'ment', cat: 'rest', days: [0, 1, 3, 4], to: 'A', t: 'Add a 10-minute no-screen wind-down after practice Mon, Tue, Thu, Fri.' },
        { id: 'r2', feasible: true, targets: 'ment', cat: 'screens', days: [1, 3, 5], to: 'B', t: 'Use app timers; charge the phone across the room after 9:30 Tue, Thu, Sat.' },
        { id: 'r3', feasible: true, targets: 'phys', cat: 'movement', days: [5], to: 'A', t: 'Add a Saturday bike ride with a teammate.' },
        { id: 'r4', feasible: false, targets: 'ment', cat: 'rest', days: [0, 1, 3, 4], to: 'A', t: 'Quit the team and the job so afternoons are free.' }
      ],
      state: 'Maya needs realistic mental downtime without giving up practice or shifts.',
      wrongState: ['Maya should add more exercise; it matters most.', 'Maya should stop worrying; her total is positive.', 'Maya should drop all her commitments.']
    },
    eli: {
      id: 'eli', name: 'Eli', rows: {
        sleep: 'BBCCBBC', nutrition: 'BBBCBBA', hydration: 'BBABBBB', movement: 'ABBABAB',
        screens: 'BCBCBBC', stress: 'BBBCCBB', focus: 'BBBBCCB', rest: 'BBBBBBC',
        selftalk: 'BCBBBCB', express: 'BBBCBBB', setbacks: 'BBCBBCB', gratitude: 'BBABBBB',
        peer: 'BBBBBBB', connect: 'ABBABAB', conflict: 'BBBBBCB', kindness: 'BBABBBB',
        space: 'CBCBBCB', outdoors: 'BCBBBBB', studyenv: 'CCCCBCB', sustain: 'BBBBBBB'
      },
      bio: 'Eli lives with two siblings in a busy apartment, has no car, and little money. Eli keeps up with friends.',
      constraints: ['shares a noisy kitchen table', 'club bus runs Tue and Thu', 'no money for paid spaces'],
      revisions: [
        { id: 'r1', feasible: true, targets: 'env', cat: 'studyenv', days: [1, 3], to: 'A', t: 'Use the school library after the Tue and Thu club bus.' },
        { id: 'r2', feasible: true, targets: 'env', cat: 'space', days: [0, 2, 5], to: 'B', t: 'Clear a desk corner for 5 minutes Mon, Wed, Sat.' },
        { id: 'r3', feasible: true, targets: 'phys', cat: 'sleep', days: [3], to: 'A', t: 'Set a Thursday lights-out; phone on the charger.' },
        { id: 'r4', feasible: false, targets: 'env', cat: 'studyenv', days: [0, 1, 2, 3], to: 'A', t: 'Pay for a downtown co-working desk (about $10 a day).' }
      ],
      state: 'Eli needs a quieter way to study that fits the bus schedule and a tight budget.',
      wrongState: ['Eli should wait until after midnight for quiet.', 'Eli should focus only on the physical domain.', 'Eli should max out one category.']
    }
  };

  /* Jordan's playable week: 12 consequential decisions, one scored cell each (no double counting). */
  W.DECISIONS = [
    { id: 'd1', day: 0, cat: 'sleep', scene: 'Mon night: big test tomorrow; friends are gaming.', opts: {
      A: 'Study 30 minutes, lights out on time.', B: 'One match, sleep near midnight.', C: 'Play until 2 a.m., cram.' },
      ripple: 'Less sleep can hurt focus and mood. Each is scored in its own row.',
      rule: 'Worksheet rule: A is about 7–9 hours. CDC lists 8–10 for ages 13–17.' },
    { id: 'd2', day: 0, cat: 'studyenv', scene: 'The shared room is loud (sibling watching videos).', opts: {
      A: 'Free library quiet hour; catch the 5:30 bus.', B: 'Headphones, no-lyrics playlist.', C: 'Study on the bed with the TV on.' },
      ripple: 'Noise slows studying and can raise stress.' },
    { id: 'd3', day: 1, cat: 'nutrition', scene: 'Tue: no breakfast; long lunch line.', opts: {
      A: 'Free school breakfast or a packed lunch.', B: 'Only a granola bar.', C: 'Skip meals; buy a soda.' },
      ripple: 'Going without food hurts afternoon energy and focus.' },
    { id: 'd4', day: 1, cat: 'screens', scene: 'Tue night: the phone keeps buzzing.', opts: {
      A: '30-minute limit; charge across the room.', B: 'Scroll an hour, then stop.', C: 'Scroll until very late.' },
      ripple: 'Late scrolling can cut sleep; Sleep is scored separately.' },
    { id: 'd5', day: 2, cat: 'stress', scene: 'Wed: two assignments due Friday, plus a shift.', opts: {
      A: 'List tasks, start two, ask about an extension.', B: 'Do the easy ones and hope.', C: 'Freeze and panic at night.' },
      ripple: 'Handling workload well helps sleep, focus and mood.' },
    { id: 'd6', day: 2, cat: 'hydration', scene: 'Wed slump: energy drinks nearby, a fountain too.', opts: {
      A: 'Refill the water bottle; eat a snack.', B: 'Half an energy drink, some water.', C: 'Energy drink only.' },
      ripple: 'Small (±1) choices still add up over a week.' },
    { id: 'd7', day: 3, cat: 'conflict', scene: 'Thu: a friend posted something that stung.', opts: {
      A: 'Wait, then use “I” statements or ask an adult.', B: 'Ignore the friend for now.', C: 'Reply with a sharp comment.' },
      ripple: 'How conflict is handled affects friendships and stress.' },
    { id: 'd8', day: 3, cat: 'movement', scene: 'Thu: no gym this week; bus home; sibling duty.', opts: {
      A: 'Walk the long way, then 15 minutes at home.', B: 'A few stretches (about 10 minutes).', C: 'Sit all evening.' },
      ripple: 'Movement can lift mood and help sleep.',
      rule: 'Worksheet rule: A is about 30 minutes. CDC youth guidance is 60+ a day; 30 is a helpful step.' },
    { id: 'd9', day: 4, cat: 'setbacks', scene: 'Fri: the test score is lower than hoped.', opts: {
      A: 'Review mistakes; get teacher help.', B: 'Put the test away unread.', C: '“I’m bad at science”; stop trying.' },
      ripple: 'Self-talk and effort after a setback shape what happens next.' },
    { id: 'd10', day: 4, cat: 'peer', scene: 'Fri hangout: someone offers a vape: “everyone does it.”', opts: {
      A: 'Say no, suggest something else, text an adult if pushed.', B: 'Say “maybe later”; drift away.', C: 'Take it to fit in.' },
      ripple: 'Peer pressure choices connect to safety and friendships.' },
    { id: 'd11', day: 5, cat: 'express', scene: 'Sat: Jordan feels overwhelmed.', opts: {
      A: 'Tell a friend or write it down.', B: 'Say “I’m fine”; stay busy.', C: 'Bottle it up, then snap at family.' },
      ripple: 'Naming feelings makes them easier to handle.' },
    { id: 'd12', day: 6, cat: 'outdoors', scene: 'Sun: cloudy; Jordan could stay in all day.', opts: {
      A: '20-minute walk with a friend.', B: 'Sit on the porch 10 minutes.', C: 'Stay indoors all day.' },
      ripple: 'Time outside can support mood and energy.' }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
