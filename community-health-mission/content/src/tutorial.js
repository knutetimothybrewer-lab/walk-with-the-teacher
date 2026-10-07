'use strict';
// Ungraded entry tutorial (practice item is checked in the browser and is never recorded).
module.exports = {
  minutes: 3,
  steps: [
    'You are joining the county youth advisory team. Your job: investigate a fictional county, then present an evidence-based plan.',
    'Click a glowing place on the county map to travel there. Each place has a mission, an investigation panel, and scored questions.',
    'Exploring is free and unlimited. Only pressing Submit on a question uses an attempt, and every question gives you three submitted attempts.',
    'Credit for a question: correct on attempt 1 = 100%, attempt 2 = 85%, attempt 3 = 75%, never correct = 0%.',
    'You can use the keyboard (Tab, arrow keys, Enter, Space) for everything. Use the Motion toggle in the top bar to turn animations off.'
  ],
  practice: {
    prompt: 'Practice question (not scored): which button uses up an attempt on a real question?',
    options: [{ id: 'a', t: 'Selecting an answer choice' }, { id: 'b', t: 'Submit' }, { id: 'c', t: 'Exploring the map' }],
    correct: 'b',
    feedback: 'Right. Selecting and exploring never use an attempt; Submit does.'
  }
};
