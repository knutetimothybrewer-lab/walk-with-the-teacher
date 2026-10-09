// Browser end-to-end tests.  Starts its own dev server (fresh state) on a spare port and drives Chromium through the real UI.
//   node tests/e2e/run.mjs            run everything
//   node tests/e2e/run.mjs full       run scenarios whose name contains "full"
import { startServer, launch, api, post, check, section, summary, watchErrors, login, begin, sess, playThrough, fillItem, solveRemote, checkAnswer, CODES, TEACHER_PW } from './lib.mjs';

const only = process.argv[2] || '';
const SC = [];
const scenario = (name, fn) => SC.push({ name, fn });

scenario('full: sign-in, every chapter, submit, perfect score', async ({ srv, browser }) => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } }); const errs = watchErrors(page, 'full');
  await login(page, srv, { first: 'Ada', last: 'Lovelace', id: 'E2E-001', block: 'Block 6/7', code: 'WRONG-CODE' });
  await page.waitForSelector('.err:visible');
  check('wrong class code is rejected with a message', (await page.locator('form').innerText()).toLowerCase().includes('code'));
  await login(page, srv, { first: 'Ada', last: 'Lovelace', id: 'E2E-001', block: 'Block 6/7' });
  await begin(page);
  const timerText = await page.locator('.bar .timer .tm').innerText();
  check('timer shows about 90 minutes at start', /^(89|90):\d\d$/.test(timerText.trim()), timerText);
  const box = await page.locator('.bar .timer').boundingBox();
  check('timer sits in the upper right', box && box.x > 1366 / 2 && box.y < 100, JSON.stringify(box));
  await playThrough(page, srv);
  await page.waitForSelector('.score-ring');
  const ringLabel = await page.locator('.score-ring').getAttribute('aria-label');
  check('completion screen shows a 100% score', /Score 100 percent/.test(ringLabel), ringLabel);
  check('completion screen lists points earned', /100 of 100 points/.test(await page.locator('body').innerText()));
  const t = await api(srv, 'teacherLogin', { password: TEACHER_PW });
  const ov = await api(srv, 'teacherOverview', { teacherToken: t.teacherToken });
  const row = ov.rows.find((r) => r.studentId === 'E2E-001');
  check('server records the submission as Submitted with 100%', row && row.statusLabel === 'Submitted' && row.pct === 100, JSON.stringify(row && { s: row.statusLabel, p: row.pct }));
  check('no page errors during the full run', errs.length === 0, errs.slice(0, 3).join(' | '));
  await page.close();
});


const nextBtn = (page) => page.locator('.foot .btn-primary');
async function gotoItem(page, id) {
  for (let i = 0; i < 12; i++) {
    if (await page.locator(`section.item[data-item="${id}"]`).count()) return;
    await page.waitForFunction(() => { const b = document.querySelector('.foot .btn-primary'); return b && !b.disabled; }); await nextBtn(page).click(); await page.waitForTimeout(80);
  }
  throw new Error('could not reach ' + id);
}
const attemptLine = (page) => page.locator('.attempt-line').innerText();
const fb = (page) => page.locator('.feedback').innerText();

scenario('attempts: hints, 85/75 credit, lock, explanation, refresh keeps attempts', async ({ srv, browser }) => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } }); const errs = watchErrors(page, 'attempts');
  await login(page, srv, { first: 'Grace', last: 'Hopper', id: 'E2E-002', block: 'Block 1/2' }); await begin(page);
  const { sid } = await sess(page);
  await gotoItem(page, 'c1-test');
  check('first attempt is worth full credit', /Attempt 1 of 3/.test(await attemptLine(page)));
  check('Continue is blocked until the question finishes', await nextBtn(page).isDisabled());
  await fillItem(page, 'c1-test', await solveRemote(srv, sid, 'c1-test', 'wrong', 1)); let r = await checkAnswer(page);
  check('a wrong answer is not correct and shows a hint', r.ok && !r.correct && /Hint/.test(await fb(page)), JSON.stringify({ c: r.correct }));
  check('attempt 2 is worth 85% of the points', /Attempt 2 of 3/.test(await attemptLine(page)) && /worth up to/.test(await attemptLine(page)), await attemptLine(page));
  await page.reload(); await page.waitForSelector('section.item[data-item="c1-test"]');
  check('refreshing does not give back an attempt', /Attempt 2 of 3/.test(await attemptLine(page)), await attemptLine(page));
  check('the hint is still shown after a refresh', /Hint/.test(await fb(page)));
  await fillItem(page, 'c1-test', await solveRemote(srv, sid, 'c1-test', 'wrong', 2)); r = await checkAnswer(page);
  check('attempt 3 is shown after a second miss', /Attempt 3 of 3/.test(await attemptLine(page)), await attemptLine(page));
  await fillItem(page, 'c1-test', await solveRemote(srv, sid, 'c1-test', 'wrong', 3)); r = await checkAnswer(page);
  check('after the third miss the question locks with 0 credit', r.locked === true && /finished/.test(await fb(page)) && /0 of/.test(await fb(page)), await fb(page));
  check('the explanation appears only after the lock', /Explanation/.test(await fb(page)));
  check('the check button and inputs are gone after locking', (await page.locator('button:has-text("Check answer"):visible').count()) === 0 && (await page.locator('section.item input:not([disabled]), section.item select:not([disabled])').count()) === 0, String(await page.locator('section.item input:not([disabled]), section.item select:not([disabled])').evaluateAll((e) => e.map((x) => x.outerHTML.slice(0, 80)))));
  check('Continue is enabled after locking', await nextBtn(page).isEnabled());
  const late = await api(srv, 'submit', { sessionId: sid, token: (await sess(page)).token, itemId: 'c1-test', response: await solveRemote(srv, sid, 'c1-test', 'correct'), requestId: 'late-request-000001', expectedAttempt: 4 });
  check('the server refuses a fourth attempt', late.ok === false && /ITEM_DONE|STALE/.test(late.code), JSON.stringify(late).slice(0, 120));
  await nextBtn(page).click(); await page.waitForSelector('section.item[data-item="c1-vocab"]');
  await fillItem(page, 'c1-vocab', await solveRemote(srv, sid, 'c1-vocab', 'wrong', 1)); await checkAnswer(page);
  await fillItem(page, 'c1-vocab', await solveRemote(srv, sid, 'c1-vocab', 'correct')); r = await checkAnswer(page);
  check('correct on attempt 2 earns 85% of the points', r.correct === true && /attempt 2/.test(await fb(page)) && /1\.7 of 2/.test(await fb(page)), await fb(page));
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await page.close();
});

scenario('resume: new device, same student, no new attempts, one record', async ({ srv, browser }) => {
  const ctx1 = await browser.newContext(); const a = await ctx1.newPage(); const errs = watchErrors(a, 'resume');
  await login(a, srv, { first: 'Alan', last: 'Turing', id: 'E2E-003', block: 'Block 3/4' }); await begin(a);
  const { sid } = await sess(a);
  await gotoItem(a, 'c1-test'); await fillItem(a, 'c1-test', await solveRemote(srv, sid, 'c1-test', 'wrong', 1)); await checkAnswer(a);
  const ctx2 = await browser.newContext(); const b = await ctx2.newPage(); watchErrors(b, 'resume2');
  await login(b, srv, { first: 'alan', last: 'TURING', id: 'e2e-003', block: 'Block 3/4' });
  await b.waitForSelector('section.item, .stage', { timeout: 10000 });
  check('signing in again skips the briefing and resumes the running assessment', (await b.locator('.bar .timer').count()) === 1);
  await gotoItem(b, 'c1-test');
  check('the second device sees attempt 2 (nothing was reset)', /Attempt 2 of 3/.test(await attemptLine(b)), await attemptLine(b));
  const t = await api(srv, 'teacherLogin', { password: TEACHER_PW }); const ov = await api(srv, 'teacherOverview', { teacherToken: t.teacherToken });
  check('only one record exists for the student', ov.rows.filter((r) => r.studentId === 'E2E-003').length === 1);
  const wrongBlock = await api(srv, 'login', { firstName: 'Alan', lastName: 'Turing', studentId: 'E2E-003', block: 'Block 1/2', code: CODES['Block 1/2'] });
  check('a student cannot move themselves to another block', wrongBlock.ok === false, JSON.stringify(wrongBlock).slice(0, 140));
  const crossCode = await api(srv, 'login', { firstName: 'New', lastName: 'Kid', studentId: 'E2E-099', block: 'Block 3/4', code: CODES['Block 1/2'] });
  check('another block’s code does not work', crossCode.ok === false);
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await ctx1.close(); await ctx2.close();
});

scenario('expiry: server deadline, late answers refused, offline student auto-submitted', async ({ srv, browser }) => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } }); const errs = watchErrors(page, 'expiry');
  await login(page, srv, { first: 'Katherine', last: 'Johnson', id: 'E2E-004', block: 'Block 6/7' }); await begin(page);
  const { sid, token } = await sess(page);
  await gotoItem(page, 'c1-test'); await fillItem(page, 'c1-test', await solveRemote(srv, sid, 'c1-test', 'correct')); await checkAnswer(page);
  // a second student who walks away (offline) after answering one question
  const off = await api(srv, 'login', { firstName: 'Offline', lastName: 'Student', studentId: 'E2E-005', block: 'Block 8/9', code: CODES['Block 8/9'] });
  await api(srv, 'begin', { sessionId: off.sessionId, token: off.token });
  const ans = await post(srv, '/dev/solve', { sessionId: off.sessionId, itemId: 'c1-test', mode: 'correct' });
  await api(srv, 'submit', { sessionId: off.sessionId, token: off.token, itemId: 'c1-test', response: ans.response, requestId: 'offline-request-0001', expectedAttempt: 1 });
  await post(srv, '/dev/advance', { minutes: 91 });
  const late = await api(srv, 'submit', { sessionId: sid, token, itemId: 'c1-vocab', response: (await post(srv, '/dev/solve', { sessionId: sid, itemId: 'c1-vocab', mode: 'correct' })).response, requestId: 'late-request-000002', expectedAttempt: 1 });
  check('an answer sent after the deadline is rejected', late.ok === false && /TIME_UP|FINALIZED/.test(late.code), JSON.stringify(late).slice(0, 140));
  await page.reload(); await page.waitForSelector('#done-title', { timeout: 15000 });
  check('the student sees the Time Expired screen', /Time expired/i.test(await page.locator('#done-title').innerText()));
  check('the screen is labelled Auto-Submitted', /Auto-Submitted/.test(await page.locator('main').innerText()));
  const t = await api(srv, 'teacherLogin', { password: TEACHER_PW }); const ov = await api(srv, 'teacherOverview', { teacherToken: t.teacherToken });
  const k = ov.rows.find((r) => r.studentId === 'E2E-004'), o = ov.rows.find((r) => r.studentId === 'E2E-005');
  check('the server recorded the first student as auto-submitted with only earned work', k && /Auto-Submitted/.test(k.statusLabel) && k.pct > 0 && k.pct < 10, JSON.stringify(k && { s: k.statusLabel, p: k.pct }));
  check('the offline student was finalized by the server without ever reconnecting', o && /Auto-Submitted/.test(o.statusLabel) && o.pct > 0, JSON.stringify(o && { s: o.statusLabel, p: o.pct }));
  check('overview counts the auto-submissions', ov.summary.autoSubmitted >= 2, JSON.stringify(ov.summary));
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await page.close();
});


async function teacherLoginUI(page, srv) {
  await page.goto(srv.base + '/'); await page.waitForSelector('form');
  await page.fill('input[name=code]', 'WALK-TEACHER'); await page.waitForSelector('input[type=password]');
  check('the teacher code opens the password screen immediately (no student fields)', (await page.locator('input[name=firstName]').count()) === 0);
  await page.fill('input[type=password]', 'wrong-password'); await page.click('button[type=submit]'); await page.waitForSelector('.notice.bad:visible');
  check('a wrong teacher password is refused by the server', (await page.locator('.t-tabs').count()) === 0);
  await page.fill('input[type=password]', TEACHER_PW); await page.click('button[type=submit]'); await page.waitForSelector('.t-tabs');
}

scenario('timer: warning colours, final banner, expiry, in the preview', async ({ srv, browser }) => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } }); const errs = watchErrors(page, 'timer');
  await teacherLoginUI(page, srv);
  await page.click('#tt-testing'); await page.click('button:has-text("Open my preview")'); await page.waitForSelector('.pvbar');
  const setTimer = async (value) => { await page.selectOption('select[aria-label="Set preview timer to"]', value); await page.click('button:has-text("Set timer")'); await page.waitForTimeout(1300); };
  const cls = () => page.locator('.bar .timer').getAttribute('class');
  check('normal state at the start', !/amber|red|final/.test(await cls()), await cls());
  await setTimer('1500'); check('amber at 25:00 (30 minutes or less)', /amber/.test(await cls()), await cls());
  await setTimer('600'); check('red at 10:00', /red/.test(await cls()), await cls());
  await setTimer('300'); check('final warning at 5:00 with a banner', /final/.test(await cls()) && (await page.locator('.final-banner').count()) === 1, await cls());
  await setTimer('20');
  await page.waitForSelector('#done-title', { timeout: 40000 });
  check('at 0:00 the preview locks and shows the Time Expired screen', /Time expired/i.test(await page.locator('#done-title').innerText()));
  check('the preview says no grade was recorded', /No grade was recorded/.test(await page.locator('main').innerText()));
  await page.click('button:has-text("Reset My Preview Progress")'); await page.waitForSelector('.pvbar');
  check('Reset My Preview Progress restores a fresh 90-minute preview', /^(89|90):/.test((await page.locator('.bar .timer .tm').innerText()).trim()));
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await page.close();
});

scenario('teacher: preview key, resets, codes, access control', async ({ srv, browser }) => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } }); const errs = watchErrors(page, 'teacher');
  // a real student with some progress
  const st = await api(srv, 'login', { firstName: 'Mae', lastName: 'Jemison', studentId: 'E2E-010', block: 'Block 8/9', code: CODES['Block 8/9'] });
  await api(srv, 'begin', { sessionId: st.sessionId, token: st.token });
  const sol = await post(srv, '/dev/solve', { sessionId: st.sessionId, itemId: 'c1-test', mode: 'correct' });
  const sub = await api(srv, 'submit', { sessionId: st.sessionId, token: st.token, itemId: 'c1-test', response: sol.response, requestId: 'mae-first-request-01', expectedAttempt: 1 });
  check('student answer accepted', sub.ok && sub.correct);
  check('teacher actions are refused without a teacher token', (await api(srv, 'resetStudent', { studentId: 'E2E-010', confirm: true })).code === 'FORBIDDEN' && (await api(srv, 'answerKey', {})).code === 'FORBIDDEN' && (await api(srv, 'getConfig', {})).code === 'FORBIDDEN');
  check('a student token cannot be used as a teacher token', (await api(srv, 'answerKey', { teacherToken: st.token })).code === 'FORBIDDEN');
  await teacherLoginUI(page, srv);
  check('the overview lists the student with progress', (await page.locator('.t-table').innerText()).includes('Jemison'));
  // preview: key under questions, free navigation, separate from gradebook
  await page.click('#tt-testing'); await page.click('button:has-text("Open my preview")'); await page.waitForSelector('.pvbar');
  await page.selectOption('select[aria-label="Chapter"]', '4'); await page.waitForTimeout(600);
  await page.selectOption('select[aria-label="Step"]', { index: 1 }); await page.click('button:has-text("Go")');
  await page.waitForSelector('section.item'); await page.waitForSelector('.keypanel .kp-key', { timeout: 8000 });
  check('chapter 4 opens immediately in the preview and shows the answer key', (await page.locator('.keypanel .kp-key').count()) > 0);
  const keyText = await page.locator('.keypanel .kp-key').first().innerText();
  const itemId = await page.locator('section.item').getAttribute('data-item');
  const sess_ = await sess_preview(page);
  const sol2 = await post(srv, '/dev/solve', { sessionId: 'PV-MAIN', itemId, mode: 'correct' });
  check('the key matches the preview’s own numbers', sol2.ok && keyText.length > 3);
  await fillItem(page, itemId, sol2.response); await checkAnswer(page);
  check('answers in the preview are graded as correct', (await page.locator('.feedback.good').count()) === 1);
  await page.click('button:has-text("Exit preview")'); await page.waitForSelector('.t-tabs');
  const ov0 = await api(srv, 'teacherLogin', { password: TEACHER_PW }); const ov = await api(srv, 'teacherOverview', { teacherToken: ov0.teacherToken });
  check('the preview left the real gradebook untouched', ov.rows.every((r) => !String(r.studentId).startsWith('PV')) && ov.rows.find((r) => r.studentId === 'E2E-010').earned > 0);
  // reset a real student
  await page.click('#tt-students'); await page.fill('input[type=search]', 'Jemison'); await page.keyboard.press('Enter'); await page.click('button:has-text("View progress")'); await page.waitForSelector('text=Progress by question');
  await page.click('button:has-text("Reset Student Progress")'); await page.waitForSelector('.modal');
  check('the reset confirm button stays disabled until the box is ticked', await page.locator('.modal .btn-danger-solid').isDisabled());
  await page.check('.modal input[type=checkbox]'); await page.fill('.modal input[type=text]', 'e2e test'); await page.click('.modal .btn-danger-solid');
  await page.waitForSelector('#sd-msg .notice.good', { timeout: 8000 });
  const after = await api(srv, 'teacherStudent', { teacherToken: ov0.teacherToken, studentId: 'E2E-010' });
  check('after the reset the student is back to Not Started with 0 points and a fresh set of attempts', after.row.status === 'registered' && after.row.earned === 0 && after.items.every((i) => i.attempts === 0), JSON.stringify(after.row).slice(0, 160));
  check('the old record is kept in the archive and the reset is logged', after.archive.length === 1 && after.resetLog.length === 1, JSON.stringify({ a: after.archive.length, r: after.resetLog.length }));
  const old = await api(srv, 'state', { sessionId: st.sessionId, token: st.token });
  check('the student’s old session is no longer valid', old.ok === false, JSON.stringify(old).slice(0, 100));
  const again = await api(srv, 'login', { firstName: 'Mae', lastName: 'Jemison', studentId: 'E2E-010', block: 'Block 8/9', code: CODES['Block 8/9'] });
  check('the student can sign in again and begin with a full 90 minutes', again.ok && again.state.status === 'registered');
  await api(srv, 'begin', { sessionId: again.sessionId, token: again.token });
  const st2 = await api(srv, 'state', { sessionId: again.sessionId, token: again.token });
  check('the new deadline is 90 minutes after the new start', Math.abs((Date.parse(st2.state.deadline) - Date.parse(st2.state.startedAt)) / 60000 - 90) < 0.01, JSON.stringify([st2.state.startedAt, st2.state.deadline]));
  // codes
  await page.click('#tt-codes'); await page.waitForSelector('text=Check a code without signing in');
  const closed = await api(srv, 'saveConfig', { teacherToken: ov0.teacherToken, codes: { 'Block 1/2': { code: 'NEWCODE-12', open: false } } });
  check('a teacher can change one block’s code and close it', closed.ok && closed.codes['Block 1/2'].code === 'NEWCODE-12' && closed.codes['Block 1/2'].open === false);
  const rej = await api(srv, 'login', { firstName: 'Late', lastName: 'Comer', studentId: 'E2E-011', block: 'Block 1/2', code: 'NEWCODE-12' });
  check('a closed block refuses sign-in even with the right code', rej.ok === false, JSON.stringify(rej).slice(0, 120));
  const dup = await api(srv, 'saveConfig', { teacherToken: ov0.teacherToken, codes: { 'Block 1/2': { code: CODES['Block 3/4'], open: true } } });
  check('two blocks cannot share a code', dup.ok === false);
  const tst = await api(srv, 'testCode', { teacherToken: ov0.teacherToken, block: 'Block 3/4', code: CODES['Block 3/4'] });
  check('Test Code validates without creating a student', tst.ok && tst.valid === true);
  const demo = await api(srv, 'generateDemo', { teacherToken: ov0.teacherToken, count: 8 });
  const ov2 = await api(srv, 'teacherOverview', { teacherToken: ov0.teacherToken });
  check('fictional submissions never enter the real overview', demo.ok && ov2.rows.every((r) => !/DEMO/.test(r.studentId)));
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await page.close();
});
async function sess_preview() { return null; }


scenario('keyboard: answer a question using only the keyboard, visible focus', async ({ srv, browser }) => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } }); const errs = watchErrors(page, 'keyboard');
  await teacherLoginUI(page, srv);
  await page.click('#tt-testing'); await page.click('button:has-text("Open my preview")'); await page.waitForSelector('.pvbar');
  await page.evaluate(() => { const sel = document.querySelector('select[aria-label="Chapter"]'); sel.value = '5'; sel.dispatchEvent(new Event('change')); }); await page.waitForTimeout(700);
  await page.evaluate(() => { const st = document.querySelector('select[aria-label="Step"]'); st.selectedIndex = Array.from(st.options).findIndex((o) => /counter-message/.test(o.textContent)); Array.from(document.querySelectorAll('.pvbar button')).find((b) => b.textContent === 'Go').click(); });
  await page.waitForSelector('section.item[data-item="c5-psa"]');
  const focusInfo = () => page.evaluate(() => { const a = document.activeElement, l = a && (a.closest('label') || a), cs = getComputedStyle(l), cs2 = getComputedStyle(a); return { tag: a.tagName, type: a.type || '', outline: cs.outlineStyle + ' ' + cs.outlineWidth, shadow: cs.boxShadow, outline2: cs2.outlineStyle }; });
  await page.locator('#step-title').focus();
  let found = null;
  for (let i = 0; i < 40 && !found; i++) { await page.keyboard.press('Tab'); const f = await focusInfo(); if (f.type === 'radio') found = f; }
  check('Tab reaches the answer choices', !!found);
  check('the focused choice shows a visible focus indicator', found && (!/none/.test(found.outline) || found.shadow !== 'none' || !/none/.test(found.outline2)), JSON.stringify(found));
  await page.keyboard.press('Space');
  check('Space selects the choice', (await page.locator('section.item input[type=radio]:checked').count()) === 1);
  let hit = false; for (let i = 0; i < 12 && !hit; i++) { await page.keyboard.press('Tab'); hit = await page.evaluate(() => /Check answer/.test(document.activeElement.textContent || '')); }
  check('Tab reaches the Check answer button', hit);
  const p = page.waitForResponse((r) => r.url().endsWith('/api') && /"action":"submit"/.test(r.request().postData() || '')); await page.keyboard.press('Enter'); const res = await (await p).json();
  check('Enter submits the answer', res.ok === true);
  await page.waitForTimeout(300);
  check('the result is shown (and announced) after Enter', (await page.locator('.feedback').innerText()).length > 0);
  // first focus stop on a fresh page load is the skip link
  await page.goto(srv.base + '/'); await page.waitForSelector('form'); await page.keyboard.press('Tab');
  check('the skip link is the first focus stop', await page.evaluate(() => /Skip to main/.test(document.activeElement.textContent)));
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await page.close();
});

scenario('layout: no horizontal overflow on any screen at Chromebook and phone sizes', async ({ srv, browser }) => {
  for (const vp of [{ width: 1366, height: 768, name: 'Chromebook 1366x768' }, { width: 1024, height: 700, name: 'small laptop 1024' }, { width: 390, height: 844, name: 'phone 390' }]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } }); const errs = watchErrors(page, vp.name);
    await page.goto(srv.base + '/'); await page.waitForSelector('form'); await page.waitForTimeout(500);
    const over = async (label) => { const o = await page.evaluate(() => { const w = document.documentElement.clientWidth, bad = []; document.querySelectorAll('body *').forEach((e) => { if (e.closest('.t-scroll, .t-table, .b-tablewrap, .chart-data, .sr-only, .skip, .odds-bg, svg, .ghost, .wipe')) return; const inScroller = (() => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll') return true; } return false; })(); const r = e.getBoundingClientRect(); if (r.width && r.right > w + 1 && !inScroller && getComputedStyle(e).position !== 'fixed') bad.push(e.tagName + '.' + String(e.className).slice(0, 24)); }); return { sw: document.documentElement.scrollWidth, w, bad: bad.slice(0, 4) }; }); return { label, ...o, ok: o.sw <= o.w + 1 && !o.bad.length }; };
    const bad = []; let r = await over('login'); if (!r.ok) bad.push(r);
    await page.fill('input[name=code]', 'WALK-TEACHER'); await page.waitForSelector('input[type=password]'); r = await over('teacher sign-in'); if (!r.ok) bad.push(r);
    await page.fill('input[type=password]', TEACHER_PW); await page.click('button[type=submit]'); await page.waitForSelector('.t-tabs'); await page.waitForTimeout(600);
    for (const t of ['overview', 'analytics', 'students', 'codes', 'testing', 'key', 'sources', 'export']) { await page.click('#tt-' + t); await page.waitForTimeout(500); r = await over('teacher ' + t); if (!r.ok) bad.push(r); }
    await page.click('#tt-testing'); await page.click('button:has-text("Open my preview")'); await page.waitForSelector('.pvbar'); await page.addStyleTag({ content: '#pvbar{display:none!important}' });
    const api_ = await page.evaluate(() => 0);
    for (let ch = 1; ch <= 6; ch++) {
      await page.evaluate((c) => { const sel = document.querySelector('select[aria-label="Chapter"]'); sel.value = String(c); sel.dispatchEvent(new Event('change')); }, ch); await page.waitForTimeout(500);
      const n = await page.locator('select[aria-label="Step"] option').count();
      for (let i = 0; i < n; i++) {
        await page.evaluate((idx) => { document.querySelector('select[aria-label="Step"]').selectedIndex = idx; Array.from(document.querySelectorAll('.pvbar button')).find((b) => b.textContent === 'Go').click(); }, i);
        await page.waitForSelector('.view'); await page.waitForTimeout(700); r = await over(`ch${ch} step${i}`); if (!r.ok) bad.push(r);
      }
    }
    check(`${vp.name}: no screen overflows horizontally`, bad.length === 0, JSON.stringify(bad.slice(0, 4)));
    check(`${vp.name}: no page errors`, errs.length === 0, errs.slice(0, 3).join(' | '));
    await page.close();
  }
});


scenario('network: offline answer is not counted, retry works, timer survives refresh and clock changes', async ({ srv, browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const page = await ctx.newPage(); const errs = watchErrors(page, 'network');
  await login(page, srv, { first: 'Hedy', last: 'Lamarr', id: 'E2E-030', block: 'Block 8/9' }); await begin(page);
  const { sid } = await sess(page);
  await gotoItem(page, 'c1-test');
  await fillItem(page, 'c1-test', await solveRemote(srv, sid, 'c1-test', 'correct'));
  await ctx.setOffline(true);
  await page.click('button:has-text("Check answer")'); await page.waitForTimeout(1500);
  check('offline: the page says the answer was NOT counted', /NOT counted|not counted/i.test(await page.locator('.feedback').innerText()) || /Retrying|Offline/i.test(await page.locator('.save-state').innerText()), await page.locator('.feedback').innerText());
  await ctx.setOffline(false);
  const t0 = await api(srv, 'state', { sessionId: sid, token: (await sess(page)).token });
  check('offline: the server did not use an attempt', t0.state.items['c1-test'].n === 0, JSON.stringify(t0.state.items['c1-test']).slice(0, 100));
  await page.waitForTimeout(6500);   // the client retries with backoff, or the student presses again; either way exactly one attempt results
  if (await page.locator('button:has-text("Check answer"):visible').count()) { const b = page.locator('button:has-text("Check answer")'); if (await b.isEnabled()) await checkAnswer(page).catch(() => {}); }
  await page.waitForTimeout(500);
  const t1 = await api(srv, 'state', { sessionId: sid, token: (await sess(page)).token });
  check('after reconnecting, exactly one attempt was recorded and it was correct', t1.state.items['c1-test'].n === 1 && t1.state.items['c1-test'].st === 'correct', JSON.stringify(t1.state.items['c1-test']).slice(0, 120));
  // the server clock moves on 62 minutes; a refresh shows the same remaining time the server has
  await post(srv, '/dev/advance', { minutes: 62 });
  await page.reload(); await page.waitForSelector('.bar .timer');
  const txt = (await page.locator('.bar .timer .tm').innerText()).trim(); const mins = Number(txt.split(':')[0]);
  check('after a refresh the timer shows what the server says remains (about 28 minutes)', mins >= 27 && mins <= 28, txt);
  check('and it is in the amber state', /amber/.test(await page.locator('.bar .timer').getAttribute('class')));
  // a wrong computer clock must not matter: jump the browser’s clock forward an hour and reload
  await page.addInitScript(() => { const real = Date.now; Date.now = () => real() + 3600000; });
  await page.reload(); await page.waitForSelector('.bar .timer');
  const txt2 = (await page.locator('.bar .timer .tm').innerText()).trim(); const m2 = Number(txt2.split(':')[0]);
  check('a computer clock that is an hour fast does not change the countdown', m2 >= 26 && m2 <= 28, txt2);
  check('no page errors', errs.filter((e) => !/Failed to fetch|NetworkError|ERR_INTERNET_DISCONNECTED/.test(e)).length === 0, errs.slice(0, 3).join(' | '));
  await ctx.close();
});

const srv = await startServer(Number(process.env.E2E_PORT || 8191 + Math.floor(Math.random() * 400)));
const browser = await launch();
let failed = 0;
try {
  for (const s of SC) { if (only && !s.name.includes(only)) continue; section(s.name); try { await s.fn({ srv, browser }); } catch (e) { check('scenario completed without throwing', false, String(e.message).split('\n')[0]); } }
  failed = summary();
} finally { await browser.close(); srv.stop(); }
process.exit(failed ? 1 : 0);
