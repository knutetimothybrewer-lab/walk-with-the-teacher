#!/usr/bin/env node
/* Plays a whole game in a real browser (Playwright + Chromium) by clicking the UI like students would.
   Usage: node sim/ui-play.js [humans=2] [cpus=2] [years=6] [anim=fast|reduced|normal] [width=1366] [height=768]
   Fails on any page error, console error, or network request.                                        */
const { chromium } = require('playwright');
const path = require('path');
const [H = 2, CP = 2, YEARS = 6, ANIM = 'fast', W = 1366, HT = 768] = process.argv.slice(2).map((v, i) => i === 3 ? v : +v);
const FILE = 'file://' + path.join(__dirname, '..', 'index.html');
require('fs').mkdirSync(path.join(__dirname, 'shots'), { recursive: true });

async function playGame(page, opts = {}) {
  const log = (...a) => { if (process.env.VERBOSE) console.log(...a); };
  let did = { bank: false, loan: false, trade: false, build: false, property: false, glossary: false, why: false, speak: false };
  const start = Date.now();
  const KB = !!opts.keyboard; let kbPresses = 0;
  // keyboard mode: reach the element with Tab only, then press Enter (buttons) or Space (checkboxes/radios)
  const press = async (h) => {
    if (!KB) { await h.click({ timeout: 3000 }); return; }
    const radio = await h.evaluate(e => e.type === 'radio' ? e.name : null);
    if (radio) { // standard radio-group keys: Tab reaches the group, arrow keys pick the option
      for (let k = 0; k < 120; k++) { if (await page.evaluate((n) => document.activeElement && document.activeElement.name === n, radio)) break; await page.keyboard.press('Tab'); kbPresses++; if (k === 119) throw new Error('could not reach radio group by keyboard'); }
      for (let k = 0; k < 6 && !(await h.evaluate(e => e.checked)); k++) await page.keyboard.press('ArrowDown');
      return;
    }
    for (let k = 0; k < 120; k++) {
      if (await h.evaluate(e => e === document.activeElement).catch(() => false)) break;
      await page.keyboard.press('Tab'); kbPresses++;
      if (k === 119) throw new Error('could not reach element by keyboard: ' + await h.evaluate(e => e.outerHTML.slice(0, 120)));
    }
    const tag = await h.evaluate(e => e.tagName + ':' + (e.type || ''));
    await page.keyboard.press(/INPUT:(checkbox|radio)/.test(tag) ? 'Space' : 'Enter');
  };
  for (let i = 0; i < 6000; i++) {
    if (Date.now() - start > (opts.timeout || 600000)) throw new Error('UI game timed out');
    const st = await page.evaluate(() => { const G = window.__DD.G, U = window.__DD.UI; return G ? { stage: G.flow.stage, year: G.flow.year, pending: G.pending ? G.pending.kind : null, human: !!(G.pending && G.players[G.pending.player] && !G.players[G.pending.player].cpu), busy: U.pumping || U.modals.some(m => m.o.fx) || U.fxq.length > 0 || !!document.querySelector('.coach') } : { stage: 'none' }; });
    if (st.stage === 'results' && await page.$('#rsLine')) { st.kbPresses = kbPresses; return st; }
    if (opts.stopAt && !st.busy && opts.stopAt(st)) return st;
    // tutorial coach
    const coach = await page.$('.coach [data-next]'); if (coach) { try { await press(coach); } catch (e) { } continue; }
    const top = await page.$('#modalRoot:not(.hidden) .modal:not(.hidden)');
    if (top) {
      const title = (await top.$eval('h2', e => e.textContent).catch(() => '')) || '';
      log('modal:', title.slice(0, 60));
      const click = async (sel) => { try { const b = await top.$(sel); if (b && await b.isEnabled()) { await press(b); return true; } } catch (e) { if (KB && /keyboard/.test(e.message)) throw e; } return false; };
      if (/choose your path/.test(title)) { await click('.careerCard[data-path="' + ['college', 'trade', 'work'][i % 3] + '"]'); if (i % 2) { const r = await top.$('input[name=home][value=own]'); if (r) await press(r); } await click('text=Why?'); await click('text=Confirm'); continue; }
      if (/is for sale/.test(title)) { if (!did.why) { did.why = true; await click('text=Why?'); } if (!did.speak) { did.speak = true; await click('[data-speak]'); } if (!(await click('.btns button.primary'))) await click('.btns button:nth-child(3)'); continue; }
      if (/Auction:/.test(title)) { if (await click('[data-pass]')) continue; await click('text=End auction now'); await page.waitForTimeout(300); continue; }
      if (/how do you vote/.test(title)) { await click(i % 2 ? '.btns button.go' : '.btns button.danger'); continue; }
      if (/Short on cash/.test(title)) { if (await click('[data-act]')) continue; if (await click('[data-bk="ch13"]')) continue; await click('[data-bk]'); continue; }
      if (/Quick Check/.test(title)) { await click('[data-a]'); await page.waitForTimeout(1300); continue; }
      if (/Trade offer from/.test(title)) { await click('.btns button.go'); continue; }
      if (await top.$('[data-opt]')) { await click('[data-whyb]'); await click('[data-opt]'); continue; }
      if (await top.$('.btns button.primary')) { await click('.btns button.primary'); continue; }
      const any = await top.$$('.btns button'); if (any.length) { try { await press(any[any.length - 1]); } catch (e) { if (KB) throw e; } continue; }
      const x = await top.$('[data-close]'); if (x) { await press(x); continue; }
      await page.waitForTimeout(100); continue;
    }
    if (st.busy) { await page.waitForTimeout(50); continue; }
    const roll = await page.$('#btnRoll'), end = await page.$('#btnEnd');
    if (roll || end) {
      if (KB) {
        if (!did.glossary) { did.glossary = true; await page.keyboard.press('g'); await page.keyboard.type('lien'); await page.keyboard.press('Escape'); continue; }
        // the game puts focus on Roll / End Turn; otherwise use the R / E shortcut keys
        const focused = await page.evaluate(() => document.activeElement && ['btnRoll', 'btnEnd'].includes(document.activeElement.id));
        await page.keyboard.press(focused ? 'Enter' : (roll ? 'r' : 'e')); kbPresses++; await page.waitForTimeout(40); continue;
      }
      // exercise tools on a human turn now and then
      if (!did.bank && st.year >= 2) { did.bank = true; try { await page.click('#sbBank'); await page.click('[data-tab="save"]'); await page.fill('#bAmt', '50'); await page.click('[data-do="deposit"]'); await page.click('[data-tab="ins"]'); const c = await page.$('[data-ins="health"]'); if (c) await c.click(); await page.click('[data-tab="loans"]'); await page.click('[data-do="loan"]').catch(() => {}); did.loan = true; await page.click('[data-tab="life"]'); await page.click('[data-tab="fund"]'); await page.click('.modal .btns button'); } catch (e) { log('bank', e.message); } continue; }
      if (!did.property && st.year >= 2) { did.property = true; try { await page.click('#sbProp'); const b = await page.$('.modal [data-id]'); if (b) await b.click(); const closes = await page.$$('.modal:not(.hidden) .btns button'); if (closes.length) await closes[0].click(); const c2 = await page.$('.modal:not(.hidden) .btns button'); if (c2) await c2.click(); } catch (e) { log('prop', e.message); } continue; }
      if (!did.glossary) { did.glossary = true; try { await page.keyboard.press('g'); await page.fill('#glQ', 'lien'); await page.click('.modal:not(.hidden) .btns button'); } catch (e) { log('gloss', e.message); } continue; }
      if (!did.trade && st.year >= 3 && end) {
        did.trade = true; try { await page.click('#sbTrade'); const to = await page.$('.modal [data-to]'); if (to) { await to.click(); const lot = await page.$('.modal [data-k="get"][data-lot]'); const mine = await page.$('.modal [data-k="give"][data-lot]');
          if (lot || mine) { if (lot) await lot.check(); else await mine.check(); await page.fill('.modal [data-cash="give"]', '20').catch(() => {}); await page.click('text=Send offer'); } else await page.click('.modal:not(.hidden) .btns button'); } } catch (e) { log('trade', e.message); }
        continue;
      }
      try { await (roll || end).click({ timeout: 3000 }); } catch (e) { } await page.waitForTimeout(30); continue;
    }
    await page.waitForTimeout(60);
  }
  await page.screenshot({ path: path.join(__dirname, 'shots', 'ui-play-stuck.png') }); throw new Error('UI game did not finish: ' + JSON.stringify(await page.evaluate(() => { const G = window.__DD.G; return G ? { stage: G.flow.stage, year: G.flow.year, pending: G.pending, ui: { pumping: window.__DD.UI.pumping, modals: window.__DD.UI.modals.length, fxq: window.__DD.UI.fxq.length, sig: window.__DD.UI.promptSig } } : null; })));
}

async function newGame(page, { humans, cpus, years, group, prePost }) {
  await page.click('#stNew');
  await page.fill('#sgName', group);
  // set player count
  const rows = async () => (await page.$$('.prow')).length;
  while (await rows() < humans + cpus) await page.click('#sgAdd');
  while (await rows() > humans + cpus) await page.click('[data-rm="0"]');
  for (let i = 0; i < humans + cpus; i++) {
    const cb = await page.$('[data-cpu="' + i + '"]'); const want = i >= humans;
    if ((await cb.isChecked()) !== want) await cb.click();
    if (i < humans) await page.fill('[data-pn="' + i + '"]', ['Ana', 'Ben', 'Cruz', 'Dee', 'Eli', 'Fay'][i]);
  }
  await page.selectOption('#sgLen', String(years));
  if (!prePost) await page.uncheck('#sgPP');
  await page.click('#sgGo');
  if (prePost) { // answer the pre-check for each human
    for (let k = 0; k < humans; k++) { await page.click('.modal .btns button.primary'); await page.waitForSelector('.modal input[name=q0]'); for (let q = 0; q < 5; q++) await page.check('.modal input[name=q' + q + '][value="' + (q % 3) + '"]'); await page.click('.modal .btns button.primary'); }
  }
}

async function launch(w, h, anim) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  page.on('request', r => { const u = r.url(); if (!/^(file|data|blob|about):/.test(u)) problems.push('network: ' + u); });
  await page.addInitScript((a) => { try { localStorage.setItem('deedndebt:prefs', JSON.stringify({ anim: a, muted: true })); } catch (e) { } }, anim);
  await page.goto(FILE);
  return { browser, page, problems };
}
module.exports = { playGame, newGame, launch, FILE };

if (require.main === module) {
  (async () => {
    const { browser, page, problems } = await launch(W, HT, ANIM);
    const t0 = Date.now();
    await newGame(page, { humans: H, cpus: CP, years: YEARS, group: 'UI Test', prePost: true });
    await playGame(page);
    // post-check and exports on the results page
    await page.click('#rsPost'); for (let k = 0; k < H; k++) { await page.click('.modal .btns button.primary'); await page.waitForSelector('.modal input[name=q0]'); for (let q = 0; q < 5; q++) await page.check('.modal input[name=q' + q + '][value="' + C_ANS[q] + '"]'); await page.click('.modal .btns button.primary'); }
    await page.waitForSelector('#rsLine');
    const ta = await page.$('textarea[data-ref]'); if (ta) { await ta.fill('Because I took a loan to build houses.'); await ta.dispatchEvent('change'); }
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#rsCsv')]);
    const csvPath = path.join(__dirname, 'shots', 'ui-play-log.csv'); await dl.saveAs(csvPath);
    await page.screenshot({ path: path.join(__dirname, 'shots', 'ui-play-results.png'), fullPage: false });
    const summary = await page.evaluate(() => { const G = window.__DD.G; return { year: G.flow.year, turns: G.flow.turnCount, log: G.log.length, post: G.players.map(p => p.checks.post), refl: G.players.map(p => Object.keys(p.reflections).length) }; });
    console.log('Finished UI game in', ((Date.now() - t0) / 1000).toFixed(0), 's', JSON.stringify(summary));
    if (problems.length) { console.log('PROBLEMS:\n' + problems.join('\n')); process.exitCode = 1; } else console.log('No page errors, console errors or network requests.');
    await browser.close();
  })().catch(e => { console.error(e); process.exit(1); });
}
const C_ANS = [1, 2, 0, 2, 2];
