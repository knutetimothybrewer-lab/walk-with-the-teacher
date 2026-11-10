// Short form + saved-work preservation. Needs Chromium: NODE_PATH=$(npm root -g) node tests/short-form.js
//
// The fixtures in tests/fixtures/ were written by the ORIGINAL full-form code (before the short form existed). They prove that
// a student's saved work (submitted or in progress) still opens exactly as it was, with the same items and the same score.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { load } = require('./load'); const { BROWSER } = require('./helpers');
const URL_ = 'file://' + path.resolve(__dirname, '../index.html'), CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let fails = 0, passes = 0; const ok = (c, m) => { if (c) { passes++; console.log('  ok  :', m); } else { fails++; console.log('  FAIL:', m); } };
const near = (a, b) => Math.abs(a - b) < 1e-6;
const FIX = n => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', n + '.json'), 'utf8'));

console.log('== Rosters in Node');
{
  const W = load(), sum = () => W.ITEMS.reduce((a, i) => a + i.pts, 0);
  ok(W.ITEMS.length === 49 && sum() === 100 && W.roster === undefined, 'default (nothing applied) = original 49 items, 100 points');
  const full = W.ITEMS.map(i => i.id + ':' + i.pts).join(), fullStages = JSON.stringify(W.MISSIONS.map(m => m.stages.map(s => s.id)));
  W.applyRoster('short');
  ok(W.ITEMS.length === 40 && near(sum(), 100), 'short = 40 items, exactly 100 points');
  ok(W.CHECKS.length === 1 && W.CHECKS[0].id === 'ck.m7.plan' && W.ACTIVITIES.every(a => a.id !== 'playWeek2'), 'short drops three unscored checkpoints and Maya’s week');
  ok(W.SHORT.retiredItems.every(id => !W.ITEM_BY_ID[id]) && W.ITEMS.every(i => W.ITEM_BY_ID[i.id] === i), 'retired items are not in the live roster; lookup matches');
  ok(W.CONFIG.assessmentVersion === 'wwq-1.0-short', 'short uses its own storage version (never the full form’s keys)');
  ok(Object.keys(W.Policy.MISSION_MAX).every(k => W.Policy.MISSION_MAX[k] === W.Policy.maxByMission()[k]) && Object.values(W.Policy.maxByMission()).reduce((a, b) => a + b, 0) === 100, 'mission maximums add to 100');
  const keep = new Set(W.ITEMS.map(i => i.id)); ok(W.MISSIONS.every(m => m.stages.every(s => W.itemsForStage(s.id).length || ['setup', 'howto', 'practice', 'overlap', 'play', 'myplan', 'form', 'sort'].includes(s.kind))), 'no stage is left empty');
  ok(W.MISSIONS.every(m => m.stages.length > 0) && W.MISSIONS.every(m => m.stages.every(s => !W.SHORT.retiredStages.includes(s.id))), 'retired stages are gone from every mission');
  ok(W.MISSIONS.every(m => m.stages.filter(s => s.kind === 'form').every(s => W.itemsForStage(s.id).length > 0)), 'every remaining question stage still has its question');
  W.applyRoster('long');
  ok(W.ITEMS.map(i => i.id + ':' + i.pts).join() === full && JSON.stringify(W.MISSIONS.map(m => m.stages.map(s => s.id))) === fullStages && W.CONFIG.assessmentVersion === 'wwq-1.0', 'switching back to long restores the original items, points, stages and version exactly');
  // legacy detection against several storage shapes
  const mk = keys => ({ length: keys.length, key: i => keys[i], getItem: k => keys.includes(k) ? '1' : null });
  ok(!W.hasLegacyRecord(mk([])) && !W.hasLegacyRecord(null), 'empty storage is not legacy');
  ok(['active', 'submitted', 'history', 'outbox', 'cool'].every(n => W.hasLegacyRecord(mk(['x', 'wwq:wwq-1.0:' + n]))), 'any full-form key (active, submitted, history, outbox, cool) marks a device as legacy');
  ok(!W.hasLegacyRecord(mk(['wwq:wwq-1.0-short:active', 'wwq:wwq-1.0-short:submitted'])), 'short-form keys do not look like legacy');
  ok(W.hasLegacyRecord({ getItem: k => k === 'wwq:wwq-1.0:submitted' ? '{}' : null }), 'storage without key()/length is probed by name');
  W.CONFIG.roster = 'auto'; ok(W.chooseRoster(mk(['wwq:wwq-1.0:active'])) === 'long' && W.chooseRoster(mk([])) === 'short', "'auto': legacy device -> long, fresh device -> short");
  W.CONFIG.roster = 'long'; ok(W.chooseRoster(mk([])) === 'long', "'long' forces the full form"); W.CONFIG.roster = 'short'; ok(W.chooseRoster(mk(['wwq:wwq-1.0:active'])) === 'short', "'short' forces the short form");
}

console.log('== Saved work, in a real browser (original-code fixtures, default settings)');
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  // The page is opened with the SHIPPED defaults (no test helper forcing a roster). The backend is switched off so nothing is sent.
  async function open(seed, mutate) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' }), page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    const ls = Object.assign({}, seed || {}); if (mutate) mutate(ls);
    await page.addInitScript("window.__ROSTER = 'auto';"); await page.addInitScript(BROWSER);   // BROWSER = the test helpers (__T); 'auto' = the shipped default choice
    await page.addInitScript(([ls]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); Object.keys(ls).forEach(k => localStorage.setItem(k, ls[k])); } document.addEventListener('DOMContentLoaded', () => { window.WWQ.CONFIG.backend.url = ''; }); }, [ls]);
    await page.goto(URL_); await page.waitForSelector('#stage-title', { timeout: 15000 });
    return { ctx, page, errs, ls };
  }
  const dump = page => page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });

  // --- 1. submitted full-form record
  { const f = FIX('legacy-submitted'), { ctx, page, errs } = await open(f.localStorage);
    const r = await page.evaluate(() => ({ roster: WWQ.roster, ver: WWQ.CONFIG.assessmentVersion, n: WWQ.ITEMS.length, status: WWQ.App.state.session.status, ro: WWQ.App.ro(), rep: WWQ.App.state.final && WWQ.App.state.final.report, view: WWQ.App.state.progress.view, modal: !!document.querySelector('.modal, [role=dialog]') }));
    ok(r.roster === 'long' && r.ver === 'wwq-1.0' && r.n === 49, 'submitted record: device keeps the FULL form (49 items, original storage version)');
    ok(r.status === 'SUBMITTED' && r.ro && !r.modal, 'submitted record: opens locked, no "inconsistent data" warning');
    ok(near(r.rep.scores.earnedPoints, f.expected.earned) && r.rep.scores.maxPoints === f.expected.max && r.rep.scores.percentDisplay === f.expected.percent, 'submitted record: score unchanged (' + f.expected.earned + ' / ' + f.expected.max + ')');
    ok(r.rep.items.length === f.expected.perItem.length && r.rep.items.every((i, k) => i.id === f.expected.perItem[k][0] && near(i.best, f.expected.perItem[k][1])), 'submitted record: every item’s points unchanged');
    ok(r.rep.missions.every((m, k) => m.id === f.expected.missions[k][0] && near(m.earned, f.expected.missions[k][1]) && m.max === f.expected.missions[k][2]), 'submitted record: every mission subtotal and maximum unchanged');
    const txt = await page.locator('body').innerText(); ok(txt.includes(f.expected.percent), 'submitted record: results screen shows ' + f.expected.percent + '%');
    const after = await dump(page); ok(after['wwq:wwq-1.0:submitted'] === f.localStorage['wwq:wwq-1.0:submitted'], 'submitted record: the saved submission is not rewritten (byte for byte)');
    ok(!Object.keys(after).some(k => k.includes('-short')), 'submitted record: nothing written under the short-form key');
    ok((await page.locator('#form-label').innerText()).startsWith('Full form (49'), 'submitted record: the footer says "Full form (49 graded questions)"');
    ok(!errs.length, 'submitted record: no console errors' + (errs.length ? ' ' + errs[0] : '')); await ctx.close(); }

  // --- 2. in-progress full-form record: resumes on the full form and can be finished and submitted
  { const f = FIX('legacy-active'), { ctx, page, errs } = await open(f.localStorage);
    const r = await page.evaluate(() => { const st = WWQ.App.state, t = WWQ.Policy.totals(st); return { roster: WWQ.roster, n: WWQ.ITEMS.length, status: st.session.status, earned: t.earned, max: t.max, fin: t.finalized, per: Object.keys(st.items).map(k => [k, st.items[k].attempts.length, st.items[k].best, !!st.items[k].finalized]), toast: document.body.innerText.includes('inconsistent') }; });
    ok(r.roster === 'long' && r.n === 49 && r.status === 'ACTIVE', 'in-progress record: resumes on the FULL form');
    ok(near(r.earned, f.expected.earned) && r.max === 100 && r.fin === f.expected.finalized, 'in-progress record: same points and finished items (' + r.fin + ' finished, ' + r.earned.toFixed(1) + ' pts)');
    ok(JSON.stringify(r.per) === JSON.stringify(f.expected.perItem), 'in-progress record: every attempt, score and finished flag unchanged');
    ok(!r.toast, 'in-progress record: no "inconsistent data" warning');
    const fin = await page.evaluate(() => { const W = WWQ; ['m3.loop', 'm3.strat.2', 'm3.strat.3', 'm3.smartfix', 'm3.smartbuild'].forEach(id => __T.answerItem(id, 'best')); [4, 5, 6, 7].forEach(m => __T.completeMission(m, 'best')); W.ITEMS.forEach(i => { if (!(W.App.state.items[i.id] || {}).finalized) __T.answerItem(i.id, 'best'); }); W.CHECKS.forEach(c => __T.answerItem(c.id, 'best')); W.ACTIVITIES.forEach(a => W.App.state.progress.activities[a.id] = true); const res = W.Store.submitFinal(W.App.state); return { ok: res.ok, max: res.ok && res.state.final.report.scores.maxPoints, n: res.ok && res.state.final.report.items.length }; });
    ok(fin.ok && fin.max === 100 && fin.n === 49, 'in-progress record: can be finished and submitted on the full form (49 items, out of 100)');
    ok(!errs.length, 'in-progress record: no console errors' + (errs.length ? ' ' + errs[0] : '')); await ctx.close(); }

  // --- 3. in-progress record that is already past the 90-minute limit: reopening submits it (as before), on the full form
  { const f = FIX('legacy-active'), { ctx, page } = await open(f.localStorage, ls => { const k = 'wwq:wwq-1.0:active', s = JSON.parse(ls[k]), old = new Date(Date.now() - 100 * 60000).toISOString(); s.timing.beganAt = old; s.timing.startedAt = old; ls[k] = JSON.stringify(s); });
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => ({ roster: WWQ.roster, status: WWQ.App.state.session.status, timedOut: WWQ.App.state.session.timedOut, rep: WWQ.App.state.final && WWQ.App.state.final.report }));
    ok(r.roster === 'long' && r.status === 'SUBMITTED' && r.timedOut && r.rep && r.rep.scores.maxPoints === 100, 'over-time record: reopening auto-submits it on the full form, out of 100');
    ok(near(r.rep.scores.earnedPoints, FIX('legacy-active').expected.earned), 'over-time record: keeps exactly the points already earned (' + r.rep.scores.earnedPoints.toFixed(1) + ')'); await ctx.close(); }

  // --- 4. a brand-new device gets the short form and writes only short-form keys
  { const { ctx, page, errs } = await open({});
    const r = await page.evaluate(() => { __T.start('Fresh Student'); WWQ.App.state.student.code = 'FIX'; WWQ.App.save(true); return { roster: WWQ.roster, n: WWQ.ITEMS.length, max: WWQ.Policy.totals(WWQ.App.state).max, ver: WWQ.App.state.assessmentVersion, g: WWQ.CONFIG.timeGuidance }; });
    ok(r.roster === 'short' && r.n === 40 && r.max === 100 && r.ver === 'wwq-1.0-short', 'fresh device: short form (40 items, 100 points, its own version)');
    ok(r.g.targetMinutes === 45 && r.g.rangeMinutes[0] === 40 && r.g.rangeMinutes[1] === 50, 'fresh device: the pacing guide says about 45 minutes (40-50)');
    const keys = Object.keys(await dump(page)); ok(keys.length > 0 && keys.every(k => k.startsWith('wwq:wwq-1.0-short:')), 'fresh device: saves only under the short-form keys (' + keys.join(', ') + ')');
    await page.reload(); await page.waitForSelector('#stage-title');
    const r2 = await page.evaluate(() => ({ roster: WWQ.roster, alias: WWQ.App.state.student.alias, started: WWQ.App.state.progress.started })); ok(r2.roster === 'short' && r2.alias === 'Fresh Student' && r2.started, 'fresh device: reload resumes the same short-form session');
    ok((await page.locator('#form-label').innerText()).startsWith('Short form (40'), 'fresh device: the footer says "Short form (40 graded questions)"');
    ok(!errs.length, 'fresh device: no console errors' + (errs.length ? ' ' + errs[0] : '')); await ctx.close(); }

  // --- 5. teacher forces the short form on a device that has an old record: the old record is kept, not shown, not altered
  { const f = FIX('legacy-submitted'), { ctx, page } = await open(f.localStorage); await ctx.close();
    const ctx2 = await browser.newContext(), p2 = await ctx2.newPage();
    await p2.addInitScript("window.__ROSTER = 'short';"); await p2.addInitScript(BROWSER);
    await p2.addInitScript(([ls]) => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); Object.keys(ls).forEach(k => localStorage.setItem(k, ls[k])); } document.addEventListener('DOMContentLoaded', () => { window.WWQ.CONFIG.backend.url = ''; }); }, [f.localStorage]);
    await p2.goto(URL_); await p2.waitForSelector('#stage-title');
    const r = await p2.evaluate(() => ({ roster: WWQ.roster, status: WWQ.App.state.session.status })); const after = await dump(p2);
    ok(r.roster === 'short' && r.status === 'ACTIVE', "roster 'short' on an old device starts a fresh short-form session");
    ok(after['wwq:wwq-1.0:submitted'] === f.localStorage['wwq:wwq-1.0:submitted'], 'the old submitted record is still in the browser, unchanged'); await ctx2.close(); }

  await browser.close();
  console.log('\n' + passes + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
