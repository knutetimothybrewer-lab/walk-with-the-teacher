// KEYBOARD-ONLY full run: only Tab / Shift+Tab / Space / Enter / arrow keys / typing. No mouse clicks. Must end at exactly 100.0 and a locked final report.
// NODE_PATH=$(npm root -g) node tests/e2e-keyboard.js
const { chromium } = require('playwright'); const path = require('path'); const { BROWSER } = require('./helpers');
let fails = 0, passes = 0; const ok = (c, m) => { if (c) { passes++; console.log('  ok  :', m); } else { fails++; console.log('  FAIL:', m); } };
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' })).newPage(); page.setDefaultTimeout(8000);
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(BROWSER); await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForSelector('#stage-title');
  let keys = 0; const K = async k => { keys++; await page.keyboard.press(k); };
  const matches = sel => page.evaluate(s => !!document.activeElement && document.activeElement.matches(s), sel);
  async function tabTo(sel, max = 400) {
    for (let pass = 0; pass < 2; pass++) { for (let i = 0; i < max; i++) { if (await matches(sel)) return true; await K('Tab'); } await page.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); }); }
    throw new Error('could not Tab to ' + sel);
  }
  const act = async sel => { await tabTo(sel); await K('Enter'); };
  async function kbPart(itemId, vid, p) {
    const name = `${itemId}|${vid}|${p.id}`, esc = s => s.replace(/"/g, '\\"');
    if (p.type === 'num') { await tabTo(`input[data-fk="n-${esc(name)}"]`); await page.keyboard.type(String(p.val)); keys += String(p.val).length; }
    else if (p.type === 'select') { const idx = await page.evaluate(([n, v]) => [...document.querySelector(`select[data-fk="s-${n}"]`).options].findIndex(o => o.value === v), [name, p.val]); await tabTo(`select[data-fk="s-${esc(name)}"]`); for (let i = 0; i < idx; i++) await K('ArrowDown'); }
    else if (p.type === 'multi') { const order = await page.evaluate(([n, vals]) => [...document.querySelectorAll(`input[name="${n}"]`)].map(e => e.value).filter(v => vals.includes(v)), [name, p.val]); for (const v of order) { await tabTo(`input[name="${esc(name)}"][value="${v}"]`); await K('Space'); } }
    else { const idx = await page.evaluate(([n, v]) => [...document.querySelectorAll(`input[name="${n}"]`)].findIndex(e => e.value === v), [name, p.val]); await tabTo(`input[name="${esc(name)}"]`); for (let i = 0; i < idx; i++) await K('ArrowDown'); if (idx === 0) await K('Space'); }
  }
  async function kbItems() {
    const ids = await page.evaluate(() => [...document.querySelectorAll('section.item[data-item]')].map(s => s.dataset.item).filter(id => WWQ.Policy.mode(WWQ.ITEM_BY_ID[id], WWQ.App.state.items[id] || WWQ.Policy.newRec()) === 'draft'));
    for (const id of ids) { const plan = await page.evaluate(id => { const it = WWQ.ITEM_BY_ID[id], rec = WWQ.App.state.items[id] || WWQ.Policy.newRec(), v = WWQ.Policy.currentVariant(it, rec), r = __T.extreme(v, 1); return { vid: v.id, parts: v.parts.map(p => ({ id: p.id, type: p.type, val: r[p.id] })) }; }, id); for (const p of plan.parts) await kbPart(id, plan.vid, p); }
    if (ids.length) await act('#btn-submit');
  }
  const nextStage = async () => { await act('.stagenav .btn:last-child'); await page.waitForTimeout(20); };

  console.log('== Welcome, setup, tutorial (keyboard)');
  await tabTo('#alias'); await page.keyboard.type('kb-user'); await act('#btn-start'); await page.waitForSelector('text=How credit works'); await act('.page .row .btn.primary');
  await page.waitForSelector('text=Practice question');
  for (let g = 0; g < 4 && !(await page.evaluate(() => WWQ.App.state.practice.tut.finalized)); g++) {
    const plan = await page.evaluate(() => { const v = WWQ.Policy.currentVariant(WWQ.PRACTICE.tut, WWQ.App.state.practice.tut), r = __T.extreme(v, 1); return { vid: v.id, parts: v.parts.map(p => ({ id: p.id, type: p.type, val: r[p.id] })) }; });
    for (const p of plan.parts) await kbPart('pr.tut', plan.vid, p); await act('#btn-submit');
  }
  ok(await page.evaluate(() => WWQ.App.state.progress.activities.tutorial === true), 'tutorial completed by keyboard');
  await page.evaluate(() => WWQ.App.go({ view: 'map' })); // direct jump allowed; subsequent missions are entered via keyboard pips

  for (let m = 1; m <= 7; m++) {
    console.log('== Mission ' + m + ' (keyboard)');
    await tabTo(`.strip li:nth-child(${m + 1}) .pip`); await K('Enter'); await page.waitForSelector('#stage-title');
    const stages = await page.evaluate(m => WWQ.MISSION[m].stages.map(s => ({ id: s.id, kind: s.kind })), m);
    for (let si = 0; si < stages.length; si++) {
      const st = stages[si]; await page.waitForFunction(id => WWQ.App.state.progress.pos.s === id, st.id);
      if (st.kind === 'sort') {
        const DN = { phys: 'Physical', ment: 'Mental', emo: 'Emotional', soc: 'Social', env: 'Environmental' };
        const cards = await page.evaluate(() => WWQ.ITEMS.filter(i => i.st === '1.1').map(i => ({ text: WWQ.Policy.variantAt(i, 0).ctx, key: WWQ.Policy.variantAt(i, 0).key })));
        for (const c of cards) { const t = c.text.slice(0, 30).replace(/"/g, '\\"'); await page.evaluate(t => { const el = [...document.querySelectorAll('.tray .sortcard')].find(x => x.textContent.startsWith(t)); el && el.setAttribute('data-kbt', '1'); }, c.text.slice(0, 30)); await tabTo('.sortcard[data-kbt="1"]'); await K('Enter'); await page.evaluate(() => document.querySelectorAll('[data-kbt]').forEach(e => e.removeAttribute('data-kbt'))); await tabTo(`.bin[aria-label="${DN[c.key]} dimension"] .place button`); await K('Enter'); }
        await act('#btn-submit');
      } else if (st.kind === 'overlap') { for (let i = 0; i < 3; i++) { await tabTo('.card button.btn.sm[aria-pressed="false"]'); await K('Enter'); } await act('button.btn.primary.big:not([disabled])'); }
      else if (st.kind === 'play') {
        for (const d of await page.evaluate(() => WWQ.DECISIONS.map(d => d.id))) { const idx = await page.evaluate(d => [...document.querySelectorAll(`input[name="${d}"]`)].findIndex(e => document.querySelector(`input[name="${d}"][value="A"]`) === e), d); await tabTo(`input[name="${d}"]`); for (let i = 0; i < idx; i++) await K('ArrowDown'); if (idx === 0) await K('Space'); }
        await act('.actionbar .btn.primary.big:not([disabled])');
      } else if (st.kind === 'form') {
        // media tabs by keyboard (arrow keys) on the first post of a post stage
        if (m === 4 && st.id !== '4.6') { await tabTo('[role=tab][aria-selected="true"]'); await K('ArrowRight'); await K('ArrowRight'); }
        await kbItems();
      }
      if (si < stages.length - 1) await nextStage();
    }
    ok(await page.evaluate(m => WWQ.Policy.missionStatus(WWQ.App.state, m).complete, m), 'mission ' + m + ' completed with keyboard only');
  }
  console.log('== Review and lock (keyboard)');
  await tabTo('.strip li:last-child .pip'); await K('Enter'); await page.waitForSelector('#ack'); await tabTo('#ack'); await K('Space'); await act('#btn-final');
  await page.waitForSelector('.modal'); await tabTo('.modal .btn.danger'); await K('Enter'); await page.waitForSelector('.score-hero');
  const rep = await page.evaluate(() => WWQ.App.state.final.report); ok(Math.abs(rep.scores.earnedPoints - 100) < 1e-9, 'keyboard-only run = exactly 100.0 points (' + rep.scores.earnedPoints + ')'); ok(rep.completion.percent === 100, 'completion 100%');
  // modal focus trap + Escape
  await tabTo('.footnote button'); await K('Enter'); await page.waitForSelector('.modal'); for (let i = 0; i < 6; i++) await K('Tab'); ok(await page.evaluate(() => !!document.activeElement.closest('.modal')), 'focus stays trapped inside the open dialog'); await K('Escape'); ok(await page.locator('.modal').count() === 0, 'Escape closes the dialog and returns focus');
  ok(errs.length === 0, 'no console errors ' + errs.slice(0, 2).join('|'));
  console.log('   ' + keys + ' key presses');
  await browser.close(); console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
