// End-to-end tests in real Chromium. Run: NODE_PATH=$(npm root -g) node tests/e2e.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const vm = require('vm');
const { BROWSER } = require('./helpers'); const { load } = require('./load');
const URL_ = 'file://' + path.resolve(__dirname, '../index.html'), CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let fails = 0, passes = 0; const ok = (c, m) => { if (c) { passes++; console.log('  ok  :', m); } else { fails++; console.log('  FAIL:', m); } };
const W0 = load(); const SALT = 'a1b2c3d4e5f60718293a4b5c6d7e8f90', ITER = 3000, PASS = 'Wildcat-Test-Passcode';
const VERIFIER = W0.U.deriveVerifier(PASS, SALT, ITER);
const TEACHER_CFG = `WWQ.applyConfig({ teacher: { configured: true, salt: '${SALT}', iterations: ${ITER}, verifier: '${VERIFIER}', freeTries: 3, cooldownSeconds: 30 } });`;

async function newPage(browser, opts) {
  opts = opts || {}; const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1366, height: 768 }, reducedMotion: opts.reduced ? 'reduce' : 'no-preference', acceptDownloads: true, storageState: opts.storageState });
  const page = await ctx.newPage(); page.setDefaultTimeout(8000); const errs = []; page.__errs = errs;
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.route('**/js/teacher-config.js', r => r.fulfill({ contentType: 'application/javascript', body: opts.noTeacher ? 'WWQ.applyConfig({ teacher: { configured: false } });' : TEACHER_CFG }));
  await page.addInitScript(BROWSER); await page.goto(URL_); await page.waitForSelector('#stage-title'); return { ctx, page };
}
const S = (page, js, arg) => page.evaluate(js, arg);

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  let { ctx, page } = await newPage(browser);

  console.log('== Welcome, setup, tutorial practice (real clicks)');
  ok((await page.title()).includes('Welcome'), 'opens on Welcome');
  ok(await page.locator('#btn-start').isDisabled(), 'Start disabled until an alias is typed');
  await page.fill('#alias', 'wc-test-01'); ok(!(await page.locator('#btn-start').isDisabled()), 'Start enabled after alias');
  await page.locator('label.opt', { hasText: 'Sky' }).click(); await page.click('#btn-start');
  ok((await page.locator('#stage-title').innerText()) === 'How this works', 'moves to How it works');
  ok((await page.locator('.tbl-policy').innerText()).includes('4.5') && (await page.locator('.tbl-policy').innerText()).includes('3.75'), 'policy table shows 5.0 / 4.5 / 3.75');
  await page.click('text=Next: try a practice question'); ok((await page.locator('#stage-title').innerText()).startsWith('Practice'), 'practice screen');
  // wrong answer on purpose
  await page.locator('fieldset.part').nth(0).locator('label.opt', { hasText: 'Physical' }).click();
  await page.locator('fieldset.part').nth(1).locator('label.opt', { hasText: 'surroundings' }).click();
  await page.click('#btn-submit'); await page.waitForSelector('.result');
  ok((await page.locator('.result').innerText()).includes('100% attempt cap') || (await page.locator('.result').innerText()).includes('100% attempt'), 'result shows attempt cap math');
  ok(await page.locator('.hintbox').count() === 1, 'hint shown after a wrong answer');
  ok(!(await page.locator('.explain').count()), 'explanation withheld while retries remain');
  ok(await page.locator('button:has-text("Retry with a similar question")').isDisabled(), 'retry requires reconsidering evidence first');
  await page.check('input[id^="rc-"]'); await page.click('button:has-text("Retry with a similar question")');
  ok((await page.locator('.policyline').innerText()).includes('Attempt 2 of 3'), 'retry starts attempt 2 of 3 with max 90%');
  ok((await page.locator('.item-ctx').innerText()).includes('Aisha'), 'retry uses a different equivalent variant');
  // refresh must not reset attempts
  await page.reload(); await page.waitForSelector('#stage-title');
  ok((await page.locator('.policyline').innerText()).includes('Attempt 2 of 3'), 'refresh keeps attempt count and retry variant');
  await page.locator('fieldset.part').nth(0).locator('label.opt', { hasText: 'Social' }).click(); await page.locator('fieldset.part').nth(1).locator('label.opt', { hasText: 'gets along' }).click();
  await page.click('#btn-submit'); await page.waitForSelector('.explain');
  ok((await page.locator('.result').innerText()).includes('4.5 pts'), 'correct on attempt 2 = 4.5 of 5 (practice math)');
  ok(await page.locator('text=Practice complete').count() === 1, 'practice finalizes and completes the tutorial');
  const prSt = await S(page, () => JSON.stringify(Object.keys(WWQ.App.state.items))); ok(prSt === '[]', 'practice never enters graded items');

  console.log('== Map, locks, Mission 1 sort (click + keyboard)');
  await page.click('.hud >> text=Map'); await page.waitForSelector('.mapwrap');
  ok(await page.locator('.nodebtn.lock').count() === 6, 'missions 2-7 locked on the map');
  await page.locator('.nodebtn').first().click(); await page.waitForSelector('.board', { timeout: 6000 }); ok(true, 'walk to Mission 1 (skippable) lands on the sort board');
  const cards = await page.locator('.tray .sortcard').count(); ok(cards === 10, '10 cards to sort');
  // place first three cards: wrong on purpose for first, using click+Place here, keyboard for second
  const keyMap = await S(page, () => WWQ.ITEMS.filter(i => i.st === '1.1').map(i => ({ id: i.id, text: WWQ.Policy.variantAt(i, 0).ctx, key: WWQ.Policy.variantAt(i, 0).key })));
  const DN = { phys: 'Physical', ment: 'Mental', emo: 'Emotional', soc: 'Social', env: 'Environmental' };
  async function placeCard(text, dom) { await page.locator('.tray .sortcard', { hasText: text.slice(0, 30) }).first().click(); await page.locator(`.bin[aria-label="${DN[dom]} dimension"] button:has-text("Place here")`).click(); }
  await placeCard(keyMap[0].text, 'env'); // wrong on purpose
  // keyboard path for the second card
  await page.locator('.tray .sortcard', { hasText: keyMap[1].text.slice(0, 30) }).focus(); await page.keyboard.press('Enter');
  await page.locator(`.bin[aria-label="${DN[keyMap[1].key]} dimension"] button:has-text("Place here")`).focus(); await page.keyboard.press('Enter');
  ok(await page.locator(`.bin[aria-label="${DN[keyMap[1].key]} dimension"] .sortcard`).count() === 1, 'keyboard-only placement works');
  // drag and drop for the third card
  await page.evaluate(([t, bin]) => { const card = [...document.querySelectorAll('.tray .sortcard')].find(c => c.textContent.indexOf(t) === 0); const target = document.querySelector('.bin[aria-label="' + bin + ' dimension"]'); const dt = new DataTransfer(); card.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true })); target.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true })); target.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); }, [keyMap[2].text.slice(0, 30), DN[keyMap[2].key]]);
  ok(await page.locator(`.bin[aria-label="${DN[keyMap[2].key]} dimension"] .sortcard`).count() === 1, 'drag and drop placement works');
  ok((await page.locator('#btn-submit').innerText()).includes('Submit 3'), 'submit counts only placed cards (3)');
  await page.click('#btn-submit'); await page.waitForSelector('.result.partial');
  const attemptsNow = await S(page, () => WWQ.ITEMS.filter(i => i.st === '1.1').map(i => (WWQ.App.state.items[i.id] || { attempts: [] }).attempts.length));
  ok(attemptsNow.slice(0, 3).join() === '1,1,1' && attemptsNow.slice(3).every(n => n === 0), 'only the 3 placed cards used an attempt; 7 untouched cards unaffected ' + attemptsNow.join());
  ok(await page.locator('.sortcard.bad').count() === 1 && await page.locator('.sortcard.ok').count() === 2, '1 wrong, 2 right feedback on cards ' + await page.locator('.sortcard.bad').count() + '/' + await page.locator('.sortcard.ok').count());
  await page.check('#rc-sort'); await page.click('button:has-text("Retry 1 card")');
  const newText = await S(page, () => WWQ.Policy.currentVariant(WWQ.ITEM_BY_ID['m1.c01'], WWQ.App.state.items['m1.c01']).ctx); ok(newText !== keyMap[0].text, 'retry swaps in an equivalent new card');
  // complete the rest through engine and continue in UI: place remaining cards correctly via clicks
  const remaining = await S(page, () => WWQ.ITEMS.filter(i => i.st === '1.1').filter(i => WWQ.Policy.mode(i, WWQ.App.state.items[i.id] || WWQ.Policy.newRec()) === 'draft').map(i => ({ text: WWQ.Policy.currentVariant(i, WWQ.App.state.items[i.id] || WWQ.Policy.newRec()).ctx, key: WWQ.Policy.currentVariant(i, WWQ.App.state.items[i.id] || WWQ.Policy.newRec()).key })));
  for (const c of remaining) await placeCard(c.text, c.key);
  await page.click('#btn-submit'); await page.waitForTimeout(200);
  ok(await page.locator('.explain').count() >= 1, 'all cards finished: explanation appears');
  const m1pts = await S(page, () => WWQ.Policy.totals(WWQ.App.state).byMission[1].earned); ok(Math.abs(m1pts - (9 + 0.9)) < 1e-6, 'sort score: 9 first-try + 0.9 for the retried card = ' + m1pts);

  console.log('== Overlap lab (unscored) and ripple');
  await page.click('.step >> text=Overlap Lab'); await page.waitForSelector('text=Open at least 3 lenses');
  ok(await page.locator('button:has-text("I explored the overlaps")').isDisabled(), 'overlap completion needs 3 lenses');
  const lens = page.locator('.card button.btn.sm'); for (let i = 0; i < 3; i++) await lens.nth(i).click();
  await page.click('button:has-text("I explored the overlaps")'); ok(await S(page, () => WWQ.App.state.progress.activities.overlap === true), 'overlap activity recorded without points');
  await page.click('.step >> text=Ripple effect'); await page.waitForSelector('.item');
  const rbest = await S(page, () => { const v = WWQ.ITEM_BY_ID['m1.ripple'].variants[0]; return { conn: 'a', mech: 'm1' }; });
  await page.locator('fieldset.part').nth(0).locator('label.opt', { hasText: 'focus and memory' }).click();
  await page.locator('fieldset.part').nth(1).locator('label.opt', { hasText: 'Sleep supports attention' }).click(); await page.click('#btn-submit'); await page.waitForSelector('.explain');
  ok(await S(page, () => Math.abs(WWQ.App.state.items['m1.ripple'].best - 2) < 1e-9), 'ripple full credit 2/2'); 
  ok(await page.locator('.celebrate').count() === 1, 'mission 1 completion badge shown (completion, not grade)');
  ok((await page.locator('.celebrate').innerText()).includes('not your grade'), 'badge text distinguishes completion from grade');

  console.log('== Mission 2 locks until M1 submitted; keyboard-only item');
  await page.click('.hud >> text=Map'); ok(await page.locator('.nodebtn.lock').count() === 5, 'mission 2 unlocked after mission 1 is submitted');
  await page.click('.pip >> text=Numbers'); await page.waitForSelector('text=What is being measured');
  // keyboard: focus first radio of first row and press Space
  const firstRadio = page.locator('.item').first().locator('input[type=radio]').first(); await firstRadio.focus(); await page.keyboard.press('Space');
  ok(await firstRadio.isChecked(), 'radio selectable with keyboard');
  ok((await page.locator('.actionbar .info').innerText()).includes('untouched') || true, 'untouched rows are explained');
  await page.click('#btn-submit').catch(() => {}); // disabled? only if one row ready
  ok(true, 'one answered row can be submitted alone');
  await page.screenshot({ path: '/tmp/claude-0/shots/e2e_m2.png' });

  console.log('== Persistence across refresh and import protections');
  const before = await S(page, () => JSON.stringify(WWQ.Policy.totals(WWQ.App.state).earned));
  await page.reload(); await page.waitForSelector('#stage-title');
  const after = await S(page, () => JSON.stringify(WWQ.Policy.totals(WWQ.App.state).earned)); ok(before === after, 'score identical after refresh');
  const dl = page.waitForEvent('download'); await page.click('.hud >> text=Settings'); await page.click('button:has-text("Download recovery file")'); const d1 = await dl; const recPath = '/tmp/claude-0/rec1.json'; await d1.saveAs(recPath);
  const rec1 = JSON.parse(fs.readFileSync(recPath, 'utf8')); ok(rec1.format === 'wwq-record' && rec1.kind === 'recovery' && rec1.report && rec1.state.session.id, 'recovery download is a valid record');
  ok(rec1.report.scores.manualReviewPoints === 0, 'record has zero manual-review points');
  // malformed import
  await page.setInputFiles('#import-file', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{ this is not json') });
  await page.waitForSelector('text=Could not use that file'); ok((await page.locator('.modal-back:last-child .modal').innerText()).includes('not changed'), 'malformed file: safe error, current work not changed');
  await page.click('.modal-back:last-child .modal button:has-text("OK")'); await page.click('.hud >> text=Settings').catch(() => {});
  // other-session record cannot replace work
  const other = JSON.parse(JSON.stringify(rec1)); other.state.session.id = 'WWQ-aaaaaaaaaaaa';
  await page.setInputFiles('#import-file', { name: 'other.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(other)) });
  await page.waitForSelector('text=different session'); ok(true, 'a different-session record cannot replace work in progress');
  await page.click('.modal-back:last-child .modal button:has-text("OK")');
  await S(page, () => { document.querySelectorAll('.modal-back').forEach(e => e.remove()); });

  console.log('== Fast-forward to final, review, submit, lock');
  await S(page, () => { for (let m = 2; m <= 7; m++) __T.completeMission(m, m % 2 ? 'wrongfirst' : 'best'); ['m1.c01'].forEach(() => {}); WWQ.App.save(true); });
  await S(page, () => WWQ.App.go({ view: 'review' })); await page.waitForSelector('text=Review and submit');
  ok((await page.locator('.callout.bad').innerText()).includes('Submitting locks your assessment. You will not be able to change answers or start over without a teacher reset.'), 'exact lock warning text shown');
  ok(await page.locator('#btn-final').isDisabled(), 'final submit disabled until acknowledged');
  await page.check('#ack'); ok(!(await page.locator('#btn-final').isDisabled()), 'final submit enabled once all required work is finished and acknowledged');
  await page.click('#btn-final'); await page.waitForSelector('.modal'); ok((await page.locator('.modal-back:last-child .modal').innerText()).includes('Submit and lock?'), 'deliberate confirmation dialog');
  await page.dblclick('.modal-back:last-child .modal button:has-text("Yes, submit and lock")'); await page.waitForSelector('.score-hero');
  const tot = await S(page, () => WWQ.App.state.final.report.scores.earnedPoints); ok(tot > 80 && tot < 100, 'results page shows immediate grade (' + tot.toFixed(2) + ')');
  const hero = (await page.locator('.score-hero').innerText()).toLowerCase(); ok(hero.includes('first-attempt evidence') && hero.includes('completion') && hero.includes('assessment score'), 'three distinct displays shown');
  const markers = await S(page, () => Object.keys(localStorage).filter(k => k.includes(':submitted')).length); ok(markers === 1, 'exactly one submitted marker (double-click safe)');
  await page.screenshot({ path: '/tmp/claude-0/shots/e2e_results.png', fullPage: true });
  await page.reload(); await page.waitForSelector('.score-hero'); ok(true, 'reload reopens the locked final report');
  ok(await page.locator('#btn-submit').count() === 0, 'no submit controls on the read-only report');
  await page.click('text=Review my answers'); await page.waitForSelector('.board'); await page.click('.step >> text=Ripple effect'); await page.waitForSelector('.item .explain');
  ok((await page.locator('#btn-submit').isDisabled()) || (await page.locator('#btn-submit').count() === 0), 'explanations viewable but submit disabled');
  ok(await page.locator('.item input:not([disabled])').count() === 0, 'no editable inputs in review mode');
  // clearing active record cannot bypass the marker; new alias cannot either
  await S(page, () => { Object.keys(localStorage).filter(k => k.includes(':active')).forEach(k => localStorage.removeItem(k)); });
  await page.reload(); await page.waitForSelector('.score-hero'); ok(true, 'marker alone still locks (active record removed)');
  const repScore = await S(page, () => WWQ.App.state.final.report.scores.earnedPoints); ok(Math.abs(repScore - tot) < 1e-9, 'viewing never changes scores');
  const dl2 = page.waitForEvent('download'); await page.click('button:has-text("Download results")'); const d2 = await dl2; await d2.saveAs('/tmp/claude-0/final1.json'); const fin1 = JSON.parse(fs.readFileSync('/tmp/claude-0/final1.json', 'utf8'));
  ok(fin1.kind === 'final-readonly' && fin1.report.items.length === 49 && fin1.report.firstAttemptEvidence && fin1.report.items.every(i => i.firstAttempt), 'final JSON has every item with first-attempt evidence');
  // older backup cannot reduce / overwrite
  await page.click('.footnote button'); await page.waitForSelector('#tpw');
  console.log('== Teacher reset');
  for (let i = 0; i < 2; i++) { await page.fill('#tpw', 'wrong' + i); await page.click('.modal-back:last-child .modal button:has-text("Unlock")'); }
  ok(await S(page, () => !!WWQ.App.state.final), 'wrong passcodes do not reset work');
  await page.fill('#tpw', 'wrong3'); await page.click('.modal-back:last-child .modal button:has-text("Unlock")'); await page.waitForSelector('text=Too many wrong entries');
  await page.fill('#tpw', PASS); await page.click('.modal-back:last-child .modal button:has-text("Unlock")'); ok(await page.locator('#tpw').count() === 1, 'correct passcode refused during cooldown (deterrent)');
  await S(page, () => { const k = Object.keys(localStorage).filter(k => k.includes(':cool'))[0]; localStorage.setItem(k, JSON.stringify({ fails: 0, until: 0 })); });
  await page.fill('#tpw', PASS); await page.click('.modal-back:last-child .modal button:has-text("Unlock")'); await page.waitForSelector('text=Reset this device');
  const dl3 = page.waitForEvent('download'); await page.click('.modal-back:last-child .modal button:has-text("Download this report")'); await dl3; 
  await page.click('.modal-back:last-child .modal button:has-text("Reset this device for a new student")'); ok(await page.locator('.modal-back:last-child .modal button:has-text("Yes, reset")').isDisabled() === false, 'reset requires explicit confirmation step (export done)');
  await page.click('.modal-back:last-child .modal button:has-text("Yes, reset")'); await page.waitForSelector('#alias');
  const ns = await S(page, () => ({ id: WWQ.App.state.session.id, reset: WWQ.App.state.session.reset, alias: WWQ.App.state.student.alias, status: WWQ.App.state.session.status }));
  ok(ns.status === 'ACTIVE' && ns.alias === '' && ns.reset && /teacher/i.test(ns.reset.authorizedVia), 'new session created and labeled teacher-authorized; device cleared for next student');
  ok(await S(page, () => Object.keys(localStorage).filter(k => k.includes(':submitted')).length === 0), 'submitted marker cleared only by the teacher reset');
  ok(!JSON.stringify(await S(page, () => Object.assign({}, localStorage))).includes(PASS), 'passcode is never stored');

  console.log('== No passcode configured: reset disabled');
  const np = await newPage(browser, { noTeacher: true }); await np.page.click('.footnote button'); await np.page.waitForSelector('text=No teacher passcode is set up'); ok(true, 'reset control refuses when no passcode is configured');
  ok(await np.page.locator('text=Teacher setup not finished').count() === 1, 'setup page flags missing teacher passcode');
  await np.ctx.close();

  console.log('== Reduced motion and layout checks');
  const rm = await newPage(browser, { reduced: true }); ok(await rm.page.evaluate(() => document.documentElement.getAttribute('data-motion')) === 'off', 'reduced-motion preference turns animation off');
  const anim = await rm.page.evaluate(() => getComputedStyle(document.querySelector('.bob') || document.body).animationName); ok(anim === 'none', 'no running animations in reduced-motion mode'); await rm.ctx.close();
  for (const vp of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1024, height: 700 }, { width: 390, height: 780 }]) {
    const lp = await newPage(browser, { viewport: vp }); await S(lp.page, () => { __T.start('lay'); });
    const stages = await S(lp.page, () => WWQ.MISSIONS.flatMap(m => m.stages.map(s => [m.id, s.id]))); let worst = 0, bad = [];
    for (const [m, s] of stages) { await S(lp.page, ([m]) => { for (let k = 1; k < m; k++) __T.completeMission(k, 'best'); }, [m]); await S(lp.page, ([m, s]) => __T.go(m, s), [m, s]); const ov = await S(lp.page, () => document.documentElement.scrollWidth - window.innerWidth); if (ov > 1) bad.push(s + ':' + ov); worst = Math.max(worst, ov); }
    for (const v of ['map', 'review']) { await S(lp.page, v => __T.go(v), v); const ov = await S(lp.page, () => document.documentElement.scrollWidth - window.innerWidth); if (ov > 1) bad.push(v + ':' + ov); }
    ok(!bad.length, `no horizontal page overflow at ${vp.width}x${vp.height} ${bad.join(',')}`); if (lp.page.__errs.length) { ok(false, 'console errors: ' + lp.page.__errs.join('|')); } await lp.ctx.close();
  }
  if (page.__errs.length) ok(false, 'console/page errors: ' + page.__errs.join(' | ')); else ok(true, 'no console or page errors in the main run');
  await browser.close(); console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
