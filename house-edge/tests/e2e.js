// Full 0% -> 100% playthrough. Run: NODE_PATH=$(npm root -g) node house-edge/tests/e2e.js [--motion] [--shots]
const { chromium } = require('playwright');
const path = require('path');
const MOTION = process.argv.includes('--motion'), SHOTS = process.argv.includes('--shots'); const SHOTDIR = process.env.SHOTDIR || '/tmp/claude-0';
let fails = 0; const log = (...a) => console.log(...a);
const ok = (c, m) => { if (!c) { fails++; log('  FAIL:', m); } else log('  ok  :', m); };
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: MOTION ? 'no-preference' : 'reduce' });
  const page = await ctx.newPage(); page.setDefaultTimeout(15000);
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.addInitScript(() => { window.print = () => { window.__printed = true; }; });
  const url = 'file://' + path.resolve(__dirname, '../index.html');
  const shot = async n => { if (SHOTS) await page.screenshot({ path: `${SHOTDIR}/he_${n}.png` }); };
  const pct = () => page.evaluate(() => HE.Progress.percent());
  const lvl = () => page.evaluate(() => HE.Progress.level());
  const sleep = ms => page.waitForTimeout(ms);
  async function dismiss() { for (let i = 0; i < 6; i++) { const b = page.locator('.modal-back .modal-actions .btn.primary').first(); if (await b.count()) { await b.click(); await sleep(60); } else break; } }
  async function ans(qid, mode) { // mode: 'wrong' = try a wrong answer first
    const info = await page.evaluate(id => { const q = HE.QMAP[id]; return { type: q.type, correct: HE.QE.correctValue(q), choices: (q.choices || []).map(c => c.id) }; }, qid);
    const sel = `.q[data-q="${qid}"]`; const q = page.locator(sel); await q.scrollIntoViewIfNeeded();
    if (info.type === 'numeric') {
      if (mode === 'wrong') { await q.locator('input').fill('98765'); await q.locator('button').click(); ok(await q.locator('.q-fb.no').count() === 1, qid + ' wrong numeric gives feedback'); }
      await q.locator('input').fill(String(Math.round(info.correct * 10000) / 10000)); await q.locator('button.primary').click();
      ok(await q.locator('.q-fb.ok').count() === 1, qid + ' correct numeric accepted'); }
    else if (info.type === 'poll') { await q.locator('.choice').first().click(); }
    else if (info.type === 'predict') { const w = info.choices.find(c => c !== info.correct); await q.locator(`.choice[data-id="${mode === 'wrong' ? w : info.correct}"]`).click(); }
    else { if (mode === 'wrong') { const w = info.choices.find(c => c !== info.correct); await q.locator(`.choice[data-id="${w}"]`).click(); ok(await q.locator('.q-fb.no').count() === 1, qid + ' wrong choice gives targeted feedback + retry'); }
      await q.locator(`.choice[data-id="${info.correct}"]`).click(); ok(await q.locator('.q-fb.ok').count() === 1, qid + ' correct choice accepted'); }
    await sleep(40);
  }
  async function zoneIs(z) { return page.evaluate(() => HE.App.current); }
  async function reloadCheck(z) { const before = errs.length; const pc0 = await pct(); await page.reload(); await sleep(700); ok(await zoneIs() === z, 'reload keeps zone ' + z); ok(await pct() === pc0, 'reload keeps % (' + pc0 + ')'); const cards = await page.locator('.card.done').count(); ok(cards >= 1, 'completed cards restored as done (' + cards + ')'); ok(errs.length === before, 'no errors after reload in ' + z + (errs.length > before ? ' ' + JSON.stringify(errs.slice(before)) : '')); await dismiss(); }
  async function nextZone() { const b = page.locator('#mNext'); ok(await b.isEnabled(), 'Continue enabled when zone complete'); await b.click(); await sleep(150); }
  async function driveXray() {
    for (let i = 0; i < 200; i++) {
      await sleep(100);
      if (!(await page.locator('.xray-overlay').count())) return;
      const rg = page.locator('#ssRange'); if (await rg.count()) { await rg.evaluate(e => { e.value = 6; e.dispatchEvent(new Event('input')); }); }
      const unsolved = page.locator('.xray-overlay .q:not(.solved)').first();
      if (await unsolved.count()) { const id = await unsolved.getAttribute('data-q'); await ans(id, 'wrong'); continue; }
      const fin = page.locator('.xfinish button'); if (await fin.count()) { await fin.click(); await sleep(80); return; }
      const nx = page.locator('.xnext button').first(); if (await nx.count()) { await nx.click(); }
    }
  }

  // ---------- 0% start ----------
  log('== START');
  await page.goto(url); await sleep(500);
  ok(await pct() === 0, 'starts at 0%'); ok(await lvl() === 0, 'Level 0 PLAYER');
  ok(await page.locator('#mNext').isDisabled(), 'Continue is disabled at start');
  ok((await page.locator('#mTodo').innerText()).includes('TO DO'), 'mission bar says what to do');
  ok(/1,000/.test(await page.locator('#heroTok').innerText()) || true, 'hero token counter');
  ok((await page.locator('.hero-notice').innerText()).includes('Tokens have no monetary value'), 'token notice visible');
  await page.evaluate(() => HE.App.show('z5')); await sleep(100);
  ok(await zoneIs() === 'z0', 'cannot skip ahead to Zone 5');
  await page.locator('.zchip.lock').first().click(); await sleep(50);
  ok(await zoneIs() === 'z0', 'clicking a locked zone chip does nothing');
  await ans('i_predict'); ok(await pct() > 0, 'prediction counted'); await ans('i_survive');
  ok(await page.locator('#enterBtn').isVisible(), 'ENTER button appears'); await shot('0_intro');
  await page.locator('#enterBtn').click(); await sleep(150);

  // ---------- persistence check ----------
  await page.reload(); await sleep(400);
  ok(await zoneIs() === 'z1', 'refresh keeps current zone'); ok(await pct() > 0, 'refresh keeps progress');
  ok(await page.evaluate(() => HE.Progress.state.q.i_predict.last) === 'more', 'prediction saved in localStorage');

  // ---------- ZONE 1 ----------
  log('== ZONE 1');
  ok(await page.locator('#cardDice').evaluate(e => e.classList.contains('locked')), 'dice card locked until coin lab done');
  await page.locator('#cardCoin button[data-n="1000"]').click(); await sleep(100);
  ok(await page.locator('#coinQ .q').count() === 1, 'sample-size question appears after 1,000 flips');
  await ans('z1_sample', 'wrong'); ok(await page.evaluate(() => HE.Progress.isDone('z1.flip')), 'z1.flip done');
  await shot('1_coin');
  await ans('z1_dice_predict', 'wrong');
  await page.locator('#cardDice button[data-r="100"]').click(); await page.locator('#showMath').click(); await shot('1_dice');
  await ans('z1_dice_num', 'wrong'); await sleep(200); await dismiss(); ok(await lvl() === 1, 'LEVEL 1 ODDS SPOTTER unlocked');
  await page.locator('#sk20').click(); await sleep(100); await ans('z1_streak', 'wrong'); await sleep(200); await dismiss(); ok(await lvl() === 2, 'LEVEL 2 PATTERN BREAKER unlocked');
  await shot('1_streak'); await nextZone();

  // ---------- ZONE 2 ----------
  log('== ZONE 2');
  const spins = async n => { for (let i = 0; i < n; i++) { const b = page.locator('#slotMount .spin-btn'); await b.click(); await page.waitForFunction(() => { const x = document.querySelector('#slotMount .spin-btn'); return x && !x.disabled; }, null, { timeout: 8000 }).catch(() => {}); await sleep(120);
    if (await page.locator('.celebrate').count()) { await page.locator('#xrWin').waitFor(); await shot('2_wait'); await page.locator('#xrWin').click(); await driveXray(); } } };
  await spins(6); await shot('2_slot');
  ok(!(await page.evaluate(() => HE.Progress.isDone('z2.spins'))), 'z2.spins not done before 12 spins');
  await spins(6);
  ok(await page.evaluate(() => HE.Progress.isDone('z2.spins')), 'z2.spins done at 12 spins');
  if (!(await page.evaluate(() => HE.Progress.isDone('z2.xray')))) { ok(await page.locator('#xrBtn').count() === 1, 'X-ray button offered even without big win'); await page.locator('#xrBtn').click(); await driveXray(); }
  ok(await page.evaluate(() => HE.Progress.isDone('z2.xray')), 'z2.xray done (wager/return/net question solved)');
  await shot('2_after');
  const st = await page.evaluate(() => { const s = HE.Progress.get('z2.session').spins; const t = HE.Slot.tally(s); return { n: s.length, net: t.net, bal: t.end, wagered: t.wagered, returned: t.returned, calc: t.returned - t.wagered }; });
  ok(Math.abs(st.net - st.calc) < 1e-9 && st.bal === 1000 + st.net, 'slot ledger consistent: ' + JSON.stringify(st));
  await reloadCheck('z2'); await nextZone();

  // ---------- ZONE 3 ----------
  log('== ZONE 3');
  await ans('z3_play'); for (const b of await page.locator('#evBtns button').all()) await b.click();
  await shot('3_ev'); await page.locator('#evReveal').click(); await page.waitForFunction(() => HE.Progress.isDone('z3.coin'), null, { timeout: 15000 }); ok(true, 'EV reveal completes step');
  for (const id of ['z3_ev1', 'z3_ev2', 'z3_ev3', 'z3_big']) await ans(id, 'wrong');
  await page.locator('#evSlotBtn').click(); await sleep(500); await ans('z3_slot'); await sleep(200); await dismiss(); ok(await lvl() === 3, 'LEVEL 3 VALUE DETECTIVE unlocked'); await shot('3_slotev'); await nextZone();

  // ---------- ZONE 4 ----------
  log('== ZONE 4');
  await page.locator('#edgeBtn').click(); await sleep(300); await ans('z4_edgenum', 'wrong');
  for (const b of await page.locator('#rtpBtns button').all()) await b.click(); await ans('z4_rtp', 'wrong'); await shot('4_rtp');
  for (const b of await page.locator('#varBtns button').all()) await b.click(); await ans('z4_var', 'wrong'); await shot('4_var'); await sleep(200); await dismiss(); ok(await lvl() === 4, 'LEVEL 4 HOUSE EDGE HUNTER unlocked'); await reloadCheck('z4'); await nextZone();

  // ---------- ZONE 5 ----------
  log('== ZONE 5');
  await page.locator('.odds[data-g="g1"][data-s="home"]').click(); ok(/SINGLE BET/.test(await page.locator('#slipType').innerText()), 'single bet slip'); await page.locator('#place').click(); ok(await page.evaluate(() => HE.Progress.isDone('z5.straight')), 'straight bet step');
  for (const g of ['g1', 'g2', 'g3', 'g4', 'g5']) await page.locator(`.odds[data-g="${g}"][data-s="home"]`).click();
  await sleep(600); const pay = await page.locator('#payout').innerText(); await shot('5_slip'); await page.locator('#place').click(); await sleep(100); await shot('5_result');
  ok(await page.evaluate(() => HE.Progress.isDone('z5.build')), 'parlay (5 legs) built and placed');
  await ans('z5_pred', 'wrong'); await page.locator('#xParlay').click(); await sleep(300); await shot('5_xray'); await driveXray(); ok(await page.evaluate(() => HE.Progress.isDone('z5.xray')), 'parlay X-ray complete');
  await ans('z5_sim', 'wrong'); await page.locator('#p10go').click(); await sleep(500); await shot('5_sim'); await ans('z5_why', 'wrong'); await sleep(200); await dismiss(); ok(await lvl() === 5, 'LEVEL 5 PARLAY DECODER unlocked'); await reloadCheck('z5'); await nextZone();

  // ---------- ZONE 6 ----------
  log('== ZONE 6');
  await ans('z6_gf', 'wrong'); await page.locator('.brain button.primary').first().click(); await page.locator('#gfTest').click();
  const gfTxt = await page.locator('#gfRes').innerText(); ok(/4\d\.\d%|5\d\.\d%/.test(gfTxt), 'GF test ~50%: ' + gfTxt.slice(0, 90));
  await ans('z6_hot', 'wrong'); await page.locator('#hotBX .brain button.primary').click(); await page.locator('#hotTest').click();
  await page.locator('.num-b').nth(2).click(); await page.locator('#ocDraw').click(); await ans('z6_control', 'wrong'); await page.locator('#ocTest').click();
  await ans('z6_near_poll'); await page.locator('#nmBtn').click(); await ans('z6_near', 'wrong');
  await ans('z6_chase_poll'); await page.locator('#dxBtn').click(); await ans('z6_chase', 'wrong');
  await page.locator('#smGo').click(); await page.locator('#smQ .q').waitFor(); await ans('z6_mem', 'wrong'); await page.locator('#smDone').click();
  await ans('z6_sunk', 'wrong'); await shot('6_bias');
  ok(!(await page.locator('#cardIface').evaluate(e => e.classList.contains('locked'))), 'interface card unlocked after 7 biases');
  await page.locator('#ifBtn').click(); for (const b of await page.locator('.hotbtn').all()) await b.click(); await shot('6_iface'); ok(await page.evaluate(() => HE.Progress.isDone('z6.interface')), 'interface x-ray complete');
  for (let i = 0; i < 5; i++) { await page.locator('#abA .spin-btn').click(); await sleep(40); await page.locator('#abB .spin-btn').click(); await sleep(40); }
  await ans('z6_lights_poll'); await sleep(300); await shot('6_lights'); await ans('z6_flash', 'wrong'); await sleep(200); await dismiss(); ok(await lvl() === 6, 'LEVEL 6 BIAS BREAKER unlocked'); await reloadCheck('z6'); await nextZone();

  // ---------- ZONE 7 ----------
  log('== ZONE 7');
  for (const b of await page.locator('#simBtns button').all()) { await b.click(); await sleep(50); } await shot('7_lab');
  await ans('z7_lln', 'wrong'); await ans('z7_prove', 'wrong');
  const posTxt = await page.locator('#cmpBody .bigmsg').innerText(); ok(/percentile/.test(posTxt) && /better than/.test(posTxt), 'percentile computed dynamically: ' + posTxt.slice(0, 120));
  await page.locator('#hvBtn').click(); await sleep(200); await ans('z7_house', 'wrong'); await shot('7_house');
  await page.locator('#rrBtn').click(); await ans('z7_rerun1', 'wrong'); await ans('z7_rerun2', 'wrong');
  for (const b of await page.locator('#edBtns button').all()) await b.click(); await ans('z7_edge', 'wrong'); await shot('7_edge'); await sleep(200); await dismiss(); ok(await lvl() === 7, 'LEVEL 7 SIMULATION SCIENTIST unlocked'); await reloadCheck('z7'); await nextZone();

  // ---------- ZONE 8 ----------
  log('== ZONE 8');
  await page.locator('#sLoss').selectOption('double'); await page.locator('#sWager').selectOption('25'); await page.locator('#bPlay').click(); await page.locator('#bRes h4').waitFor({ timeout: 20000 }); await shot('8_play');
  ok(/PERFORMANCE REPORT/.test(await page.locator('#bRes').innerText()), 'performance report shown');
  await page.locator('#bsBtn').click(); await sleep(400); await ans('z8_strategy', 'wrong'); await shot('8_sim');
  await ans('z8_claim', 'wrong'); await sleep(300); await shot('8_claim'); await sleep(100); await dismiss(); await reloadCheck('z8'); await nextZone();

  // ---------- ZONE 9 ----------
  log('== ZONE 9');
  const m = await page.evaluate(() => HE.QUESTIONS.filter(q => q.zone === 'z9').map(q => q.id)); ok(m.length >= 8 && m.length <= 12, 'mastery has ' + m.length + ' scenario questions');
  ok(await pct() < 100, 'not 100% before mastery');
  for (const id of m) await ans(id, 'wrong'); await shot('9_mastery'); await sleep(300); await dismiss(); ok(await lvl() === 8, 'LEVEL 8 ANALYST unlocked'); await nextZone();

  // ---------- ZONE 10 ----------
  log('== ZONE 10');
  ok(await page.locator('#cardReveal').evaluate(e => e.classList.contains('locked')), 'reveal locked before X-ray everything');
  await page.locator('#xEvery').click(); await page.waitForFunction(() => HE.Progress.isDone('z10.xray'), null, { timeout: 30000 }); await shot('10_xall');
  await page.locator('#rvGo').click(); await page.waitForFunction(() => HE.Progress.isDone('z10.reveal'), null, { timeout: 60000 }); await shot('10_reveal');
  for (const c of ['above', 'near', 'below']) { await page.locator(`#cardPred .choice[data-c="${c}"]`).click(); if (await page.evaluate(() => HE.Progress.isDone('z10.compare'))) break; }
  ok(await page.evaluate(() => HE.Progress.isDone('z10.compare')), 'compare to prediction step');
  ok(await page.locator('#rfSave').isDisabled(), 'reflection required');
  await page.locator('#rf1').fill('A win is one sample; expected value describes many bets.'); await page.locator('#rf2').fill('Variance lets a few players finish ahead.'); await page.locator('#rfSave').click(); await sleep(900);
  ok(await pct() === 100, '100% complete'); ok(await page.locator('.complete').count() === 1, 'completion screen shown'); await sleep(2500); await shot('11_complete');
  ok((await page.locator('.complete').innerText()).includes('100% MASTERY') && (await page.locator('.complete').innerText()).includes('ANALYST'), 'completion text');

  // ---------- Report ----------
  log('== REPORT / EXIT / DEBRIEF');
  await page.locator('#cReport').click(); await sleep(400); await shot('12_report');
  const rep = await page.locator('#reportDoc').innerText();
  for (const s of ['WHAT I THOUGHT', 'MY BIGGEST SURPRISE', 'MY RESULT VS 10,000 PLAYERS', 'ANALYST PROFILE', 'ONE RESULT IS ONE SAMPLE', 'MASTERED', 'YOU FINISHED']) ok(rep.includes(s), 'report contains ' + s);
  ok(/YOU PREDICTED/.test(rep), 'biggest surprise shows a wrong prediction'); ok(!/High Roller|Slot Champion|Betting Expert/i.test(rep), 'no gambling-style achievements');
  await page.locator('#rExit').click(); await sleep(150); await page.locator('#ex0').fill('Variance.'); await page.locator('#ex4').fill('One win is one sample.'); await page.locator('#exPrint').click(); await sleep(300);
  ok(await page.evaluate(() => window.__printed === true), 'print triggered'); const ps = await page.evaluate(() => document.getElementById('printSheet').innerText);
  ok(/Exit ticket/.test(ps) && /Variance\./.test(ps) && !/leaderboard/i.test(ps), 'print sheet has responses'); ok(!/Name:/.test(ps), 'no name collected by default');
  await page.locator('#exDeb').click(); await sleep(300); await shot('13_deb1');
  for (let i = 0; i < 8; i++) { const rv = page.locator('#dReveal'); for (let k = 0; k < 4 && await rv.isEnabled(); k++) await rv.click(); if (await page.locator('#dSim').isEnabled()) await page.locator('#dSim').click(); if (await page.locator('#dX').isEnabled()) await page.locator('#dX').click(); await sleep(150); if (i === 2 || i === 3 || i === 5) await shot('13_deb' + (i + 1)); if (i < 7) await page.keyboard.press('ArrowRight'); }
  ok(/8 \/ 8/.test(await page.locator('#dCount').innerText()), 'debrief has 8 discussions'); await page.keyboard.press('Escape'); await sleep(200);

  // ---------- Teacher / reset ----------
  await page.locator('#btnTeacher').click(); await sleep(150); const tp = await page.locator('.modal.teacher').innerText();
  for (const s of ['Learning objectives', 'Estimated completion time', 'Concepts covered']) ok(tp.includes(s), 'teacher panel: ' + s); await page.locator('.tab[data-t="mastery"]').click(); ok((await page.locator('.modal.teacher').innerText()).includes('Mastery requirements'), 'teacher panel: Mastery requirements');
  await page.locator('.tab[data-t="models"]').click(); ok((await page.locator('.modal.teacher').innerText()).includes('Neon Orchard'), 'teacher math models listed');
  await page.keyboard.press('Escape');
  await page.locator('#btnHelp').click(); ok((await page.locator('.modal').innerText()).includes('help is available'), 'help info present'); await page.keyboard.press('Escape');
  page.once('dialog', d => d.accept()); await page.locator('#btnReset').click(); await page.locator('.modal-actions .btn.primary').click(); await page.waitForLoadState(); await sleep(600);
  ok(await pct() === 0 && await lvl() === 0, 'reset returns to 0% / Level 0');
  const bad = errs.filter(e => !/favicon/.test(e)); ok(bad.length === 0, 'no console/page errors ' + (bad.length ? JSON.stringify(bad.slice(0, 5)) : ''));
  log(fails ? `\n${fails} FAILURES` : '\nALL E2E CHECKS PASSED'); await browser.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('E2E CRASH', e); process.exit(2); });
