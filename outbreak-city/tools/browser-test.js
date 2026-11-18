// End-to-end browser test (Playwright + the pre-installed Chromium).
//   node tools/browser-test.js [screenshotDir]
// Checks: no console errors, real mouse/keyboard input, tutorial, briefings,
// endings differ by strategy, report + completion code, save/resume, auto
// low-effects, Sheets webhook (to a local server), frame times under load,
// page weight. Screenshots are written to screenshotDir.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), http = require('http');
const ROOT = path.join(__dirname, '..');
const OUT = process.argv[2] || path.join(ROOT, 'test-shots');
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  -- ' + detail : '')); };

function serve() {
  // static file server for the game + a fake Apps Script endpoint at /hook
  const posts = [];
  const srv = http.createServer((req, res) => {
    if (req.url.startsWith('/hook')) { let b = ''; req.on('data', c => b += c); req.on('end', () => { posts.push(b); res.end('ok'); }); return; }
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'application/octet-stream';
    res.setHeader('Content-Type', type); res.end(fs.readFileSync(f));
  });
  return new Promise(r => srv.listen(0, () => r({ srv, port: srv.address().port, posts })));
}

async function newPage(browser, opts) {
  const page = await browser.newPage(Object.assign({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 }, opts || {}));
  page.errors = [];
  page.on('console', m => { if (m.type() === 'error') page.errors.push(m.text()); });
  page.on('pageerror', e => page.errors.push('PAGEERROR ' + e.message));
  return page;
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + '.png') });
const addBots = page => page.addScriptTag({ path: path.join(__dirname, 'strategies.js') });

(async () => {
  const { srv, port, posts } = await serve();
  const base = 'http://localhost:' + port + '/';
  const browser = await chromium.launch();

  // ---------- 1. file:// load + title ----------
  {
    const page = await newPage(browser);
    await page.goto('file://' + path.join(ROOT, 'index.html'));
    await page.waitForTimeout(1200);
    const title = await page.textContent('.oc-logo');
    check('Loads from file:// (double-click)', title && title.includes('OUTBREAK'), title);
    check('No errors on file:// load', page.errors.length === 0, page.errors.join(' | '));
    await page.close();
  }

  // ---------- 2. Tutorial with real input (http://) ----------
  {
    const page = await newPage(browser);
    await page.goto(base + 'index.html?seed=TUTOR1');
    await page.waitForTimeout(800);
    const seedVal = await page.inputValue('[data-f=seed]');
    check('?seed= URL parameter fills the seed', seedVal === 'TUTOR1', seedVal);
    await page.fill('[data-f=name]', 'Test S.');
    await page.check('[data-f=tut]');
    await page.click('[data-a=start]');
    await page.waitForTimeout(600);
    check('Tutorial bubble shows', await page.isVisible('.oc-tut'));
    await page.click('.oc-tut [data-a=next]');
    await page.waitForTimeout(800);
    await shot(page, '10-tutorial-lab-step');
    // Place a lab with the keyboard + mouse near the highlighted (patient zero) building
    const target = await page.evaluate(() => {
      const app = OutbreakCity._instances[0], g = app.game, b = g.blds[g.patientZero];
      for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const x = b.x + dx, y = b.y + dy;
        if (g.canPlace('lab', x, y).ok) { const p = app.renderer.worldToScreen(x + 0.5, y + 0.5); return { x, y, sx: p.x, sy: p.y }; }
      }
      return null;
    });
    await page.keyboard.press('2');
    await page.mouse.move(target.sx, target.sy);
    await page.waitForTimeout(250);
    await shot(page, '11-placement-preview');
    await page.mouse.click(target.sx, target.sy);
    await page.waitForTimeout(300);
    const placed = await page.evaluate(() => OutbreakCity._instances[0].game.towers.map(t => t.type + '@' + t.tx + ',' + t.ty));
    check('Mouse picking places a tower on the clicked tile', placed.includes('lab@' + target.x + ',' + target.y), placed.join(' '));
    const step = await page.evaluate(() => OutbreakCity._instances[0].tut && OutbreakCity._instances[0].tut.i);
    check('Tutorial advances after building', step === 2, step);
    await page.click('.oc-tut [data-a=skip]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    const phase = await page.evaluate(() => OutbreakCity._instances[0].game.phase);
    check('Enter key starts the wave', phase === 'wave', phase);
    await page.keyboard.press('f'); await page.keyboard.press('f');
    const speed = await page.evaluate(() => OutbreakCity._instances[0].speed);
    check('F key cycles speed to 3x', speed === 3, speed);
    await page.waitForTimeout(5000);
    await shot(page, '12-wave-running');
    await page.keyboard.press('l');
    await page.waitForTimeout(300);
    await shot(page, '13-data-lens');
    await page.keyboard.press('l');
    // zoom with the wheel at the centre
    await page.mouse.move(683, 400);
    const z0 = await page.evaluate(() => OutbreakCity._instances[0].renderer.cam.zoom);
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(400);
    const z1 = await page.evaluate(() => OutbreakCity._instances[0].renderer.cam.zoom);
    check('Mouse wheel zooms', z1 > z0 * 1.2, z0.toFixed(2) + ' -> ' + z1.toFixed(2));
    await page.waitForTimeout(1500);
    await shot(page, '14-zoomed-in');
    // drag to pan
    const c0 = await page.evaluate(() => OutbreakCity._instances[0].renderer.cam.x);
    await page.mouse.move(600, 400); await page.mouse.down(); await page.mouse.move(800, 420, { steps: 6 }); await page.mouse.up();
    const c1 = await page.evaluate(() => OutbreakCity._instances[0].renderer.cam.x);
    check('Mouse drag pans the camera', Math.abs(c1 - c0) > 50, (c1 - c0).toFixed(0));
    // select tower and check panel
    const sp = await page.evaluate(() => { const app = OutbreakCity._instances[0], tw = app.game.towers[0]; app.renderer.focus(tw.x, tw.y, 1.2); return true; });
    await page.waitForTimeout(900);
    const tp = await page.evaluate(() => { const app = OutbreakCity._instances[0], tw = app.game.towers[0]; const p = app.renderer.worldToScreen(tw.x, tw.y, 14); return p; });
    await page.mouse.click(tp.x, tp.y);
    await page.waitForTimeout(300);
    check('Clicking a tower opens its panel', await page.isVisible('.oc-sel'));
    await shot(page, '15-tower-selected');
    // save + resume after reload
    const before = await page.evaluate(() => { const app = OutbreakCity._instances[0]; app.paused = true; app.autosave(); const g = app.game; return { tick: g.tick, towers: g.towers.length, inf: g.stats.infections, budget: Math.round(g.budget) }; });
    await page.reload();
    await page.waitForTimeout(800);
    check('Continue button offered after reload', await page.isVisible('[data-a=resume]'));
    await page.click('[data-a=resume]');
    await page.waitForFunction(() => { const a = OutbreakCity._instances[0]; return a.game && !a.game.attract && !a.modalOpen; }, null, { timeout: 30000 });
    const after = await page.evaluate(() => { const g = OutbreakCity._instances[0].game; return { tick: g.tick, towers: g.towers.length, inf: g.stats.infections, budget: Math.round(g.budget) }; });
    check('Save/resume restores the exact same game (deterministic replay)', JSON.stringify(before) === JSON.stringify(after), JSON.stringify(before) + ' vs ' + JSON.stringify(after));
    check('No errors in tutorial/input session', page.errors.length === 0, page.errors.join(' | '));
    await page.close();
  }

  // ---------- 3. Strategy playthroughs in the browser: endings must differ ----------
  const endings = {};
  for (const strat of ['nothing', 'shooter', 'balanced']) {
    const page = await newPage(browser);
    await page.goto(base + 'index.html?seed=CLASS1');
    await page.waitForTimeout(500);
    await addBots(page);
    await page.evaluate(() => { document.querySelector('[data-f=tut]').checked = false; document.querySelector('[data-f=name]').value = 'Bot'; document.querySelector('[data-a=start]').click(); });
    await page.waitForTimeout(300);
    // play wave 1 with the real loop for a moment, then fast-forward to the first briefing
    await page.evaluate((strat) => {
      const app = OutbreakCity._instances[0], g = app.game, s = Object.assign({}, OCBots.STRATS[strat]); s.q = null; window.__s = s;
      s.build(g); app.doStartWave(); app.speed = 3;
    }, strat);
    await page.waitForTimeout(2500);
    if (strat === 'balanced') await shot(page, '20-balanced-wave1');
    await page.evaluate(() => { const g = OutbreakCity._instances[0].game; while (g.phase === 'wave') g.step(); });
    await page.waitForTimeout(500);
    const brief = await page.isVisible('.oc-brief');
    if (strat === 'balanced') { check('Mayor\'s Briefing appears after a wave', brief); await shot(page, '21-briefing'); }
    // choose via real click on the strategy's option
    const idx = await page.evaluate(() => { const g = OutbreakCity._instances[0].game; return window.__s.choose(g, g.briefing.card); });
    await page.click('.oc-opt >> nth=' + idx);
    await page.waitForTimeout(300);
    if (strat === 'balanced') await shot(page, '22-decision-result');
    await page.click('.oc-brief .oc-btn.primary');
    // fast-forward the rest of the game with the strategy, keeping the UI in sync
    await page.evaluate(() => {
      const app = OutbreakCity._instances[0], g = app.game, s = window.__s;
      let guard = 0;
      while (g.phase !== 'ended' && guard++ < 200000) {
        if (g.phase === 'build') { s.build(g); g.startWave(); }
        else if (g.phase === 'briefing') g.choose(s.choose(g, g.briefing.card));
        else g.step();
      }
      app.lastPhase = 'wave';
    });
    await page.waitForSelector('.oc-paper', { timeout: 8000 });
    await page.waitForTimeout(600);
    const end = await page.evaluate(() => { const g = OutbreakCity._instances[0].game, r = g.report(); return { ending: g.ending, surv: Math.round(r.survival * 100), trust: r.trust, equity: r.equity, stray: r.strayDeaths, peakR: r.peakR }; });
    endings[strat] = end;
    await shot(page, '3' + Object.keys(endings).length + '-end-' + strat);
    if (strat === 'balanced') {
      await page.click('[data-a=report]');
      await page.waitForTimeout(500);
      await shot(page, '40-report-top');
      await page.evaluate(() => { const s = document.querySelector('.oc-screen'); s.scrollTop = 700; });
      await page.waitForTimeout(200);
      await shot(page, '41-report-curve');
      await page.evaluate(() => { const s = document.querySelector('.oc-screen'); s.scrollTop = 2200; });
      await page.waitForTimeout(200);
      await shot(page, '42-report-concepts');
      const code = await page.textContent('.oc-code');
      const decoded = await page.evaluate(c => OutbreakCity._instances[0].decodeCode(c), code);
      check('Completion code decodes and validates', /Yes \(checksum matches\)/.test(decoded) && decoded.includes('Bot'), code.slice(0, 40) + '...');
      const tampered = await page.evaluate(c => OutbreakCity._instances[0].decodeCode(c.slice(0, -5) + 'X' + c.slice(-4)), code);
      check('Tampered completion code is flagged', /NO: the code was changed|Could not read|does not look/.test(tampered));
      const qs = await page.$$eval('.oc-qs li', l => l.length);
      check('Report has 4-6 reflection questions', qs >= 4 && qs <= 6, qs);
    }
    check('No errors during ' + strat + ' playthrough', page.errors.length === 0, page.errors.join(' | '));
    await page.close();
  }
  console.log('Endings by strategy (seed CLASS1):', JSON.stringify(endings));
  const set = new Set(Object.values(endings).map(e => e.ending));
  check('Do-nothing, pure-shooting and balanced reach three different endings', set.size === 3, JSON.stringify(Object.fromEntries(Object.entries(endings).map(([k, v]) => [k, v.ending]))));
  check('Pure shooting fails or wins hollow', ['collapse', 'hollow', 'zombieMayor'].includes(endings.shooter.ending), endings.shooter.ending);
  check('Balanced play succeeds', ['eradication', 'endemic', 'modelCity'].includes(endings.balanced.ending), endings.balanced.ending);

  // ---------- 4. Frame times under load (~300 entities) ----------
  for (const lowFx of [false, true]) {
    const page = await newPage(browser);
    await page.goto(base + 'index.html?seed=STRESS');
    await page.waitForTimeout(400);
    const n = await page.evaluate((lowFx) => {
      const app = OutbreakCity._instances[0];
      app.trackPerf = function (ms) { (this.ft = this.ft || []).push(ms); };
      if (lowFx) app.settings.lowFx = true;
      document.querySelector('[data-f=tut]').checked = false; document.querySelector('[data-a=start]').click();
      const g = app.game;
      // grow an outbreak, then top up to ~300 moving agents (150 walkers + 140 zombies)
      while (g.phase !== 'ended' && g.wave < 3) { if (g.phase === 'build') g.startWave(); else if (g.phase === 'briefing') { g.choose(0); } else g.step(); }
      for (let i = 0; i < 600 && g.phase === 'wave'; i++) g.step();
      const roads = []; for (let i = 0; i < g.city.tiles.length; i++) if (g.city.tiles[i] === 1) roads.push(i);
      while (g.nZombies < 140) { const t = roads[Math.floor(Math.random() * roads.length)]; g.spawnZombie(Math.random() < 0.3 ? 'runner' : 'basic', t % g.W + 0.5, ((t / g.W) | 0) + 0.5, t, 0, -1); }
      for (let i = 0; i < 200 && g.phase === 'wave'; i++) g.step();
      app.hideScreen(); app.lastPhase = g.phase;
      // a few towers so towers/projectiles/particles are in the mix
      let k = 0; for (let y = 3; y < g.H - 3 && k < 12; y += 4) for (let x = 3; x < g.W - 3 && k < 12; x += 4) { const t = ['militia', 'lab', 'clinic', 'hospital'][k % 4]; g.budget += 200; if (g.canPlace(t, x, y).ok) { g.place(t, x, y); k++; } }
      return g.agents.length;
    }, lowFx);
    await page.waitForTimeout(2500);
    await page.evaluate(() => { OutbreakCity._instances[0].ft = []; });
    await page.waitForTimeout(5000);
    const st = await page.evaluate(() => { const a = OutbreakCity._instances[0], ft = a.ft.slice().sort((x, y) => x - y); return { n: a.game.agents.length, frames: ft.length, avg: ft.reduce((x, y) => x + y, 0) / ft.length, med: ft[ft.length >> 1], p95: ft[Math.floor(ft.length * 0.95)], phase: a.game.phase }; });
    if (!lowFx) await shot(page, '50-stress-300-entities');
    check('Frame time under load, ' + (lowFx ? 'Low effects' : 'full effects') + ' (' + st.n + ' agents; headless software rendering)', st.avg < 40,
      'avg ' + st.avg.toFixed(1) + ' ms (' + (1000 / st.avg).toFixed(0) + ' fps), median ' + st.med.toFixed(1) + ', p95 ' + st.p95.toFixed(1));
    await page.close();
  }

  // ---------- 5. Auto low-effects ----------
  {
    const page = await newPage(browser);
    await page.goto(base + 'index.html?seed=SLOW1');
    await page.waitForTimeout(300);
    const on = await page.evaluate(() => {
      const app = OutbreakCity._instances[0];
      app.settings.lowFx = false;
      document.querySelector('[data-f=tut]').checked = false; document.querySelector('[data-a=start]').click();
      for (let s = 0; s < 6; s++) for (let f = 0; f < 40; f++) app.trackPerf(25); // 6 s of 25 ms frames
      return app.settings.lowFx;
    });
    check('Low effects auto-enables after 5 s above 20 ms/frame', on === true);
    await page.close();
  }

  // ---------- 6. Teacher webhook (local fake Apps Script) ----------
  {
    const page = await newPage(browser);
    await page.goto(base + 'index.html?seed=HOOK1');
    await page.waitForTimeout(300);
    await page.evaluate((url) => {
      const app = OutbreakCity._instances[0];
      app.webhook = url;
      Math.random = () => 0.05; // keep the classroom-spreading delay short for the test
      document.querySelector('[data-f=tut]').checked = false; document.querySelector('[data-f=name]').value = 'Hook Test'; document.querySelector('[data-a=start]').click();
      const g = app.game; g.quick = true;
      while (g.phase !== 'ended') { if (g.phase === 'build') g.startWave(); else if (g.phase === 'briefing') g.choose(0); else g.step(); }
      app.lastPhase = 'wave';
    }, base + 'hook');
    await page.waitForTimeout(4500);
    const got = posts.length ? JSON.parse(posts[0]) : null;
    check('Results POST to the Sheets webhook (no-cors, delayed)', got && got.name === 'Hook Test' && got.code && got.code.startsWith('OC1-'), got ? got.ending + ' ' + got.code.slice(0, 20) : 'nothing received');
    await page.close();
  }

  // ---------- 7. Tablet / large text / reduced motion ----------
  {
    const page = await newPage(browser, { viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: false });
    await page.goto(base + 'index.html?seed=TABLET');
    await page.waitForTimeout(400);
    await page.evaluate(() => { const app = OutbreakCity._instances[0]; app.settings.text = 'large'; app.settings.reducedMotion = true; app.applySettings(); document.querySelector('[data-f=tut]').checked = false; document.querySelector('[data-a=start]').click(); const g = app.game; g.startWave(); for (let i = 0; i < 1500; i++) g.step(); });
    await page.waitForTimeout(1500);
    await shot(page, '60-tablet-large-text');
    // tap to place: select clinic then tap a free tile
    const t = await page.evaluate(() => { const app = OutbreakCity._instances[0], g = app.game; app.selectTower('clinic'); for (let y = 15; y < 30; y++) for (let x = 15; x < 30; x++) if (g.canPlace('clinic', x, y).ok) { const p = app.renderer.worldToScreen(x + 0.5, y + 0.5); if (p.x > 60 && p.x < 900 && p.y > 120 && p.y < 600) return { x, y, sx: p.x, sy: p.y }; } return null; });
    await page.touchscreen.tap(t.sx, t.sy);
    await page.waitForTimeout(300);
    const ok = await page.evaluate(t => OutbreakCity._instances[0].game.towers.some(w => w.type === 'clinic' && w.tx === t.x && w.ty === t.y), t);
    check('Touch tap places a tower (tablet)', ok);
    check('No errors on tablet run', page.errors.length === 0, page.errors.join(' | '));
    await page.close();
  }

  // ---------- 8. Page weight ----------
  {
    const files = ['index.html', 'style.css'].concat(fs.readdirSync(path.join(ROOT, 'js')).map(f => 'js/' + f));
    const bytes = files.reduce((s, f) => s + fs.statSync(path.join(ROOT, f)).size, 0);
    check('Total page weight under 1 MB', bytes < 1024 * 1024, (bytes / 1024).toFixed(0) + ' KB uncompressed (' + files.length + ' files)');
  }

  await browser.close(); srv.close();
  const failed = results.filter(r => !r.ok);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed. Screenshots in ' + OUT);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ results, endings }, null, 2));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
