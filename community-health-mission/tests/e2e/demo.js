'use strict';
// Demo build: no backend, no credentials. Verifies it works and is labeled as demo.
const assert = require('assert'); const path = require('path');
let chromium; try { chromium = require('playwright').chromium; } catch (e) { chromium = require('/opt/node22/lib/node_modules/playwright').chromium; }
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, '..', '..', 'dist', 'demo', 'index.html'));
  await p.fill('input[name=code]', 'demo'); await p.fill('input[name=roster]', 'demo1'); await p.fill('input[name=name]', 'Demo'); await p.click('button[type=submit]');
  await p.click('text=Begin the mission'); await p.waitForSelector('.county'); assert(/DEMO MODE/.test(await p.textContent('.demobar')));
  await p.click('.mission >> nth=0'); await p.waitForSelector('.qcard'); await p.click('label.opt:has-text("Transportation")'); await p.click('.qcard button.primary'); await p.waitForSelector('.fbox.ok');
  assert(/DEMO MODE/.test(await p.textContent('.demobar'))); assert(!(await p.content()).includes('Contains the PRIVATE answer key'));
  assert.deepEqual(errs, []); await b.close(); console.log('demo: ok (labeled DEMO, works offline from a file, no graded answer key inside)');
})().catch(e => { console.error('DEMO FAIL', e); process.exit(1); });
