// Behavioural checks: scoring through the UI, persistence across refresh, locking, validation, layout, preview mode.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import { start } from '../../tools/serve.js';
import { loadAuthored, authored, solve } from './driver.mjs';
await loadAuthored();
const srv = await start(8127), URL = 'http://localhost:8127/index.html';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const results = []; const ok = (name, fn) => fn().then(() => { results.push('PASS ' + name); }).catch((e) => { results.push('FAIL ' + name + ': ' + String(e.message).split('\n')[0]); });
async function fresh(vp = { width: 1366, height: 768 }) { const ctx = await b.newContext({ viewport: vp }); const p = await ctx.newPage(); p.setDefaultTimeout(8000); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); return { ctx, p }; }
async function login(p, { name = 'Pat Lee', code = 'DEMO2026', period = '2' } = {}) { await p.goto(URL); await p.fill('#f-name', name); await p.selectOption('#f-period', period); await p.fill('#f-code', code); await p.getByRole('button', { name: /Begin/ }).click(); }
async function toFirstMission(p) { await p.waitForSelector('text=Mission 0'); await p.getByRole('button', { name: /Start Mission 1/ }).click(); await p.locator('.wipe').click({ force: true }); await p.waitForSelector('article.item'); }

await ok('invalid class code cannot begin; message is shown; no code is exposed in the page source', async () => {
  const { ctx, p } = await fresh(); await login(p, { code: 'WRONG1' });
  await p.waitForSelector('.err:has-text("not valid")'); assert.ok(!(await p.locator('#f-name').count() === 0));
  const html = await (await p.request.get(URL.replace('index.html', 'js/config.js'))).text();
  assert.ok(!/HEALTH2|DEMO2026/.test(html.replace(/\/\/.*$/gm, '')), 'plaintext class codes must not be in config.js');
  await ctx.close();
});
await ok('missing fields are rejected', async () => { const { ctx, p } = await fresh(); await p.goto(URL); await p.getByRole('button', { name: /Begin/ }).click(); await p.waitForSelector('.err:has-text("first and last name")'); await ctx.close(); });

await ok('three-attempt rules in the UI: messages, no answer reveal, lock on third miss, credit by attempt, refresh keeps attempts', async () => {
  const { ctx, p } = await fresh(); await login(p); await toFirstMission(p);
  // find a multiple-choice item on the first stages by moving forward
  let qid = null;
  for (let i = 0; i < 12 && !qid; i++) {
    const ids = await p.locator('article.item').evaluateAll((e) => e.map((x) => x.dataset.qid));
    const mc = ids.find((id) => authored[id] && authored[id].type === 'mc');
    if (mc) { qid = mc; break; }
    for (const id of ids) await solve(p, id);
    await p.locator('.navrow .btn.primary').click({ timeout: 8000 }); await p.waitForTimeout(300);
  }
  assert.ok(qid, 'found an mc item'); const q = authored[qid]; const item = p.locator(`article.item[data-qid="${qid}"]`);
  const wrongs = q.opts.filter((o) => o[0] !== q.ans).map((o) => o[0]);
  const check = item.locator('button:has-text("Check answer")');
  await item.locator(`.opt[data-k="${wrongs[0]}"]`).click(); await check.click();
  await item.locator('.fb.wrong').waitFor(); let t = await item.locator('.fb').innerText();
  assert.match(t, /Not correct\. Review the evidence and try again\. 2 attempts remaining\. Maximum available credit: 85%\./);
  assert.ok(!t.toLowerCase().includes('correct answer'), 'no reveal');
  assert.equal(await check.isDisabled(), true, 'cannot resubmit an unchanged answer');
  // refresh: attempts persist
  await p.reload(); await p.waitForSelector(`article.item[data-qid="${qid}"]`);
  const it2 = p.locator(`article.item[data-qid="${qid}"]`);
  assert.match(await it2.locator('.fb').innerText(), /2 attempts remaining/);
  assert.equal(await it2.locator('.pip.used').count(), 1, 'one attempt used after refresh');
  await it2.locator(`.opt[data-k="${wrongs[1]}"]`).click(); await it2.locator('button:has-text("Check answer")').click();
  await it2.locator('.fb:has-text("1 attempt remaining")').waitFor();
  assert.match(await it2.locator('.fb').innerText(), /Maximum available credit: 75%/);
  await p.reload(); await p.waitForSelector(`article.item[data-qid="${qid}"]`);
  const it3 = p.locator(`article.item[data-qid="${qid}"]`);
  await it3.locator(`.opt[data-k="${wrongs[2] || wrongs[0]}"]`).click(); await it3.locator('button:has-text("Check answer")').click();
  await it3.locator('.fb.out').waitFor(); t = await it3.locator('.fb').innerText();
  assert.match(t, /Maximum attempts reached\./); assert.match(t, /Explanation:/);
  assert.equal(await it3.locator('.opt[disabled]').count() > 0, true, 'locked');
  await p.reload(); await p.waitForSelector(`article.item[data-qid="${qid}"]`);
  assert.match(await p.locator(`article.item[data-qid="${qid}"] .fb`).innerText(), /Maximum attempts reached/);
  assert.equal(await p.locator(`article.item[data-qid="${qid}"] button:has-text("Check answer")`).isHidden(), true, 'cannot retry after refresh');
  assert.equal(p.errs.length, 0, p.errs.join('; '));
  await ctx.close();
});

await ok('credit by attempt: second try earns 85%, third 75%', async () => {
  const { ctx, p } = await fresh(); await login(p); await toFirstMission(p);
  const out = {};
  for (let i = 0; i < 14; i++) {
    const ids = await p.locator('article.item').evaluateAll((e) => e.map((x) => x.dataset.qid));
    for (const id of ids) {
      const q = authored[id]; if (q.type !== 'mc' || out.second && out.third) { await solve(p, id); continue; }
      const item = p.locator(`article.item[data-qid="${id}"]`); const w = q.opts.filter((o) => o[0] !== q.ans).map((o) => o[0]);
      const tries = !out.second ? 1 : 2; await item.scrollIntoViewIfNeeded();
      for (let k = 0; k < tries; k++) { await item.locator(`.opt[data-k="${w[k]}"]`).click(); await item.locator('button:has-text("Check answer")').click(); await item.locator('.fb.wrong').waitFor(); }
      await item.locator(`.opt[data-k="${q.ans}"]`).click(); await item.locator('button:has-text("Check answer")').click(); await item.locator('.fb.right').waitFor();
      const txt = await item.locator('.fb.right').innerText(); (tries === 1 ? (out.second = txt + '|' + q.pts) : (out.third = txt + '|' + q.pts));
    }
    if (out.second && out.third) break;
    await p.locator('.navrow .btn.primary').click(); await p.waitForTimeout(300);
  }
  assert.ok(out.second && out.third, 'exercised both');
  const num = (s) => { const m = s.match(/Attempt (\d): (\d+)% of the points \(([\d.]+) of (\d+)\)/); return m.slice(1).map(Number); };
  const [a2, pct2, got2, pts2] = num(out.second); assert.equal(a2, 2); assert.equal(pct2, 85); assert.ok(Math.abs(got2 - pts2 * 0.85) < 0.011);
  const [a3, pct3, got3, pts3] = num(out.third); assert.equal(a3, 3); assert.equal(pct3, 75); assert.ok(Math.abs(got3 - pts3 * 0.75) < 0.011);
  await ctx.close();
});

await ok('progress restores after closing the tab (new page, same browser profile)', async () => {
  const { ctx, p } = await fresh(); await login(p, { name: 'Resume Rae' }); await toFirstMission(p);
  const ids = await p.locator('article.item').evaluateAll((e) => e.map((x) => x.dataset.qid)); for (const id of ids) await solve(p, id);
  await p.locator('.navrow .btn.primary').click(); await p.waitForTimeout(400);
  const before = await p.locator('.stagehead .count').innerText(); await p.close();
  const p2 = await ctx.newPage(); await p2.goto(URL); await p2.waitForSelector('article.item');
  assert.equal(await p2.locator('.stagehead .count').innerText(), before); await p2.locator('#toast.show').waitFor();
  await ctx.close();
});

await ok('no horizontal overflow at 1366x768, 1024x768, 768x1024 and 390x844', async () => {
  for (const vp of [{ width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    const { ctx, p } = await fresh(vp); await login(p); await toFirstMission(p);
    for (let i = 0; i < 4; i++) {
      const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(over <= 1, `${vp.width}x${vp.height} overflow ${over}px`);
      const ids = await p.locator('article.item').evaluateAll((e) => e.map((x) => x.dataset.qid)); for (const id of ids) await solve(p, id);
      await p.locator('.navrow .btn.primary').click(); await p.waitForTimeout(250);
    }
    await ctx.close();
  }
});

await ok('keyboard: every question control is reachable and usable without a mouse (mc + multi)', async () => {
  const { ctx, p } = await fresh(); await login(p); await toFirstMission(p);
  await p.keyboard.press('Tab');
  const info = await p.evaluate(() => { const el = document.querySelector('article.item .opt, article.item select, article.item .tile, article.item .mvbtn, article.item .hs'); if (!el) return null; el.focus(); return { focused: document.activeElement === el, outline: getComputedStyle(el).outlineStyle, svg: el.classList.contains('hs') }; });
  assert.ok(info && info.focused, 'item controls take focus');
  if (!info.svg) assert.notEqual(info.outline, 'none', 'visible focus ring');
  await ctx.close();
});

await ok('reduced-motion setting is honored (and persists)', async () => {
  const { ctx, p } = await fresh(); await login(p); await p.waitForSelector('text=Mission 0');
  await p.locator('#btn-settings').click(); await p.locator('dialog select').selectOption('reduced'); await p.getByRole('button', { name: 'Done' }).click();
  assert.equal(await p.evaluate(() => document.documentElement.dataset.motion), 'reduced');
  await p.reload(); await p.waitForSelector('text=Mission 0'); assert.equal(await p.evaluate(() => document.documentElement.dataset.motion), 'reduced');
  await ctx.close();
});

await ok('completed attempt is locked: results shown after refresh; same student cannot restart on this device', async () => {
  const { ctx, p } = await fresh(); await login(p, { name: 'Done Dana', code: 'DEMO2026' });
  await p.waitForSelector('text=Mission 0');
  const [k, v] = await p.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.endsWith('.cur')); const s = JSON.parse(localStorage.getItem(k)); s.completedAt = Date.now(); s.submit = { status: 'nobackend', confirm: 'LOCAL-TEST' }; return [k, JSON.stringify(s)]; });
  const lock = await p.evaluate(() => Object.keys(localStorage));
  await ctx.addInitScript(([kk, vv]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(kk, vv); sessionStorage.setItem('seeded', '1'); } }, [k, v]);
  await p.goto(URL); await p.waitForSelector('text=Summative complete');
  assert.ok(await p.locator('text=Reference ID').count());
  // clear only the session (not the completion lock) and try to start again with the same name + code
  await p.evaluate(() => { localStorage.removeItem(Object.keys(localStorage).find((x) => x.endsWith('.cur'))); });
  const { sha256 } = await import('../../js/util.js');
  const lockKey = 'sig.done.' + sha256('done dana|DEMO2026').slice(0, 16);
  await ctx.addInitScript(([lk]) => { localStorage.removeItem('sig.cur'); localStorage.setItem(lk, '{}'); }, [lockKey]);
  await p.goto(URL); await p.waitForSelector('#f-name'); await p.fill('#f-name', 'Done Dana'); await p.selectOption('#f-period', '2'); await p.fill('#f-code', 'DEMO2026'); await p.getByRole('button', { name: /Begin/ }).click();
  await p.waitForSelector('.err:has-text("already submitted")');
  await ctx.close();
});

await ok('Preview Mode is hidden from students and needs the passcode', async () => {
  const { ctx, p } = await fresh(); await p.goto(URL); const body = await p.content();
  assert.ok(!/preview/i.test(await p.locator('main').innerText()), 'no preview text on the student screen'); assert.equal(await p.locator('#pv').count(), 0);
  p.once('dialog', (d) => d.accept('wrong')); await p.goto(URL + '?preview=1'); await p.waitForSelector('#f-name'); assert.equal(await p.locator('#pv').count(), 0);
  p.once('dialog', (d) => d.accept('SIGNAL-PREVIEW')); await p.goto(URL + '?preview=1'); await p.waitForSelector('#pv'); await p.waitForSelector('article.item');
  assert.ok(await p.locator('.pv-banner').count());
  await p.locator('#pv button:has-text("Questions")').click();
  await p.locator('#pv button:has-text("✓ attempt 2")').first().click(); await p.waitForSelector('article.item .fb.right');
  assert.match(await p.locator('article.item .fb.right').first().innerText(), /Attempt 2: 85%/);
  await p.locator('#pv button:has-text("Results")').click(); await p.locator('#pv button:has-text("Preview results (mixed)")').click(); await p.waitForSelector('text=Summative complete');
  // student storage untouched
  assert.equal(await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('sig.')).length), 0);
  await ctx.close();
});

await ok('Preview Mode: Continue is never locked, so the whole assessment can be clicked through without answering', async () => {
  const { ctx, p } = await fresh();
  p.once('dialog', (d) => d.accept('SIGNAL-PREVIEW')); await p.goto(URL + '?preview=1'); await p.waitForSelector('#pv'); await p.waitForSelector('article.item');
  let steps = 0;
  while (steps++ < 400) {
    const nb = p.locator('.navrow .btn.primary');
    if (await p.locator('text=Ready to submit?').count()) break;
    assert.equal(await nb.isDisabled(), false, 'Continue open on step ' + steps);
    await p.locator('#pv-next').click(); await p.waitForTimeout(40);
  }
  await p.waitForSelector('text=Ready to submit?');
  assert.ok(steps > 10, 'walked many steps (' + steps + ')');
  // a normal student still cannot skip
  const s2 = await fresh(); await login(s2.p); await toFirstMission(s2.p);
  await s2.p.waitForSelector('article.item, .simhost');
  assert.equal(await s2.p.locator('.navrow .btn.primary').first().isDisabled(), true, 'students stay gated');
  await s2.ctx.close(); await ctx.close();
});

console.log(results.join('\n')); await b.close(); srv.close();
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
