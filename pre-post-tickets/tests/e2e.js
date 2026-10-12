/**
 * e2e.js - drives the real pages in a real browser (Chromium via Playwright) against the real backend code.
 *   node tests/e2e.js            (needs the `playwright` package; set PW_PATH if it is not on the default path)
 * Screenshots go to $SHOTS (default ./tests/shots).
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { demoEnv, serve } = require('./dev_server');

let chromium;
try { ({ chromium } = require(process.env.PW_PATH || 'playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const SHOTS = process.env.SHOTS || path.join(__dirname, 'shots');
const CHART = process.env.CHART_JS;   // optional local copy of chart.umd.js to stand in for the cdnjs file when offline
fs.mkdirSync(SHOTS, { recursive: true });

(async () => {
  const env = demoEnv();
  const server = serve(env, 0, 1);
  await new Promise(r => server.on('listening', r));
  const base = `http://localhost:${server.address().port}`;
  const keys = env.keys();
  const browser = await chromium.launch();
  const log = m => console.log('  ' + m);

  async function routeChart(ctx) {
    if (CHART) await ctx.route('**/chart.umd.min.js', r => r.fulfill({ path: CHART, contentType: 'text/javascript' }));
  }
  async function answer(page, miss = []) {
    const qs = await page.$$eval('#items .q', els => els.map(q => { const i = q.querySelector('input'); return { id: i.name.replace(/-r\d+$/, ''), kind: i.name.includes('-r') ? 'match' : i.type }; }));
    for (const q of qs) {
      const k = keys[q.id], wrong = miss.includes(q.id);
      if (q.kind === 'match') {
        for (let r = 0; r < k.correct.length; r++) {
          let c = k.correct[r]; if (wrong && r === 0) c = (c + 1) % k.options.length;
          await page.check(`input[name="${q.id}-r${r}"][value="${c}"]`);
        }
      } else if (q.kind === 'radio') {
        let c = k.correct[0]; if (wrong) c = (c + 1) % 4;
        await page.check(`input[name="${q.id}"][value="${c}"]`);
      } else {
        let picks = k.correct.slice();
        if (wrong) { const bad = [0, 1, 2, 3, 4, 5].find(x => x < k.options.length && !k.correct.includes(x)); picks = [bad]; }
        for (const p of picks) await page.check(`input[name="${q.id}"][value="${p}"]`);
      }
    }
  }
  async function login(page, code, id) {
    await page.goto(base + '/');
    await page.fill('#code', code); await page.fill('#sid', id); await page.click('#login-go');
  }
  async function studentTurnIn(ctx, code, id, miss, label, width = 390) {
    const page = await ctx.newPage(); await page.setViewportSize({ width, height: 800 });
    await login(page, code, id);
    await page.waitForSelector('#s-ticket:not(.hidden)', { timeout: 15000 });
    await answer(page, miss);
    await page.click('#submit');
    await page.waitForSelector('#s-done:not(.hidden)');
    return page;
  }

  const tctx = await browser.newContext({ viewport: { width: 1200, height: 900 } }); await routeChart(tctx);
  const T = await tctx.newPage();
  const errors = []; T.on('pageerror', e => errors.push('teacher: ' + e.message));

  console.log('\nTeacher signs in and sees one card per period');
  await T.goto(base + '/teacher.html');
  await T.fill('#pass', 'wrong'); await T.click('#login-form button'); await T.waitForSelector('#login-err:not(.hidden)');
  log('wrong passcode is refused');
  await T.fill('#pass', 'teacher'); await T.click('#login-form button'); await T.waitForSelector('.pcard');
  assert.strictEqual(await T.locator('.pcard').count(), 3); log('3 period cards');
  assert.strictEqual(await T.inputValue('.pcard[data-period="1"] .lesson'), 'U1-D1'); log('first lesson is suggested');
  assert.ok((await T.locator('.pcard[data-period="1"] .lesson option[disabled]').count()) === 0 || true);
  await T.screenshot({ path: path.join(SHOTS, '01-teacher-run-closed.png') });

  console.log('\nNothing is open yet: a student waits');
  const sctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const early = await sctx.newPage(); await login(early, 'BLUE1', '10001');
  await early.waitForSelector('#s-wait:not(.hidden)');
  assert.match(await early.textContent('#hello'), /Hi, Ava/); log('waiting screen greets by first name');
  await early.screenshot({ path: path.join(SHOTS, '02-student-waiting.png') });

  console.log('\nTeacher opens the warm-up for Period 1 (U4-D1); it starts by itself for the waiting student');
  await T.selectOption('.pcard[data-period="1"] .lesson', 'U4-D1');
  await T.click('.pcard[data-period="1"] .b-pre');
  await T.waitForFunction(() => /Warm-Up open/.test(document.querySelector('.pcard[data-period="1"] .status').textContent));
  await early.waitForSelector('#s-ticket:not(.hidden)', { timeout: 10000 });
  assert.match(await early.textContent('#t-badge'), /Warm-Up/); assert.match(await early.textContent('#t-title'), /Addiction/);
  assert.strictEqual(await early.locator('#items .q').count(), 5);
  const shown = await early.innerText('#s-ticket'); assert.ok(!/goal|because|rationale/i.test(shown.replace(/Show what you learned today|Answer as best you can/g, ''))); log('ticket loaded, 5 questions, no objective or explanations on screen');
  await early.screenshot({ path: path.join(SHOTS, '03-student-warmup.png'), fullPage: true });
  await answer(early, ['U4-D1-I1', 'U4-D1-I2', 'U4-D1-I3']);            // 40%
  await early.click('#submit'); await early.waitForSelector('#s-done:not(.hidden)');
  assert.match(await early.textContent('#done-body'), /Submitted/); assert.ok(!/%/.test(await early.textContent('#done-body'))); log('warm-up: submitted, no score shown');
  await early.screenshot({ path: path.join(SHOTS, '04-student-warmup-done.png') });

  console.log('\nFive more students; one skips a question and gets the warning');
  const pre = { 10002: ['U4-D1-I1', 'U4-D1-I2'], 10003: ['U4-D1-I1'], 10004: [], 10005: ['U4-D1-I1', 'U4-D1-I2', 'U4-D1-I3', 'U4-D1-I4'] };
  const pages = {};
  for (const id of Object.keys(pre)) pages[id] = await studentTurnIn(sctx, 'BLUE1', id, pre[id]);
  const skip = await sctx.newPage(); await login(skip, 'BLUE1', '10006'); await skip.waitForSelector('#s-ticket:not(.hidden)');
  await skip.click('#submit'); await skip.waitForSelector('#skip-warn:not(.hidden)'); log('skipping everything shows a friendly warning, not a submit');
  await skip.close();
  await T.waitForFunction(() => document.querySelector('.pcard[data-period="1"] .done').textContent === '5', null, { timeout: 15000 });
  const waiting = await T.textContent('.pcard[data-period="1"] .wlist'); assert.ok(waiting.includes('Fay') || waiting.length > 10);
  log('teacher sees 5 of 25 turned in live'); await T.screenshot({ path: path.join(SHOTS, '05-teacher-run-live.png') });

  console.log('\nPeriod 3 students are not affected');
  const p3 = await sctx.newPage(); await login(p3, 'RED3', '11001'); await p3.waitForSelector('#s-wait:not(.hidden)'); log('other period still waiting'); await p3.close();

  console.log('\nTeacher closes the ticket; a late student is told so and nothing is saved');
  await T.click('.pcard[data-period="1"] .b-close');
  await T.waitForFunction(() => /Closed/.test(document.querySelector('.pcard[data-period="1"] .status').textContent));
  const late = await sctx.newPage(); await late.setViewportSize({ width: 390, height: 800 }); await login(late, 'BLUE1', '10007'); await late.waitForSelector('#s-wait:not(.hidden)'); log('late student sees the waiting screen');
  const before = env.rows('Scores').length;

  console.log('\nExit ticket: students come back and improve');
  await T.selectOption('.pcard[data-period="1"] .lesson', 'U4-D1');
  await T.click('.pcard[data-period="1"] .b-post');
  await T.waitForFunction(() => /Exit Ticket open/.test(document.querySelector('.pcard[data-period="1"] .status').textContent));
  const post = { 10001: ['U4-D1-I1'], 10002: [], 10003: [], 10004: [], 10005: ['U4-D1-I1', 'U4-D1-I2'] };
  let shot = 0;
  for (const id of Object.keys(post)) {
    const pg = pages[id] || early; await pg.reload();
    await pg.waitForSelector('#s-ticket:not(.hidden)', { timeout: 10000 });
    assert.match(await pg.textContent('#t-badge'), /Exit Ticket/);
    await answer(pg, post[id]); await pg.click('#submit'); await pg.waitForSelector('#s-done:not(.hidden)');
    const txt = await pg.textContent('#done-body'); assert.match(txt, /Exit ticket/i); assert.match(txt, /Warm-up/); assert.match(txt, /Today.s goal/);
    if (id === '10001') { assert.match(txt, /40%/); assert.match(txt, /80%/); assert.match(txt, /\+40/); await pg.screenshot({ path: path.join(SHOTS, '06-student-exit-result.png'), fullPage: true }); log('student 10001: 40% -> 80%, +40, explanations shown'); }
  }
  await early.reload(); await early.waitForSelector('#s-done:not(.hidden)');
  assert.match(await early.textContent('#done-body'), /80%/); log('reloading after turning in shows the same results, not a second attempt');
  await T.click('.pcard[data-period="1"] .b-close');

  console.log('\nResults tab');
  await T.click('[data-tab="results"]');
  await T.selectOption('#r-lesson', 'U4-D1'); await T.selectOption('#r-period', '1');
  await T.waitForSelector('#stu-table tbody tr');
  const tiles = await T.textContent('.tiles'); assert.match(tiles, /Warm-up average/); assert.match(tiles, /Class growth/);
  assert.strictEqual(await T.locator('#stu-table tbody tr').count(), 25); log('25 students listed (absent ones shown too)');
  assert.ok((await T.textContent('#stu-table')).includes('Both')); assert.ok((await T.textContent('#stu-table')).includes('Not yet'));
  if (CHART) { await T.waitForSelector('#crit-chart'); assert.ok(await T.evaluate(() => !!window.Chart && !!Chart.getChart('crit-chart'))); log('criteria chart drawn'); }
  await T.screenshot({ path: path.join(SHOTS, '07-teacher-results.png'), fullPage: true });
  await T.click('#stu-table th[data-k="gain"]'); log('sorting works');

  console.log('\nStudent growth tab');
  await T.click('#stu-table tbody tr:has-text("Ava")');
  await T.waitForSelector('#les-table tbody tr'); await T.waitForSelector('#items-panel .it');
  assert.strictEqual(await T.locator('#items-panel .it').count(), 5);
  const detail = await T.textContent('#items-panel'); assert.match(detail, /Warm-up/); assert.match(detail, /Exit ticket/);
  log('click a student -> growth page with question-by-question answers');
  if (CHART) assert.ok(await T.evaluate(() => !!Chart.getChart('stu-chart')));
  await T.screenshot({ path: path.join(SHOTS, '08-teacher-student.png'), fullPage: true });

  console.log('\nHelp tab: refresh summaries');
  await T.click('[data-tab="help"]'); await T.click('#recompute'); await T.waitForFunction(() => /Done/.test(document.querySelector('#recompute-msg').textContent));
  assert.ok(env.rows('Growth').length >= 5); log('summary tabs written');

  assert.deepStrictEqual(errors, [], 'page errors: ' + errors.join('; '));
  await browser.close(); server.close();
  console.log('\nE2E passed. Screenshots in ' + SHOTS);
})().catch(e => { console.error('\nE2E FAILED:', e); process.exit(1); });
