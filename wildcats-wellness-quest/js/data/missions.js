/* Mission and stage map, locations, pacing estimates and short guide dialogue. */
(function (root) {
  'use strict';
  var W = root.WWQ;

  W.MISSIONS = [
    { id: 0, short: 'Welcome', title: 'Welcome to Wildcat High', place: 'gate', placeName: 'Front Gate', est: 2, color: 'navy', max: 0,
      intro: 'Meet Jordan, learn the controls, and try one practice question that does not count.',
      stages: [
        { id: '0.1', title: 'Welcome and setup', kind: 'setup' },
        { id: '0.2', title: 'How this works', kind: 'howto' },
        { id: '0.3', title: 'Practice (not graded)', kind: 'practice' }
      ] },
    { id: 1, short: 'Hub', title: 'Whole-Health Hub', place: 'hub', placeName: 'Wellness Hub', est: 4, color: 'teal', max: 12,
      intro: 'Sort situations by the dimension MOST directly involved, then trace a ripple effect.',
      guide: 'Wellness is active and ongoing, not just the absence of illness.',
      stages: [
        { id: '1.1', title: 'Sort the situations', kind: 'sort', example: 1 },
        { id: '1.2', title: 'Overlap Lab', kind: 'overlap' },
        { id: '1.3', title: 'Ripple effect', kind: 'form' }
      ] },
    { id: 2, short: 'Numbers', title: 'Know Your Numbers', place: 'nurse', placeName: 'Nurse’s Office', est: 5, color: 'coral', max: 16,
      intro: 'Read fictional adult check-up numbers with the reference panel. A reading is a reason for follow-up, never an automatic diagnosis.',
      guide: 'Lower is not always better. An unusual reading means follow up, not panic.',
      stages: [
        { id: '2.1', title: 'What is being measured?', kind: 'form', example: 2 },
        { id: '2.2', title: 'Read the check-up', kind: 'form' },
        { id: '2.3', title: 'Habits and health measures', kind: 'form' },
        { id: '2.4', title: 'Intake desk', kind: 'form' }
      ] },
    { id: 3, short: 'Habits', title: 'Habit Workshop', place: 'workshop', placeName: 'Habit Workshop', est: 5, color: 'gold', max: 18,
      intro: 'Read ratings as information, repair a habit loop, and build a SMART goal.',
      guide: 'A missed day does not erase progress. Habit timing varies by person.',
      stages: [
        { id: '3.1', title: 'Read the ratings', kind: 'form' },
        { id: '3.2', title: 'Repair the habit loop', kind: 'form' },
        { id: '3.3', title: 'Strategies and roadblocks', kind: 'form' },
        { id: '3.4', title: 'SMART repair', kind: 'form' },
        { id: '3.5', title: 'SMART builder', kind: 'form', example: 3, reflection: true }
      ] },
    { id: 4, short: 'Media Lab', title: 'Fact or Fiction Media Lab', place: 'lab', placeName: 'Media Lab', est: 5, color: 'violet', max: 18,
      intro: 'Open every tab on five fictional posts, rate each, and pick the strongest evidence. Some are credible.',
      guide: 'A sales motive deserves scrutiny but does not prove a claim false.',
      stages: [
        { id: '4.1', title: 'Case 1', kind: 'form', example: 4 }, { id: '4.2', title: 'Case 2', kind: 'form' }, { id: '4.3', title: 'Case 3', kind: 'form' },
        { id: '4.4', title: 'Case 4', kind: 'form' }, { id: '4.5', title: 'Case 5', kind: 'form' }, { id: '4.6', title: 'Checklist', kind: 'form' }
      ] },
    { id: 5, short: 'STOP', title: 'STOP Crossroads', place: 'crossroads', placeName: 'Decision Crossroads', est: 4, color: 'green', max: 14,
      intro: 'Use STOP: State, Think, Observe, Pick. More than one choice can be responsible.',
      guide: 'Responsibility is not perfection. Asking for support is a responsible choice.',
      stages: [
        { id: '5.1', title: 'Situation A', kind: 'form', example: 5 }, { id: '5.2', title: 'Situation B', kind: 'form' }, { id: '5.3', title: 'Defend a choice', kind: 'form' }
      ] },
    { id: 6, short: 'Simulator', title: 'Thousand Choices Simulator', place: 'dashboard', placeName: 'Whole-Health Dashboard', est: 7, color: 'indigo', max: 16,
      intro: 'Play Jordan’s week (not scored), then answer questions about fixed case weeks.',
      guide: 'These points are fictional teaching weights, not a health score.',
      stages: [
        { id: '6.1', title: 'Play Jordan’s week', kind: 'play', example: 6 },
        { id: '6.2', title: 'Calculate', kind: 'form' }, { id: '6.3', title: 'Trajectory', kind: 'form' }, { id: '6.4', title: 'Overlooked domain', kind: 'form' },
        { id: '6.5', title: 'Small choices, big sums', kind: 'form' }, { id: '6.6', title: 'STOP revision', kind: 'form' }
      ] },
    { id: 7, short: 'Final', title: 'Final Transfer Challenge', place: 'dashboard', placeName: 'Dashboard Top Floor', est: 4, color: 'navy', max: 6,
      intro: 'A new case: a misleading post, conflicting duties, a wellness pattern and a goal.',
      guide: 'Use facts from the case. Your evidence and reasoning must match your claim.',
      stages: [
        { id: '7.1', title: 'Three decisions', kind: 'form', example: 7 }, { id: '7.2', title: 'Claim, evidence, reasoning', kind: 'form', reflection: true }
      ] }
  ];
  W.MISSION = {}; W.MISSIONS.forEach(function (m) { W.MISSION[m.id] = m; });

  W.AVATARS = [
    { id: 'a1', name: 'Riley', skin: '#f2c9a0', hair: '#3b2a20', hairStyle: 'short', top: '#e4572e', accent: '#ffd166' },
    { id: 'a2', name: 'Sky', skin: '#8d5a3b', hair: '#1c1c28', hairStyle: 'curly', top: '#cc2f7d', accent: '#ffd166' },
    { id: 'a3', name: 'Quinn', skin: '#d9a273', hair: '#8a4b2d', hairStyle: 'long', top: '#7b5ea7', accent: '#ffd166' },
    { id: 'a4', name: 'Dakota', skin: '#5a3825', hair: '#0f0f16', hairStyle: 'bun', top: '#17a2a2', accent: '#ffd166' },
    { id: 'a5', name: 'Sage', skin: '#f6d9c0', hair: '#c9772e', hairStyle: 'wavy', top: '#2f9e44', accent: '#ffd166' }
  ];

  // Stage lookup helpers
  W.stageList = function () { var out = []; W.MISSIONS.forEach(function (m) { m.stages.forEach(function (s) { out.push({ m: m, s: s }); }); }); return out; };
  W.itemsForStage = function (stageId) { return W.ITEMS.filter(function (i) { return i.st === stageId; }); };
  W.estTotal = function () { return W.MISSIONS.reduce(function (s, m) { return s + m.est; }, 0); };
})(typeof window !== 'undefined' ? window : globalThis);
