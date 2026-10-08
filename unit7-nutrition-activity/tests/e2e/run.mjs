// End-to-end browser tests (Playwright + Chromium). Run:  node tests/e2e/run.mjs
// The real Code.gs runs against a mock of Google Sheets behind a local HTTP endpoint, so student -> Sheet -> dashboard is exercised.
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { start as startStatic } from '../../tools/serve.js';
import { makeEnv } from '../gas-mock.js';
import { loadAuthored, authored, setAnswer, check, statusOf, exploreScene, findChromium, wrongResponse } from './driver.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
await loadAuthored();
const PORT = 8097, BPORT = 8098, BASE = `http://localhost:${PORT}`;
const env = makeEnv(root); env.run('setupGradebook()'); env.props.RESET_CODE = 'WALK-TEACHER';
const backend = http.createServer((req, res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Content-Type', 'application/json'); if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Headers', '*'); return res.end(); } res.end(env.sandbox.doPost({ postData: { contents: b } })._s); }); });
await new Promise((r) => backend.listen(BPORT, r));
const web = await startStatic(PORT);
const browser = await chromium.launch({ executablePath: findChromium() });
const results = []; const ok = (name, cond, extra = '') => { results.push([name, !!cond, extra]); console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' ' + extra)); };

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1366, height: 768 }, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(); const errs = []; page.errs = errs;
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); }); page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  page.reqs = []; page.on('request', (r) => page.reqs.push(r.url()));
  if (opts.backend) await page.route('**/js/config.js', async (route) => { const r = await route.fetch(); let t = await r.text(); t = t.replace("backendUrl: ''", `backendUrl: 'http://localhost:${BPORT}/exec'`); if (opts.server) t = t.replace("gradingMode: 'local'", "gradingMode: 'server'"); await route.fulfill({ response: r, body: t }); });
  return page;
}
async function signIn(page, first = 'Test', last = 'Student', block = 'Block 3/4', code = 'unit7') {
  await page.goto(BASE + '/index.html'); await page.fill('#f-first', first); await page.fill('#f-last', last); if (block) await page.selectOption('#f-block', block); await page.fill('#f-code', code); await page.click('button[type=submit]');
}
const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('u7.cur')));
async function startMission1(page) { await page.waitForSelector('text=Welcome'); await page.click('text=Start Mission 1'); await page.locator('.wipe').click().catch(() => {}); await page.waitForSelector('article.item:not([data-qid="practice"])'); }
async function play(page, { stopAt = null, wrongFirst = 0 } = {}) {
  let steps = 0; const bad = [];
  while (steps++ < 90) {
    const w = page.locator('.wipe'); if (await w.count()) await w.click().catch(() => {});
    await page.waitForSelector('article.item:not([data-qid="practice"]), #final-btn, .opts[aria-label]', { timeout: 15000 }).catch(() => {});
    if (await page.locator('#final-btn').count()) break;
    await exploreScene(page);
    const ids = await page.locator('article.item').evaluateAll((els) => els.map((e) => e.dataset.qid));
    if (stopAt && ids.includes(stopAt)) return { stoppedAt: stopAt, bad };
    for (const id of ids) { const q = authored[id]; await page.locator(`article.item[data-qid="${id}"]:not(.gated)`).waitFor({ timeout: 8000 }).catch(() => bad.push('gated ' + id)); await setAnswer(page, q); await check(page, q); if ((await statusOf(page, id)) !== 'correct') bad.push(id); }
    if (!ids.length) await page.locator('.opts[aria-label] .opt').first().click();
    await page.locator('button.btn.primary', { hasText: /Continue|Complete mission|Finish and review/ }).click({ timeout: 5000 });
    await page.waitForTimeout(100);
  }
  return { steps, bad };
}

try {
  // ---- 1. sign-in validation
  { const p = await newPage(); await p.goto(BASE + '/index.html');
    const blocks = await p.locator('#f-block option').allInnerTexts(); ok('Class Block is a required dropdown with exactly the four configured values', JSON.stringify(blocks.slice(1)) === JSON.stringify(['Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9']) && (await p.locator('#f-block').evaluate((e) => e.tagName)) === 'SELECT' && (await p.locator('#f-block').getAttribute('required')) !== null, blocks.join('|'));
    await p.fill('#f-first', 'Ana'); await p.fill('#f-last', 'Cruz'); await p.fill('#f-code', 'UNIT7'); await p.click('button[type=submit]');
    ok('cannot begin without choosing a block', (await p.locator('#e-msg').innerText()).includes('block') && (await p.locator('text=Welcome').count()) === 0);
    await p.selectOption('#f-block', 'Block 1/2'); await p.fill('#f-code', 'WRONG'); await p.click('button[type=submit]');
    ok('invalid class code is rejected', (await p.locator('#e-msg').innerText()).includes('not valid') && (await p.locator('text=Welcome').count()) === 0);
    await p.fill('#f-first', ''); await p.fill('#f-code', 'unit7'); await p.click('button[type=submit]'); ok('first name is required', (await p.locator('#e-msg').innerText()).includes('first name'));
    await p.fill('#f-first', 'Ana'); await p.click('button[type=submit]'); await p.waitForSelector('text=Welcome');
    const s = await state(p); ok('student session stores first, last, block and code', s.student.first === 'Ana' && s.student.last === 'Cruz' && s.student.block === 'Block 1/2' && s.student.code === 'UNIT7');
    await p.reload(); await p.waitForSelector('text=Welcome'); ok('refresh keeps the student signed in with the same block (no re-entry)', (await state(p)).student.block === 'Block 1/2' && (await p.locator('#f-block').count()) === 0);
    ok('no console errors on sign-in', p.errs.length === 0, p.errs.join('|')); await p.context().close(); }

  // ---- 2. attempts, hints, locking, refresh recovery
  { const p = await newPage(); await signIn(p); await startMission1(p);
    const ids = await p.locator('article.item').evaluateAll((els) => els.map((e) => e.dataset.qid)); const id = ids[0], q = authored[id];
    const item = p.locator(`article.item[data-qid="${id}"]`);
    // a wrong answer for any type: swap two assignments / pick another option
    const wrongAns = () => wrongFor(q, 1);
    const w = wrongAns(); ok('first question is wrong-answerable in the test', w != null, q.type);
    await setAnswer(p, q, w); await check(p, q);
    ok('wrong answer 1: hint shown, no answer or explanation revealed', (await item.locator('.hintbox').count()) === 1 && (await item.locator('.why').count()) === 0 && (await item.innerText()).includes('2 attempts remaining') && (await item.innerText()).includes('85%'));
    await p.reload(); await p.waitForSelector('article.item[data-qid="' + id + '"]');
    ok('refresh does not restore attempts (1 attempt still used)', (await state(p)).answers[id].attempts.length === 1 && (await p.locator(`article.item[data-qid="${id}"] .pip.used`).count()) === 1);
    await setAnswer(p, q, wrongFor(q, 2)); await check(p, q);
    ok('wrong answer 2: still no reveal; 75% tier shown', (await p.locator(`article.item[data-qid="${id}"] .why`).count()) === 0 && (await p.locator(`article.item[data-qid="${id}"]`).innerText()).includes('75%'));
    await setAnswer(p, q, wrongFor(q, 3)); await check(p, q);
    ok('wrong answer 3: question locks at zero and shows the explanation', (await p.locator(`article.item[data-qid="${id}"] .fb.out .why`).count()) === 1 && (await state(p)).answers[id].status === 'locked');
    ok('locked question cannot be changed', (await p.locator(`article.item[data-qid="${id}"] button.btn.primary`).count()) === 0 || (await p.locator(`article.item[data-qid="${id}"] button.btn.primary`).isHidden()));
    ok('HUD shows progress but never a grade', (await p.locator('#hud').innerText()).includes('% done') && !/score|grade|points earned/i.test(await p.locator('#hud').innerText()));
    ok('no console errors during attempts', p.errs.length === 0, p.errs.join('|')); await p.context().close(); }

  // ---- 3. full run with the real backend: 100% first-try, final submission, lock, reset
  { const p = await newPage({ backend: true }); await signIn(p, 'Maya', 'Okafor', 'Block 6/7', 'UNIT7'); await startMission1(p);
    const r = await play(p, {}); ok('full playthrough: every question accepted the correct answer first time', r.bad.length === 0, JSON.stringify(r.bad)); ok('44+ steps traversed', r.steps > 40);
    await p.click('#final-btn'); const dlgText = await p.locator('#dlg').innerText();
    ok('confirmation text is exactly as required', dlgText.includes('You are about to submit your Unit 7 assessment. You will not be able to change your answers after submission.'));
    await p.click('#confirm-submit'); await p.waitForSelector('text=UNIT 7 COMPLETE'); await p.waitForSelector('.confirm-id', { timeout: 8000 }); await p.waitForTimeout(1700);
    ok('final percentage 100% and points shown', (await p.locator('.bigscore').innerText()).startsWith('100') && (await p.locator('.big-sub').innerText()).includes('100 of 100'));
    ok('domain bars and mastery labels are shown (7 domains)', (await p.locator('.brow').count()) === 7 && (await p.locator('.mastery.strong').count()) === 7);
    ok('no answer key on the results screen', !/correct answer|explanation/i.test(await p.locator('main').innerText()));
    const m = env.book.get('MASTER RESULTS').slice(1).filter((x) => x[2]); ok('submission arrived in MASTER RESULTS with block, 100 points and Submitted', m.length === 1 && m[0][4] === 'Block 6/7' && m[0][11] === 100 && m[0][25] === 'Submitted' && m[0][2] === 'Maya' && m[0][3] === 'Okafor');
    ok('routed to BLOCK 6-7 only', env.book.get('BLOCK 6-7').slice(1).filter((x) => x[2]).length === 1 && env.book.get('BLOCK 3-4').slice(1).filter((x) => x[2]).length === 0);
    ok('item-level rows recorded', env.book.get('ITEM ANALYSIS').slice(1).filter((x) => x[2]).length >= 53);
    const st = await state(p); ok('completion token stored; assessment locked', !!st.completedAt && st.submit.status === 'done');
    await p.reload(); await p.waitForSelector('text=UNIT 7 COMPLETE'); ok('reload after submission shows results, not the assessment', (await p.locator('article.item').count()) === 0);
    // a second device/new session cannot start again
    const q2 = await newPage({ backend: true }); await signIn(q2, 'maya ', 'OKAFOR', 'Block 6/7', 'UNIT7'); await q2.waitForTimeout(800);
    ok('same student cannot begin again, even with cleared storage or another device (server records completion)', (await q2.locator('#e-msg').innerText()).includes('already submitted'));
    await q2.click('text=Teacher reset'); await q2.fill('#dlg input[type=password]', 'wrong-code'); await q2.fill('#dlg input[placeholder="Student first name"]', 'Maya'); await q2.fill('#dlg input[placeholder="Student last name"]', 'Okafor'); await q2.selectOption('#dlg select', 'Block 6/7'); await q2.click('text=Reset this student');
    ok('wrong reset code is refused', (await q2.locator('#dlg .err').innerText()).includes('not correct'));
    await q2.fill('#dlg input[type=password]', 'WALK-TEACHER'); await q2.click('text=Reset this student'); await q2.waitForTimeout(800);
    ok('reset marks the earlier sheet row superseded', env.book.get('MASTER RESULTS')[1][26] === 'RESET: superseded');
    await signIn(q2, 'Maya', 'Okafor', 'Block 6/7', 'UNIT7'); await q2.waitForSelector('text=Welcome', { timeout: 8000 }); ok('after reset the student can start again', true);
    ok('no console errors after reset', q2.errs.length === 0, q2.errs.join('|')); await q2.context().close();
    ok('no console errors in the full run', p.errs.length === 0, p.errs.join('|')); await p.context().close(); }

  // ---- 4. teacher dashboard against the real backend (passcode, filters, demo data, exports)
  { const p = await newPage({ backend: true }); await p.goto(BASE + '/teacher/index.html'); await p.fill('input[type=password]', 'nope'); await p.click('button[type=submit]');
    ok('dashboard rejects a wrong passcode', (await p.locator('.err').innerText()).includes('not correct'));
    await p.fill('input[type=password]', env.props.TEACHER_PASSCODE); await p.click('button[type=submit]'); await p.waitForSelector('.cards');
    p.on('dialog', (d) => d.accept());
    await p.locator('#demo button.btn.primary').click(); await p.waitForFunction(() => document.querySelectorAll('.cards .card .cv').length > 0 && document.querySelector('.banner.demo'), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    ok('demo data generated, labelled DEMO DATA, spread across four blocks', env.book.get('MASTER RESULTS').slice(1).filter((x) => x[1] === 'DEMO DATA').length === 28);
    const cards = await p.locator('.cards').first().innerText(); ok('summary cards computed from data', /Students submitted\s+28|STUDENTS SUBMITTED\s+28/i.test(cards.replace(/\n/g, ' ')), cards.slice(0, 120));
    await p.selectOption('select[aria-label=View]', 'Block 3/4'); await p.waitForTimeout(500);
    ok('changing the class view updates the numbers', /7/.test((await p.locator('.cards').first().innerText()).split('\n')[1] || ''));
    ok('what-should-I-reteach lists 5 priorities', (await p.locator('.reteach > li').count()) === 5);
    ok('most-missed list shown', (await p.locator('.missed li').count()) === 8);
    await p.locator('.itemtable tbody tr').first().click(); ok('clicking a question reveals correct answer and incorrect-response detail', (await p.locator('#detail').innerText()).includes('Correct answer'));
    await p.locator('#stu .linkish').first().click(); ok('clicking a student opens the individual report', (await p.locator('#dlg').innerText()).includes('Performance by domain')); await p.keyboard.press('Escape');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('#exp button', { hasText: 'Grade Export: all blocks' }).click()]); const csv = fs.readFileSync(await dl.path(), 'utf8');
    ok('grade export CSV has Last | First | Block | Final Percentage', csv.replace('﻿', '').startsWith('"Student Last Name","Student First Name","Block","Final Percentage"'));
    await p.locator('#demo button.btn.warn').click(); await p.waitForTimeout(1500);
    ok('delete demo data removes only DEMO rows', env.book.get('MASTER RESULTS').slice(1).filter((x) => x[1] === 'DEMO DATA').length === 0);
    ok('no console errors on the dashboard', p.errs.length === 0, p.errs.join('|')); await p.context().close(); }

  // ---- 5. preview mode
  { const p = await newPage(); p.on('dialog', (d) => d.accept('WALK-TEACHER')); await p.goto(BASE + '/index.html?preview'); await p.waitForSelector('.pv-banner'); await p.waitForSelector('article.item');
    ok('Preview Mode is visibly labelled', (await p.locator('.pv-banner').innerText()).includes('PREVIEW MODE') && (await p.locator('#pv').count()) === 1);
    await p.locator('#pv button', { hasText: 'Questions' }).click(); await p.locator('#pv button', { hasText: 'Show correct answer' }).first().click(); await p.waitForTimeout(200);
    ok('preview shows the correct answer', (await p.locator('#pv pre').first().innerText()).trim().length >= 1);
    await p.locator('#pv button', { hasText: 'Real: submit WRONG' }).first().click(); await p.waitForTimeout(300);
    ok('preview can test an incorrect attempt through the real grader', (await p.locator('article.item .fb.wrong').count()) === 1);
    await p.locator('#pv button', { hasText: 'Results' }).click(); await p.locator('#pv button', { hasText: 'Preview results (mixed)' }).click(); await p.waitForSelector('text=UNIT 7 COMPLETE');
    ok('preview can show the final results screen', (await p.locator('.pill.demo', { hasText: 'PREVIEW' }).count()) === 1);
    const real = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('u7.')).length); ok('preview uses its own storage namespace (u7p.*)', real === 0);
    await p.context().close();
    const bad = await newPage(); bad.on('dialog', (d) => d.accept('wrong')); await bad.goto(BASE + '/index.html?preview'); await bad.waitForSelector('#f-first'); ok('wrong preview passcode falls back to the normal sign-in', (await bad.locator('.pv-banner').count()) === 0); await bad.context().close(); }

  // ---- 6. keyboard alternative to drag-and-drop, Chromebook layout, mobile layout, reduced motion
  { const p = await newPage({ reduced: true }); await signIn(p); await p.waitForSelector('text=Welcome');
    const tile = p.locator('article.item[data-qid="practice"] .tile[data-k="a"]'); await tile.focus(); await p.keyboard.press('Enter');
    const bin = p.locator('article.item[data-qid="practice"] .bin[data-bin="f"]'); await bin.focus(); await p.keyboard.press('Enter');
    ok('sort works from the keyboard (no dragging required)', (await p.locator('article.item[data-qid="practice"] .bin[data-bin="f"] .tile[data-k="a"]').count()) === 1);
    await p.locator('article.item[data-qid="practice"]').evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(900);
    const t2 = p.locator('article.item[data-qid="practice"] .tile[data-k="b"]'), box = await t2.boundingBox(), vb = await p.locator('article.item[data-qid="practice"] .bin[data-bin="v"]').boundingBox();
    await p.mouse.move(box.x + 10, box.y + 10); await p.mouse.down(); await p.mouse.move(vb.x + 40, vb.y + 40, { steps: 8 }); await p.mouse.up();
    ok('sort works with real mouse drag-and-drop', (await p.locator('article.item[data-qid="practice"] .bin[data-bin="v"] .tile[data-k="b"]').count()) === 1);
    const prac = p.locator('article.item[data-qid="practice"]'); for (const [k, bn] of [['c', 'f'], ['d', 'v'], ['a', 'f']]) { await prac.locator(`.tile[data-k="${k}"]`).click(); await prac.locator(`[data-bin="${bn}"]`).first().click(); }
    await prac.locator('button.btn.primary', { hasText: 'Check answer' }).click(); await p.waitForSelector('article.item[data-qid="practice"] .fb.right'); ok('practice question is graded (unscored)', true);
    await startMission1(p);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok('Chromebook 1366x768: no horizontal scrolling', overflow <= 1, String(overflow));
    ok('visible focus outline defined', await p.evaluate(() => { const s = [...document.styleSheets].flatMap((x) => [...x.cssRules]).some((r) => r.selectorText && r.selectorText.includes(':focus-visible')); return s; }));
    await p.context().close();
    const m = await newPage({ viewport: { width: 390, height: 844 } }); await signIn(m); await startMission1(m); const mo = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok('phone width 390px: no horizontal scrolling', mo <= 1, String(mo)); ok('phone layout renders questions', (await m.locator('article.item').count()) > 0); await m.context().close();
    const t = await newPage({ viewport: { width: 820, height: 1180 } }); await signIn(t); await startMission1(t); const to = await t.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok('tablet width 820px: no horizontal scrolling', to <= 1, String(to)); await t.context().close(); }
  // ---- 7. server-grading mode: no answer keys in the browser; every attempt is counted by the server
  { const p = await newPage({ backend: true, server: true }); await signIn(p, 'Sol', 'Server', 'Block 8/9', 'UNIT7'); await startMission1(p);
    ok('server-grading build never downloads the hashed-key content file', p.reqs.some((u) => u.endsWith('content/public.server.js')) && !p.reqs.some((u) => u.endsWith('content/public.js')));
    const id = await p.locator('article.item').first().getAttribute('data-qid'), q = authored[id];
    const wf = (n) => wrongFor(q, n);
    await setAnswer(p, q, wf(1)); await check(p, q); await p.waitForSelector(`article.item[data-qid="${id}"] .fb.wrong`);
    ok('server mode: wrong answer 1 gives a hint and no explanation', (await p.locator(`article.item[data-qid="${id}"] .hintbox`).count()) === 1 && (await p.locator(`article.item[data-qid="${id}"] .why`).count()) === 0);
    const sess = () => env.book.get('SESSIONS').slice(1).find((r) => r[2] === 'Sol'); ok('server recorded attempt 1', JSON.parse(sess()[12])[id].length === 1 && JSON.parse(sess()[12])[id][0].c === false);
    await setAnswer(p, q, wf(2)); await check(p, q); await p.waitForFunction((i) => document.querySelectorAll(`article.item[data-qid="${i}"] .pip.used`).length >= 2, id); await setAnswer(p, q, wf(3)); await check(p, q); await p.waitForSelector(`article.item[data-qid="${id}"] .fb.out .why`);
    ok('server mode: explanation arrives only after the third wrong attempt', (await p.locator(`article.item[data-qid="${id}"] .why`).innerText()).length > 30 && JSON.parse(sess()[12])[id].length === 3);
    ok('no console errors in server mode', p.errs.length === 0, p.errs.join('|')); await p.context().close(); }
} catch (e) { console.error('EXCEPTION', e); results.push(['exception', false, String(e)]); } finally {
  await browser.close(); await new Promise((r) => backend.close(r)); web.close();
  const failed = results.filter((r) => !r[1]); console.log(`\n${results.length - failed.length}/${results.length} end-to-end checks passed`); process.exit(failed.length ? 1 : 0);
}
function wrongFor(q, n) {
  if (q.type === 'num') return q.ans + n;
  if (q.type === 'mc') return q.opts.map((o) => o[0]).filter((k) => k !== q.ans)[n - 1];
  const a = { ...q.ans }; const keys = (q.bins || q.choices).map((x) => x[0]); const k = Object.keys(a)[n - 1]; a[k] = keys.find((x) => x !== a[k]); return a;
}
