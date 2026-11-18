// Measures renderer.draw() and sim step cost in headless Chromium.
// node tools/perf.js [lowFx 0|1] [zoom]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const lowFx = process.argv[2] === '1', zoom = parseFloat(process.argv[3] || '0');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'index.html') + '?seed=PERF1');
  await page.waitForTimeout(500);
  const r = await page.evaluate(async ({ lowFx, zoom }) => {
    const app = OutbreakCity._instances[0];
    app.settings.lowFx = lowFx; app.settings.autoLowFx = false;
    document.querySelector('[data-f=tut]').checked = false;
    document.querySelector('[data-a=start]').click();
    const g = app.game;
    app.renderer.clearSprites(); app.renderer.buildChunks(); app.renderer.initCars();
    if (zoom) { app.renderer.cam.tz = app.renderer.cam.zoom = zoom; }
    g.startWave();
    // fast-forward to a busy moment (wave 3) using a mixed strategy
    const place = (type) => { for (let i = 0; i < 400; i++) { const x = 2 + Math.floor(Math.random() * (g.W - 4)), y = 2 + Math.floor(Math.random() * (g.H - 4)); if (g.canPlace(type, x, y).ok) { g.place(type, x, y); return; } } };
    while (g.wave < 3 && g.phase !== 'ended') {
      if (g.phase === 'build') { ['militia', 'lab', 'clinic', 'militia', 'hospital'].forEach(place); g.startWave(); }
      else if (g.phase === 'briefing') g.choose(0); else g.step();
    }
    for (let i = 0; i < 900 && g.phase === 'wave'; i++) g.step();
    app.paused = true;
    // time draws
    for (let w = 0; w < 120; w++) app.renderer.draw(0.5, 1 / 60, app.ui); // warm-up (sprite cache)
    const t0 = performance.now(); let n = 0;
    const times = [];
    for (; n < 60; n++) { const a = performance.now(); app.renderer.draw(0.5, 1 / 60, app.ui); times.push(performance.now() - a); }
    times.sort((a, b) => a - b);
    // time sim steps
    app.paused = false;
    const s0 = performance.now(); let steps = 0;
    for (; steps < 400 && g.phase === 'wave'; steps++) g.step();
    const stepMs = (performance.now() - s0) / steps;
    return { agents: g.agents.length, walkers: g.nWalkers, zombies: g.nZombies, towers: g.towers.length, drawn: app.renderer.stats.drawn, sprites: app.renderer.spriteCount,
      drawMedian: times[30].toFixed(2), drawP90: times[54].toFixed(2), stepMs: stepMs.toFixed(3), zoom: app.renderer.cam.zoom.toFixed(2), wave: g.wave };
  }, { lowFx, zoom });
  console.log(r, errors.length ? errors : 'no errors');
  await browser.close();
})();
