// Screenshot tour for visual review. NODE_PATH=$(npm root -g) node tests/shots.js [outdir] [width] [height]
const { chromium } = require('playwright'); const path = require('path'); const { BROWSER } = require('./helpers');
const OUT = process.argv[2] || '/tmp/claude-0/shots', WIDTH = +process.argv[3] || 1366, HEIGHT = +process.argv[4] || 768;
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.addInitScript(BROWSER);
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(300);
  await page.evaluate(() => { __T.start('shotter'); });
  const stages = await page.evaluate(() => WWQ.MISSIONS.flatMap(m => m.stages.map(s => [m.id, s.id])));
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const [m, s] of stages) {
    await page.evaluate(([m]) => { for (let k = 1; k < m; k++) __T.completeMission(k, 'best'); }, [m]);
    await page.evaluate(([m, s]) => __T.go(m, s), [m, s]); await page.waitForTimeout(150);
    if (!only || only.includes(s)) {
      if (process.env.ITEM) { const el = page.locator(process.env.ITEM === '1' ? '.item, .board, .playgrid' : process.env.ITEM).first(); await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: `${OUT}/it_${s}.png` }); }
      else await page.screenshot({ path: `${OUT}/st_${s}.png`, fullPage: process.env.FULL === '1' });
    }
  }
  await page.evaluate(() => { __T.go('map'); }); await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/map.png` });
  console.log(errs.length ? errs.join('\n') : 'no errors'); await browser.close();
})();
