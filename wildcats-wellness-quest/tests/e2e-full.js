// Full run through the REAL UI (clicks/typing only). Optional mode: wrongfirst (every item answered wrong first, then right on the retry).
// NODE_PATH=$(npm root -g) node tests/e2e-full.js [best|wrongfirst]
const { chromium } = require('playwright'); const path = require('path'); const { BROWSER } = require('./helpers');
const MODE = process.argv[2] || 'best';
let fails = 0, passes = 0; const ok = (c, m) => { if (c) { passes++; console.log('  ok  :', m); } else { fails++; console.log('  FAIL:', m); } };
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' }); const page = await ctx.newPage(); page.setDefaultTimeout(8000);
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(BROWSER); await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForSelector('#stage-title');
  const t0 = Date.now(); let submitsClicked = 0;

  async function applyResponse(itemId, dir) {
    const plan = await page.evaluate(([id, dir]) => { const W = WWQ, it = W.ITEM_BY_ID[id], rec = W.App.state.items[id] || W.Policy.newRec(), v = W.Policy.currentVariant(it, rec); const r = __T.extreme(v, dir); return { vid: v.id, parts: v.parts.map(p => ({ id: p.id, type: p.type, val: r[p.id] })) }; }, [itemId, dir]);
    for (const p of plan.parts) {
      const name = `${itemId}|${plan.vid}|${p.id}`;
      if (p.type === 'num') await page.locator(`section[data-item="${itemId}"] input.txt[data-fk="n-${name}"]`).fill(String(p.val));
      else if (p.type === 'select') await page.locator(`section[data-item="${itemId}"] select[data-fk="s-${name}"]`).selectOption(p.val);
      else if (p.type === 'multi') { for (const v of p.val) await page.locator(`section[data-item="${itemId}"] input[name="${name}"][value="${v}"]`).locator('xpath=..').click(); }
      else await page.locator(`section[data-item="${itemId}"] input[name="${name}"][value="${p.val}"]`).locator('xpath=..').click();
    }
  }
  async function answerStage() {
    for (let guard = 0; guard < 8; guard++) {
      const ids = await page.evaluate(() => [...document.querySelectorAll('section.item[data-item]')].map(s => s.dataset.item).filter(id => WWQ.Policy.mode(WWQ.ITEM_BY_ID[id], WWQ.App.state.items[id] || WWQ.Policy.newRec()) !== 'final'));
      if (!ids.length) return;
      let answered = 0;
      for (const id of ids) {
        const mode = await page.evaluate(id => WWQ.Policy.mode(WWQ.ITEM_BY_ID[id], WWQ.App.state.items[id] || WWQ.Policy.newRec()), id);
        if (mode === 'review') { await page.locator(`section[data-item="${id}"] input[id^="rc-"]`).check(); await page.locator(`section[data-item="${id}"] button:has-text("Retry with a similar question")`).click(); continue; }
        const att = await page.evaluate(id => (WWQ.App.state.items[id] || { attempts: [] }).attempts.length, id);
        await applyResponse(id, MODE === 'wrongfirst' && att === 0 ? -1 : 1); answered++;
      }
      if (answered) { await page.click('#btn-submit'); submitsClicked++; await page.waitForTimeout(30); }
    }
  }
  async function stepsOf(m) { return page.evaluate(m => WWQ.MISSION[m].stages.map(s => ({ id: s.id, kind: s.kind, title: s.title })), m); }
  async function goStage(m, s) { await page.evaluate(([m, s]) => WWQ.App.go({ m, s }), [m, s]); await page.waitForSelector('#stage-title'); }

  console.log('== Setup + practice through the UI');
  await page.fill('#alias', 'full-run'); await page.click('#btn-start'); await page.click('text=Next: try a practice question');
  await page.evaluate(() => { }); // practice item
  for (let g = 0; g < 4; g++) { const done = await page.evaluate(() => WWQ.App.state.practice.tut.finalized); if (done) break; const mode = await page.evaluate(() => WWQ.Policy.mode(WWQ.PRACTICE.tut, WWQ.App.state.practice.tut)); if (mode === 'review') { await page.locator('input[id^="rc-"]').check(); await page.locator('button:has-text("Retry with a similar question")').click(); }
    const plan = await page.evaluate(() => { const v = WWQ.Policy.currentVariant(WWQ.PRACTICE.tut, WWQ.App.state.practice.tut); const r = __T.extreme(v, 1); return { vid: v.id, parts: v.parts.map(p => ({ id: p.id, val: r[p.id] })) }; });
    for (const p of plan.parts) await page.locator(`input[name="pr.tut|${plan.vid}|${p.id}"][value="${p.val}"]`).locator('xpath=..').click(); await page.click('#btn-submit'); }
  ok(await page.evaluate(() => WWQ.App.state.progress.activities.tutorial === true), 'tutorial activity complete');

  for (let m = 1; m <= 7; m++) {
    console.log('== Mission ' + m);
    await page.evaluate(() => WWQ.App.go({ view: 'map' })); await page.waitForSelector('.mapwrap');
    ok(await page.evaluate(m => WWQ.App.unlocked(m), m), 'mission ' + m + ' unlocked by previous submission');
    for (const st of await stepsOf(m)) {
      await goStage(m, st.id);
      if (st.kind === 'sort') {
        const cards = await page.evaluate(() => WWQ.ITEMS.filter(i => i.st === '1.1').map(i => ({ id: i.id, text: WWQ.Policy.currentVariant(i, WWQ.App.state.items[i.id] || WWQ.Policy.newRec()).ctx, key: WWQ.Policy.currentVariant(i, WWQ.App.state.items[i.id] || WWQ.Policy.newRec()).key })));
        const DN = { phys: 'Physical', ment: 'Mental', emo: 'Emotional', soc: 'Social', env: 'Environmental' }, WR = { phys: 'env', ment: 'phys', emo: 'soc', soc: 'ment', env: 'emo' };
        for (let round = 0; round < 3; round++) {
          const draft = await page.evaluate(() => WWQ.ITEMS.filter(i => i.st === '1.1').filter(i => WWQ.Policy.mode(i, WWQ.App.state.items[i.id] || WWQ.Policy.newRec()) === 'draft').map(i => ({ id: i.id, text: WWQ.Policy.currentVariant(i, WWQ.App.state.items[i.id] || WWQ.Policy.newRec()).ctx, key: WWQ.Policy.currentVariant(i, WWQ.App.state.items[i.id] || WWQ.Policy.newRec()).key, att: (WWQ.App.state.items[i.id] || { attempts: [] }).attempts.length })));
          if (!draft.length) { const rev = await page.locator('#rc-sort').count(); if (rev) { await page.check('#rc-sort'); await page.click('button:has-text("Retry")'); continue; } break; }
          for (const c of draft) { const dom = MODE === 'wrongfirst' && c.att === 0 ? WR[c.key] : c.key; await page.locator('.tray .sortcard', { hasText: c.text.slice(0, 30) }).first().click(); await page.locator(`.bin[aria-label="${DN[dom]} dimension"] button:has-text("Place here")`).click(); }
          await page.click('#btn-submit'); submitsClicked++;
        }
      } else if (st.kind === 'overlap') { const lens = page.locator('.card button.btn.sm'); for (let i = 0; i < 3; i++) await lens.nth(i).click(); await page.click('button:has-text("I explored the overlaps")'); }
      else if (st.kind === 'play') {
        for (const d of await page.evaluate(() => WWQ.DECISIONS.map(d => ({ id: d.id, A: d.opts.A })))) await page.locator(`input[name="${d.id}"]`).first().locator('xpath=..').click();
        await page.click('button:has-text("Finish the week")');
        ok(await page.evaluate(() => WWQ.App.state.progress.activities.playWeek), 'simulation week finished through the UI (unscored)');
      }
      else await answerStage();
    }
    const done = await page.evaluate(m => WWQ.Policy.missionStatus(WWQ.App.state, m).complete, m); ok(done, 'mission ' + m + ' complete via UI');
  }
  console.log('== Review, submit');
  await page.evaluate(() => WWQ.App.go({ view: 'review' })); await page.check('#ack'); await page.click('#btn-final'); await page.click('.modal-back:last-child .modal button:has-text("Yes, submit and lock")'); await page.waitForSelector('.score-hero');
  const rep = await page.evaluate(() => WWQ.App.state.final.report);
  console.log('   mode=' + MODE + ' final=' + rep.scores.earnedPoints.toFixed(4) + ' first-attempt=' + rep.firstAttemptEvidence.points.toFixed(4) + ' completion=' + rep.completion.percent);
  if (MODE === 'best') { ok(Math.abs(rep.scores.earnedPoints - 100) < 1e-9, 'best-answer UI run = exactly 100 points'); ok(Math.abs(rep.firstAttemptEvidence.points - 100) < 1e-9, 'first-attempt evidence = 100'); }
  else { ok(Math.abs(rep.scores.earnedPoints - 90) < 0.3 || rep.scores.earnedPoints < 95, 'wrong-then-right run is capped near 90 (' + rep.scores.earnedPoints.toFixed(2) + ')'); ok(rep.firstAttemptEvidence.points < 5, 'first-attempt evidence reflects the wrong first answers (' + rep.firstAttemptEvidence.points.toFixed(2) + ')'); }
  ok(rep.completion.percent === 100, 'completion 100%'); ok(rep.items.length === 49 && rep.scores.manualReviewPoints === 0, '49 auto-scored items, 0 manual points');
  await page.screenshot({ path: `/tmp/claude-0/shots/full_${MODE}_results.png`, fullPage: true });
  ok(!errs.length, 'no console errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(`   (${submitsClicked} Submit clicks, ${(Date.now() - t0) / 1000}s automation time; not a student timing)`);
  await browser.close(); console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
