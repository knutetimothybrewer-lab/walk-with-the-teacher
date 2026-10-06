// Print layout of the final report + teacher passcode-setup page.  NODE_PATH=$(npm root -g) node tests/print-and-tools.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { BROWSER } = require('./helpers'); const { load } = require('./load');
let fails = 0, passes = 0; const ok = (c, m) => { if (c) { passes++; console.log('  ok  :', m); } else { fails++; console.log('  FAIL:', m); } };
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }); const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const page = await ctx.newPage();
  await page.addInitScript(BROWSER); await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForSelector('#stage-title');
  await page.evaluate(() => { __T.start('print-test'); for (let m = 1; m <= 7; m++) __T.completeMission(m, m % 3 ? 'best' : 'wrongfirst'); WWQ.Store.submitFinal(WWQ.App.state); WWQ.App.go({ view: 'results' }); }); await page.waitForSelector('.score-hero');
  await page.emulateMedia({ media: 'print' }); await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  const vis = await page.evaluate(() => ({ hud: getComputedStyle(document.querySelector('.hud')).display, strip: getComputedStyle(document.querySelector('.strip')).display, noprint: [...document.querySelectorAll('.noprint')].every(e => getComputedStyle(e).display === 'none'), details: [...document.querySelectorAll('details')].every(d => [...d.children].every(c => getComputedStyle(c).display !== 'none')) }));
  ok(vis.hud === 'none' && vis.strip === 'none' && vis.noprint, 'print hides navigation chrome and buttons'); ok(vis.details, 'collapsed sections (topics, item table) are expanded in print');
  await page.pdf({ path: '/tmp/claude-0/report.pdf', format: 'Letter', printBackground: true }); const size = fs.statSync('/tmp/claude-0/report.pdf').size; ok(size > 20000, 'PDF generated from the report (' + Math.round(size / 1024) + ' KB)');
  await page.screenshot({ path: '/tmp/claude-0/shots/print_results.png', fullPage: true });
  await ctx.close();
  // passcode setup page
  const W0 = load(); const p2 = await (await browser.newContext()).newPage(); await p2.goto('file://' + path.resolve(__dirname, '../teacher/passcode-setup.html'));
  await p2.fill('#p1', 'short'); await p2.fill('#p2', 'short'); await p2.click('#go'); ok((await p2.locator('#msg').innerText()).includes('8 characters'), 'rejects short passcodes');
  await p2.fill('#p1', 'password'); await p2.fill('#p2', 'password'); await p2.click('#go'); ok((await p2.locator('#msg').innerText()).includes('too easy'), 'rejects easy passcodes (no default like 1234)');
  await p2.fill('#p1', 'Maple-Quill-4821'); await p2.fill('#p2', 'Maple-Quill-4820'); await p2.click('#go'); ok((await p2.locator('#msg').innerText()).includes('do not match'), 'rejects mismatched entries');
  await p2.fill('#p1', 'Maple-Quill-4821'); await p2.fill('#p2', 'Maple-Quill-4821'); await p2.click('#go');
  const code = await p2.locator('#code').innerText(); const m = code.match(/salt: '([0-9a-f]+)', iterations: (\d+), verifier: '([0-9a-f]{64})'/); ok(!!m, 'generates a salted verifier block');
  ok(m && W0.U.deriveVerifier('Maple-Quill-4821', m[1], +m[2]) === m[3], 'verifier matches the passcode (independent re-derivation)');
  ok(!code.includes('Maple-Quill') && (await p2.inputValue('#p1')) === '', 'passcode is not shown and the fields are cleared');
  await browser.close(); console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
