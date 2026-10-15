'use strict';
// Mission 4 model: plan checks, the two fire runs, and the first-aid bench.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const url = require('url');
const load = () => import(url.pathToFileURL(path.join(__dirname, '..', '..', 'js', 'sims', 'home-model.js')).href);

const goodPlan = (M) => ({ alarms: [{ x: 160, y: 120 }, { x: 360, y: 120 }, { x: 300, y: 250 }], routes: { br1: ['br1-door', 'br1-window'], br2: ['br2-door', 'br2-window'] }, meet: 'mailbox' });

test('an empty plan is incomplete and says what is missing', async () => {
  const M = await load(); const r = M.checkPlan(M.newPlan());
  assert.equal(r.ok, false); assert.equal(r.items.length, 6); assert.ok(r.items.every((i) => !i.ok));
});

test('a plan with alarms in both bedrooms and the hall, two ways out of each bedroom and a good spot passes', async () => {
  const M = await load(); assert.equal(M.checkPlan(goodPlan(M)).ok, true);
});

test('the plan rules: hall alarm, one way out must reach outside, and the meeting spot must be far and fixed', async () => {
  const M = await load();
  const noHall = goodPlan(M); noHall.alarms.pop(); assert.equal(M.checkPlan(noHall).items.find((i) => i.id === 'alarm-hall').ok, false);
  const inside = goodPlan(M); inside.routes.br2 = ['br2-door', 'br2-bathdoor'];
  const br2 = M.checkPlan(inside).items.find((i) => i.id === 'exits-br2'); assert.equal(br2.ok, false); assert.match(br2.detail, /straight outside/);
  const one = goodPlan(M); one.routes.br1 = ['br1-window']; assert.equal(M.checkPlan(one).items.find((i) => i.id === 'exits-br1').ok, false);
  ['steps', 'car'].forEach((s) => { const p = goodPlan(M); p.meet = s; assert.equal(M.checkPlan(p).items.find((i) => i.id === 'meet').ok, false, s); });
  ['mailbox', 'tree'].forEach((s) => { const p = goodPlan(M); p.meet = s; assert.equal(M.checkPlan(p).ok, true, s); });
  assert.equal(M.roomAt(300, 250).id, 'hall'); assert.equal(M.roomAt(5, 5), null);
});

const play = (M, id, plan, ids) => { let st = M.startRun(id); ids.forEach((c) => { st = M.applyChoice(st, c, plan); }); return st; };

test('night fire: getting low, using the window, closing the door and going to the meeting spot ends safely and quickly', async () => {
  const M = await load(); const st = play(M, 'night', goodPlan(M), ['low', 'window', 'close', 'meet']);
  assert.equal(st.outcome, 'safe'); assert.ok(st.t < 40 && st.exposure < 25, 'time ' + st.t + ' exposure ' + st.exposure);
});

test('night fire: standing, opening the door, running the hall, hiding and going back in are worse', async () => {
  const M = await load(), plan = goodPlan(M);
  const best = play(M, 'night', plan, ['low', 'window', 'close', 'meet']);
  const slow = play(M, 'night', plan, ['phone', 'window', 'close', 'meet']);
  assert.equal(slow.outcome, 'safe'); assert.ok(slow.t > best.t + 15 && slow.exposure > best.exposure, 'grabbing things costs time and smoke');
  assert.equal(play(M, 'night', plan, ['wait']).outcome, 'fail');
  assert.equal(play(M, 'night', plan, ['low', 'dash']).outcome, 'fail');
  assert.equal(play(M, 'night', plan, ['low', 'window', 'close', 'back']).outcome, 'fail');
  assert.ok(play(M, 'night', plan, ['open', 'window', 'leave', 'meet']).exposure > best.exposure, 'opening the door and leaving it open adds smoke');
});

test('night fire needs the second way out on the plan, and a good meeting spot to finish', async () => {
  const M = await load(); const p = goodPlan(M); p.routes.br2 = ['br2-door']; p.meet = 'car';
  const st = play(M, 'night', p, ['low', 'window']);
  assert.equal(st.step, 's1', 'the window choice is refused: it is not on the plan');
  const win = M.SCENARIOS.night.steps.s1.choices.find((c) => c.id === 'window'); assert.equal(M.choiceAvailable(win, p).ok, false);
  const meet = M.SCENARIOS.night.steps.s3.choices.find((c) => c.id === 'meet'); assert.equal(M.choiceAvailable(meet, p).ok, false);
});

test('kitchen fire: the wrong extinguisher keeps you on the step; the right one, stop-drop-roll and reporting end safely', async () => {
  const M = await load(), plan = goodPlan(M);
  let st = M.startRun('kitchen');
  st = M.applyChoice(st, 'fight', plan); assert.equal(st.step, 'k1');
  st = M.applyChoice(st, 'A', plan); assert.equal(st.step, 'k1'); assert.equal(st.wrong, 1); assert.equal(st.outcome, null);
  st = M.applyChoice(st, 'C', plan); assert.equal(st.wrong, 2);
  st = M.applyChoice(st, 'B', plan); assert.equal(st.step, 'k2');
  st = M.applyChoice(st, 'sdr', plan); st = M.applyChoice(st, 'report', plan);
  assert.equal(st.outcome, 'safe');
  assert.equal(play(M, 'kitchen', plan, ['water']).outcome, 'fail');
  assert.equal(play(M, 'kitchen', plan, ['leave']).outcome, 'safe');
  assert.equal(play(M, 'kitchen', plan, ['fight', 'B', 'run']).outcome, 'fail');
});

test('smoke: crawling stays under the layer for the first minute, standing does not', async () => {
  const M = await load();
  assert.equal(M.exposureGain(0, 20, M.HEAD.crawl, 0), 0);
  assert.ok(M.exposureGain(10, 30, M.HEAD.stand, 0) > 10);
  assert.ok(M.smokeLayer(60, 0) > M.smokeLayer(10, 0));
});

test('bench: the cut and burn steps must come in order, and unsafe choices are refused with a reason', async () => {
  const M = await load();
  assert.equal(M.benchPick('scrape', [], 'wash').advance, true);
  assert.equal(M.benchPick('scrape', [], 'rinse').advance, false, 'out of order');
  assert.equal(M.benchPick('scrape', ['wash'], 'press').advance, true);
  assert.match(M.benchPick('burn', [], 'butter').text, /ice, butter or toothpaste/);
  assert.match(M.benchPick('burn', [], 'sticky').text, /sticky/);
  assert.equal(M.benchPick('burn', [], 'cool').advance, true);
  assert.equal(M.benchPick('burn', ['cool', 'cover'], 'blister').advance, true);
  assert.equal(M.benchDecide('infected', 'help').ok, true); assert.equal(M.benchDecide('infected', 'self').ok, false);
  assert.equal(M.benchDecide('outlet', 'help').ok, true);
});
