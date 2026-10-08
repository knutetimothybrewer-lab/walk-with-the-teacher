// Teacher mode end-to-end. Run: NODE_PATH=$(npm root -g) node tests/e2e-teacher.js
const { chromium } = require('playwright'); const path = require('path');
const { BROWSER } = require('./helpers'); const { load } = require('./load');
const URL_ = 'file://' + path.resolve(__dirname, '../index.html'), CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let fails = 0, passes = 0; const ok = (c, m) => { if (c) { passes++; console.log('  ok  :', m); } else { fails++; console.log('  FAIL:', m); } };
const W0 = load(); const SALT = 'a1b2c3d4e5f60718293a4b5c6d7e8f90', ITER = 3000, PASS = 'Wildcat-Test-Passcode';
const TEACHER_CFG = `WWQ.applyConfig({ teacher: { configured: true, salt: '${SALT}', iterations: ${ITER}, verifier: '${W0.U.deriveVerifier(PASS, SALT, ITER)}', freeTries: 3, cooldownSeconds: 30 } });`;
const S = (page, js, arg) => page.evaluate(js, arg);

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); page.setDefaultTimeout(8000); const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  const sent = []; page.on('request', r => { if (/script\.google\.com/.test(r.url())) sent.push(r.url()); });
  await page.route('**/js/teacher-config.js', r => r.fulfill({ contentType: 'application/javascript', body: TEACHER_CFG + "\nWWQ.applyConfig({ backend: { url: 'https://script.google.com/macros/s/FAKE/exec' } });" }));
  await page.route('https://script.google.com/**', r => r.fulfill({ contentType: 'application/json', body: '{"ok":true}' }));
  await page.addInitScript(BROWSER.replace('window.WWQ.CONFIG.backend.url = \'\'', '0')); await page.goto(URL_); await page.waitForSelector('#stage-title');

  console.log('== A real student is mid-work on this device');
  await page.fill('#alias', 'real-student'); await page.click('#btn-start').catch(() => {});
  await S(page, () => { WWQ.App.state.student.alias = 'real-student'; WWQ.App.state.progress.started = true; WWQ.App.save(true); });
  const realBefore = await S(page, () => localStorage.getItem(Object.keys(localStorage).find(k => k.endsWith(':active'))));
  ok(await page.locator('#teacher-bar').count() === 0, 'no teacher bar for students');

  console.log('== Teacher passcode opens teacher mode');
  await page.click('.footnote button'); await page.waitForSelector('#tpw');
  await page.fill('#tpw', 'wrong'); await page.click('.modal-back:last-child .modal button:has-text("Unlock")');
  ok(await page.locator('#btn-teacher-mode').count() === 0, 'wrong passcode does not offer teacher mode');
  await page.fill('#tpw', PASS); await page.click('.modal-back:last-child .modal button:has-text("Unlock")');
  await page.waitForSelector('#btn-teacher-mode');
  await Promise.all([page.waitForNavigation(), page.click('#btn-teacher-mode')]);
  await page.waitForSelector('#teacher-bar');
  ok(await S(page, () => WWQ.Teacher.active), 'teacher mode is active after reload');
  ok(await S(page, () => WWQ.App.state.student.alias) === 'Teacher preview', 'fresh teacher state, not the student record');
  ok(await S(page, () => [1, 2, 3, 4, 5, 6, 7].every(m => WWQ.App.unlocked(m))), 'every mission is open without answering anything');

  console.log('== Click through without answering');
  await page.click('button.nodebtn >> nth=6'); await page.waitForSelector('#stage-title'); // Mission 7 straight away
  ok((await page.title()).includes('Mission 7'), 'can open Mission 7 directly');
  await page.click('#tm-mission'); await page.waitForSelector('.result');
  ok(await S(page, () => WWQ.Policy.missionStatus(WWQ.App.state, 7).complete), 'Fill this mission completes it');
  await page.click('#tm-all'); await page.waitForSelector('#btn-final');
  ok(await S(page, () => WWQ.Store.canSubmit(WWQ.App.state).ok), 'Fill everything makes the assessment submittable');
  await page.check('#ack'); await page.click('#btn-final'); await page.click('.modal-back:last-child button:has-text("Yes, submit and lock")');
  await page.waitForSelector('.score-hero');
  ok(Math.abs(await S(page, () => WWQ.App.state.final.report.scores.earnedPoints) - 100) < 1e-9, 'preview results show the full 100 points');
  ok(await page.locator('#sync-card').count() === 0, 'no "sent to your teacher" card in teacher mode');
  ok(sent.length === 0, 'nothing was sent to the Google Sheet');

  console.log('== Exit restores the real student record untouched');
  await Promise.all([page.waitForNavigation(), page.click('#tm-exit')]);
  await page.waitForSelector('#stage-title');
  ok(await page.locator('#teacher-bar').count() === 0 && !(await S(page, () => WWQ.Teacher.active)), 'teacher mode is gone');
  ok(await S(page, () => WWQ.App.state.student.alias) === 'real-student', 'the real student record is back');
  const realAfter = await S(page, () => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.endsWith(':active')))).student.alias);
  ok(realAfter === 'real-student' && JSON.parse(realBefore).student.alias === 'real-student', 'localStorage record never changed');
  ok(await S(page, () => Object.keys(localStorage).filter(k => k.includes(':submitted')).length === 0), 'no submitted marker leaked into the device');

  if (errs.length) ok(false, 'console/page errors: ' + errs.join(' | ')); else ok(true, 'no console or page errors');
  await browser.close(); console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
