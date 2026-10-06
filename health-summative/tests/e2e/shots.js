/* Screenshots of every screen at desktop, Chromebook and phone sizes. */
import fs from 'node:fs';
import { chromium } from 'playwright';
import { serve } from '../../tools/serve.js';
import * as D from './driver.js';

const out = process.argv[2] || '/tmp/shots';
const sizes = { desktop: { width: 1366, height: 768 }, phone: { width: 360, height: 640 } };
const which = (process.argv[3] || 'desktop,phone').split(',');
const server = await serve(8097);
const browser = await chromium.launch({ args: ['--no-sandbox'] });
for (const name of which) {
  const dir = `${out}/${name}`; fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: sizes[name], reducedMotion: 'reduce', hasTouch: name === 'phone', isMobile: name === 'phone' });
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', m => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  await page.goto('http://localhost:8097/');
  await page.screenshot({ path: `${dir}/00-welcome.png`, fullPage: true });
  await D.startStudent(page, 'http://localhost:8097/');
  let n = 1;
  await D.playThrough(page, D.PERFECT, {
    shots: async (pg, id, kind) => {
      if (kind === 'done') return;
      // horizontal overflow check
      const over = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (over > 1) problems.push(`overflow ${over}px at ${id}/${kind}`);
      await pg.screenshot({ path: `${dir}/${String(n++).padStart(3, '0')}-${id}-${kind}.png`, fullPage: true });
    },
  });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${dir}/999-final.png`, fullPage: true });
  console.log(name, 'problems:', problems.length ? problems : 'none');
  await ctx.close();
}
await browser.close(); server.close();
