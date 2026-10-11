// Runs axe-core on key screens of the multi-file dist (also proves dist/index.html works from file://).
import { chromium } from 'playwright'; import { pathToFileURL } from 'url'; import { resolve } from 'path'; import { readFileSync } from 'fs';
const axe = readFileSync(resolve('node_modules/axe-core/axe.min.js'), 'utf8');
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const base = pathToFileURL(resolve('dist/index.html')).href;
const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
await ctx.addInitScript(() => { if (localStorage.getItem('riverton.profiles')) return; const prof = { id: 'p1', name: 'Ava', period: '3', created: 1, lastSeen: 1, progress: {}, mastery: {}, responses: [], written: [], notebook: { summaryCards: [], terms: [] }, lessonsDone: [] }; localStorage.setItem('riverton.profiles', JSON.stringify({ profiles: { p1: prof }, activeId: 'p1' })); });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const routes = ['', 'lesson/orientation-community-health', 'notebook', 'glossary', 'report', 'orientation', 'city', 'lab', 'crossroads', 'styleguide', 'teacher'];
let bad = 0;
for (const dark of [false, true]) for (const r of routes) {
  await p.goto(base + '#/' + r); await p.evaluate((d) => { document.documentElement.dataset.theme = d ? 'dark' : 'light'; }, dark); await p.waitForTimeout(1200);
  await p.evaluate(axe); const res = await p.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] }));
  for (const v of res.violations) { bad++; console.log(`${dark ? 'dark' : 'light'} /${r}: ${v.id} (${v.impact}) x${v.nodes.length} ${v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' [' + (n.any[0]?.data ? [n.any[0].data.fgColor, n.any[0].data.bgColor, n.any[0].data.contrastRatio].join(' ') : '') + ']').join(' | ')}`); }
}
console.log(bad ? `A11Y: ${bad} violation groups` : 'A11Y OK', errs.slice(0, 3)); await b.close();
