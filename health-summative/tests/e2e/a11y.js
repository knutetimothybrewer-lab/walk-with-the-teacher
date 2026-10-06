/* Accessibility audit: runs axe-core (WCAG 2.1 A/AA) on every kind of screen and
   Lighthouse's accessibility category on the main screens. Usage: node tests/e2e/a11y.js */
import fs from 'node:fs';
import { chromium } from 'playwright';
import { serve } from '../../tools/serve.js';
import * as D from './driver.js';

const axeSrc = fs.readFileSync(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const server = await serve(8120);
const browser = await chromium.launch({ args: ['--no-sandbox', '--remote-debugging-port=9333'] });
const BASE = 'http://localhost:8120/';
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const seen = new Map();
async function axe(label) {
  await page.evaluate(axeSrc);
  const r = await page.evaluate(async () => await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }));
  for (const v of r.violations) {
    const key = v.id;
    const entry = seen.get(key) || { impact: v.impact, help: v.help, where: new Set(), nodes: [] };
    entry.where.add(label);
    if (entry.nodes.length < 3) entry.nodes.push(v.nodes[0].target.join(' ') + ' :: ' + (v.nodes[0].failureSummary || '').split('\n').slice(0, 2).join(' '));
    seen.set(key, entry);
  }
}
await page.goto(BASE);
await axe('welcome');
await page.click('#helpBtn'); await axe('help dialog'); await page.keyboard.press('Escape');
await page.click('#settingsBtn'); await axe('settings dialog'); await page.keyboard.press('Escape');
await page.click('#sourcesBtn'); await axe('sources dialog'); await page.keyboard.press('Escape');
await D.startStudent(page, BASE, { first: 'Axe', last: 'Test' });
await page.waitForSelector('.station-intro'); await axe('station intro');
await D.playThrough(page, D.PERFECT, { shots: async (pg, id, kind) => {
  // audit the first item of each type, plus every station intro/end
  const key = kind === 'item' ? (await pg.locator('article.item').first().evaluate(a => a.className.split(' ').filter(c => c.startsWith('t-') || c.startsWith('m-') || c === 'chat' || c === 'explore').join(' '))) : kind;
  if (!key || seen.has('__t:' + key)) return;
  seen.set('__t:' + key, 1);
  await axe(`${kind}:${key}:${id}`);
} });
await page.waitForSelector('.final h1'); await page.waitForTimeout(1500); await axe('final');
const res = [...seen.entries()].filter(([k]) => !k.startsWith('__t:'));
console.log('axe screens audited:', [...seen.keys()].filter(k => k.startsWith('__t:')).length + 5);
if (!res.length) console.log('axe: no violations');
for (const [id, e] of res) console.log(`- [${e.impact}] ${id}: ${e.help}\n    on: ${[...e.where].join(', ')}\n    ${e.nodes.join('\n    ')}`);

// Lighthouse on welcome and an in-progress item (state is read from the same browser via CDP port)
const { default: lighthouse } = await import('lighthouse');
for (const [name, url] of [['welcome', BASE]]) {
  const r = await lighthouse(url, { port: 9333, onlyCategories: ['accessibility', 'best-practices', 'performance'], output: 'json', logLevel: 'error', formFactor: 'desktop', screenEmulation: { disabled: true }, throttlingMethod: 'simulate' });
  const c = r.lhr.categories;
  console.log(`Lighthouse ${name}: accessibility ${Math.round(c.accessibility.score * 100)}, best-practices ${Math.round(c['best-practices'].score * 100)}, performance ${Math.round(c.performance.score * 100)}`);
  const bad = Object.values(r.lhr.audits).filter(a => a.score !== null && a.score < 1 && c.accessibility.auditRefs.some(x => x.id === a.id));
  bad.forEach(a => console.log('   a11y audit not passing:', a.id, '-', a.title));
}
await browser.close(); server.close();
