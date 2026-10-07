// Drives the real UI (Playwright). Answers come from authoring/ (Node side only; the browser never sees them).
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const authored = {};
export async function loadAuthored() {
  if (Object.keys(authored).length) return authored;
  function* qs(stages) { for (const s of stages) { if (s.kind === 'pool') for (const g of s.groups) yield* qs(g.items); else if (s.kind === 'q') yield s.q; else if (s.kind === 'scene') yield* s.qs; } }
  for (const m of ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7']) { const d = (await import(`${root}/authoring/${m}.js`)).default; for (const q of qs(d.stages)) authored[q.id] = q; }
  return authored;
}
export function findChromium() {
  const base = '/opt/pw-browsers';
  for (const d of fs.readdirSync(base)) { const p = path.join(base, d, 'chrome-linux', 'chrome'); if (fs.existsSync(p) && d.startsWith('chromium-')) return p; }
  return undefined;
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Build a wrong response for question q (a different, valid response). */
export function wrongResponse(q) {
  switch (q.type) {
    case 'mc': return { k: q.opts.map((o) => o[0]).find((k) => k !== q.ans) };
    case 'hotspot': return { k: q.regions.map((o) => o[0]).find((k) => k !== q.ans) };
    case 'multi': return { toggle: [q.opts.map((o) => o[0]).find((k) => !q.ans.includes(k)) || q.opts[0][0]], base: q.ans.slice(1) };
    case 'spots': return { toggle: [q.regions.map((o) => o[0]).find((k) => !q.ans.includes(k))], base: q.ans.slice(1) };
    default: return null;
  }
}

export async function setAnswer(page, q, ans = q.ans) {
  const item = page.locator(`article.item[data-qid="${q.id}"]`);
  await item.scrollIntoViewIfNeeded();
  switch (q.type) {
    case 'mc': await item.locator(`.opt[data-k="${ans}"]`).click(); break;
    case 'hotspot': await item.locator(`.regionpick .opt[data-k="${ans}"]`).click(); break;
    case 'multi': case 'spots': {
      const sel = q.type === 'multi' ? '.opt' : '.regionpick .opt';
      for (const [k] of (q.opts || q.regions)) { const o = item.locator(`${sel}[data-k="${k}"]`); const on = (await o.getAttribute('aria-checked')) === 'true'; if (on !== ans.includes(k)) await o.click(); }
      break;
    }
    case 'slots': for (const [slot, k] of Object.entries(ans)) await item.locator(`.opt[data-k="${k}"]`).first().click(); break;
    case 'sort': for (const [k] of q.items) { await item.locator(`.tile[data-k="${k}"]`).click(); await item.locator(`[data-bin="${ans[k]}"]`).first().click(); } break;
    case 'match': for (const [k, t] of q.items) { const row = item.locator('.matchrow', { has: page.locator('.lbl', { hasText: new RegExp('^' + esc(t) + '$') }) }); await row.locator('select').selectOption(ans[k]); } break;
    case 'seq':
      for (let i = 0; i < ans.length; i++) {
        for (let guard = 0; guard < 14; guard++) {
          const order = await item.locator('ol.seq > li').evaluateAll((els) => els.map((e) => e.dataset.k));
          const j = order.indexOf(ans[i]); if (j <= i) break;
          await item.locator(`ol.seq > li[data-k="${ans[i]}"] .mvbtn`).first().click();
        }
      } break;
    case 'num': await item.locator('input.numin').fill(String(Array.isArray(ans) ? ans[0] : ans)); break;
    case 'slider': await item.locator('input.range').evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(Array.isArray(ans) ? ans[0] : ans)); break;
    case 'plan': await solvePlan(page, item); break;
    default: throw new Error('no driver for type ' + q.type);
  }
}
async function solvePlan(page, item) {
  // Mon & Fri soccer is set. Add vigorous+bone, muscle and MVPA minutes on the other days.
  const plan = { Tue: ['hoops', 'bands', 'walk'], Wed: ['run', 'body', 'bike'], Thu: ['rope', 'bands', 'walk'], Sat: ['hoops', 'body', 'bike'], Sun: ['walk', 'bike', 'dance'], Mon: ['bands', 'walk'], Fri: ['body', 'walk'] };
  for (const [day, blocks] of Object.entries(plan)) for (const b of blocks) {
    const sel = item.locator(`select[aria-label="Add an activity to ${day}"]`);
    if (!(await sel.count())) continue;
    await sel.selectOption(b);
  }
}
export async function check(page, q) {
  const item = page.locator(`article.item[data-qid="${q.id}"]`);
  await item.locator('button.btn.primary', { hasText: 'Check answer' }).click();
}
export async function statusOf(page, qid) {
  const item = page.locator(`article.item[data-qid="${qid}"]`);
  if (await item.locator('.fb.right').count()) return 'correct';
  if (await item.locator('.fb.out').count()) return 'locked';
  if (await item.locator('.fb.wrong').count()) return 'wrong';
  return 'open';
}

/** Unlock the scene on the current step by really using it. */
export async function exploreScene(page) {
  const sc = page.locator('.sim');
  if (!(await sc.count())) return;
  if (await sc.locator('.labelsim').count() || await page.locator('.sim.labelsim').count()) {
    const r = page.locator('.sim.labelsim input.range');
    for (const v of ['2', '3', '1.5']) await r.evaluate((el, x) => { el.value = x; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
    for (const k of ['sod', 'added']) await page.locator(`.sim.labelsim [data-region="${k}"]`).first().click();
  } else if (await page.locator('.sim.grocery').count()) {
    const n = await page.locator('.sim.grocery .gcard button').count();
    for (let i = 0; i < n; i++) await page.locator('.sim.grocery .gcard button').nth(i).click();
  } else if (await page.locator('.sim.intensity').count()) {
    for (const k of ['brisk', 'cycle', 'jog', 'sprint']) await page.locator(`.sim.intensity .ptabs [data-k="${k}"]`).click();
  } else if (await page.locator('.sim.market').count()) {
    for (const k of ['handle', 'photo', 'claim', 'testimonial', 'code', 'disclosure']) await page.locator(`.sim.market [data-region="${k}"]`).first().click();
  } else if (await page.locator('.sim.foodsys').count()) {
    const r = page.locator('.sim.foodsys input.range');
    for (const v of ['2', '7', '9']) await r.evaluate((el, x) => { el.value = x; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
    await page.locator('.sim.foodsys button.warn').click();
  }
}
