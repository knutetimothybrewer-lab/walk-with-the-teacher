// Google Sheet backend through the real UI, over http with the backend URL switched on. The Apps Script endpoint is stubbed with page.route.
// NODE_PATH=$(npm root -g) node tests/e2e-backend.js
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path'); const { BROWSER } = require('./helpers');
let fails = 0, passes = 0; const ok = (c, m) => { if (c) { passes++; console.log('  ok  :', m); } else { fails++; console.log('  FAIL:', m); } };
const ROOT = path.resolve(__dirname, '..'), MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const EXEC = 'https://script.test/exec';
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
  if (u === '/js/teacher-config.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(`WWQ.applyConfig({ backend: { url: '${EXEC}' }, teacher: { configured: false } });`); }
  const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, r)); const base = 'http://localhost:' + server.address().port + '/';
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' }); const page = await ctx.newPage(); page.setDefaultTimeout(8000);
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const received = []; let submitUp = true;
  await page.route(EXEC, async route => {
    const body = JSON.parse(route.request().postData()), cors = { 'access-control-allow-origin': '*' };
    if (body.action === 'start') return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(/^quest1$/i.test(body.student.code) ? { ok: true, status: 'new' } : { ok: false, reason: 'code' }) });
    if (!submitUp) return route.abort();
    received.push(body.payload); return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ ok: true, status: 'new' }) });
  });
  await page.addInitScript('window.__KEEP_BACKEND = true;'); await page.addInitScript(BROWSER); await page.goto(base + 'index.html'); await page.waitForSelector('#stage-title');

  console.log('== Class code at the start');
  ok(await page.locator('#classcode').count() === 1, 'class code field is shown when the backend is on');
  await page.fill('#alias', 'stu-77'); ok(await page.locator('#btn-start').isDisabled(), 'Start stays disabled until a class code is typed');
  await page.fill('#classcode', 'wrong'); await page.click('#btn-start'); await page.waitForSelector('#code-msg:has-text("not recognized")');
  ok(true, 'wrong code shows a clear message'); ok(await page.evaluate(() => !WWQ.App.state.progress.started), 'student is not started with a wrong code');
  await page.fill('#classcode', 'Quest1'); await page.click('#btn-start'); await page.waitForSelector('text=How credit works');
  ok(await page.evaluate(() => WWQ.App.state.student.code === 'Quest1' && WWQ.App.state.progress.started), 'correct code (any case) starts the quest and is remembered');

  console.log('== Finish, submit, send (first attempt fails, then succeeds)');
  await page.evaluate(() => { for (let m = 1; m <= 7; m++) __T.completeMission(m, 'best'); WWQ.App.state.progress.activities.tutorial = true; WWQ.App.state.progress.howto = true; WWQ.App.go({ view: 'review' }); });
  await page.waitForSelector('text=Review and submit'); submitUp = false;
  await page.check('#ack'); await page.click('#btn-final'); await page.waitForSelector('.modal'); await page.click('.modal-back:last-child .modal button:has-text("Yes, submit and lock")'); await page.waitForSelector('.score-hero');
  await page.waitForSelector('#sync-card:has-text("Not sent yet")'); ok(true, 'status card says "Not sent yet" when the server cannot be reached');
  ok(await page.evaluate(() => WWQ.Sync.pending() === 1), 'result waits in the outbox');
  submitUp = true; await page.click('#sync-card button:has-text("Try sending again")'); await page.waitForSelector('#sync-card:has-text("Sent to your teacher")');
  ok(received.length === 1 && received[0].student.alias === 'stu-77' && received[0].student.code === 'Quest1', 'server received alias and class code');
  ok(Math.abs(received[0].scores.earned - 100) < 1e-6 && received[0].items.length > 20, 'server received 100 points and per-item data');
  ok(await page.evaluate(() => WWQ.Sync.pending() === 0), 'outbox is empty after a successful send');
  await page.reload(); await page.waitForSelector('.score-hero'); ok(received.length === 1, 'reloading the locked results does not send again');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join('|'));
  await browser.close(); server.close(); console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('  FAIL: threw', e.message); console.log('0 passed, 1 failed'); process.exit(1); });
