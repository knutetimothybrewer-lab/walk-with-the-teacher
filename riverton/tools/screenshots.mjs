import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const out = resolve('shots'); mkdirSync(out, { recursive: true });
const url = pathToFileURL(resolve('dist-single/index.html')).href;
const sizes = { desktop: [1366, 768], tablet: [820, 1180] };
const routes = (process.argv[2] ?? '/styleguide').split(',');
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
for (const [name, [w, h]] of Object.entries(sizes)) for (const theme of ['light', 'dark']) for (const r of routes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.addInitScript((t) => localStorage.setItem('riverton.settings', JSON.stringify({ theme: t })), theme);
  await page.goto(`${url}#${r}`); await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/${r.replace(/\//g, '') || 'home'}-${name}-${theme}.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
