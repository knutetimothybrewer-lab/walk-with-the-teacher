// Full playthrough against the REAL Code.gs (run in a Node mock of Apps Script) via request interception.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { start } from '../../tools/serve.js';
import { playAll } from './driver.mjs';
import { makeEnv } from '../gas-mock.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mode = process.argv[2] || 'local'; // 'local' (browser grades) or 'server' (server grades; needs --strip build)
const env = makeEnv(root); env.run('setup()');
const srv = await start(8131);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
let failSubmits = 1, calls = [];
await ctx.route('**/js/config.js', async (r) => { let t = fs.readFileSync(root + '/js/config.js', 'utf8').replace("backendUrl: ''", "backendUrl: 'https://script.example/exec'"); if (mode === 'server') t = t.replace("gradingMode: 'local'", "gradingMode: 'server'"); r.fulfill({ body: t, contentType: 'text/javascript' }); });
await ctx.route('https://script.example/exec', async (r) => {
  const body = JSON.parse(r.request().postData()); calls.push(body.action);
  if (body.action === 'submit' && failSubmits-- > 0) return r.abort('failed');
  const res = env.call(body); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(res) });
});
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
p.setDefaultTimeout(15000);
const seen = await playAll(p, { url: 'http://localhost:8131/index.html', name: 'Sam Carter', code: 'health2', period: 'Block 1/2' });
await p.getByRole('button', { name: 'Submit final answers' }).click(); await p.getByRole('button', { name: 'Yes, submit' }).click();
await p.waitForSelector('text=Summative complete');
await p.waitForSelector('text=Saved on this device. Waiting to send', { timeout: 8000 }); // first submit was dropped
await p.getByRole('button', { name: 'Try again' }).click();
await p.waitForSelector('text=Your responses have been submitted.');
const conf = await p.locator('.confirm-id').innerText();
console.log('confirmation', conf, 'calls', calls.join(','));
const sum = env.book.get('Summary'); assert.equal(sum.length, 2, 'one summary row'); assert.equal(sum[1][1], 'Sam Carter'); assert.equal(sum[1][9], 100); assert.equal(sum[1][17], 'LIVE'); assert.equal(sum[1][20], conf);
assert.equal(env.book.get('Questions').length - 1, seen.length + 1, 'one row per question (+ the chat run)');
// duplicate protection: retrying submit does not add rows; a second sign-in is refused by the server
const again = env.call({ action: 'validate', code: 'HEALTH2', name: 'sam carter' }); assert.equal(again.error, 'already-completed');
// the browser lock: reload shows results
await p.reload(); await p.waitForSelector('text=Summative complete');
// teacher reset -> browser notices on next load and returns to the entry screen
env.run("PropertiesService.getScriptProperties().setProperty('TEACHER_PASSCODE','pw')");
const sid = sum[1][19]; assert.equal(env.call({ action: 't_reset', pass: 'pw', sid }).ok, true);
await p.reload(); await p.waitForSelector('text=Sign in to begin'); assert.ok(await p.locator('.err:has-text("reset")').count());
assert.equal(errs.length, 0, errs.join(';'));
console.log('BACKEND E2E PASS (' + mode + ') answered', seen.length);
await b.close(); srv.close();
