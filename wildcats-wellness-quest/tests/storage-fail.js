// Storage unavailable (private mode / blocked): honest messaging, recovery file still works, no false promise of locking. Also: avatar change cannot reset attempts.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { BROWSER } = require('./helpers');
let fails = 0, passes = 0; const ok = (c, m) => { if (c) { passes++; console.log('  ok  :', m); } else { fails++; console.log('  FAIL:', m); } };
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { Storage.prototype.setItem = function () { throw new DOMException('QuotaExceededError', 'QuotaExceededError'); }; });
  await page.addInitScript(BROWSER); await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForSelector('#stage-title');
  ok((await page.locator('.hud .savechip').innerText()).toLowerCase().includes('not saved'), 'HUD says progress is NOT saved on this device');
  ok(await page.locator('text=not allowing saving').count() === 1, 'setup page explains device-level save/lock protection is unavailable');
  await page.fill('#alias', 'nostore'); await page.click('#btn-start'); await page.evaluate(() => { __T.start('nostore'); __T.completeMission(1, 'best'); });
  const dl = page.waitForEvent('download'); await page.evaluate(() => WWQ.Shell.downloadRecord()); const d = await dl; await d.saveAs('/tmp/claude-0/nostore.json'); const rec = JSON.parse(fs.readFileSync('/tmp/claude-0/nostore.json', 'utf8'));
  ok(rec.format === 'wwq-record' && rec.report.scores.earnedPoints >= 12, 'recovery record downloads even though storage failed (contains the work)');
  ok(await page.evaluate(() => WWQ.Store.storageOK === false), 'app does not pretend storage works');
  // avatar change must not reset attempts
  await page.evaluate(() => WWQ.App.go({ m: 0, s: '0.1' })); await page.waitForSelector('.avatars'); const before = await page.evaluate(() => JSON.stringify(Object.keys(WWQ.App.state.items).map(k => WWQ.App.state.items[k].attempts.length)));
  await page.locator('label.opt', { hasText: 'Quinn' }).click(); const after = await page.evaluate(() => JSON.stringify(Object.keys(WWQ.App.state.items).map(k => WWQ.App.state.items[k].attempts.length)));
  ok(before === after && JSON.parse(after).length > 0, 'changing avatar does not reset attempt counts');
  ok(errs.length === 0, 'no page errors with storage disabled ' + errs.join('|'));
  await browser.close(); console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
