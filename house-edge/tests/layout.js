// Layout / accessibility / consistency checks. Run: NODE_PATH=$(npm root -g) node house-edge/tests/layout.js
const { chromium } = require('playwright'); const path = require('path'); let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  FAIL:', m); } else console.log('  ok  :', m); };
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const url = 'file://' + path.resolve(__dirname, '../index.html');
  for (const [w, h, name] of [[1366, 768, 'chromebook'], [1280, 720, 'small chromebook'], [390, 800, 'phone']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message)); await page.goto(url); await page.waitForTimeout(300);
    await page.evaluate(() => { HE.Progress.pref('demo', true); HE.Progress.pref('nameLine', false); });
    for (const z of ['z0', 'z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7', 'z8', 'z9', 'z10']) {
      await page.evaluate(id => HE.App.show(id), z); await page.waitForTimeout(250);
      const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      ok(o.sw <= o.iw + 1, `${name} ${z}: no horizontal page scroll (${o.sw} <= ${o.iw})`);
      if (name === 'phone' && (z === 'z2' || z === 'z5')) await page.screenshot({ path: `/tmp/claude-0/he_phone_${z}.png` });
    }
    // accessibility: controls need accessible names
    const unnamed = await page.evaluate(() => { const bad = []; document.querySelectorAll('button,a[href],input,select,textarea').forEach(e => { const n = (e.getAttribute('aria-label') || e.innerText || e.value || (e.id && document.querySelector(`label[for="${e.id}"]`) && 'lbl') || e.getAttribute('title') || '').trim(); if (!n && !e.closest('[hidden]')) bad.push(e.outerHTML.slice(0, 80)); }); return bad; });
    ok(unnamed.length === 0, `${name}: all controls have accessible names ${unnamed.slice(0, 3).join(' | ')}`);
    const noalt = await page.evaluate(() => [...document.querySelectorAll('canvas')].filter(c => !c.getAttribute('aria-label') && !c.getAttribute('aria-hidden')).length); ok(noalt === 0, `${name}: every visible canvas has aria-label (${noalt} missing)`);
    ok(errs.length === 0, `${name}: no page errors ${errs.join(';')}`);
    const small = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent && (b.getBoundingClientRect().height < 40 || b.getBoundingClientRect().width < 36)).map(b => b.className + ':' + b.innerText.slice(0, 12)).slice(0, 8));
    ok(small.length === 0, `${name}: touch targets >= 40px ${JSON.stringify(small)}`);
    await ctx.close();
  }
  // keyboard: tab reaches the first prediction choice, Enter selects it
  { const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const page = await ctx.newPage(); await page.goto(url); await page.waitForTimeout(300);
    for (let i = 0; i < 30; i++) { await page.keyboard.press('Tab'); const c = await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('choice')); if (c) break; }
    await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => HE.Progress.isDone('i.predict')), 'keyboard-only: Tab + Enter answers the prediction');
    await page.keyboard.press('Tab'); const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle); ok(outline !== 'none', 'visible focus outline on choices');
    // motion preference
    await ctx.close(); }
  { const ctx = await browser.newContext({ reducedMotion: 'reduce' }); const page = await ctx.newPage(); await page.goto(url); await page.waitForTimeout(300);
    ok(await page.evaluate(() => HE.UI.reduced === true), 'prefers-reduced-motion detected');
    ok(await page.evaluate(() => getComputedStyle(document.querySelector('.hero-title span')).opacity === '1'), 'title visible without animation'); await ctx.close(); }
  // math consistency & lucky/unlucky messaging & perf, all in page
  { const ctx = await browser.newContext(); const page = await ctx.newPage(); await page.goto(url); await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const E = HE.Engine, out = {}; out.valid = E.validate().length;
      const t0 = performance.now(); const s = HE.Sim.run(10000, rng => E.playN('slots', 10, 100, rng)); out.ms10k = Math.round(performance.now() - t0); out.mean = s.mean; out.expected = E.game('slots').ev * 1000;
      const t1 = performance.now(); HE.Sim.run(10000, rng => E.playN('slots', 10, 1000, rng)); out.ms10kx1000 = Math.round(performance.now() - t1);
      const lucky = HE.describePosition({ below: .97, above: .03, percentile: 97 }, 1800), unlucky = HE.describePosition({ below: .02, above: .98, percentile: 2 }, -400), mid = HE.describePosition({ below: .5, above: .5, percentile: 50 }, 0);
      out.lucky = /unusually strong/.test(lucky) && /97\.0%/.test(lucky); out.unlucky = /unusually rough/.test(unlucky) && /not a judgment/.test(unlucky); out.mid = /middle/.test(mid);
      // X-ray table equals game config
      const tb = E.evTable('slots', 10); out.evMatch = Math.abs(tb.ev - E.game('slots').ev * 10) < 1e-9; out.rtpSum = tb.rows.reduce((a, r) => a + r.p * (r.ret / 10), 0);
      // gameplay draws match configured probabilities
      const g = E.game('slots'), c = new Array(g.outcomes.length).fill(0), N = 200000; for (let i = 0; i < N; i++) c[E.draw('slots').index]++;
      out.maxDev = Math.max(...g.outcomes.map((o, i) => Math.abs(c[i] / N - o.p)));
      // strategy runner == sim model: expected return per token across rotate strategy
      out.parlay6 = HE.Parlay.reference(6).prob; out.parlay3 = HE.Parlay.reference(3).prob;
      out.tokenOnly = !/\$|USD|dollar|cash out|deposit/i.test(document.body.innerText);
      return out; });
    console.log('  info:', JSON.stringify(r));
    ok(r.valid === 0, 'config probabilities valid'); ok(r.ms10k < 1500, `10,000 players x 100 bets in ${r.ms10k} ms`); ok(r.ms10kx1000 < 4000, `10,000 players x 1,000 bets in ${r.ms10kx1000} ms`);
    ok(Math.abs(r.mean - r.expected) < 25, 'sim mean ~ expected'); ok(r.lucky && r.unlucky && r.mid, 'lucky / unlucky / middle students get appropriate, non-shaming messages'); ok(r.evMatch && Math.abs(r.rtpSum - 0.895) < 1e-9, 'X-ray EV table matches config'); ok(r.maxDev < 0.003, 'gameplay frequencies match config (' + r.maxDev.toFixed(5) + ')');
    ok(r.parlay6 === 0.015625 && r.parlay3 === 0.125, 'parlay math: 6 legs = 1.5625%, 3 legs = 12.5%'); ok(r.tokenOnly, 'no real-money terms on screen');
    await ctx.close(); }
  console.log(fails ? fails + ' FAILURES' : 'LAYOUT/A11Y/MATH CHECKS PASSED'); await browser.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
