import fs from 'node:fs';
// Automated accessibility scan (axe-core, WCAG 2.0/2.1 A and AA) of the login, all teacher tabs, and every step of all six chapters.
// axe cannot evaluate text over the animated gradients, so color contrast is checked separately by tests/contrast.test.js.
import { startServer, launch, api, TEACHER_PW, ROOT } from './lib.mjs';
const srv = await startServer(Number(process.env.E2E_PORT || 8600 + Math.floor(Math.random() * 300))); const b = await launch(); const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
const axeSrc = fs.readFileSync(ROOT + '/node_modules/axe-core/axe.min.js', 'utf8');
const seen = new Map();
async function axe(label) {
  await page.evaluate(axeSrc);
  const res = await page.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, exclude: [['.pvbar']] }); window.__inc = r.incomplete.filter((i) => i.id === 'color-contrast').reduce((a, i) => a + i.nodes.length, 0); return r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, sample: v.nodes.slice(0, 2).map((n) => n.target.join(' ') + ' :: ' + (n.any[0] ? n.any[0].message : '').slice(0, 140)) })); });
  res.forEach((v) => { const k = v.id; if (!seen.has(k)) seen.set(k, { v, where: [] }); seen.get(k).where.push(label); });
  console.log(label.padEnd(34), res.length ? res.map((v) => `${v.id}(${v.n})`).join(' ') : 'clean', ' contrast-incomplete=' + await page.evaluate(() => window.__inc));
}
await page.goto(srv.base + '/'); await page.waitForSelector('form'); await page.waitForTimeout(900); await axe('login');
await page.fill('input[name=code]', 'WALK-TEACHER'); await page.waitForSelector('input[type=password]'); await page.waitForTimeout(500); await axe('teacher-auth');
await page.fill('input[type=password]', TEACHER_PW); await page.click('button[type=submit]'); await page.waitForSelector('.t-tabs'); await page.waitForTimeout(900);
for (const t of ['overview', 'analytics', 'students', 'codes', 'testing', 'key', 'sources', 'export']) { await page.click('#tt-' + t); await page.waitForTimeout(900); await axe('teacher-' + t); }
await page.click('#tt-testing'); await page.click('button:has-text("Open my preview")'); await page.waitForSelector('.pvbar');
for (let ch = 1; ch <= 6; ch++) {
  await page.selectOption('select[aria-label="Chapter"]', String(ch)); await page.waitForTimeout(500);
  const n = await page.locator('select[aria-label="Step"] option').count();
  for (let i = 0; i < n; i++) { await page.selectOption('select[aria-label="Step"]', { index: i }); await page.click('button:has-text("Go")'); await page.waitForSelector('.view'); await page.waitForTimeout(1100); const k = await page.locator('.view').first().getAttribute('data-kind'); await axe(`ch${ch} step${i} ${k}`); }
}
console.log('\n=== distinct violations');
for (const [id, { v, where }] of seen) console.log(`${id} [${v.impact}] ${v.help}\n   on: ${where.slice(0, 8).join(', ')}${where.length > 8 ? ', …(' + where.length + ')' : ''}\n   ${v.sample.join('\n   ')}`);
await b.close(); srv.stop();
console.log(seen.size ? `\n${seen.size} kinds of violation` : '\nNo violations');
process.exit(seen.size ? 1 : 0);
