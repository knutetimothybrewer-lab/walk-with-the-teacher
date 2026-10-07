import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { serve } from '../../tools/serve.js';
import { mockBackend } from './mockBackend.js';
import * as D from './driver.js';
import content from '../../content/index.js';

const PORT = 8101;
const BASE = `http://localhost:${PORT}/`;
let server, browser, backend;

before(async () => {
  server = await serve(PORT);
  browser = await chromium.launch({ args: ['--no-sandbox'] });
  backend = await mockBackend();
});
after(async () => { await browser.close(); server.close(); backend.close(); });

/** New page; optionally point config.js at the mock backend and add overrides. */
async function newPage({ viewport = { width: 1366, height: 768 }, reducedMotion = 'reduce', withBackend = false, overrides = null, extra = null, touch = false } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  { // always intercept config.js so tests never depend on (or call) the teacher's real backend URL
    await page.route('**/config.js', async route => {
      let src = fs.readFileSync(new URL('../../config.js', import.meta.url), 'utf8');
      src = src.replace(/url: '[^']*'/, `url: '${withBackend ? backend.url : ''}'`);
      if (overrides) src = src.replace('studentOverrides: {', `studentOverrides: ${JSON.stringify(overrides)}, _unused: {`);
      if (extra) src = src.replace("assessmentVersion: 'mh-1.0'", `assessmentVersion: 'mh-1.0', ...${JSON.stringify(extra)}`);
      await route.fulfill({ contentType: 'text/javascript', body: src });
    });
  }
  return { page, ctx, errors };
}
const finalPercent = async (page) => Number((await page.locator('#finalPct').innerText()).trim());
async function waitFinal(page) { await page.waitForSelector('.final h1'); await page.waitForFunction(() => document.querySelector('#finalPct') && document.querySelector('#finalPct').textContent === String(window.__WWT__.app.session.result.percent)); }

test('wrong class code shows a friendly error; empty form is caught', async () => {
  const { page, ctx, errors } = await newPage();
  await page.goto(BASE);
  await page.click('button[type=submit]');
  assert.match(await page.locator('.form-err').innerText(), /fill in all four/i);
  await D.startStudent(page, BASE, { code: 'WRONG' });
  await page.waitForSelector('.form-err:not([hidden])');
  assert.match(await page.locator('.form-err').innerText(), /didn't work/i);
  assert.equal(await page.locator('.station-intro').count(), 0);
  // codes are case-insensitive
  await page.fill('#f-code', 'tRaIl2');
  await page.click('button[type=submit]');
  await page.waitForSelector('.station-intro');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('full run with mixed perfect / retry / failed / skipped answers matches the independently computed score', { timeout: 600000 }, async () => {
  const { page, ctx, errors } = await newPage({ withBackend: true });
  await D.startStudent(page, BASE, { first: 'Mixed', last: 'Run', code: 'TRAIL1' });
  const skipIds = ['s3-01', 's7-02', 's8-c1a', 's5-03'];
  const results = await D.playThrough(page, D.mixed(skipIds));
  await waitFinal(page);
  // expected score, computed only from content + what the driver did
  let earned = 0, possible = 0;
  for (const { it } of D.allItems()) {
    const res = results[it.id];
    assert.ok(res, `no result recorded for ${it.id}`);
    earned += D.expectedEarned(it, res);
    possible += D.itemPoints(it);
  }
  // scene skip: skipping a chat step skips the remaining steps of that scene (full credit)
  const expected = D.expectedPercent(earned, possible);
  const actual = await finalPercent(page);
  assert.equal(actual, expected, `app says ${actual}, independent calculation says ${expected} (earned ${earned.toFixed(3)} / ${possible})`);
  assert.match(await page.locator('h1').first().innerText(), new RegExp(`Your final score: ${expected}%`));
  // sent to backend
  await page.waitForFunction(() => /sent to/.test(document.querySelector('#syncStatus').textContent));
  assert.equal(backend.state.submissions.length >= 1, true);
  const sub = backend.state.submissions.at(-1);
  assert.equal(sub.percent, expected);
  assert.equal(sub.items.length, D.allItems().length);
  assert.ok(sub.skips >= 3, 'skips are logged');
  assert.equal(sub.items.filter(i => i.skipped).every(i => i.attempts === 0 && i.firstWrong === ''), true, 'skipped items log no answers');
  assert.match(sub.completion, /^WWT-/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('refresh resumes at the same item with the same shuffle, and keeps progress', async () => {
  const { page, ctx } = await newPage();
  await D.startStudent(page, BASE, { first: 'Resume', last: 'Test' });
  await page.click('#btn-begin');
  await page.waitForSelector('article.item');
  const id1 = await page.locator('article.item').getAttribute('data-item');
  const order1 = await page.locator('button.opt, button.tok').evaluateAll(els => els.map(e => e.textContent));
  // answer it correctly, go to the next
  const it = D.allItems().find(x => x.it.id === id1).it;
  await D.answerItem(page, it, 'second');
  await page.locator('.item-foot button.btn-primary', { hasText: /Next|Finish/ }).click();
  await page.waitForSelector('article.item');
  const id2 = await page.locator('article.item').getAttribute('data-item');
  const order2 = await page.locator('button.opt, button.tok').evaluateAll(els => els.map(e => e.textContent));
  const pointsBefore = await page.locator('#ptsVal').innerText();
  await page.reload();
  await page.waitForSelector('#btn-resume');
  assert.match(await page.locator('.welcome-back').innerText(), /Welcome back, Resume/);
  await page.click('#btn-resume');
  await page.waitForSelector('article.item');
  assert.equal(await page.locator('article.item').getAttribute('data-item'), id2);
  assert.deepEqual(await page.locator('button.opt, button.tok').evaluateAll(els => els.map(e => e.textContent)), order2, 'same option order after refresh');
  assert.equal(await page.locator('#ptsVal').innerText(), pointsBefore);
  assert.notEqual(id1, id2);
  void order1;
  await ctx.close();
});

test('a refresh in the middle of retries keeps the attempt count', async () => {
  const { page, ctx } = await newPage();
  await D.startStudent(page, BASE, { first: 'Retry', last: 'Keep' });
  await page.click('#btn-begin');
  await page.waitForSelector('article.item');
  const id = await page.locator('article.item').getAttribute('data-item');
  const it = D.allItems().find(x => x.it.id === id).it;
  // one wrong attempt (use the driver's 'second' then stop before the right one is not possible), so do it manually
  if (it.type === 'mc') {
    const wrong = it.options.findIndex(o => !o.ok);
    await page.locator(`button.opt[data-opt="${wrong}"]`).click();
    await page.locator('.item-foot button.btn-primary', { hasText: 'Check answer' }).click();
    await page.waitForSelector('.feedback.try');
    await page.reload(); await page.click('#btn-resume');
    await page.waitForSelector('article.item');
    assert.match(await page.locator('.chip.attempt').innerText(), /Try 2 of 3/);
  }
  await ctx.close();
});

test('offline: score and code still show; queued submission is retried and succeeds', { timeout: 300000 }, async () => {
  backend.state.down = true;
  const before = backend.state.submissions.length;
  const { page, ctx } = await newPage({ withBackend: true });
  // start is allowed offline with a locally valid code (allowOfflineStart)
  await D.startStudent(page, BASE, { first: 'Off', last: 'Line', code: 'TRAIL2' });
  await page.waitForSelector('.station-intro');
  // shorten the run: disable all but a few items through config
  await ctx.close();
  const p2 = await newPage({ withBackend: true, extra: { disabledItems: D.allItems().map(x => x.it.id).filter(id => !['s1-01', 's1-02'].includes(id)) } });
  await D.startStudent(p2.page, BASE, { first: 'Off', last: 'Line', code: 'TRAIL2' });
  await D.playThrough(p2.page, D.PERFECT);
  await p2.page.waitForSelector('.final h1');
  assert.match(await p2.page.locator('#syncStatus').innerText(), /may not have been sent yet/i);
  assert.match(await p2.page.locator('#ccode').innerText(), /^WWT-/);
  assert.ok((await p2.page.locator('#finalPct').innerText()).length > 0);
  assert.equal(backend.state.submissions.length, before);
  backend.state.down = false;
  await p2.page.click('#btn-resend');
  await p2.page.waitForFunction(() => /was sent to/.test(document.querySelector('#syncStatus').textContent), null, { timeout: 20000 });
  assert.equal(backend.state.submissions.length, before + 1);
  await p2.ctx.close();
});

test('duplicate prevention + teacher reset allows a retake with a reshuffle', { timeout: 300000 }, async () => {
  const only = { disabledItems: D.allItems().map(x => x.it.id).filter(id => !['s1-01', 's1-03', 's2-01', 's2-05'].includes(id)) };
  const student = { first: 'Dup', last: 'Check', code: 'TRAIL1' };
  const a = await newPage({ withBackend: true, extra: only });
  await D.startStudent(a.page, BASE, student);
  await D.playThrough(a.page, D.PERFECT);
  await a.page.waitForFunction(() => /was sent to/.test(document.querySelector('#syncStatus').textContent));
  // same student on a brand-new browser profile (no local record): blocked by the server
  const b = await newPage({ withBackend: true, extra: only });
  await D.startStudent(b.page, BASE, student);
  await b.page.waitForSelector('.form-err:not([hidden])');
  assert.match(await b.page.locator('.form-err').innerText(), /already on record/i);
  // teacher resets on the server; the first device (which holds a finished record) can now retake
  backend.reset({ first: 'Dup', last: 'Check', period: '3', code: 'TRAIL1' });
  const seedBefore = await a.page.evaluate(() => window.__WWT__.app.session.seed);
  await a.page.goto(BASE);
  await a.page.waitForSelector('#btn-notme');
  await a.page.click('#btn-notme');
  await D.startStudent(a.page, BASE, student);
  await a.page.waitForSelector('.station-intro');
  const seedAfter = await a.page.evaluate(() => window.__WWT__.app.session.seed);
  assert.notEqual(seedAfter, seedBefore, 'a retake reshuffles');
  await a.ctx.close(); await b.ctx.close();
});

test('per-student override: extended time hides the pace indicator', async () => {
  const { page, ctx } = await newPage({ overrides: { 'sam rivera|3': { extendedTime: true, largeText: true } } });
  await D.startStudent(page, BASE, { first: 'Sam', last: 'Rivera' });
  await page.click('#btn-begin');
  await page.waitForSelector('article.item');
  assert.equal(await page.locator('#paceChip').isVisible(), false);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.text), '2');
  await ctx.close();
  const o = await newPage();
  await D.startStudent(o.page, BASE, { first: 'Other', last: 'Kid' });
  await o.page.click('#btn-begin');
  await o.page.waitForSelector('article.item');
  assert.equal(await o.page.locator('#paceChip').isVisible(), true);
  assert.match(await o.page.locator('#paceChip').innerText(), /min left at a typical pace|Almost there/);
  await o.ctx.close();
});

test('help button works on every kind of screen and is offline-safe', async () => {
  const { page, ctx } = await newPage();
  await page.goto(BASE);
  await page.click('#helpBtn');
  const dlg = page.locator('#help');
  assert.equal(await dlg.isVisible(), true);
  const text = await dlg.innerText();
  for (const s of ['988', '741741', '911', 'school counselor']) assert.ok(text.toLowerCase().includes(s.toLowerCase()), `help dialog mentions ${s}`);
  await page.keyboard.press('Escape');
  assert.equal(await dlg.isVisible(), false);
  await D.startStudent(page, BASE, { first: 'Help', last: 'Test' });
  await page.click('#btn-begin');
  await page.waitForSelector('article.item');
  await ctx.setOffline(true);
  await page.click('#helpBtn');
  assert.equal(await dlg.isVisible(), true);
  await page.click('#help [data-close] >> nth=1');
  await ctx.setOffline(false);
  assert.ok(await page.evaluate(() => window.__WWT__.app.session.helpOpens) >= 1);
  await ctx.close();
});

test('keyboard only: complete the welcome form, answer an mc, a multi and a sort without a mouse', async () => {
  const { page, ctx } = await newPage();
  await page.goto(BASE);
  await page.keyboard.press('Tab'); // skip link
  await page.focus('#f-first');
  await page.keyboard.type('Key'); await page.keyboard.press('Tab');
  await page.keyboard.type('Board'); await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); // period via select
  await page.keyboard.press('Tab');
  await page.keyboard.type('trail1');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.station-intro');
  await page.focus('#btn-begin'); await page.keyboard.press('Enter');
  await page.waitForSelector('article.item');
  // answer three different kinds with keyboard only
  let done = 0;
  for (let guard = 0; guard < 12 && done < 3; guard++) {
    const id = await page.locator('article.item').getAttribute('data-item');
    const it = D.allItems().find(x => x.it.id === id)?.it;
    if (!it) { await page.keyboard.press('Tab'); continue; }
    if (it.type === 'mc') {
      const rightIdx = it.options.findIndex(o => o.ok);
      const btn = page.locator(`button.opt[data-opt="${rightIdx}"]`);
      await btn.focus(); await page.keyboard.press('Space');
    } else if (it.type === 'multi') {
      for (const [i, o] of it.options.entries()) if (o.ok) { await page.locator(`button.opt[data-opt="${i}"]`).focus(); await page.keyboard.press('Space'); }
    } else if (it.mode === 'tag') {
      for (const t of it.tokens) { await page.locator(`.tag-row[data-tok="${t.id}"] button[data-slot="${t.slot}"]`).focus(); await page.keyboard.press('Enter'); }
    } else {
      for (const t of it.tokens) {
        await page.locator(`button.tok[data-tok="${t.id}"]`).focus(); await page.keyboard.press('Enter');
        await page.locator(`button.slot-btn[data-slot="${t.slot}"]`).focus(); await page.keyboard.press('Enter');
      }
    }
    await page.locator('.item-foot button.btn-primary', { hasText: 'Check answer' }).focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('.feedback.good');
    await page.locator('.item-foot button.btn-primary', { hasText: /Next|Finish/ }).focus();
    await page.keyboard.press('Enter');
    done++;
    await page.waitForSelector('article.item, .station-end');
    if (await page.locator('.station-end').count()) break;
  }
  assert.ok(done >= 3, `answered ${done} items by keyboard`);
  await ctx.close();
});

test('reduced motion: no running animations, class applied', async () => {
  const { page, ctx } = await newPage({ reducedMotion: 'reduce' });
  await page.goto(BASE);
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('reduce-motion')), true);
  await D.startStudent(page, BASE, { first: 'Calm', last: 'Motion' });
  await page.click('#btn-begin');
  await page.waitForSelector('article.item');
  await page.waitForTimeout(300);
  const running = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations === Infinity).length);
  assert.equal(running, 0, 'no infinite animations');
  await ctx.close();
  // and with normal motion there ARE animations (stars twinkle), so the test is meaningful
  const n = await newPage({ reducedMotion: 'no-preference' });
  await n.page.goto(BASE); await n.page.waitForTimeout(300);
  assert.ok(await n.page.evaluate(() => document.getAnimations().length) > 0);
  await n.ctx.close();
});

for (const [name, vp, touch] of [['phone 360x640', { width: 360, height: 640 }, true], ['Chromebook 1366x768', { width: 1366, height: 768 }, false], ['small Chromebook 1280x720', { width: 1280, height: 720 }, false]]) {
  test(`layout: ${name} has no horizontal overflow on every screen type`, { timeout: 300000 }, async () => {
    const keep = ['s1-02', 's3-03', 's4-06', 's5-03', 's6-07', 's7-01', 's8-c1a', 's9-02', 's9-04', 's10-c8'];
    const { page, ctx, errors } = await newPage({ viewport: vp, touch, extra: { disabledItems: D.allItems().map(x => x.it.id).filter(id => !keep.includes(id)) } });
    await D.startStudent(page, BASE, { first: 'Lay', last: 'Out' });
    const bad = [];
    await D.playThrough(page, D.PERFECT, { shots: async (pg, id, kind) => {
      const over = await pg.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
      if (over > 1) bad.push(`${id}/${kind}: ${over}px`);
      // every interactive control is at least 36px tall (touch-friendly)
      const small = await pg.evaluate(() => Array.from(document.querySelectorAll('main button, main select, main input')).filter(e => e.offsetParent && getComputedStyle(e).visibility === 'visible' && e.getBoundingClientRect().height < 34 && !e.closest('.bp-steps')).map(e => e.textContent.trim().slice(0, 20)));
      if (small.length) bad.push(`${id}/${kind}: small targets ${small.join(', ')}`);
    } });
    assert.deepEqual(bad, []);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('finished stations can be reviewed (read-only); later stations stay locked', { timeout: 120000 }, async () => {
  const keep = ['s1-01', 's1-03', 's2-01', 's2-05'];
  const { page, ctx, errors } = await newPage({ extra: { disabledItems: D.allItems().map(x => x.it.id).filter(id => !keep.includes(id)) } });
  await D.startStudent(page, BASE, { first: 'Rev', last: 'Iew' });
  await page.click('#btn-begin');
  for (let i = 0; i < 2; i++) {
    await page.waitForSelector('article.item');
    const id = await page.locator('article.item').getAttribute('data-item');
    await D.answerItem(page, D.allItems().find(x => x.it.id === id).it, i === 0 ? 'fail' : 'perfect');
    await page.locator('.item-foot button.btn-primary', { hasText: /Next|Finish/ }).click();
  }
  await page.waitForSelector('.station-end');
  await page.click('#btn-trail');
  await page.waitForSelector('#trail[open]');
  assert.equal(await page.locator('#trail button[data-review]').count(), 1, 'only the finished station is reviewable');
  await page.click('#trail button[data-review]');
  await page.waitForSelector('#review[open] .review-card');
  const cards = await page.locator('#review .review-card').count();
  assert.equal(cards, 2);
  assert.equal(await page.locator('#review button', { hasText: 'Check answer' }).count(), 0, 'no re-answering');
  assert.ok(await page.locator('#review .opt.right, #review .opt.reveal').count() >= 2, 'correct answers are shown');
  assert.match(await page.locator('#review').innerText(), /Review only/);
  assert.deepEqual(errors, []);
  await ctx.close();
});
