// Helpers for the browser end-to-end tests.  These drive the REAL front end against the REAL engine running in the dev server.
// (The dev server adds /dev/solve, /dev/advance for tests; neither exists in the production backend.)
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const CODES = { 'Block 1/2': 'DEV1-TEST', 'Block 3/4': 'DEV2-TEST', 'Block 6/7': 'DEV3-TEST', 'Block 8/9': 'DEV4-TEST' };
export const TEACHER_PW = 'dev-teacher-pass-1';

export async function startServer(port, env = {}) {
  const child = spawn('node', ['tools/serve.js', String(port)], { cwd: ROOT, env: Object.assign({}, process.env, { U5_FRESH: '1', U5_TEACHER_PW: TEACHER_PW }, env), stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('dev server did not start')), 15000);
    child.stdout.on('data', (d) => { if (String(d).includes('dev server')) { clearTimeout(t); resolve(); } });
    child.stderr.on('data', (d) => { if (/EADDRINUSE/.test(String(d))) { clearTimeout(t); reject(new Error('port in use')); } });
    child.on('exit', (c) => { clearTimeout(t); reject(new Error('dev server exited ' + c)); });
  });
  return { port, base: `http://localhost:${port}`, stop: () => child.kill('SIGKILL') };
}
export function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { const d = fs.readdirSync(base).filter((x) => /^chromium-\d+/.test(x)).sort().pop(); if (d) return path.join(base, d, 'chrome-linux', 'chrome'); } catch { /* fall through */ }
  return undefined;
}
export async function launch() { return chromium.launch({ executablePath: chromiumPath(), args: ['--no-sandbox'] }); }

export const post = async (srv, p, body) => (await fetch(srv.base + p, { method: 'POST', body: JSON.stringify(body || {}) })).json();
export const api = (srv, action, payload) => post(srv, '/api', { action, payload });

// ---------------------------------------------------------------------------------------------- reporting
export const results = [];
export function check(name, ok, detail) { results.push({ name, ok: !!ok, detail }); console.log((ok ? '  PASS ' : '  FAIL ') + name + (ok || !detail ? '' : '  -> ' + detail)); return !!ok; }
export const section = (t) => console.log('\n' + t);
export function summary() { const bad = results.filter((r) => !r.ok); console.log(`\n${results.length - bad.length} passed, ${bad.length} failed`); return bad.length; }

/** Collects uncaught page errors and console errors (ignores 404s for optional assets such as favicons). */
export function watchErrors(page, label) {
  const errs = []; page.on('pageerror', (e) => errs.push(`${label} PAGEERROR ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource.*404/.test(m.text())) errs.push(`${label} CONSOLE ${m.text()}`); });
  return errs;
}

// ---------------------------------------------------------------------------------------------- student actions
export async function login(page, srv, { first, last, id, block, code }) {
  await page.goto(srv.base + '/'); await page.waitForSelector('form');
  await page.fill('input[name=firstName]', first); await page.fill('input[name=lastName]', last); await page.fill('input[name=studentId]', id);
  await page.selectOption('select[name=block]', block); await page.fill('input[name=code]', code == null ? CODES[block] : code);
  await page.click('button[type=submit]');
}
export async function begin(page) {
  await page.waitForSelector('text=Before you begin');
  await page.click('button:has-text("Begin Assessment")'); await page.click('button:has-text("Start the 90-minute timer")'); await page.waitForSelector('.bar .timer');
}
export const sess = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('u5.sess')));

/** Fill the widgets of the item on screen from a server response object ({parts:{pid:{c|v|m|o}}}). */
export async function fillItem(page, itemId, resp) {
  try { await fillItem_(page, itemId, resp); } catch (e) { throw new Error(`filling ${itemId} (${JSON.stringify(resp).slice(0, 200)}): ${e.message.split('\n')[0]}`); }
}
async function fillItem_(page, itemId, resp) {
  const root = page.locator(`section.item[data-item="${itemId}"]`);
  const fields = root.locator('fieldset.part');
  const entries = Object.entries(resp.parts);
  for (let i = 0; i < entries.length; i++) {
    const fs_ = fields.nth(i), v = entries[i][1];
    const pick = async (val) => { const lab = fs_.locator('label.opt', { has: page.locator(`input[value="${val}"]`) }); await lab.click(); };     // a real click on the option, like a student
    if (v.c !== undefined && !Array.isArray(v.c)) await pick(v.c);
    else if (Array.isArray(v.c)) { for (const c of v.c) await pick(c); }
    else if (v.v) { const ins = fs_.locator('input.num'); let k = 0; for (const val of Object.values(v.v)) { if (val && typeof val === 'object') { await ins.nth(k++).fill(String(val.a)); await ins.nth(k++).fill(String(val.b)); } else await ins.nth(k++).fill(String(val)); } }
    else if (v.m) {
      const drag = (await fs_.locator('.dcard').count()) > 0;
      const rows = Object.entries(v.m);
      for (let r = 0; r < rows.length; r++) { if (drag) await fs_.locator(`.dcard[data-row="${rows[r][0]}"] select`).selectOption(rows[r][1]); else await fs_.locator('select').nth(r).selectOption(rows[r][1]); }
    } else if (v.o) {
      for (let target = 0; target < v.o.length; target++) {
        const cur = await fs_.locator('li.oitem').evaluateAll((els) => els.map((e) => e.dataset.id)); let at = cur.indexOf(v.o[target]);
        while (at > target) { await fs_.locator(`li.oitem[data-id="${v.o[target]}"] button.mv`).first().click(); at--; }
      }
    }
  }
}
export async function solveRemote(srv, sid, itemId, mode, k) { const r = await post(srv, '/dev/solve', { sessionId: sid, itemId, mode, k }); if (!r.ok) throw new Error('solve failed for ' + itemId); return r.response; }
export async function checkAnswer(page) {
  const wait = page.waitForResponse((r) => r.url().endsWith('/api') && /"action":"submit"/.test(r.request().postData() || ''), { timeout: 20000 });
  await page.click('button:has-text("Check answer")'); const res = await wait; await page.waitForTimeout(120); return res.json();
}

/** Do the minimum in each laboratory that the progress gate requires. */
export async function runSim(page, sim) {
  const tab = (n) => page.locator('.sim-tab').nth(n).click();
  if (sim === 'coin') await page.click('button:text-is("+1,000")');
  else if (sim === 'house') await page.click('button:has-text("Run the class experiment")');
  else if (sim === 'sports') { await tab(1); for (const i of [0, 2, 4]) await page.locator('.pick').nth(i).click(); await tab(2); await page.click('button:has-text("Run 10,000")'); }
  else if (sim === 'brain') { await tab(1); await page.click('button:has-text("Throw a dart")'); await page.locator('fieldset.part button').first().click(); await tab(2); await tab(3); }
  else if (sim === 'adlab') { for (let i = 0; i < 6; i++) { await page.locator('.adtile').nth(i).click(); await page.click('button:has-text("All six ads")'); } }
  else if (sim === 'decide') {
    await page.click('button:has-text("Check my flags") >> nth=0');
    await tab(3); await page.locator('.sim [role=tabpanel]:not([hidden]) .controls button').first().click();
    await tab(1);
    for (let guard = 0; guard < 30; guard++) { const b = page.locator('.sim .choice-btn:not([disabled]):visible'); if (!(await b.count())) break; await b.first().click(); await page.waitForTimeout(40); }
  }
}

/** Walk the whole assessment through the real UI, answering every question via /dev/solve.  hooks.onItem(id, step) may override one question. */
export async function playThrough(page, srv, hooks = {}) {
  const where = { v: 'start' };
  try { return await playThrough_(page, srv, hooks, where); } catch (e) { throw new Error(`playThrough stopped at ${where.v}: ${String(e.message).split('\n')[0]}`); }
}
async function playThrough_(page, srv, hooks, where) {
  const { sid } = await sess(page);
  for (let guard = 0; guard < 200; guard++) {
    if (page.url().includes('#done') || (await page.locator('.hero .kicker:has-text("Assessment locked"), .score-ring').count())) return;
    const inter = page.locator('.interstitial .btn-primary');
    if (await inter.count()) { await inter.click(); await page.waitForTimeout(700); continue; }
    if (await page.locator('button:has-text("Submit assessment")').count()) { await page.click('button:has-text("Submit assessment")'); await page.click('button:has-text("Yes, submit now")'); await page.waitForSelector('.score-ring', { timeout: 15000 }); return; }
    const view = page.locator('.view').first(); await view.waitFor({ timeout: 8000 });
    const kind = await view.getAttribute('data-kind'); where.v = `ch${await view.getAttribute('data-ch')} ${await view.getAttribute('data-step')} (${kind})`;
    if (kind === 'item') {
      const id = await page.locator('section.item').first().getAttribute('data-item');
      const done = await page.locator('button:has-text("Check answer")').count() === 0;
      if (!done) { const handled = hooks.onItem ? await hooks.onItem(id, page, srv, sid) : false; if (!handled) { await fillItem(page, id, await solveRemote(srv, sid, id, 'correct')); await checkAnswer(page); } }
    } else if (kind === 'sim') { await runSim(page, await view.getAttribute('data-sim')); }
    const next = page.locator('.foot .btn-primary'); await next.waitFor(); await page.waitForFunction(() => { const b = document.querySelector('.foot .btn-primary'); return b && !b.disabled; }, null, { timeout: 8000 });
    await next.click(); await page.waitForTimeout(60);
  }
  throw new Error('playThrough did not finish');
}
