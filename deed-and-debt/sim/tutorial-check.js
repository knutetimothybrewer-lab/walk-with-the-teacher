#!/usr/bin/env node
/* Tutorial check (Playwright + Chromium): a brand-new student sets up a solo game, is sent to the
   tutorial, follows Dex's instructions step by step, finishes, and lands in their game. Then the same
   name starts another game and is NOT asked again; the teacher SKIP override works; a group with a
   new player is asked again for that player only.
   Usage: node sim/tutorial-check.js [anim=fast]                                                    */
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.join(__dirname, '..', 'index.html');
const ANIM = process.argv[2] || 'fast';
const results = []; const record = (n, ok, d) => { results.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + n + (d ? ' - ' + d : '')); };

async function followTutorial(page) {
  const seen = [];
  for (let i = 0; i < 1500; i++) {
    const st = await page.evaluate(() => { const G = window.__DD.G; const t = document.querySelector('#tutor .tutText'); const prog = document.querySelector('#tutor .tutProg');
      return { stage: G && G.flow.stage, text: t ? t.innerText : '', prog: prog ? prog.innerText : '', tut: !!G && !!G.settings.isTutorial, done: !!Array.from(document.querySelectorAll('.modal h2')).find(h => /Tutorial complete/.test(h.textContent)) }; });
    if (st.prog && seen[seen.length - 1] !== st.prog) seen.push(st.prog);
    if (st.done) return seen;
    const click = async (sel) => { try { const b = await page.$(sel); if (b && await b.isVisible() && await b.isEnabled()) { await b.click({ timeout: 2000 }); return true; } } catch (e) { } return false; };
    const top = await page.$('#modalRoot:not(.hidden) .modal:not(.hidden)');
    const title = top ? ((await top.$eval('h2', e => e.textContent).catch(() => '')) || '') : '';
    if (/Put \$50/.test(st.text)) { await click('#modalRoot [data-set="50"]'); await click('#modalRoot [data-do="deposit"]'); await page.waitForTimeout(150); continue; }
    if (/Close the Bank/.test(st.text)) { await click('#modalRoot .tools [data-close]'); continue; }
    if (/Open 🏦 Bank/.test(st.text) && !top) { await click('#sbBank'); continue; }
    if (top) {
      if (/choose your path/.test(title)) { await click('.careerCard[data-path="trade"]'); await click('#modalRoot .btns button:first-child'); await click('#modalRoot .btns button.primary'); continue; }
      if (/is for sale/.test(title)) { await click('#modalRoot .btns button:first-child'); await click('#modalRoot .btns button.primary'); continue; }
      if (/how do you vote/.test(title)) { await click('#modalRoot .btns button.go'); continue; }
      if (await page.$('#modalRoot [data-opt]')) { await click('#modalRoot [data-whyb]'); await click('#modalRoot [data-opt="pass"]') || await click('#modalRoot [data-opt]'); continue; }
      if (await click('#modalRoot .modal:not(.hidden) .btns button.primary')) continue;
      await page.waitForTimeout(80); continue;
    }
    if (await click('#tutNext')) continue;
    const busy = await page.evaluate(() => window.__DD.UI.pumping || window.__DD.UI.fxq.length > 0);
    if (busy) { await page.waitForTimeout(80); continue; }
    if (/Roll/.test(st.text) && await click('#btnRoll')) continue;
    if (/End Turn/.test(st.text) && await click('#btnEnd')) continue;
    await page.waitForTimeout(80);
  }
  throw new Error('tutorial did not finish');
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } }); await ctx.setOffline(true);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript((a) => { if (!localStorage.getItem('deedndebt:prefs')) localStorage.setItem('deedndebt:prefs', JSON.stringify({ anim: a, muted: true })); }, ANIM);
  await page.goto(FILE); await page.waitForSelector('#stSolo');

  // 1. a new player is sent to the tutorial
  await page.click('#stSolo'); await page.click('[data-theme="copper"]'); await page.fill('#soloName', 'Nova'); await page.click('details summary'); await page.selectOption('#sgLen', '3'); await page.uncheck('#sgPP'); await page.click('#sgGo');
  await page.waitForSelector('.modal h2'); const gateTitle = await page.textContent('.modal h2');
  record('New player is asked to do the tutorial', /Tutorial time/.test(gateTitle), gateTitle.trim());
  await page.click('text=🎓 Start the tutorial'); await page.waitForTimeout(500);
  const town = await page.evaluate(() => document.querySelector('#center .sub').textContent);
  const t0 = Date.now();
  let steps = [];
  try { steps = await followTutorial(page); } catch (e) { await page.screenshot({ path: path.join(__dirname, 'shots', 'tutorial-fail.png') }); record('Tutorial can be completed', false, e.message); }
  if (steps.length) record('Tutorial can be completed step by step', steps.length >= 18, steps.length + ' steps shown, in the ' + town + ' theme, in ' + ((Date.now() - t0) / 1000).toFixed(0) + 's (automated, ' + ANIM + ' animations)');
  await page.screenshot({ path: path.join(__dirname, 'shots', 'tutorial-complete.png') });

  // 2. finishing starts the real game
  await page.click('text=Start my game ▶'); await page.waitForTimeout(800);
  const g = await page.evaluate(() => { const G = window.__DD.G; return G && { tut: !!G.settings.isTutorial, years: G.settings.years, players: G.players.map(p => p.name), theme: G.settings.theme, coach: G.settings.tutorial }; });
  record('After the tutorial, the student\'s own game starts', g && !g.tut && g.years === 3 && g.players[0] === 'Nova' && g.theme === 'copper', JSON.stringify(g));
  const saves = await page.evaluate(() => window.__DD.listSaves().map(x => x.s.groupName));
  record('The tutorial practice game is not saved', !saves.includes('Tutorial'), 'saves: ' + JSON.stringify(saves));

  // 3. the same name is not asked again
  await page.evaluate(() => window.__DD.exitToMenu()); await page.waitForSelector('#stSolo');
  await page.click('#stSolo'); await page.fill('#soloName', 'nova'); await page.click('details summary'); await page.uncheck('#sgPP'); await page.click('#sgGo'); await page.waitForTimeout(700);
  const asked = await page.evaluate(() => Array.from(document.querySelectorAll('.modal h2')).some(h => /Tutorial time/.test(h.textContent)));
  const inGame = await page.evaluate(() => !!window.__DD.G && !window.__DD.G.settings.isTutorial);
  if (!inGame) { const rep = await page.$('text=Replace it'); if (rep) await rep.click(); await page.waitForTimeout(600); }
  record('A player who finished the tutorial is not asked again', !asked, 'asked again: ' + asked);

  // 4. group with one new player: only the new player is named; teacher SKIP works
  await page.evaluate(() => window.__DD.exitToMenu());
  try { await page.waitForSelector('#stNew', { timeout: 8000 }); } catch (e) { await page.screenshot({ path: path.join(__dirname, 'shots', 'tutorial-fail.png') }); console.log('DEBUG', JSON.stringify(await page.evaluate(() => ({ screens: document.querySelector('#screens').innerHTML.slice(0, 200), modals: Array.from(document.querySelectorAll('.modal h2')).map(h => h.textContent), G: !!window.__DD.G }))), errs); throw e; }
  await page.click('#stNew'); await page.fill('#sgName', 'Table 9'); await page.fill('[data-pn="0"]', 'Nova'); await page.fill('[data-pn="1"]', 'Remy'); await page.uncheck('#sgPP'); await page.click('#sgGo');
  await page.waitForSelector('.modal h2'); const gateText = await page.textContent('.modal .body');
  record('In a group, only new players are named', /Remy/.test(gateText) && !/Nova/.test(gateText), gateText.replace(/\s+/g, ' ').slice(0, 90));
  await page.click('text=Teacher: skip the tutorial'); await page.fill('#tutSkipTxt', 'SKIP'); await page.click('#tutSkipBtn'); await page.waitForTimeout(700);
  const g2 = await page.evaluate(() => window.__DD.G && { tut: !!window.__DD.G.settings.isTutorial, group: window.__DD.G.groupName });
  record('Teacher SKIP override starts the game', g2 && !g2.tut && g2.group === 'Table 9', JSON.stringify(g2));

  // 5. teacher can turn the requirement off
  await page.evaluate(() => window.__DD.exitToMenu()); await page.waitForSelector('#stNew');
  await page.click('#stNew'); await page.uncheck('#sgTutReq'); await page.fill('#sgName', 'Table 10'); await page.fill('[data-pn="0"]', 'Zed'); await page.fill('[data-pn="1"]', 'Quinn'); await page.uncheck('#sgPP'); await page.click('#sgGo'); await page.waitForTimeout(700);
  const g3 = await page.evaluate(() => window.__DD.G && window.__DD.G.groupName);
  record('Teacher setting "New players must do the tutorial" can be turned off', g3 === 'Table 10', 'game started: ' + g3);

  record('No page errors or console errors', errs.length === 0, errs.join(' | '));
  await browser.close();
  console.log(results.every(Boolean) ? 'ALL TUTORIAL CHECKS PASSED' : 'TUTORIAL CHECKS FAILED');
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
