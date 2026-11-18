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
    // walk to the Testing Lab step with real clicks and keys: hello, camera, hall, lens (press L), lensOff, pz
    for (let k = 0; k < 3; k++) { await page.click('.oc-tut [data-a=next]'); await page.waitForTimeout(150); }
    await page.keyboard.press('l'); await page.waitForTimeout(500);
    await page.keyboard.press('l');
    await page.click('.oc-tut [data-a=next]'); await page.waitForTimeout(150);
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
    await page.waitForTimeout(300);
    const step = await page.evaluate(() => { const a = OutbreakCity._instances[0]; return a.tut && OutbreakCity.data.TUTORIAL[a.tut.i].id; });
    check('Tutorial advances after building', step === 'hover', step);
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

  // ---------- 2b. Full guided walkthrough, every step, real input ----------
  {
    const page = await newPage(browser);
    await page.goto(base + 'index.html?seed=WALK1');
    await page.waitForTimeout(600);
    await page.check('[data-f=tut]'); await page.click('[data-a=start]'); await page.waitForTimeout(500);
    const cur = () => page.evaluate(() => { const a = OutbreakCity._instances[0]; return a.tut ? OutbreakCity.data.TUTORIAL[a.tut.i].id : null; });
    const placeNear = async (type, key) => {
      // pick a free tile near the screen centre (where the tutorial moved the camera) and click it
      const t = await page.evaluate((type) => {
        const app = OutbreakCity._instances[0], g = app.game, w = app.renderer.screenToWorld(683, 384);
        for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const x = Math.floor(w.x) + dx, y = Math.floor(w.y) + dy;
          if (g.canPlace(type, x, y).ok) { const p = app.renderer.worldToScreen(x + 0.5, y + 0.5); if (p.x > 40 && p.x < 1080 && p.y > 90 && p.y < 600) return { sx: p.x, sy: p.y }; }
        }
        return null;
      }, type);
      await page.keyboard.press(key); await page.mouse.click(t.sx, t.sy); await page.waitForTimeout(400);
    };
    const seen = [];
    for (let guard = 0; guard < 60; guard++) {
      const id = await cur(); if (!id) break;
      if (!seen.includes(id)) seen.push(id);
      if (id === 'lens') { await page.keyboard.press('l'); await page.waitForTimeout(400); continue; }
      if (id === 'lensOff') { await page.keyboard.press('l'); }
      if (id === 'lab') { await shot(page, '16-walkthrough-lab'); await placeNear('lab', '2'); continue; }
      if (id === 'militia') { await placeNear('militia', '1'); continue; }
      if (id === 'clinic') { await placeNear('clinic', '3'); continue; }
      if (id === 'hospital') { await placeNear('hospital', '4'); continue; }
      if (id === 'start') { await shot(page, '17-walkthrough-start'); await page.keyboard.press('Enter'); await page.waitForTimeout(400); continue; }
      if (id === 'watch' || id === 'exposed') { await page.waitForTimeout(1500); continue; }
      if (id === 'select') {
        const tp = await page.evaluate(() => { const app = OutbreakCity._instances[0], tw = app.game.towers[0]; app.renderer.focus(tw.x, tw.y, 1.2); app.renderer.cam.x = app.renderer.cam.tx; app.renderer.cam.y = app.renderer.cam.ty; app.renderer.cam.zoom = 1.2; return app.renderer.worldToScreen(tw.x, tw.y, 14); });
        await page.mouse.click(tp.x, tp.y); await page.waitForTimeout(500); continue;
      }
      if (id === 'side') await shot(page, '18-walkthrough-status');
      await page.click('.oc-tut [data-a=next]'); await page.waitForTimeout(200);
    }
    const end = await page.evaluate(() => { const a = OutbreakCity._instances[0]; return { tut: a.tut, towers: a.game.towers.map(t => t.type).sort().join(','), phase: a.game.phase, done: a.store.tutorialDone }; });
    check('Full walkthrough completes every step with real input (' + seen.length + ' of ' + (await page.evaluate(() => OutbreakCity.data.TUTORIAL.length)) + ' steps)',
      end.tut === null && seen.length === (await page.evaluate(() => OutbreakCity.data.TUTORIAL.length)) && end.towers === 'clinic,hospital,lab,militia', JSON.stringify(end) + ' saw ' + seen.join('>'));
    check('No errors during the walkthrough', page.errors.length === 0, page.errors.join(' | '));
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
      await page.click('[data-a=results]');
      await page.waitForTimeout(400);
      await shot(page, '39-results-page');
      const res = await page.evaluate(() => { const c = document.querySelector('.oc-results'); const r = c.getBoundingClientRect(); return { stamp: !!c.querySelector('.oc-stamp'), name: c.querySelector('.oc-res-name').textContent, code: c.querySelector('.oc-code').textContent, fits: r.top >= 0 && r.bottom <= innerHeight }; });
      check('Results page shows COMPLETE, name and code, and fits on one screen (1366x768)', res.stamp && res.name === 'Bot' && res.code.startsWith('OC1-') && res.fits, JSON.stringify(res).slice(0, 120));
      await page.click('.oc-results [data-a=report]');
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

  // ---------- 4b. Fire + helicopter ambience: works, mutes, doesn't slow frames ----------
  {
    const page = await newPage(browser);
    await page.goto(base + 'index.html?seed=CHAOS1');
    await page.waitForTimeout(400);
    await page.uncheck('[data-f=tut]');
    await page.click('[data-a=start]'); // a real click unlocks Web Audio
    await page.evaluate(() => {
      const app = OutbreakCity._instances[0], g = app.game; app.trackPerf = function (ms) { (this.ft = this.ft || []).push(ms); };
      while (g.phase !== 'ended' && !(g.wave === 4 && g.waveTime > 50)) { if (g.phase === 'build') g.startWave(); else if (g.phase === 'briefing') g.choose(0); else g.step(); }
      app.hideScreen(); app.lastPhase = g.phase; app.settings.muted = false; app.settings.lowFx = false;
      let best = 0; g.chaos.forEach((c, k) => { if (c > g.chaos[best]) best = k; }); const c = g.city.centers[best];
      app.renderer.focus(c[0], c[1], 1.2); app.renderer.cam.x = app.renderer.cam.tx; app.renderer.cam.y = app.renderer.cam.ty; app.renderer.cam.zoom = 1.2;
    });
    await page.waitForTimeout(2500);
    const gains = () => page.evaluate(() => { const a = OutbreakCity._instances[0].sfx.amb; return a ? { fire: +a.fireRoar.gain.value.toFixed(3), crackle: +a.fireCrackle.gain.value.toFixed(3), heli: +a.heli.gain.value.toFixed(3) } : null; });
    const on = await gains();
    check('Fire and helicopter ambience plays over a burning district', on && on.fire > 0.02 && on.crackle > 0.02 && on.heli > 0.02, JSON.stringify(on));
    const frameAvg = async () => { await page.evaluate(() => { OutbreakCity._instances[0].ft = []; }); await page.waitForTimeout(5000); return page.evaluate(() => { const f = OutbreakCity._instances[0].ft; return f.reduce((a, b) => a + b, 0) / f.length; }); };
    const withSound = await frameAvg();
    await page.keyboard.press('m'); await page.waitForTimeout(2000);
    const muted = await gains();
    check('Ambience goes silent when muted', muted.fire < 0.005 && muted.crackle < 0.005 && muted.heli < 0.005, JSON.stringify(muted));
    // compare against the ambience fully removed
    await page.evaluate(() => { const app = OutbreakCity._instances[0]; app.sfx.ambient = function () { }; app.settings.muted = false; });
    const without = await frameAvg();
    check('Ambience does not slow the game', withSound - without < 3, 'avg frame ' + withSound.toFixed(1) + ' ms with ambience vs ' + without.toFixed(1) + ' ms without');
    await page.evaluate(() => { const app = OutbreakCity._instances[0]; delete app.sfx.ambient; app.startAttract('TITLE1'); app.showTitle(); });
    await page.waitForTimeout(2000);
    const title = await gains();
    check('Ambience stops on the title screen', title.fire < 0.005 && title.heli < 0.005, JSON.stringify(title));
    check('No errors with ambient audio', page.errors.length === 0, page.errors.join(' | '));
    await page.close();
  }

  // ---------- 4c. INSANE unlock, military tanks, nuclear option, no fog ----------
  {
    const page = await newPage(browser);
    await page.goto(base + 'index.html?seed=BIG1');
    await page.evaluate(() => { try { localStorage.removeItem('outbreakCity.v1'); } catch (e) { } });
    await page.reload(); await page.waitForTimeout(500);
    const locked = await page.evaluate(() => document.querySelector('.oc-insane').classList.contains('locked'));
    check('INSANE is locked before finishing a game', locked);
    // finish a quick game -> INSANE unlocks
    await page.uncheck('[data-f=tut]'); await page.click('[data-a=start]');
    await page.evaluate(() => { const app = OutbreakCity._instances[0], g = app.game; g.waveDefs = g.waveDefs.slice(0, 2); g.totalWaves = 2; g.plans = g.plans.slice(0, 2);
      while (g.phase !== 'ended') { if (g.phase === 'build') g.startWave(); else if (g.phase === 'briefing') g.choose(0); else g.step(); } app.lastPhase = 'wave'; });
    await page.waitForSelector('.oc-paper', { timeout: 8000 });
    const unlockedMsg = await page.isVisible('.oc-unlock');
    await page.click('.oc-paper [data-a=again]'); await page.waitForTimeout(500);
    const unlocked = await page.evaluate(() => !document.querySelector('.oc-insane').classList.contains('locked'));
    check('Finishing a game unlocks INSANE (with a message)', unlockedMsg && unlocked);
    await page.click('.oc-insane'); await page.uncheck('[data-f=tut]'); await page.click('[data-a=start]'); await page.waitForTimeout(400);
    const ins = await page.evaluate(() => { const app = OutbreakCity._instances[0], g = app.game; const before = g.budget; let placed = 0;
      for (let y = 2; y < g.H - 2 && placed < 40; y++) for (let x = 2; x < g.W - 2 && placed < 40; x++) if (g.place('clinic', x, y).ok) placed++;
      app.updateHud(true); return { diff: g.diffKey, budgetText: document.querySelector('.oc-meter .val') && app.meters.budget.val.textContent, placed, spent: before - g.budget, cap: g.maxZombies }; });
    check('INSANE: unlimited budget (∞) and a higher zombie cap', ins.diff === 'insane' && ins.budgetText === '∞' && ins.placed === 40 && ins.spent === 0 && ins.cap > 140, JSON.stringify(ins));
    // military card and tanks (Normal)
    await page.evaluate(() => { const app = OutbreakCity._instances[0]; app.newGame({ seed: 'BIG1', difficulty: 'normal' }); const g = app.game;
      while (!(g.phase === 'briefing' && g.briefing.card.id === 'military') && g.phase !== 'ended') { if (g.phase === 'build') g.startWave(); else if (g.phase === 'briefing') g.choose(0); else g.step(); } app.lastPhase = 'wave'; });
    await page.waitForSelector('.oc-brief', { timeout: 5000 });
    const card = await page.evaluate(() => OutbreakCity._instances[0].game.briefing.card.id + ' after wave ' + OutbreakCity._instances[0].game.wave);
    await page.click('.oc-opt >> nth=0'); await page.click('.oc-brief .oc-btn.primary');
    const tanks = await page.evaluate(() => { const g = OutbreakCity._instances[0].game; g.startWave(); for (let i = 0; i < 1200; i++) g.step(); return { n: g.tanks.length, kills: g.stats.tankKills || 0 }; });
    check('Military intervention offered before wave 5; tanks kill zombies', card === 'military after wave 4' && tanks.n === 3 && tanks.kills > 0, card + ' ' + JSON.stringify(tanks));
    // nuclear option
    await page.evaluate(() => { const app = OutbreakCity._instances[0]; app.newGame({ seed: 'NUKE1', difficulty: 'normal' }); const g = app.game; while (!g.nukeAvailable() && g.phase !== 'ended') { if (g.phase === 'build') g.startWave(); else if (g.phase === 'briefing') g.choose(0); else g.step(); } app.hideScreen(); app.lastPhase = g.phase; app.updateHud(true); });
    await page.waitForSelector('.oc-nuke', { state: 'visible', timeout: 3000 });
    await page.click('.oc-nuke'); await page.click('.oc-nukecard [data-a=yes]'); await page.click('.oc-nukecard [data-a=yes]');
    await page.waitForSelector('.oc-paper', { timeout: 12000 });
    const nk = await page.evaluate(() => { const g = OutbreakCity._instances[0].game; return { ending: g.ending, alive: g.totals.aliveNonZ, ruins: g.blds.every(b => b.blight === 3) }; });
    check('Nuclear option (asks twice) destroys the city and ends the game', nk.ending === 'nuked' && nk.alive === 0 && nk.ruins, JSON.stringify(nk));
    const fog = await page.evaluate(() => OutbreakCity.data.WAVES.filter(w => w.weather === 'fog').length);
    check('No fog in any wave', fog === 0, fog + ' foggy waves');
    check('No errors (INSANE / tanks / nuke)', page.errors.length === 0, page.errors.join(' | '));
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
    const files = ['index.html', 'style.css', 'fonts.css'].concat(fs.readdirSync(path.join(ROOT, 'js')).map(f => 'js/' + f));
    const bytes = files.reduce((s, f) => s + fs.statSync(path.join(ROOT, f)).size, 0);
    check('Total page weight under 1 MB', bytes < 1024 * 1024, (bytes / 1024).toFixed(0) + ' KB uncompressed (' + files.length + ' files)');
  }

  await browser.close(); srv.close();
  const failed = results.filter(r => !r.ok);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed. Screenshots in ' + OUT);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ results, endings }, null, 2));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
