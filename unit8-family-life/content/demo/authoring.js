'use strict';
// PUBLIC DEMO / TEST FIXTURE. This set exists to try the interface and to drive the automated tests.
// It is deliberately about neutral practice topics, because its answer keys ship publicly with the demo.
// Real assessment keys live ONLY in the private item bank (see docs/SECURITY.md).

module.exports = {
  meta: { title: 'Practice Run', subtitle: 'Try the interface. Nothing here is recorded.', contentSet: 'demo', version: 'demo-1' },
  objectives: { DEMO: { basis: 'standard', text: 'Practice the interface.' } },
  decisionModel: {
    name: 'STOP',
    steps: [
      { letter: 'S', name: 'State', text: 'State the decision or problem.' },
      { letter: 'T', name: 'Think', text: 'Think of options.' },
      { letter: 'O', name: 'Observe', text: 'Observe the possible consequences.' },
      { letter: 'P', name: 'Pick', text: 'Pick a responsible choice and explain why.' }
    ],
    note: 'Practice only.'
  },
  figures: {
    'demo-house': {
      src: 'assets/fig-demo-house.svg', w: 420, h: 380,
      alt: 'A simple house diagram with three numbered markers.',
      desc: 'A house with a triangular roof, a door in the middle and a square window on the right. Marker 1 is at the upper left beside the roof. Marker 2 is at the lower left beside the door. Marker 3 is at the right beside the window.',
      markers: [{ id: 'm1', n: 1, x: 60, y: 60 }, { id: 'm2', n: 2, x: 60, y: 300 }, { id: 'm3', n: 3, x: 360, y: 200 }]
    }
  },
  chapters: [
    {
      id: 'd1', n: 1, title: 'Practice: label, sort, order', theme: 'lab', targetMinutes: 5,
      intro: 'Try the label, sort, and ordering tools. Everything here is practice.',
      units: [
        { id: 'd1-u1', title: 'Label the house', stimulus: [{ t: 'p', text: 'Match each label to a marker.' }], items: [{
          id: 'D1-01', type: 'assign', mode: 'label', figure: 'demo-house', topic: 'Practice labeling', prompt: 'Match each label to the numbered marker. One label is not used.',
          points: 2, cog: 'remember', obj: ['DEMO'], secs: 60,
          targets: [{ k: 'm1', label: 'Marker 1' }, { k: 'm2', label: 'Marker 2' }, { k: 'm3', label: 'Marker 3' }],
          cards: [{ t: 'Roof', to: 'm1' }, { t: 'Door', to: 'm2' }, { t: 'Window', to: 'm3' }, { t: 'Chimney' }],
          hints: ['Look at the shapes first and match the obvious ones.', 'The triangle sits on top of the building; the tall rectangle is where you walk in.'],
          explanation: 'Marker 1 is the roof, marker 2 is the door, marker 3 is the window. There is no chimney in the picture.'
        }] },
        { id: 'd1-u2', title: 'Sort the animals', stimulus: [], items: [{
          id: 'D1-02', type: 'assign', mode: 'classify', topic: 'Practice sorting', prompt: 'Sort each animal into the right group.',
          points: 2, cog: 'understand', obj: ['DEMO'], secs: 60,
          targets: [{ k: 'mam', label: 'Mammal' }, { k: 'bird', label: 'Bird' }],
          cards: [{ t: 'Dog', to: 'mam' }, { t: 'Eagle', to: 'bird' }, { t: 'Whale', to: 'mam' }, { t: 'Owl', to: 'bird' }, { t: 'Cat', to: 'mam' }, { t: 'Penguin', to: 'bird' }],
          hints: ['Think about which animals have feathers.', 'Mammals feed their young milk. Whales do too, even though they live in water.'],
          explanation: 'Dogs, whales, and cats are mammals. Eagles, owls, and penguins are birds.'
        }] },
        { id: 'd1-u3', title: 'Put the steps in order', stimulus: [], items: [{
          id: 'D1-03', type: 'order', topic: 'Practice ordering', prompt: 'Put the steps of washing hands in order.',
          points: 2, cog: 'understand', obj: ['DEMO'], secs: 50,
          steps: ['Wet your hands with clean water.', 'Add soap and lather.', 'Scrub for at least 20 seconds.', 'Rinse your hands well.', 'Dry with a clean towel.'],
          hints: ['Water comes first and drying comes last.', 'You cannot rinse soap that has not been added yet.'],
          explanation: 'Wet, soap, scrub for 20 seconds, rinse, then dry.'
        }] }
      ]
    },
    {
      id: 'd2', n: 2, title: 'Practice: choices and numbers', theme: 'studio', targetMinutes: 5,
      intro: 'Try a story with scenes, a select-all question, and a chart question.',
      units: [
        { id: 'd2-u1', title: 'A short story', stimulus: [{ t: 'note', tone: 'fiction', text: 'Fictional practice story.' }], items: [{
          id: 'D2-01', type: 'single', sceneTitle: 'Scene 1', scene: ['Lee has a science test tomorrow. A friend texts, "Come play a game tonight!"'],
          topic: 'Practice single choice', prompt: 'What is the best first step for Lee?',
          points: 2, cog: 'apply', obj: ['DEMO'], secs: 40,
          options: [
            { t: 'Decide how much study time Lee needs, then reply to the friend honestly.', ok: true, fb: 'Lee plans an hour of studying and texts back, "Maybe after 8!"' },
            { t: 'Ignore the text and also ignore the test, then scroll for a while.', fb: 'Lee scrolls for an hour and feels stressed.' },
            { t: 'Say yes without thinking, then deal with the test later on.', fb: 'Lee plays until late and feels behind.' },
            { t: 'Pretend the phone is broken so there is no need to answer.', fb: 'The friend finds out and feels confused.' },
            { t: 'Wait until the morning to decide anything about the night.', fb: 'The morning arrives and there is no time left.' }
          ],
          hints: ['Think about what Lee needs to know before replying.', 'The best step uses a plan and honest words.'],
          explanation: 'A plan for study time plus an honest reply protects both the test and the friendship. Story continues: Lee studies.'
        }, {
          id: 'D2-02', type: 'single', sceneTitle: 'Scene 2', unlockAfter: 'D2-01', scene: ['After studying, Lee feels ready and checks the phone again.'],
          topic: 'Practice a gated stage', prompt: 'What should Lee do now?',
          points: 2, cog: 'apply', obj: ['DEMO'], secs: 40,
          options: [
            { t: 'Reply to the friend, then go to sleep on time.', ok: true },
            { t: 'Study for three more hours, even though Lee feels ready.' }, { t: 'Skip dinner, then keep working on the review sheet.' }, { t: 'Stay up all night gaming with the friend online.' }, { t: 'Delete the chat so there is nothing left to answer.' }
          ],
          hints: ['Rest helps memory, so think about sleep.', 'One option keeps both the friendship and the sleep.'],
          explanation: 'Replying and sleeping on time balances the friendship and the test.'
        }] },
        { id: 'd2-u2', title: 'Select all that apply', stimulus: [], items: [{
          id: 'D2-03', type: 'multi', topic: 'Practice multi-select', prompt: 'Select all the prime numbers.',
          points: 2, cog: 'analyze', obj: ['DEMO'], secs: 40,
          options: [{ t: '2', ok: true }, { t: '3', ok: true }, { t: '4' }, { t: '5', ok: true }, { t: '6' }, { t: '7', ok: true }, { t: '9' }],
          hints: ['A prime number has exactly two factors.', 'Check each number: can it be divided evenly by anything besides 1 and itself?'],
          explanation: '2, 3, 5, and 7 are prime. 4, 6, and 9 have other factors.'
        }] },
        { id: 'd2-u3', title: 'Read a chart', stimulus: [
          { t: 'note', tone: 'fiction', text: 'Fictional data for this activity.' },
          { t: 'chart', kind: 'groupedBar', id: 'demo-chart', title: 'Steps per day (thousands)', note: 'Fictional data for this activity', yLabel: 'Thousands of steps', max: 12,
            categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], series: [{ name: 'Week 1', values: [4, 6, 5, 7, 8] }, { name: 'Week 2', values: [6, 7, 8, 9, 10] }],
            alt: 'Grouped bars for Monday to Friday. Week 1: 4, 6, 5, 7, 8. Week 2: 6, 7, 8, 9, 10.' }
        ], items: [{
          id: 'D2-04', type: 'numeric', topic: 'Practice numeric answer', prompt: 'How many more thousand steps were taken on Friday of Week 2 than on Monday of Week 1?',
          points: 2, cog: 'analyze', obj: ['DEMO'], secs: 50, numeric: { unit: 'thousand steps', range: [0, 20], decimals: 0, label: 'Difference' }, answer: 6, tolerance: 0,
          hints: ['Find the Friday bar for Week 2 and the Monday bar for Week 1.', 'Subtract the smaller from the larger.'],
          explanation: 'Friday of Week 2 is 10 and Monday of Week 1 is 4. The difference is 6.'
        }] }
      ]
    },
    {
      id: 'd3', n: 3, title: 'Practice: evidence case', theme: 'case', targetMinutes: 4,
      intro: 'Open every document before the questions unlock.',
      units: [{
        id: 'd3-u1', title: 'The notices', readSecs: 20, gate: ['e1', 'e2'],
        stimulus: [{ t: 'evidence', docs: [
          { id: 'e1', title: 'Notice A', kind: 'sheet', tag: 'Practice document', blocks: [{ t: 'list', items: ['Library hours: 9 to 5.', 'Closed on holidays.'] }] },
          { id: 'e2', title: 'Notice B', kind: 'sheet', tag: 'Practice document', blocks: [{ t: 'list', items: ['Gym hours: 3 to 6.', 'Open every day.'] }] }
        ] }],
        items: [{
          id: 'D3-01', type: 'assign', mode: 'classify', topic: 'Practice evidence sort', prompt: 'Decide which statements the notices support.',
          points: 2, cog: 'analyze', obj: ['DEMO'], secs: 50,
          targets: [{ k: 'yes', label: 'Supported by the notices' }, { k: 'no', label: 'Not supported' }],
          cards: [{ t: 'The library opens at 9.', to: 'yes' }, { t: 'The gym closes at 6.', to: 'yes' }, { t: 'The library is open on holidays.', to: 'no' }, { t: 'The gym is closed on weekends.', to: 'no' }, { t: 'The gym opens at 3.', to: 'yes' }],
          hints: ['Check each statement against the exact words in the notices.', 'If the notice does not say it, it is not supported.'],
          explanation: 'The library opens at 9, and the gym is open from 3 to 6. The library is closed on holidays, and the gym is open every day.'
        }, {
          id: 'D3-02', type: 'single', unlockAfter: 'D3-01', topic: 'Practice stage two', prompt: 'Which hours are both places open at the same time on a regular weekday?',
          points: 2, cog: 'evaluate', obj: ['DEMO'], secs: 40,
          options: [{ t: '3 to 5', ok: true }, { t: '9 to 3' }, { t: '5 to 6' }, { t: '6 to 9' }, { t: '9 to 5' }],
          hints: ['Library: 9 to 5. Gym: 3 to 6.', 'Find the overlap between the two time ranges.'],
          explanation: 'The library closes at 5 and the gym opens at 3, so they overlap from 3 to 5.'
        }]
      }]
    }
  ]
};
