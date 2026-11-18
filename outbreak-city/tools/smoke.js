// Quick visual smoke test: node tools/smoke.js [outDir]
// Opens the game from file://, starts a game, places towers, runs a wave, and screenshots.
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, '..', '..', '..', 'oc-shots');
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message + '\n' + e.stack));
  const url = 'file://' + path.join(__dirname, '..', 'index.html') + '?seed=TEST01';
  await page.goto(url);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, '01-title.png') });
  // start a game without tutorial
  await page.evaluate(() => { document.querySelector('[data-f=tut]').checked = false; });
  await page.click('[data-a=start]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(out, '02-start.png') });
  // place towers via the app API
  const res = await page.evaluate(() => {
    const app = OutbreakCity._instances[0], g = app.game;
    const tries = [['lab', 'down'], ['clinic', 'east'], ['militia'], ['hospital', 'down']];
    const out = [];
    for (const [type] of tries) {
      let done = false;
      for (let y = 10; y < g.H - 2 && !done; y++) for (let x = 10; x < g.W - 2 && !done; x++) {
        if (g.canPlace(type, x, y).ok) { app.tryPlace(type, x, y); out.push(type + '@' + x + ',' + y); done = true; }
      }
    }
    app.doStartWave();
    app.speed = 3;
    return out;
  });
  console.log('placed', res);
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(out, '03-wave.png') });
  // zoom in on action
  await page.evaluate(() => { const app = OutbreakCity._instances[0]; const g = app.game; const z = g.agents.find(a => a.kind === 1) || g.towers[0]; app.renderer.focus(z.x, z.y, 1.6); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, '04-zoom.png') });
  const perf = await page.evaluate(() => OutbreakCity._instances[0].perf.history);
  console.log('frame ms history', perf.slice(-10));
  console.log('ERRORS', errors.length ? errors : 'none');
  await browser.close();
})();
