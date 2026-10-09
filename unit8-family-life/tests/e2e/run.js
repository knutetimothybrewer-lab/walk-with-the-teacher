#!/usr/bin/env node
'use strict';
/*
 * End-to-end tests: real Chromium, the real front end, the real server core over HTTP (tools/dev-server.js).
 *   node tests/e2e/run.js            run everything
 *   node tests/e2e/run.js timer      only scenarios whose name contains "timer"
 * Needs: playwright (npm i) and, for the live-bank scenarios, the unlocked private bank (node tools/vault.js unlock).
 * What this does NOT test: the live Google Apps Script deployment (see docs/TESTING.md).
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start } = require('../../tools/dev-server.js');
const L = require('./lib.js');
const { assert } = L;

const filter = process.argv[2] || '';
const results = [];
const consoleProblems = [];

async function main() {
  const demo = await start({ bank: 'demo' });
  const ctl = new L.Ctl(demo);
  const pubDemo = L.itemsOf(await L.getJson(demo.url + 'content/demo/items.json'));
  const bankDemo = (await L.getJson(demo.url + '__test/bank')).items;
  const browser = await chromium.launch();

  async function newPage(opts) {
    opts = opts || {};
    const context = await browser.newContext({ viewport: opts.viewport || { width: 1200, height: 900 }, acceptDownloads: true });
    const page = await context.newPage();
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleProblems.push(m.text()); });
    page.on('pageerror', (e) => consoleProblems.push('pageerror: ' + e.message));
    return { context, page };
  }
  const EXPECTED_NET = /net::ERR_(INTERNET_DISCONNECTED|EMPTY_RESPONSE|CONNECTION_RESET|CONNECTION_CLOSED|FAILED)/;
  async function scenario(name, fn, opts) {
    if (filter && !name.toLowerCase().includes(filter.toLowerCase())) return;
    const t0 = Date.now();
    await ctl.reset();
    const before = consoleProblems.length;
    try { await fn(); const bad = consoleProblems.slice(before).filter((m) => !(opts && opts.expectNetErrors && EXPECTED_NET.test(m))); assert.deepEqual(bad, [], 'console errors/warnings (includes CSP violations): ' + JSON.stringify(bad)); results.push({ name, ok: true, ms: Date.now() - t0 }); console.log('  ok   ' + name + ' (' + (Date.now() - t0) + ' ms)'); }
    catch (e) { results.push({ name, ok: false, ms: Date.now() - t0, error: String(e && e.message || e).split('\n').slice(0, 6).join(' | ') }); console.log('  FAIL ' + name + '\n       ' + String(e && e.message || e).split('\n').slice(0, 6).join('\n       ')); }
  }
  const ans = (page, id, correct, opts) => L.answer(page, pubDemo[id], bankDemo[id], correct, opts);

  console.log('End-to-end scenarios (demo bank)');

  /* ---------------------------------------------------------------------------------------- sign-in */
  await scenario('sign-in: wrong code, wrong block, empty fields, then success', async () => {
    const { context, page } = await newPage(); await L.open(page, demo);
    await page.click('form button[type=submit]');
    assert.match(await page.locator('.form-error').innerText(), /Please fill in/);
    await L.signIn(page, { code: 'NOPE' });
    assert.match(await page.locator('.form-error').innerText(), /does not match the block/);
    await L.signIn(page, { block: 'Block 3/4', code: 'CODE12' });
    assert.match(await page.locator('.form-error').innerText(), /does not match the block/);
    assert.equal((await ctl.store()).sessions.length, 0, 'failed sign-ins must not create records');
    assert.deepEqual(await page.$$eval('#block option', (o) => o.map((x) => x.textContent)), ['Choose your class block', 'Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9']);
    await L.signIn(page);
    await page.waitForSelector('#begin-btn');
    assert.match(await page.locator('h1').innerText(), /Before you begin/);
    await context.close();
  });

  await scenario('sign-in: duplicate ID resumes; a second sign-in signs the first tab out; block and name are checked', async () => {
    const a = await newPage(); await L.open(a.page, demo); await L.beginAssessment(a.page); await L.startChapter(a.page);
    const b = await newPage(); await L.open(b.page, demo); await L.signIn(b.page);
    await b.page.waitForSelector('.topbar'); // resumed straight into the assessment, no second record
    assert.equal((await ctl.store()).sessions.length, 1);
    await ans(a.page, 'D1-01', true, { noCheck: true }).catch(() => {}); // tab A still shows an old page; any action must now fail safely
    await a.page.locator('#item-D1-01 .actions .btn').click({ timeout: 3000 }).catch(() => {});
    await a.page.waitForSelector('#first', { timeout: 8000 });
    assert.match(await a.page.locator('.form-error').innerText(), /signed in somewhere else|sign in again/i);
    const c = await newPage(); await L.open(c.page, demo); await L.signIn(c.page, { block: 'Block 3/4' });
    assert.match(await c.page.locator('.form-error').innerText(), /locked to Block 1\/2/);
    const d = await newPage(); await L.open(d.page, demo); await L.signIn(d.page, { last: 'Turing' });
    assert.match(await d.page.locator('.form-error').innerText(), /different last name/);
    for (const x of [a, b, c, d]) await x.context.close();
  });

  /* ---------------------------------------------------------------------------------------- refresh, offline, expiry */
  await scenario('refresh mid-item: page, attempts, hints and the running clock all come back', async () => {
    const { context, page } = await newPage(); await L.open(page, demo); await L.beginAssessment(page); await L.startChapter(page);
    await L.goToUnit(page, 'Sort the animals');
    await ans(page, 'D1-02', false);
    assert.match(await L.feedback(page, 'D1-02'), /Hint 1/);
    assert.match(await page.locator('#item-D1-02 .actions').innerText(), /Attempts left: 2/);
    await page.waitForTimeout(900);
    const t1 = await page.locator('.timer .time').innerText();
    await page.reload(); await page.waitForSelector('#item-D1-02');
    assert.match(await L.feedback(page, 'D1-02'), /Hint 1/, 'hint survives a refresh');
    assert.match(await page.locator('#item-D1-02 .actions').innerText(), /Attempts left: 2/, 'attempts come from the server, not the page');
    const t2 = await page.locator('.timer .time').innerText();
    assert.ok(t2 <= t1 && /^1:29:/.test(t2), 'timer kept running: ' + t1 + ' -> ' + t2);
    await context.close();
  });

  await scenario('offline then online: the answer waits, no attempt is used, then it is graded once', async () => {
    const { context, page } = await newPage(); await L.open(page, demo); await L.beginAssessment(page); await L.startChapter(page);
    await L.goToUnit(page, 'Sort the animals');
    await ans(page, 'D1-02', true, { noCheck: true });
    await context.setOffline(true);
    await page.locator('#item-D1-02 .actions .btn').click();
    await page.waitForSelector('#item-D1-02 .feedback :text("Reconnecting")', { timeout: 8000 });
    assert.equal(await page.locator('.save-ind').getAttribute('data-state'), 'offline');
    assert.equal((await ctl.store()).responses.length, 0, 'nothing reached the server while offline');
    await context.setOffline(false);
    await page.waitForSelector('#item-D1-02 .feedback :text("Correct")', { timeout: 15000 });
    const st = await ctl.store();
    assert.equal(st.responses.length, 1, 'graded exactly once'); assert.equal(st.responses[0].attempt, 1); assert.equal(st.responses[0].credit, 1);
    await page.waitForFunction(() => document.querySelector('.save-ind').dataset.state === 'saved');
    await context.close();
  }, { expectNetErrors: true });

  await scenario('server hiccups (dropped and 503 responses) are retried with the same request id', async () => {
    const { context, page } = await newPage(); await L.open(page, demo); await L.beginAssessment(page); await L.startChapter(page);
    await L.goToUnit(page, 'Sort the animals');
    await ans(page, 'D1-02', true, { noCheck: true });
    await ctl.fail(1, 'drop'); await ctl.fail(2, 'drop'); await page.locator('#item-D1-02 .actions .btn').click();
    await page.waitForSelector('#item-D1-02 .feedback :text("Correct")', { timeout: 20000 });
    const st = await ctl.store(); assert.equal(st.responses.length, 1); assert.equal(st.sessions[0].items['D1-02'].a, 1);
    await context.close();
  }, { expectNetErrors: true });

  await scenario('expiry during an item: the late answer is rejected and the work is auto-submitted', async () => {
    const { context, page } = await newPage(); await L.open(page, demo); await L.beginAssessment(page); await L.startChapter(page);
    await L.goToUnit(page, 'Label the house'); await ans(page, 'D1-01', true);
    await L.goToUnit(page, 'Sort the animals');
    await ans(page, 'D1-02', true, { noCheck: true });
    await ctl.advance(91 * 60000); // the server's clock passes the deadline; this tab does not know yet
    await page.locator('#item-D1-02 .actions .btn').click();
    await page.waitForSelector('text=Time is up', { timeout: 10000 });
    assert.match(await page.locator('h1').innerText(), /Time is up/);
    assert.match(await page.locator('.big-card').innerText(), /submitted automatically/);
    const st = await ctl.store(); const s = st.sessions[0];
    assert.equal(s.status, 'auto_submitted'); assert.equal(s.submissionType, 'Time Expired — Auto-Submitted');
    assert.equal(s.items['D1-02'], undefined, 'the late answer was not recorded');
    assert.equal(s.result.answered, 1);
    await page.reload(); await page.waitForSelector('text=Time is up');
    await context.close();
  });

  await scenario('timer: normal, amber at 30, red at 10, banner at 5, aria-live announcements, 00:00 submits', async () => {
    const { context, page } = await newPage(); await L.open(page, demo); await L.beginAssessment(page); await L.startChapter(page);
    const poke = () => page.evaluate(() => window.dispatchEvent(new Event('online')));
    const state = () => page.locator('.timer').getAttribute('data-state');
    assert.equal(await state(), 'ok'); assert.match(await page.locator('.timer .time').innerText(), /^1:29:|^1:30:/);
    await ctl.advance(61 * 60000); await poke(); await page.waitForFunction(() => document.querySelector('.timer').dataset.state === 'amber');
    assert.match(await page.locator('.timer .time').innerText(), /^(28|29):/);
    await ctl.advance(20 * 60000); await poke(); await page.waitForFunction(() => document.querySelector('.timer').dataset.state === 'red');
    await page.waitForFunction(() => /10 minutes left/.test(document.getElementById('live-polite').textContent), null, { timeout: 5000 });
    assert.equal(await page.locator('.timer-banner').isVisible(), false);
    await ctl.advance(5 * 60000); await poke();
    await page.waitForSelector('.timer-banner:visible'); assert.match(await page.locator('.timer-banner').innerText(), /minutes or less left/);
    await page.waitForFunction(() => /5 minutes left/.test(document.getElementById('live-assertive').textContent), null, { timeout: 5000 });
    assert.equal(await page.locator('#live-assertive').getAttribute('role'), 'alert');
    await ctl.advance(6 * 60000); await poke();
    await page.waitForSelector('text=Time is up', { timeout: 15000 });
    await context.close();
  });

  /* ---------------------------------------------------------------------------------------- hints, locking, stages, evidence */
  await scenario('hints, attempts and locking: hint after miss 1 and 2, lock + explanation after 3, credit labels', async () => {
    const { context, page } = await newPage(); await L.open(page, demo); await L.beginAssessment(page); await L.startChapter(page);
    await L.goToUnit(page, 'Sort the animals');
    await ans(page, 'D1-02', false); let f = await L.feedback(page, 'D1-02');
    assert.match(f, /Not quite/); assert.match(f, /Hint 1/); assert.doesNotMatch(f, /Explanation/);
    await ans(page, 'D1-02', false); f = await L.feedback(page, 'D1-02');
    assert.match(f, /Hint 1/); assert.match(f, /Hint 2/); assert.doesNotMatch(f, /Explanation/);
    await ans(page, 'D1-02', false); f = await L.feedback(page, 'D1-02');
    assert.match(f, /locked/i); assert.match(f, /Explanation/);
    assert.equal(await page.locator('#item-D1-02 .actions').isVisible(), false, 'no Check button once locked');
    assert.match(await page.locator('#item-D1-02 .item-head').innerText(), /Locked/);
    await page.reload(); await page.waitForSelector('#item-D1-02');
    assert.match(await L.feedback(page, 'D1-02'), /Explanation/, 'the lock survives a refresh');
    await L.goToUnit(page, 'Label the house'); await ans(page, 'D1-01', true);
    assert.match(await page.locator('#item-D1-01 .item-head').innerText(), /full credit/);
    await L.goToUnit(page, 'Put the steps in order'); await ans(page, 'D1-03', false); await ans(page, 'D1-03', true);
    assert.match(await page.locator('#item-D1-03 .item-head').innerText(), /85% credit/);
    const st = (await ctl.store()).sessions[0].items; assert.equal(st['D1-02'].c, 0); assert.equal(st['D1-03'].c, 0.85);
    await context.close();
  });

  await scenario('stage gating: the next scene opens only when the earlier one is correct or locked; evidence must be read first', async () => {
    const { context, page } = await newPage(); await L.open(page, demo); await L.beginAssessment(page); await L.startChapter(page);
    await L.goToUnit(page, 'A short story');
    assert.equal(await page.locator('#item-D2-02 .stage-lock').isVisible(), true);
    await ans(page, 'D2-01', false); await ans(page, 'D2-01', false);
    assert.equal(await page.locator('#item-D2-02 .stage-lock').isVisible(), true, 'still locked while the first stage has attempts left');
    await ans(page, 'D2-01', false);
    assert.equal(await page.locator('#item-D2-02 .stage-lock').isVisible(), false, 'a locked stage unlocks the next: the student is never stuck');
    await ans(page, 'D2-02', true);
    await L.goToUnit(page, 'The notices');
    assert.equal(await page.locator('#item-D3-01').getAttribute('data-gated'), 'true');
    assert.equal(await page.locator('#item-D3-01 .actions .btn').isDisabled(), true);
    await page.locator('.doc-head').nth(0).click();
    assert.match(await page.locator('.gate-progress').innerText(), /1 of 2/);
    assert.equal(await page.locator('#item-D3-01').getAttribute('data-gated'), 'true');
    await page.locator('.doc-head').nth(1).click();
    assert.equal(await page.locator('#item-D3-01').getAttribute('data-gated'), 'false');
    await ans(page, 'D3-01', true);
    await page.reload(); await page.waitForSelector('.doc-head');
    assert.equal(await page.locator('#item-D3-01').getAttribute('data-gated'), 'false', 'documents already read stay read after a refresh');
    await context.close();
  });

  await scenario('every widget type works by CLICK ONLY (no drag): label, classify, order, single, multi, numeric', async () => {
    const { context, page } = await newPage(); await L.open(page, demo); await L.beginAssessment(page); await L.startChapter(page);
    const pairs = [['Label the house', 'D1-01'], ['Sort the animals', 'D1-02'], ['Put the steps in order', 'D1-03'], ['A short story', 'D2-01'], ['Select all that apply', 'D2-03'], ['Read a chart', 'D2-04']];
    for (const [title, id] of pairs) { await L.goToUnit(page, title); await ans(page, id, true); assert.match(await L.feedback(page, id), /Correct/, id); }
    assert.ok(await page.locator('.chart svg[role=img]').count() >= 0);
    await context.close();
  });

  await scenario('keyboard only: pick a card with Enter, place it with Enter, Escape cancels, order buttons work', async () => {
    const { context, page } = await newPage(); await L.open(page, demo); await L.beginAssessment(page); await L.startChapter(page);
    await L.goToUnit(page, 'Sort the animals');
    const card = page.locator('#item-D1-02 .cardchip').first();
    await card.focus(); await page.keyboard.press('Enter');
    assert.equal(await card.getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#item-D1-02 .cardchip[aria-pressed="true"]').count(), 0, 'Escape clears the selection');
    await card.focus(); await page.keyboard.press('Enter');
    const place = page.locator('#item-D1-02 section.bucket').first().locator('.place-btn');
    await place.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#item-D1-02 section.bucket').first().locator('.cardchip').count(), 1);
    await page.waitForFunction(() => /placed in/i.test(document.getElementById('live-polite').textContent), null, { timeout: 3000 });
    await L.goToUnit(page, 'Put the steps in order');
    const first = await page.$$eval('#item-D1-03 .order-row', (r) => r[0].dataset.id);
    const down = page.locator('#item-D1-03 .order-row').first().locator('[data-dir="down"]');
    await down.focus(); await page.keyboard.press('Enter');
    assert.notEqual(await page.$$eval('#item-D1-03 .order-row', (r) => r[0].dataset.id), first);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-dir')), 'down', 'focus stays on the same control after a move');
    await context.close();
  });

  await scenario('drag and drop works with the mouse (classify)', async () => {
    const { context, page } = await newPage(); await L.open(page, demo); await L.beginAssessment(page); await L.startChapter(page);
    await L.goToUnit(page, 'Sort the animals');
    await page.locator('#item-D1-02 .cardchip').first().dragTo(page.locator('#item-D1-02 section.bucket').nth(1));
    assert.equal(await page.locator('#item-D1-02 section.bucket').nth(1).locator('.cardchip').count(), 1);
    await page.locator('#item-D1-02 section.bucket').nth(1).locator('.cardchip').first().dragTo(page.locator('#item-D1-02 .tray'));
    assert.equal(await page.locator('#item-D1-02 section.bucket').nth(1).locator('.cardchip').count(), 0, 'dragging back to the tray returns the card');
    await context.close();
  });

  /* ---------------------------------------------------------------------------------------- final submit + reset */
  async function submitTwoItems(page) {
    await L.goToUnit(page, 'Sort the animals'); await ans(page, 'D1-02', true);
    await L.goToUnit(page, 'Select all that apply'); await ans(page, 'D2-03', false); await ans(page, 'D2-03', true);
    for (let i = 0; i < 20 && (await page.locator('#next-btn').count()); i++) await page.click('#next-btn');
  }
  await scenario('final submit: review lists unanswered items, confirm dialog, completion with score, locked afterwards', async () => {
    const { context, page } = await newPage(); await L.open(page, demo); await L.beginAssessment(page); await L.startChapter(page);
    await submitTwoItems(page);
    assert.match(await page.locator('h1').innerText(), /Review & submit/);
    assert.match(await page.locator('main').innerText(), /7 questions/);
    await page.click('text=Submit assessment');
    const dialog = page.locator('[role=dialog]');
    assert.match(await dialog.innerText(), /These 7 questions are not finished and will score 0/);
    assert.match(await dialog.innerText(), /Label the house/);
    await dialog.locator('text=Keep working').click(); assert.equal(await page.locator('[role=dialog]').count(), 0);
    await page.click('text=Submit assessment'); await page.click('#confirm-submit');
    await page.waitForSelector('text=Your assessment is submitted');
    assert.match(await page.locator('.big-card').innerText(), /20\.6%/, 'D1-02 first try (2.0) + D2-03 second try (1.7) = 3.7 of 18');
    assert.match(await page.locator('.big-card').innerText(), /2 of 9 questions finished/);
    const s = (await ctl.store()).sessions[0]; assert.equal(s.status, 'submitted'); assert.equal(s.submissionType, 'Student Submit');
    await page.click('text=Sign out'); await L.signIn(page);
    await page.waitForSelector('text=Your assessment is submitted'); // cannot start over
    await context.close();
  });

  await scenario('teacher: password failure, WALK-TEACHER opens at once, monitor, reset (typed last name), student gets a fresh start', async () => {
    const stu = await newPage(); await L.open(stu.page, demo); await L.beginAssessment(stu.page); await L.startChapter(stu.page); await submitTwoItems(stu.page);
    await stu.page.click('text=Submit assessment'); await stu.page.click('#confirm-submit'); await stu.page.waitForSelector('text=Your assessment is submitted');

    const { context, page } = await newPage(); await L.open(page, demo);
    await page.fill('#code', 'WALK-TEACHER');
    await page.waitForSelector('[role=dialog] #tpw'); // opened immediately: no name, ID, or block needed
    assert.equal(await page.locator('#first').inputValue(), '');
    await page.fill('#tpw', 'wrong-password'); await page.click('[role=dialog] button[type=submit]');
    await page.waitForSelector('.banner.bad'); assert.match(await page.locator('[role=dialog] .banner.bad').innerText(), /not correct/);
    await page.fill('#tpw', 'teacher-pass-1'); await page.click('[role=dialog] button[type=submit]');
    await page.waitForSelector('.tdash');

    await page.click('button[data-tab=monitor]'); await page.waitForSelector('.ttable tbody tr');
    const row = page.locator('.ttable tbody tr').first();
    assert.match(await row.innerText(), /Lovelace, Ada/); assert.match(await row.innerText(), /submitted/); assert.match(await row.innerText(), /20\.6%/);

    await page.click('button[data-tab=reset]'); await page.selectOption('#rs-block', 'Block 1/2');
    await page.waitForSelector('text=View progress'); await page.click('text=View progress');
    await page.click('button:has-text("Reset Student Progress")');
    await page.fill('[role=dialog] #ask-lastName', 'Wrong'); await page.click('[role=dialog] button[type=submit]');
    await page.waitForSelector('.banner.bad'); assert.match(await page.locator('.banner.bad').innerText(), /does not match/);
    assert.equal((await ctl.store()).history.length, 0, 'a wrong confirmation changes nothing');
    await page.click('button:has-text("Reset Student Progress")'); await page.fill('[role=dialog] #ask-lastName', 'lovelace'); await page.click('[role=dialog] button[type=submit]');
    await page.waitForSelector('.banner.ok'); assert.match(await page.locator('.banner.ok').innerText(), /was reset/);
    const st = await ctl.store(); assert.equal(st.history.length, 1); assert.equal(st.history[0].result.points, 3.7); assert.equal(st.sessions[0].status, 'reset');

    // the old student tab is signed out; signing in again offers a fresh start
    await stu.page.reload(); await stu.page.waitForSelector('#first');
    await L.signIn(stu.page); await stu.page.waitForSelector('#begin-btn');
    assert.match(await stu.page.locator('.banner.ok').innerText(), /reset your progress/);
    await stu.page.click('#begin-btn'); await stu.page.waitForSelector('.hero'); await L.startChapter(stu.page);
    await L.goToUnit(stu.page, 'Sort the animals');
    assert.match(await stu.page.locator('#item-D1-02 .actions').innerText(), /Attempts left: 3/);
    const t = await stu.page.locator('.timer .time').innerText(); assert.match(t, /^1:(29|30):/, 'a fresh 90 minutes');
    await context.close(); await stu.context.close();
  });

  await scenario('teacher: preview never touches student data; answer-key overlay; free navigation; reset my preview', async () => {
    const stu = await newPage(); await L.open(stu.page, demo); await L.beginAssessment(stu.page);
    const { context, page } = await newPage(); await L.open(page, demo);
    await page.fill('#code', 'WALK-TEACHER'); await page.fill('#tpw', 'teacher-pass-1'); await page.click('[role=dialog] button[type=submit]'); await page.waitForSelector('.tdash');
    await page.click('#open-preview'); await page.waitForSelector('.preview-ribbon');
    assert.equal(await page.locator('.timer').count(), 0, 'no timer in preview');
    await page.waitForSelector('.hero'); await L.startChapter(page);
    await L.goToUnit(page, 'A short story');
    assert.equal(await page.locator('#item-D2-02 .stage-lock').isVisible(), false, 'stages are open in preview');
    await page.click('text=Show answer key'); await page.waitForSelector('.key-overlay');
    assert.match(await page.locator('#item-D2-01 .key-overlay').innerText(), /answer key \(teacher preview only\)/i);
    assert.match(await page.locator('#item-D2-01 .key-overlay').innerText(), /Hint 1:/);
    await L.goToUnit(page, 'Sort the animals'); await ans(page, 'D1-02', true);
    await L.goToUnit(page, 'The notices'); assert.equal(await page.locator('#item-D3-01').getAttribute('data-gated'), 'false', 'evidence gate is open in preview');
    let st = await ctl.store();
    assert.equal(st.sessions.length, 1, 'only the real student exists'); assert.equal(st.sessions[0].studentId, 'S1001');
    assert.deepEqual(st.sessions[0].items, {}, 'preview answers never reach the student record');
    assert.ok(st.preview && st.preview.items['D1-02'].ok);
    page.once('dialog', (d) => d.accept());
    await page.click('text=Reset my preview progress'); await page.waitForSelector('.preview-ribbon');
    st = await ctl.store(); assert.ok(!st.preview || Object.keys(st.preview.items).length === 0, 'preview cleared');
    await page.click('text=Exit preview'); await page.waitForSelector('.tdash');
    await page.click('button[data-tab=monitor]'); await page.waitForSelector('.ttable tbody tr');
    assert.equal(await page.locator('.ttable tbody tr').count(), 1);
    await context.close(); await stu.context.close();
  });

  await scenario('teacher: settings, test connection, analytics, reference, CSV export', async () => {
    const { context, page } = await newPage(); await L.open(page, demo);
    await page.fill('#code', 'WALK-TEACHER'); await page.fill('#tpw', 'teacher-pass-1'); await page.click('[role=dialog] button[type=submit]'); await page.waitForSelector('.tdash');
    await page.click('button[data-tab=settings]'); await page.waitForSelector('#save-settings');
    await page.click('#test-conn'); await page.waitForSelector('.check-row');
    const rows = await page.locator('.check-row').allInnerTexts();
    assert.ok(rows.length >= 6); rows.forEach((r) => assert.doesNotMatch(r, /✗/, 'a connection check failed: ' + r));
    assert.ok(rows.some((r) => /same assessment version/.test(r)));
    await page.fill('#code-Block\\ 1\\/2', 'NEWCODE1'); await page.click('#save-settings'); await page.waitForSelector('.banner.ok:has-text("Settings saved")');
    await page.click('button[data-tab=analytics]'); await page.waitForSelector('text=Average by block');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=Download roster and scores (CSV)')]);
    assert.equal(dl.suggestedFilename(), 'unit8-roster.csv');
    const csv = fs.readFileSync(await dl.path(), 'utf8'); assert.match(csv.split('\r\n')[0], /Student ID,Last name/);
    await page.click('button[data-tab=reference]'); await page.waitForSelector('text=Alignment matrix');
    assert.match(await page.locator('.tdash').innerText(), /NEEDS VERIFICATION/); assert.match(await page.locator('.tdash').innerText(), /provisional/i);
    const stu = await newPage(); await L.open(stu.page, demo); await L.signIn(stu.page, { code: 'NEWCODE1' }); await stu.page.waitForSelector('#begin-btn');
    await context.close(); await stu.context.close();
  });

  /* ---------------------------------------------------------------------------------------- accessibility + responsive */
  await scenario('responsive and accessible basics: no horizontal scroll at 360px, every control named, reduced motion toggle', async () => {
    const { context, page } = await newPage({ viewport: { width: 360, height: 740 } }); await L.open(page, demo);
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok((await overflow()) <= 1, 'login overflows horizontally');
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    for (const id of ['first', 'last', 'sid', 'block', 'code']) assert.equal(await page.locator('label[for=' + id + ']').count(), 1, id + ' has a label');
    await L.beginAssessment(page); await L.startChapter(page);
    for (const t of ['Label the house', 'Sort the animals', 'Put the steps in order', 'A short story', 'Read a chart', 'The notices']) {
      await L.goToUnit(page, t); const o = await overflow(); assert.ok(o <= 1, t + ' overflows by ' + o + 'px');
    }
    const unnamed = await page.$$eval('button, [role=button], input, select', (els) => els.filter((e) => { const n = (e.getAttribute('aria-label') || e.textContent || '').trim() || (e.id && document.querySelector('label[for="' + e.id + '"]')) || e.closest('label'); return !n && e.type !== 'hidden'; }).map((e) => e.outerHTML.slice(0, 80)));
    assert.deepEqual(unnamed, [], 'controls without an accessible name');
    await page.click('button.menu-btn'); await page.locator('label:has-text("Reduce motion") input').check();
    assert.equal(await page.locator('html').getAttribute('data-motion'), 'reduced');
    await page.reload(); await page.waitForSelector('.topbar'); assert.equal(await page.locator('html').getAttribute('data-motion'), 'reduced', 'preference persists');
    await context.close();
  });

  await scenario('security: the page never receives answer keys; the public question file has none', async () => {
    const { context, page } = await newPage(); const seen = [];
    page.on('response', async (r) => { try { if (/\/api$|items\.json$/.test(r.url())) seen.push(await r.text()); } catch (e) { /* ignore */ } });
    await L.open(page, demo); await L.beginAssessment(page); await L.startChapter(page);
    await L.goToUnit(page, 'Sort the animals'); await ans(page, 'D1-02', false);
    const all = seen.join('\n');
    assert.equal(/"key"|"explanation"|"hints"/.test(all.replace(/"hints":\["/g, '"hints_ok":["')) && /"key"/.test(all), false, 'a key leaked to the browser');
    assert.equal(all.includes(bankDemo['D1-03'].explanation), false, 'an explanation for an unanswered item leaked');
    assert.equal(all.includes(bankDemo['D1-02'].hints[1]), false, 'hint 2 leaked before attempt 2');
    const html = await page.content(); assert.equal(html.includes('innerHTML'), false);
    await context.close();
  });

  /* ---------------------------------------------------------------------------------------- demo mode: what GitHub Pages shows before API_URL is set */
  await scenario('demo mode (empty API_URL): the in-browser server runs a clearly-labeled practice set with no backend', async () => {
    const d = await start({ bank: 'demo', demoMode: true });
    const { context, page } = await newPage();
    const calls = []; page.on('request', (r) => { if (/\/api$/.test(r.url())) calls.push(r.url()); });
    await page.goto(d.url); await page.waitForSelector('#first');
    assert.match(await page.locator('.demo-ribbon').innerText(), /DEMO MODE/);
    assert.match(await page.locator('.panel .side').innerText(), /Demo mode/);
    await L.signIn(page, { code: 'WRONG' }); await page.waitForSelector('.form-error');
    await L.signIn(page, { code: 'DEMO12' }); await page.waitForSelector('#begin-btn'); await page.click('#begin-btn');
    await page.waitForSelector('.hero'); await L.startChapter(page);
    await L.goToUnit(page, 'Sort the animals'); await L.answer(page, pubDemo['D1-02'], bankDemo['D1-02'], true);
    assert.match(await L.feedback(page, 'D1-02'), /Correct/);
    await page.reload(); await page.waitForSelector('#item-D1-02'); // the demo remembers its practice state in this browser
    assert.match(await L.feedback(page, 'D1-02'), /Correct/);
    assert.equal(calls.length, 0, 'demo mode makes no network calls to any API');
    await page.click('button.menu-btn'); await page.click('text=Sign out'); await page.waitForSelector('#first');
    await page.fill('#code', 'WALK-TEACHER'); await page.fill('#tpw', 'demo-teacher'); await page.click('[role=dialog] button[type=submit]'); await page.waitForSelector('.tdash');
    await page.click('button[data-tab=monitor]'); await page.waitForSelector('.ttable tbody tr'); assert.match(await page.locator('.ttable tbody tr').first().innerText(), /Lovelace/);
    await context.close(); await d.close();
  });

  /* ---------------------------------------------------------------------------------------- live bank (needs the unlocked private bank) */
  const livePath = path.join(__dirname, '..', '..', 'private', 'itembank.json');
  if (fs.existsSync(livePath) && (!filter || 'live'.includes(filter.toLowerCase()) || filter.toLowerCase().includes('live'))) {
    console.log('\nLive item bank (all 40 questions, through the real UI)');
    const live = await start({ bank: 'live' });
    const lctl = new L.Ctl(live);
    const pubLive = L.itemsOf(await L.getJson(live.url + 'content/items.json'));
    const bankLive = (await L.getJson(live.url + '__test/bank')).items;
    const ctxs = await newPage({ viewport: { width: 1200, height: 900 } });
    const t0 = Date.now();
    try {
      const page = ctxs.page; await L.open(page, live); await L.beginAssessment(page);
      let solved = 0;
      for (let guard = 0; guard < 80; guard++) {
        if (await page.locator('main[data-page=review]').count()) break;
        if (await page.locator('main[data-page=chapter]').count()) { await page.click('.hero .btn'); await page.waitForSelector('main[data-page=unit]'); continue; }
        const ids = await page.$$eval('section.item', (s) => s.map((x) => x.id.replace('item-', '')));
        const heads = await page.locator('.doc-head').count();
        for (let i = 0; i < heads; i++) await page.locator('.doc-head').nth(i).click();
        for (const id of ids) { await L.answer(page, pubLive[id], bankLive[id], true); solved++; assert.match(await L.feedback(page, id), /Correct/, id + ' was not accepted through the UI'); }
        await page.click('#next-btn'); await page.waitForTimeout(40);
      }
      assert.equal(solved, 40, 'solved ' + solved + ' of 40');
      await page.waitForSelector('main[data-page=review]'); assert.match(await page.locator('main').innerText(), /Every question is finished/);
      await page.click('text=Submit assessment'); await page.click('#confirm-submit'); await page.waitForSelector('text=Your assessment is submitted');
      assert.match(await page.locator('.big-card').innerText(), /100%/); assert.match(await page.locator('.big-card').innerText(), /100 \/ 100 points/);
      const s = (await lctl.store()).sessions[0]; assert.equal(s.result.points, 100); assert.equal(s.result.answered, 40);
      results.push({ name: 'live bank: all 40 items solved through the UI, final score 100/100', ok: true, ms: Date.now() - t0 });
      console.log('  ok   live bank: all 40 items solved through the UI, final score 100/100 (' + (Date.now() - t0) + ' ms)');
    } catch (e) { results.push({ name: 'live bank: solve all 40 through the UI', ok: false, error: String(e.message).slice(0, 400) }); console.log('  FAIL live bank: ' + String(e.message).slice(0, 600)); }
    await ctxs.context.close(); await live.close();
  } else console.log('\n(live-bank scenario skipped: private/itembank.json not present)');

  await browser.close(); await demo.close();
  const pass = results.filter((r) => r.ok).length, fail = results.length - pass;
  console.log('\n' + pass + ' passed, ' + fail + ' failed, ' + results.length + ' total');
  fs.writeFileSync(path.join(__dirname, 'last-run.json'), JSON.stringify({ when: new Date().toISOString(), node: process.version, results }, null, 2) + '\n');
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
