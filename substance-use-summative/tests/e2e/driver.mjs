// Drives the real UI (Playwright) through the whole assessment. Answers come from authoring/ (Node side only).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mods = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'];
export const authored = {};
export async function loadAuthored() {
  if (Object.keys(authored).length) return authored;
  function* qs(stages) { for (const s of stages) { if (s.kind === 'pool') for (const g of s.groups) yield* qs(g.items); else if (s.kind === 'q') yield s.q; else yield* s.qs; } }
  for (const m of mods) { const d = (await import(`${root}/authoring/${m}.js`)).default; for (const q of qs(d.stages)) authored[q.id] = q; }
  authored.__chat = (await import(`${root}/authoring/chat.js`)).default;
  return authored;
}

export async function solve(page, qid, { wrongFirst = 0 } = {}) {
  const q = authored[qid];
  const item = page.locator(`article.item[data-qid="${qid}"]`);
  await item.scrollIntoViewIfNeeded();
  const check = item.locator('button.btn.primary', { hasText: 'Check answer' });
  const apply = async (kind) => { /* kind: 'right' | index of wrong tactic */ };
  const doRight = async () => {
    switch (q.type) {
      case 'mc': case 'predict': await item.locator(`.opt[data-k="${q.ans}"]`).click(); break;
      case 'multi': { // clear anything selected, then pick
        for (const [k] of q.opts) { const o = item.locator(`.opt[data-k="${k}"]`); const on = (await o.getAttribute('aria-checked')) === 'true'; if (on !== q.ans.includes(k)) await o.click(); } break; }
      case 'hotspot': await item.locator(`.hs[data-k="${q.ans}"] .shape`).click(); break;
      case 'sort': for (const [k] of q.items) { await item.locator(`.tile[data-k="${k}"]`).click(); await item.locator(`[data-bin="${q.ans[k]}"]`).first().click(); } break;
      case 'match': for (const [k, t] of q.items) { const row = item.locator('.matchrow', { has: page.locator('.lbl', { hasText: new RegExp('^' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }) }); await row.locator('select').selectOption(q.ans[k]); } break;
      case 'seq':
        if (q.layout === 'timeline') { for (let i = 0; i < q.ans.length; i++) { await item.locator(`.tile[data-k="${q.ans[i]}"]`).click(); await item.locator(`[data-bin="${i}"]`).first().click(); } }
        else {
          for (let i = 0; i < q.ans.length; i++) {
            for (let guard = 0; guard < 12; guard++) {
              const order = await item.locator('ol.seq > li').evaluateAll((els) => els.map((e) => e.dataset.k));
              const j = order.indexOf(q.ans[i]); if (j <= i) break;
              await item.locator(`ol.seq > li[data-k="${q.ans[i]}"] .mvbtn`).first().click();
            }
          }
        } break;
      case 'pick': {
        const label = Object.fromEntries(q.steps);
        // remove existing picks first
        while (await item.locator('.answerlist .mvbtn[aria-label^="Remove"]').count()) await item.locator('.answerlist .mvbtn[aria-label^="Remove"]').first().click();
        for (const k of q.ans) await item.locator('.pickbtn', { hasText: label[k] }).first().click();
        break; }
      case 'slots': for (const s of q.slots) { const o = s.opts.find((x) => x[0] === q.ans[s.k]); await item.locator('.slot-g', { has: page.locator('h4', { hasText: s.label }) }).getByRole('radio', { name: o[1], exact: true }).click(); } break;
      default: throw new Error('unsupported type ' + q.type);
    }
  };
  const doWrong = async () => {
    switch (q.type) {
      case 'mc': case 'predict': { const w = q.opts.find((o) => o[0] !== q.ans)[0]; await item.locator(`.opt[data-k="${w}"]`).click(); break; }
      case 'multi': { const cur = []; for (const [k] of q.opts) { const o = item.locator(`.opt[data-k="${k}"]`); if ((await o.getAttribute('aria-checked')) === 'true') await o.click(); } const w = q.opts.find((o) => !q.ans.includes(o[0]))[0]; await item.locator(`.opt[data-k="${w}"]`).click(); break; }
      case 'hotspot': { const w = q.regions.find((o) => o[0] !== q.ans)[0]; await item.locator(`.hs[data-k="${w}"] .shape`).click(); break; }
      default: await doRight(); // generic: wrong not implemented for complex types
    }
  };
  for (let i = 0; i < wrongFirst; i++) { await doWrong(); await check.click(); await item.locator('.fb.wrong, .fb.out').first().waitFor(); if (wrongFirst < 3 && q.type !== 'mc') break; }
  if (wrongFirst < 3) { const st = await item.locator('.fb.right').count(); if (!st) { await doRight(); await check.click(); await item.locator('.fb.right').waitFor({ timeout: 5000 }); } }
}

async function dismissWipe(page) { const w = page.locator('.wipe'); if (await w.count()) { await page.locator('.wipe').click({ force: true }).catch(() => {}); await page.waitForSelector('.wipe', { state: 'detached', timeout: 6000 }).catch(() => {}); } }

async function handleScene(page, stage) {
  if (stage === 'reaction') {
    await page.getByRole('button', { name: 'Begin round 1' }).click();
    for (const phase of ['base', 'model']) {
      for (let i = 0; i < 5; i++) {
        const go = page.locator('.react-go');
        await go.click(); // start
        await page.waitForSelector('#warn[opacity="1"]', { timeout: 6000 });
        await page.waitForTimeout(120);
        await go.click({ force: true }); // brake
        await page.waitForTimeout(150);
      }
      await page.locator(phase === 'base' ? 'button:has-text("Next: modeled slower processing")' : 'button:has-text("See the comparison")').click();
    }
    await page.waitForSelector('.compare-bars');
  } else if (stage === 'bac') {
    for (let i = 0; i < 3; i++) await page.locator('.stepper button[aria-label^="One more"]').click();
    await page.waitForSelector('.progress-note:has-text("unlocked")');
  } else if (stage === 'overdose') {
    for (const l of ['Try to wake them', 'Check breathing', 'Look at lips and skin']) await page.locator(`.hs2[aria-label="${l}"]`).click();
    await page.waitForSelector('.progress-note:has-text("Observation complete")');
  }
}

export async function playAll(page, opts = {}) {
  await loadAuthored();
  const log = opts.log || (() => {});
  const shots = opts.shots;
  await page.goto(opts.url || 'http://localhost:8123/index.html');
  await page.fill('#f-name', opts.name || 'Test Student');
  await page.selectOption('#f-period', opts.period || '3');
  await page.fill('#f-code', opts.code || 'DEMO2026');
  await page.getByRole('button', { name: /Begin/ }).click();
  await page.waitForSelector('text=Mission 0');
  // practice
  const prac = page.locator('article.item[data-qid="practice"]');
  for (const [k, bin] of [['a', 'f'], ['b', 'v'], ['c', 'f'], ['d', 'v']]) { await prac.locator(`.tile[data-k="${k}"]`).click(); await prac.locator(`[data-bin="${bin}"]`).first().click(); }
  await prac.locator('button:has-text("Check answer")').click(); await prac.locator('.fb.right').waitFor();
  if (shots) await page.screenshot({ path: `${shots}/00-orient.png`, fullPage: true });
  await page.getByRole('button', { name: /Start Mission 1/ }).click();
  const seen = [];
  for (let guard = 0; guard < 80; guard++) {
    await dismissWipe(page);
    if (await page.locator('text=Ready to submit?').count()) break;
    await page.waitForSelector('article.item', { timeout: 8000 });
    const ids = await page.locator('article.item').evaluateAll((els) => els.map((e) => e.dataset.qid));
    const mission = await page.locator('.stagehead .kicker').first().textContent();
    // scene handling
    if (await page.locator('.react-stage, .react-go, button:has-text("Begin round 1")').count()) await handleScene(page, 'reaction');
    else if (await page.locator('.stepper button[aria-label^="One more"]').count()) await handleScene(page, 'bac');
    else if (await page.locator('.od-scene').count()) await handleScene(page, 'overdose');
    if (ids.includes('p-chat')) {
      const chat = authored.__chat; const path = opts.chatPath || ['c1c', 'c2c', 'c3b', 'c4a'];
      let node = chat.start;
      for (const cid of path) { const c = chat.nodes[node].choices.find((x) => x.id === cid); await page.locator('.reply', { hasText: c.text.slice(0, 30) }).first().click(); await page.waitForTimeout(700); if (c.end) break; node = c.next; }
      await page.waitForSelector('article.item[data-qid="p-chat"] .fb', { timeout: 8000 });
    } else {
      for (const id of ids) {
        if (!authored[id]) throw new Error('unknown qid ' + id);
        const done = await page.locator(`article.item[data-qid="${id}"] .fb.right, article.item[data-qid="${id}"] .fb.out`).count();
        if (done) continue;
        // wait for gate to lift
        await page.waitForFunction((qid) => !document.querySelector(`article.item[data-qid="${qid}"]`).classList.contains('gated'), id, { timeout: 8000 });
        await solve(page, id, { wrongFirst: (opts.wrongPlan && opts.wrongPlan[id]) || 0 });
        seen.push(id);
        if (opts.afterQ) await opts.afterQ(page, id);
      }
    }
    if (shots && opts.shotEvery) await page.screenshot({ path: `${shots}/stage-${String(guard).padStart(2, '0')}-${ids[0]}.png`, fullPage: true });
    const next = page.locator('.navrow .btn.primary');
    await next.waitFor({ state: 'visible' });
    await page.waitForFunction(() => { const b = document.querySelector('.navrow .btn.primary'); return b && !b.disabled; }, null, { timeout: 8000 });
    await next.click();
  }
  return seen;
}
