// Quick smoke test: loads the app in Chromium, reports console/page errors, optional screenshot. NODE_PATH=$(npm root -g) node tests/smoke.js [shot.png]
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(500);
  console.log('title:', await page.title()); console.log('h1:', await page.locator('h1').first().innerText());
  if (process.argv[2]) await page.screenshot({ path: process.argv[2] });
  console.log(errs.length ? errs.join('\n') : 'no errors'); await browser.close();
})();
