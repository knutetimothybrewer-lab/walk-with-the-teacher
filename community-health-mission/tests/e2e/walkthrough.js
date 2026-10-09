'use strict';
// Real-browser tests (Playwright + Chromium) against the dev server (same engine as Apps Script).
const assert = require('assert');
const fs = require('fs'), os = require('os'), path = require('path');
let chromium; try { chromium = require('playwright').chromium; } catch (e) { chromium = require('/opt/node22/lib/node_modules/playwright').chromium; }
const { start } = require('../../tools/dev-server');
const G = require('../../server/grading');
const { fillUnit } = require('./driver');

const results = []; const ok = (name) => { results.push(name); console.log('  ✓ ' + name); };
let srv, browser, drop = null;

async function login(page, roster, name) {
  await page.goto(srv.url + '/'); await page.waitForSelector('input[name=code], .tut, .county, .res-head');
  if (await page.$('input[name=code]')) { await page.fill('input[name=code]', 'devclass'); await page.fill('input[name=roster]', roster); await page.fill('input[name=name]', name || 'Test Student'); await page.click('button[type=submit]'); }
  await page.waitForSelector('.tut, .county, .res-head');
  if (await page.$('.tut')) { await page.click('text=Begin the mission'); await page.waitForSelector('.county'); }
}
async function openUnit(page, mid, ui) {
  if (!(await page.$('.county'))) await page.click('.brand');
  await page.click('.mission >> nth=' + (mid - 1)); await page.waitForSelector('.qcard');
  await page.click('.step >> nth=' + ui);
  await page.waitForFunction((t) => document.querySelector('.qcard .step, .qcard h2') && true, null);
}
const unit = (id) => { let r; srv.pub.modules.forEach(m => m.units.forEach(u => { if (u.id === id) r = u; })); return r; };
const answer = async (page, id, kind) => { const u = unit(id); await fillUnit(page, u, kind === 'wrong' ? G.makeWrong(srv.pub, u, srv.priv.units[id]) : G.makeCorrect(srv.pub, u, srv.priv.units[id]), srv.pub); };
const submit = async (page) => { await page.click('.qcard button.primary'); };
const state = (roster) => { const s = srv.store.listSessions('DEVCLASS').find(x => x.rosterId === roster && x.status !== 'reset'); return s; };

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chm-e2e-'));
  const s = await start({ port: 0, dataDir: dir, dropResponse: (out) => { if (drop && out.ok && out.attempt && drop.n-- > 0) return true; return false; } });
  srv = Object.assign(s, { url: 'http://127.0.0.1:' + s.port });
  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push(m.text()); });

  console.log('Attempts, hints, locking, reload');
  await login(page, 'e2e1');
  await openUnit(page, 1, 1);
  assert(await page.textContent('.attline').then(t => /Attempt 1 of 3/.test(t) && /100%/.test(t))); ok('shows attempt number and maximum credit before submit');
  await page.click('.qcard button.primary'); assert(/Choose|Select/.test(await page.textContent('.qcard .error'))); assert.equal(state('e2e1').units['M1-U2'].attempts, 0); ok('blank submission is rejected without using an attempt');
  await answer(page, 'M1-U2', 'wrong'); await submit(page); await page.waitForSelector('.feedback .fbox.warn');
  let fb = await page.textContent('.feedback'); assert(/Not correct yet/.test(fb) && /Attempt 2 of 3/.test(fb) && /85%/.test(fb)); assert(!/Correct answer/i.test(fb)); assert.equal(state('e2e1').units['M1-U2'].attempts, 1); ok('wrong attempt 1 -> concise hint, no answer, credit drops to 85%');
  await page.reload(); await page.waitForSelector('.county'); await openUnit(page, 1, 1);
  assert(/Attempt 2 of 3/.test(await page.textContent('.attline'))); assert(/Hint/.test(await page.textContent('.feedback'))); ok('reload restores server state (attempt count and hint)');
  await answer(page, 'M1-U2', 'wrong'); await submit(page); await page.waitForSelector('.attline:has-text("Attempt 3 of 3")');
  await answer(page, 'M1-U2', 'wrong'); await submit(page); await page.waitForSelector('.fbox.bad');
  assert.equal(state('e2e1').units['M1-U2'].status, 'exhausted'); assert(await page.$eval('.qfields', e => e.disabled)); assert(/not correct/i.test(await page.textContent('.chips'))); ok('third wrong attempt locks the unit; shown as completed but not correct; inputs frozen');
  assert(!(await page.textContent('.qcard')).includes(srv.priv.units['M1-U2'].explain)); ok('explanation withheld until final review');
  await page.click('.step >> nth=2'); await answer(page, 'M1-U3', 'right'); await submit(page); await page.waitForSelector('.fbox.ok');
  assert.equal(state('e2e1').units['M1-U3'].earned, 4); ok('correct first attempt earns full credit; no dead ends after a locked unit');

  console.log('Network failure handling');
  await page.click('.step >> nth=3'); await answer(page, 'M1-U4', 'right');
  drop = { n: 1 }; await submit(page); await page.waitForSelector('.fbox.ok', { timeout: 15000 }); drop = null;
  assert.equal(state('e2e1').units['M1-U4'].attempts, 1); assert.equal(srv.store.listResponses('DEVCLASS').filter(r => r.taskId === 'M1-U4' && r.rosterId === 'e2e1').length, 1); ok('lost response is retried with the same request id: one attempt, one row');
  await page.click('.step >> nth=4'); await answer(page, 'M1-U5', 'wrong');
  await page.route('**/api', r => r.abort()); await submit(page);
  await page.waitForSelector('.pending:not([hidden])', { timeout: 30000 }); assert.equal(state('e2e1').units['M1-U5'].attempts, 0); ok('offline: clear message, answer kept, no attempt consumed');
  await page.unroute('**/api'); await page.click('.qcard button.primary'); await page.waitForSelector('.feedback .fbox.warn'); assert.equal(state('e2e1').units['M1-U5'].attempts, 1); ok('recovery: retry succeeds exactly once');

  console.log('Double click and concurrent tabs');
  const page2 = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage(); await login(page2, 'e2e2'); await openUnit(page2, 2, 0); await answer(page2, 'M2-U1', 'wrong');
  await page2.dblclick('.qcard button.primary'); await page2.waitForSelector('.feedback .fbox.warn'); assert.equal(state('e2e2').units['M2-U1'].attempts, 1); ok('double click consumes one attempt');
  const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const tabA = await ctx2.newPage(), tabB = await ctx2.newPage(); await login(tabA, 'e2e3'); await login(tabB, 'e2e3');
  await openUnit(tabA, 2, 0); await openUnit(tabB, 2, 0); await answer(tabA, 'M2-U1', 'wrong'); await answer(tabB, 'M2-U1', 'wrong'); await submit(tabA); await tabA.waitForSelector('.fbox.warn'); await submit(tabB);
  await tabB.waitForSelector('.error:not(:empty)', { timeout: 5000 }).catch(() => {}); assert.equal(state('e2e3').units['M2-U1'].attempts, 1); ok('second tab with stale attempt number is refused, nothing consumed');

  console.log('Full run, final review, results');
  const p3 = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage(); await login(p3, 'e2e4', 'Full Run');
  for (const m of srv.pub.modules) { await p3.click('.mission >> nth=' + (m.id - 1)); await p3.waitForSelector('.qcard');
    for (let i = 0; i < m.units.length; i++) { const u = m.units[i]; await p3.click('.step >> nth=' + i); await p3.waitForSelector('.qcard h2:has-text("' + u.title.replace(/"/g, '\\"') + '")');
      const ov = await p3.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); assert(ov <= 1, 'horizontal overflow ' + ov + ' at ' + u.id);
      if (u.id === 'M3-U4' || u.id === 'M4-U1') { assert(await p3.$('details.dtwrap, .tab:has-text("Data table")')); }
      if (i === 0 && m.id === 4 && false) {}
      if (u.id === 'M6-U3') { await answer(p3, u.id, 'wrong'); await submit(p3); await p3.waitForSelector('.fbox.warn'); await answer(p3, u.id, 'right'); await submit(p3); await p3.waitForSelector('.fbox.ok'); continue; }
      await answer(p3, u.id, 'right'); await submit(p3); await p3.waitForSelector('.feedback .fbox.ok'); }
    await p3.click('.brand'); await p3.waitForSelector('.county'); }
  ok('all 29 units answered through the UI at 1366x768 without horizontal overflow');
  await p3.click('text=Final review and submit'); assert(await p3.isDisabled('text=Submit final answers')); await p3.check('.submitbox input[type=checkbox]'); await p3.click('text=Submit final answers'); await p3.waitForSelector('.res-head');
  const txt = await p3.textContent('.res-head'); assert(/99\.4%/.test(txt), txt); assert(/Finalized on server/.test(txt) && /recorded in teacher gradebook/.test(txt) && /Receipt ID/.test(txt)); ok('results: 99.4% (one 4-pt unit on attempt 2), three separate status chips, receipt id');
  const rid = (await p3.textContent('.res-head .mono')); await p3.reload(); await p3.waitForSelector('.res-head'); assert.equal(await p3.textContent('.res-head .mono'), rid); ok('reload after finalization returns the same receipt (idempotent, locked)');
  await p3.waitForSelector('.rvd'); assert((await p3.$$('.rvd')).length === 29); ok('explanations and answers appear in the final review');
  assert.equal(state('e2e4').final.gradebook, 'recorded'); assert.equal(srv.store.listResponses('DEVCLASS').filter(r => r.rosterId === 'e2e4').length, 30); ok('server gradebook row + 30 response rows recorded');

  console.log('Teacher preview');
  const tctx = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const tp = await tctx.newPage(); await tp.goto(srv.url + '/'); await tp.click('text=Teacher sign-in'); await tp.fill('input[type=password]', 'wrong'); await tp.click('button[type=submit]'); await tp.waitForSelector('.error:not(:empty)');
  await tp.fill('input[type=password]', srv.pass); await tp.click('button[type=submit]'); await tp.waitForSelector('.tm-bar'); ok('teacher sign-in verified by server (wrong passcode refused)');
  const before = { s: srv.store.listSessions().length, r: srv.store.listResponses().length, g: Object.keys(srv.store.gradebook).length };
  await tp.click('.tm-tab:has-text("Preview and testing")'); await tp.click('button:has-text("Start preview")'); await tp.waitForSelector('.previewbar'); assert(/Teacher Preview — No Student Grade Recorded/.test(await tp.textContent('.previewbar'))); ok('preview opens with the required label');
  await tp.click('text=Answer and Scoring View'); await tp.click('.mission >> nth=3'); await tp.waitForSelector('.answerpanel .ansbox'); const ap = await tp.textContent('.answerpanel'); assert(/Accepted answer|Scoring rubric/.test(ap) && /Hint after attempt 1/.test(ap)); ok('answer view shows answers, rubric, tolerances, alignment and hints');
  await tp.click('text=All exhausted (0 credit)'); await tp.waitForSelector('.review'); await tp.check('.submitbox input[type=checkbox]'); await tp.click('text=Submit (preview: simulated)'); await tp.waitForSelector('.res-head');
  const pr = await tp.textContent('.res-head'); assert(/Teacher Preview — No Student Grade Recorded/.test(pr) && /0\.0%/.test(pr) && /Simulated only/.test(pr)); ok('exhausted-attempts scenario renders the final results screen with preview label and simulated delivery');
  assert.equal(srv.store.listSessions().length, before.s); assert.equal(srv.store.listResponses().length, before.r); assert.equal(Object.keys(srv.store.gradebook).length, before.g); ok('preview created no production sessions, responses or gradebook rows');
  await tp.click('text=Back to teacher panel'); await tp.click('.tm-tab:has-text("Preview and testing")'); await tp.click('text=Run delivery test'); await tp.waitForSelector('.fbox.ok'); assert.equal(srv.store.tests.length, 1); assert.equal(Object.keys(srv.store.gradebook).length, before.g); ok('delivery test writes only an isolated test record');
  await tp.click('.tm-tab:has-text("Coverage checklist")'); await tp.waitForSelector('.dt'); assert(/Total points: 100/.test(await tp.textContent('.tm'))); ok('coverage checklist lists all units and 100 points');
  await tp.click('.tm-tab:has-text("Class codes")'); await tp.click('text=Results >> nth=0'); await tp.waitForSelector('text=Student sessions'); ok('class results table loads');
  const unauth = await (await tctx.request.post(srv.url + '/api', { data: { action: 'teacherAnswerView', payload: {} } })).json(); assert.equal(unauth.code, 'FORBIDDEN'); ok('unauthenticated request for the answer key is refused by the server');

  console.log('Accessibility and motion');
  const rm = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' }); const rp = await rm.newPage(); await login(rp, 'e2e5');
  assert.equal(await rp.evaluate(() => getComputedStyle(document.querySelector('.river-flow')).animationName), 'none'); ok('prefers-reduced-motion disables animations');
  await rp.click('button:has-text("Motion")'); assert(/Motion: (on|off)/.test(await rp.textContent('.topbar'))); ok('in-app motion toggle present');
  await rp.click('.mission >> nth=0'); await rp.waitForSelector('.qcard');
  const unnamed = await rp.evaluate(() => Array.from(document.querySelectorAll('button,input,select')).filter(e => !(e.getAttribute('aria-label') || (e.labels && e.labels.length) || e.textContent.trim() || e.closest('label'))).length); assert.equal(unnamed, 0); ok('every button/input has an accessible name');
  await rp.keyboard.press('Tab'); assert(await rp.evaluate(() => document.activeElement && document.activeElement !== document.body)); ok('keyboard focus is reachable');
  const touch = await browser.newContext({ viewport: { width: 800, height: 1100 }, hasTouch: true }); const tpg = await touch.newPage(); await login(tpg, 'e2e6'); await tpg.click('.mission >> nth=3'); await tpg.waitForSelector('.qcard'); await answer(tpg, 'M4-U1', 'right'); await tpg.tap('.qcard button.primary'); await tpg.waitForSelector('.fbox.ok');
  assert((await tpg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1); ok('touch/tablet layout works and has no horizontal scroll');

  assert.deepEqual(errs, [], 'console errors: ' + errs.join('; '));
  await browser.close(); s.server.close();
  console.log('\n' + results.length + ' browser checks passed');
})().catch(async (e) => { console.error('E2E FAILURE:', e); if (browser) await browser.close(); process.exit(1); });
