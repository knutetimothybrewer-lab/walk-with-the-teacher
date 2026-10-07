'use strict';
// DEMO assessment: separate fictional content, 4 tiny units. It exercises the same engine but is NOT the graded assessment.
const mk = (id, key, title, place, units) => ({ id, key, title, place, mission: 'Demo mission: try the controls and the scoring rules. Nothing here is graded or sent to a teacher.', colors: { a: '#0f766e', b: '#e6f4f1' }, minutes: 2, explorer: { kind: 'plain', data: { note: 'DEMO: this panel is a placeholder for the real investigation tool.' } }, units });
const mods = [
  mk(1, 'neighborhood', 'Demo: Maple Street', 'Demo Map Stop 1', [
    { id: 'D-U1', points: 50, minutes: 1, target: 'DEMO', dok: 1, cog: 'recall', title: 'Demo single choice', prompt: 'A bus that runs once an hour is mostly an example of which condition?',
      fields: [{ id: 'f1', type: 'single', options: [{ id: 'a', t: 'Transportation' }, { id: 'b', t: 'Housing' }, { id: 'c', t: 'Air quality' }], key: 'a' }],
      hints: ['Think about how people get places.', 'Which condition is about getting from one place to another?'], explain: 'Bus schedules are transportation.', rubric: 'a', src: [] },
    { id: 'D-U2', points: 50, minutes: 1, target: 'DEMO', dok: 2, cog: 'apply', title: 'Demo numeric + multi', prompt: 'Answer both parts.',
      fields: [{ id: 'n', type: 'num', label: '12 of 40 students walk to school. What percent?', unit: '%', key: { v: 30, tol: 0.5 } },
        { id: 'm', type: 'multi', label: 'Select all that are environmental influences', options: [{ id: 'a', t: 'No sidewalk' }, { id: 'b', t: 'Skipping breakfast' }, { id: 'c', t: 'Poor air quality' }], key: ['a', 'c'] }],
      hints: ['Percent = part / whole x 100.', 'Environmental influences are about surroundings.'], explain: '12/40 = 30%. No sidewalk and air quality are environmental.', rubric: 'n 30±0.5; set {a,c}', src: [] }
  ])
];
module.exports = { mods, simplans: {} };
