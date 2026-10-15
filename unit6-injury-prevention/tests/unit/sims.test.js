'use strict';
// Guards on the simulations: they must teach without displaying the answers to scored questions.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'sims', f), 'utf8');

test('Mission 3 feed never mentions the three scored myths (care, open casket, age/health) or their facts', () => {
  const src = read('feed.js').toLowerCase();
  ['casket', 'try as hard', 'too old', 'age and health', 'declared', 'dressed for the service', 'automatically rule'].forEach((needle) => assert.ok(!src.includes(needle), 'feed.js contains "' + needle + '"'));
});

test('Mission 3 feed: every post has a verdict, a fact and a source, and the six-post minimum is possible', () => {
  const src = read('feed.js');
  const posts = src.match(/\{ id: 'p\d'[^]*?src: '[^']*' \}/g) || [];
  assert.equal(posts.length, 8);
  posts.forEach((p) => { assert.match(p, /truth: '(myth|fact|opinion)'/); assert.match(p, /fact: '/); assert.match(p, /src: '/); });
  assert.ok(posts.filter((p) => /truth: 'myth'/.test(p)).length >= 3 && posts.filter((p) => /truth: 'fact'/.test(p)).length >= 3 && posts.filter((p) => /truth: 'opinion'/.test(p)).length >= 1);
});

test('Mission 1 crash lab does not show the belt or helmet effectiveness percentages, and Mission 2 rescue lab never says "Chain of Survival" in order', () => {
  const crash = read('crash.js');
  ['45%', '60%', '51%', '69%', '65%'].forEach((n) => assert.ok(!crash.includes(n), 'crash.js shows ' + n));
  const rescue = read('rescue.js');
  assert.ok(!/chain of survival/i.test(rescue), 'rescue.js names the chain');
});

test('simulations report only chips that the mission declares', () => {
  const live = path.join(__dirname, '..', '..', 'content', 'items.json');
  const pub = JSON.parse(fs.readFileSync(live, 'utf8'));
  pub.chapters.forEach((c) => c.units.forEach((u) => (u.stimulus || []).filter((b) => b.t === 'sim').forEach((b) => {
    const file = read(b.id + '.js');
    const reported = Array.from(file.matchAll(/api\.report\('([a-z0-9]+)'\)/g)).map((m) => m[1]);
    b.chips.forEach((chip) => assert.ok(reported.includes(chip.id) || file.includes("api.report(S.mode)") || file.includes("api.report(belted"), b.id + ' never reports chip ' + chip.id));
    assert.deepEqual((u.gate || []).slice().sort(), b.chips.map((x) => x.id).sort(), 'unit gate equals the sim chips for ' + b.id);
  })));
});

test('Mission 4 home lab never states the extinguisher classes or what each is for', () => {
  const src = (read('home.js') + read('home-model.js')).toLowerCase();
  ['class a', 'class c', 'wood, paper', 'live electrical', 'burning liquids', 'gasoline'].forEach((needle) => assert.ok(!src.includes(needle), 'home sim contains "' + needle + '"'));
});
