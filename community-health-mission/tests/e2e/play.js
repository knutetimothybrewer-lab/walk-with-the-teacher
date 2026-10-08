'use strict';
// Real-browser test of the static "play" build: the engine runs in the page and the finished result is posted to
// receiver/SheetReceiver.gs (run here against the in-memory Apps Script mock).
const assert = require('assert'), fs = require('fs'), path = require('path'), http = require('http'), vm = require('vm');
let chromium; try { chromium = require('playwright').chromium; } catch (e) { chromium = require('/opt/node22/lib/node_modules/playwright').chromium; }
const G = require('../../server/grading');
const { fillUnit } = require('./driver');
const { makeEnv } = require('../gas-mock');
const ROOT = path.join(__dirname, '..', '..'), PLAY = path.join(ROOT, 'play');
const URL_EXEC = 'https://script.google.com/macros/s/TEST/exec';

(async () => {
  if (!fs.existsSync(path.join(PLAY, 'index.html'))) { console.log('play/index.html missing: run npm run build with the private key first'); process.exit(0); }
  const pub = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/generated/public.json'), 'utf8')), priv = JSON.parse(fs.readFileSync(path.join(ROOT, 'private/keys.json'), 'utf8'));
  // receiver under the Apps Script mock
  const env = makeEnv(); const ctx = env.ctx;
  ctx.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
  ctx.ContentService = { createTextOutput: t => ({ text: t, setMimeType() { return this; } }), MimeType: { JSON: 1 } };
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(PLAY, 'SheetReceiver.gs'), 'utf8'), ctx, { filename: 'SheetReceiver.gs' });
  const call = (body) => JSON.parse(vm.runInContext('doPost', ctx)({ postData: { contents: JSON.stringify(body) } }).text);
  const sheet = (n) => env.ss.getSheetByName(n);
  vm.runInContext('setupTabs_()', ctx); sheet('ClassCodes').appendRow(['HEALTH3A', '']);

  const server = http.createServer((req, res) => { const f = path.join(PLAY, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]); if (!f.startsWith(PLAY) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(fs.readFileSync(f)); });
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
  let offline = false, posts = [];
  await page.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.CHM_RESULTS_URL = "' + URL_EXEC + '";' }));
  await page.route(URL_EXEC, r => { if (offline) return r.abort(); let body; try { body = JSON.parse(r.request().postData()); call; } catch (e) { console.log('route err', e); } posts.push(body.action); r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: (() => { try { return JSON.stringify(call(body)); } catch (e) { console.log('receiver threw:', e.message); return '{"ok":false}'; } })() }); });
  const ok = (m) => console.log('  ✓ ' + m);
  const unit = (id) => { let r; pub.modules.forEach(m => m.units.forEach(u => { if (u.id === id) r = u; })); return r; };

  await page.goto(base + '/'); await page.waitForSelector('input[name=code]');
  // wrong class code is refused up front
  await page.fill('input[name=code]', 'NOPE'); await page.fill('input[name=roster]', 'st01'); await page.fill('input[name=name]', 'Pat Student');
  await page.selectOption('select[name=period]', 'Block 3/4'); await page.click('button[type=submit]'); await page.waitForSelector('.error:not(:empty)');
  const et = await page.textContent('.error'); assert(/not found/i.test(et), et); ok('unknown class code is refused before the student starts');
  await page.fill('input[name=code]', 'health3a'); await page.click('button[type=submit]'); await page.waitForSelector('.tut, .county');
  if (await page.$('.tut')) { await page.click('text=Begin the mission'); await page.waitForSelector('.county'); }
  for (const m of pub.modules) { await page.click('.mission >> nth=' + (m.id - 1)); await page.waitForSelector('.qcard');
    for (let i = 0; i < m.units.length; i++) { const u = m.units[i]; await page.click('.step >> nth=' + i); await page.waitForSelector('.qcard h2:has-text("' + u.title.replace(/"/g, '\\"') + '")');
      await fillUnit(page, u, G.makeCorrect(pub, u, priv.units[u.id]), pub); await page.click('.qcard button.primary'); await page.waitForSelector('.feedback .fbox.ok'); }
    await page.click('.brand'); await page.waitForSelector('.county'); }
  ok('all 29 units answered through the UI in the static build');
  // reload mid-session resumes from this device
  await page.reload(); await page.waitForSelector('.county, .tut'); ok('reload resumes the same student');
  // offline at submit: result stays pending, then Retry delivers it
  offline = true;
  await page.click('text=Final review and submit'); await page.check('.submitbox input[type=checkbox]'); await page.click('text=Submit final answers'); await page.waitForSelector('.res-head');
  assert(/delivery pending|Gradebook/i.test(await page.textContent('.res-head'))); assert.equal(sheet('Summary').getLastRow(), 1); ok('offline submit: shown as pending, nothing written to the Sheet yet');
  offline = false; await page.click('button:has-text("Retry")'); await page.waitForSelector('text=Results recorded in teacher gradebook', { timeout: 15000 }); ok('Retry delivers the result and the status changes to recorded');
  const sum = sheet('Summary'); assert.equal(sum.getLastRow(), 2); const row = sum.rows[1], head = sum.rows[0];
  const col = (h) => row[head.indexOf(h)];
  assert.equal(col('Class code'), 'HEALTH3A'); assert.equal(col('Block'), 'Block 3/4'); assert.equal(col('Roster ID'), 'st01'); assert.equal(col('Points'), 100); assert.equal(col('Percent'), 100);
  assert.equal(head.filter(h => /^M\d-U\d/.test(h)).length, 29); ok('Summary row has class, block, roster ID, 100 points and 29 question columns');
  assert(sheet('Responses').getLastRow() >= 30); ok('Responses tab holds each attempt (' + (sheet('Responses').getLastRow() - 1) + ' rows)');
  // duplicate send does not double count
  const dup = call({ action: 'submit', payload: { sessionId: row[head.indexOf('Session ID')], receiptId: 'x', classCode: 'HEALTH3A' } }); assert(dup.duplicate); assert.equal(sum.getLastRow(), 2); ok('resending the same result is ignored (no double count)');
  assert.deepEqual(errs, []); ok('no page errors');
  await browser.close(); server.close(); console.log('PLAY E2E PASSED');
})().catch(e => { console.error(e); process.exit(1); });
