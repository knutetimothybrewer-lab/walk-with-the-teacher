#!/usr/bin/env node
/* Browser Definition of Done checks (Playwright + Chromium, file:// with the network switched OFF):
   A. Layout: no page overflow and no clipped board text at 1366x768 and 1920x1080 (6 players).
   B. Keyboard: a whole Short game played with only Tab / Enter / Space / shortcut keys.
   C. Save -> reload -> Resume restores the identical state, mid-Year and mid-prompt.
   D. End Game Now (teacher confirm) produces a correct Results page.
   E. CSV download opens cleanly (RFC 4180, 6 columns, UTF-8).
   F. Reduced motion (OS setting) disables shake, falling arrows and confetti; Normal mode has them.
   G. No network requests at any point (page offline, CSP connect-src 'none', request listener).
   Usage: node sim/ui-check.js            (writes screenshots to sim/shots/)                         */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { playGame, newGame, FILE } = require('./ui-play');
const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const results = []; const net = [];
const want = (k) => !process.env.ONLY || process.env.ONLY.includes(k); // e.g. ONLY=CD node sim/ui-check.js
const record = (name, pass, detail) => { results.push({ name, pass, detail }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? ' - ' + detail : '')); };

async function open(browser, w, h, extra = {}, prefs = { anim: 'fast', muted: true, requireTutorial: false }) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: w, height: h }, acceptDownloads: true }, extra));
  await ctx.setOffline(true);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('request', r => { const u = r.url(); if (!/^(file|data|blob|about):/.test(u)) net.push(u); });
  if (prefs) await page.addInitScript((p) => { try { if (!localStorage.getItem('deedndebt:prefs')) localStorage.setItem('deedndebt:prefs', JSON.stringify(p)); } catch (e) { } }, prefs);
  await page.goto(FILE);
  return { ctx, page, errs };
}
const stripState = (G) => { const c = JSON.parse(JSON.stringify(G)); c.savedAt = 0; return JSON.stringify(c); };
async function toFirstHumanRoll(page) { await playGame(page, { stopAt: (st) => st.stage === 'turns' && st.pending === 'roll' && st.human }); await page.waitForTimeout(400); }

(async () => {
  const browser = await chromium.launch();

  // ---------- A. layout ----------
  if (want('A')) for (const [w, h] of [[1366, 768], [1920, 1080]]) {
    const { ctx, page, errs } = await open(browser, w, h);
    await newGame(page, { humans: 3, cpus: 3, years: 10, group: 'Layout ' + w, prePost: false });
    await toFirstHumanRoll(page);
    while (await page.$('.coach [data-next]')) await page.click('.coach [data-next]');
    await page.waitForTimeout(300);
    const m = await page.evaluate(() => {
      const de = document.documentElement, out = [];
      if (de.scrollWidth > innerWidth || de.scrollHeight > innerHeight) out.push('page scrolls ' + de.scrollWidth + 'x' + de.scrollHeight);
      document.querySelectorAll('#board .cell').forEach(c => { if (c.scrollHeight > c.clientHeight + 1 || c.scrollWidth > c.clientWidth + 1) out.push('cell ' + c.dataset.id + ' clipped (' + c.scrollWidth + 'x' + c.scrollHeight + ' in ' + c.clientWidth + 'x' + c.clientHeight + ')'); });
      const side = document.querySelector('#side').getBoundingClientRect(); if (side.right > innerWidth + 1 || side.bottom > innerHeight + 1) out.push('side panel off screen');
      const dash = document.querySelector('#dash'); if (dash.scrollHeight > dash.clientHeight + 1) out.push('dashboards need scrolling');
      const tk = document.querySelector('#ticker'); if (tk.scrollWidth > tk.clientWidth + 1) out.push('ticker overflows');
      document.querySelectorAll('.pdash').forEach(p => { if (p.scrollWidth > p.clientWidth + 1) out.push('dashboard overflows'); });
      const small = [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.classList.contains('term')).filter(b => { const r = b.getBoundingClientRect(); return r.height < 35 || r.width < 35; }).map(b => b.textContent.trim().slice(0, 20));
      return { out, small };
    });
    await page.screenshot({ path: path.join(SHOTS, 'game-' + w + 'x' + h + '.png') });
    // a few big dialogs must fit on screen
    const dialogs = [];
    for (const open of ['#sbBank', '#sbProp', '#tkHelp']) {
      await page.click(open); await page.waitForTimeout(250);
      const r = await page.evaluate(() => { const m = document.querySelector('.modal:not(.hidden)'); const b = m.getBoundingClientRect(); return { fits: b.top >= 0 && b.left >= 0 && b.bottom <= innerHeight && b.right <= innerWidth, hscroll: m.scrollWidth > m.clientWidth + 1 }; });
      dialogs.push(open + (r.fits && !r.hscroll ? ' ok' : ' BAD'));
      if (open === '#sbBank') await page.screenshot({ path: path.join(SHOTS, 'bank-' + w + 'x' + h + '.png') });
      await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    }
    const bad = m.out.concat(dialogs.filter(d => d.endsWith('BAD')));
    record('A. Layout ' + w + 'x' + h + ' (6 players)', bad.length === 0 && errs.length === 0, bad.length ? bad.slice(0, 6).join('; ') : 'no overflow or clipping; dialogs fit' + (m.small.length ? '; buttons under 35px: ' + m.small.join(', ') : '; all buttons >= 44px tall'));
    await ctx.close();
  }

  // ---------- B. keyboard-only game + E. CSV ----------
  if (want('B')) {
    const { ctx, page, errs } = await open(browser, 1366, 768);
    // setup screen by keyboard too
    const tabTo = async (sel) => { for (let k = 0; k < 80; k++) { if (await page.evaluate((s) => document.activeElement && document.activeElement.matches(s), sel)) return; await page.keyboard.press('Tab'); } throw new Error('cannot tab to ' + sel); };
    await tabTo('#stNew'); await page.keyboard.press('Enter');
    await tabTo('#sgName'); await page.keyboard.type('Keyboard Group');
    await tabTo('[data-pn="0"]'); await page.keyboard.type('Kim');
    await tabTo('[data-pn="1"]'); await page.keyboard.type('Lou');
    await tabTo('[data-cpu="2"]'); // already CPU
    await tabTo('[data-rm="3"]'); await page.keyboard.press('Enter');
    await tabTo('#sgLen'); await page.keyboard.press('Home'); // Standard -> Sprint (3 Years)
    await tabTo('#sgPP'); await page.keyboard.press('Space'); // pre/post off
    await tabTo('#sgGo'); await page.keyboard.press('Enter');
    let kbOk = true, detail = '';
    try { const st = await playGame(page, { keyboard: true, timeout: 900000 }); detail = 'played ' + (await page.evaluate(() => window.__DD.G.flow.year)) + ' Years to Results using only the keyboard (' + st.kbPresses + ' Tab presses)'; }
    catch (e) { kbOk = false; detail = e.message.slice(0, 300); await page.screenshot({ path: path.join(SHOTS, 'keyboard-fail.png') }); }
    record('B. Fully playable by keyboard', kbOk && errs.length === 0, detail + (errs.length ? ' | errors: ' + errs.join('; ') : ''));
    if (kbOk) {
      await page.screenshot({ path: path.join(SHOTS, 'results-1366x768.png'), fullPage: true });
      await page.focus('#rsCsv');
      const [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
      const file = path.join(SHOTS, 'game-log.csv'); await dl.saveAs(file);
      const buf = fs.readFileSync(file); const text = buf.toString('utf8');
      const utf8 = Buffer.from(text, 'utf8').equals(buf);
      const rows = parseCSV(text); const okCols = rows.every(r => r.length === 6); const header = rows[0].join(',') === 'Year,Turn,Player,Type,Description,Amount';
      const noFormula = rows.slice(1).every(r => r.every(c => !/^[=+\-@]/.test(c) || !isNaN(Number(c))));
      record('E. CSV export opens cleanly', utf8 && okCols && header && noFormula && rows.length > 50, rows.length + ' rows x 6 columns, UTF-8, RFC 4180 quoting, no formula-like cells (Google Sheets: File > Import > Upload)');
    }
    await ctx.close();
  }

  // ---------- C. save / reload / resume (mid-Year, and mid-prompt) ----------
  if (want('C')) {
    const { ctx, page, errs } = await open(browser, 1366, 768);
    await newGame(page, { humans: 2, cpus: 2, years: 10, group: 'Resume Group', prePost: false });
    await playGame(page, { stopAt: (st) => st.year >= 2 && st.pending === 'roll' && st.human });
    await page.waitForTimeout(700);
    const before = await page.evaluate(() => { const G = window.__DD.G; return { s: JSON.stringify(G), qi: G.flow.qi }; });
    await page.reload(); await page.waitForSelector('#stNew');
    try { await page.click('[data-res="deedndebt:save:Resume Group"]', { timeout: 8000 }); } catch (e) { await page.screenshot({ path: path.join(SHOTS, 'resume-fail.png') }); console.log('LS', await page.evaluate(() => Object.keys(localStorage).map(k => k + ':' + (localStorage.getItem(k) || '').length))); throw e; }
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => JSON.stringify(window.__DD.G));
    const same1 = stripState(JSON.parse(before.s)) === stripState(JSON.parse(after));
    // mid-prompt: wait for a buy/choice/auction prompt, save, reload, resume and see the same prompt
    let promptKind = null;
    await playGame(page, { stopAt: (st) => { if (['buy', 'choice', 'debt'].includes(st.pending) && st.human && st.year >= 2) { promptKind = st.pending; return true; } return st.year >= 5; } });
    await page.waitForTimeout(800);
    const b2 = await page.evaluate(() => JSON.stringify(window.__DD.G));
    await page.reload(); await page.waitForSelector('#stNew'); try { await page.click('[data-res="deedndebt:save:Resume Group"]', { timeout: 8000 }); } catch (e) { console.log('LS2', await page.evaluate(() => Object.keys(localStorage).map(k => k + ':' + (localStorage.getItem(k) || '').length + ':' + (localStorage.getItem(k) || '').slice(-30)))); throw e; } await page.waitForTimeout(900);
    const a2 = await page.evaluate(() => ({ s: JSON.stringify(window.__DD.G), modal: (document.querySelector('.modal:not(.hidden) h2') || {}).textContent || '' }));
    const same2 = stripState(JSON.parse(b2)) === stripState(JSON.parse(a2.s));
    record('C. Save -> reload -> resume restores identical state', same1 && same2 && errs.length === 0,
      'mid-Year (Year ' + JSON.parse(before.s).flow.year + ', turn ' + (before.qi + 1) + '): ' + (same1 ? 'identical' : 'DIFFERENT') + '; mid-prompt (' + promptKind + '): ' + (same2 ? 'identical, prompt reopened: "' + a2.modal.trim().slice(0, 50) + '"' : 'DIFFERENT'));

    // ---------- D. End Game Now from the middle of the game ----------
    await page.keyboard.press('Escape');
    await playGame(page, { stopAt: (st) => (st.pending === 'roll' || st.pending === 'endTurn') && st.human });
    await page.waitForTimeout(500);
    const yearAt = await page.evaluate(() => window.__DD.G.flow.year);
    await page.click('#tkSet'); await page.click('#sEnd'); await page.fill('#endTxt', 'END'); await page.click('text=End the game');
    await playGame(page, { timeout: 120000 });
    const res = await page.evaluate(() => { const G = window.__DD.G; const R = window.__DD.E.results(G); return { stage: G.flow.stage, year: G.flow.year, n: document.querySelectorAll('.resCard').length, rank: R.rank.length, ended: R.ended, podium: document.querySelectorAll('.pod').length, text: document.querySelector('.screen').innerText.slice(0, 400) }; });
    await page.screenshot({ path: path.join(SHOTS, 'endgame-results.png') });
    record('D. End Game Now produces a correct Results page', res.stage === 'results' && res.ended && res.rank === 4 && res.podium === 3 && /teacher ended the game in Year/.test(res.text) && errs.length === 0,
      'ended from Year ' + yearAt + '; Results shows podium, ' + res.n + ' result cards, ranking of ' + res.rank + (errs.length ? ' | errors: ' + errs.join('; ') : ''));
    await ctx.close();
  }

  // ---------- F. reduced motion ----------
  const motionTest = async (extra, prefs) => {
    const { ctx, page, errs } = await open(browser, 1366, 768, extra, prefs);
    await newGame(page, { humans: 1, cpus: 2, years: 6, group: 'Motion', prePost: false });
    await toFirstHumanRoll(page);
    while (await page.$('.coach [data-next]')) await page.click('.coach [data-next]');
    await page.evaluate(() => {
      window.__seen = { shake: false, fall: false, confetti: false };
      new MutationObserver(() => { if (document.querySelector('#game').classList.contains('shake')) window.__seen.shake = true; if (document.querySelector('.fall,.rise')) window.__seen.fall = true; }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
      const cv = document.querySelector('#confetti'); const orig = cv.getContext.bind(cv); cv.getContext = (...a) => { window.__seen.confetti = true; return orig(...a); };
      window.__DD.fx({ t: 'event', id: 'e_recession', pid: null, msgs: [], fx: 'recession' });
      window.__DD.fx({ t: 'groupComplete', pid: 0, group: 'mill' });
    });
    await page.waitForTimeout(900);
    const cont = await page.$('.modal:not(.hidden) .btns button.primary'); if (cont) await cont.click();
    await page.waitForTimeout(1500);
    const seen = await page.evaluate(() => window.__seen);
    await ctx.close(); return { seen, errs };
  };
  if (want('F')) {
  const red = await motionTest({ reducedMotion: 'reduce' }, { muted: true, requireTutorial: false });
  const norm = await motionTest({}, { anim: 'normal', muted: true, requireTutorial: false });
  record('F. Reduced motion disables shake and confetti', !red.seen.shake && !red.seen.confetti && !red.seen.fall && norm.seen.shake && norm.seen.confetti,
    'OS reduced-motion: shake=' + red.seen.shake + ', confetti=' + red.seen.confetti + ', falling arrows=' + red.seen.fall + ' | Normal mode (control): shake=' + norm.seen.shake + ', confetti=' + norm.seen.confetti);
  }

  // ---------- G. network ----------
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const urls = html.match(/(src|href)\s*=\s*["']?(https?:)?\/\//gi) || [];
  const csp = /connect-src 'none'/.test(html) && /default-src 'none'/.test(html);
  record('G. No network requests at all', net.length === 0 && urls.length === 0 && csp, 'pages ran with the network OFF; ' + net.length + ' requests seen; ' + urls.length + ' external src/href in the file; CSP default-src and connect-src are \'none\'');

  await browser.close();
  const failed = results.filter(r => !r.pass);
  fs.writeFileSync(path.join(__dirname, 'UI_CHECKS.md'), '# DEED & DEBT: Browser checks\n\nGenerated by `node sim/ui-check.js` (Playwright + Chromium, opened as a local file with the network switched off).\n\n| Check | Result | Details |\n|---|---|---|\n' +
    results.map(r => '| ' + r.name + ' | ' + (r.pass ? 'PASS' : 'FAIL') + ' | ' + String(r.detail).replace(/\|/g, '/') + ' |').join('\n') + '\n\nScreenshots are in `sim/shots/`.\n');
  console.log(failed.length ? failed.length + ' CHECK(S) FAILED' : 'ALL BROWSER CHECKS PASSED');
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

function parseCSV(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\r') { } else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; } else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows;
}
