#!/usr/bin/env node
'use strict';
/*
 * Performance check: real Chromium with CPU throttled 4x and a slow-3G network profile (CDP), against the dev server with
 * gzip (like GitHub Pages). Measures cold load to the sign-in form, transfer size, request count, the time to move through
 * sign-in -> Begin -> first question, long main-thread tasks, and answer-check responsiveness.
 *   node tests/perf/run.js
 * A 4x CPU slowdown on this machine is an approximation of a low-end Chromebook, not a measurement of one.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start } = require('../../tools/dev-server.js');
const L = require('../e2e/lib.js');

const PROFILES = {
  'baseline (no throttling)': { cpu: 1, net: null },
  '4x CPU slowdown only': { cpu: 4, net: null },
  '4x CPU + Slow 3G (400 ms RTT, 400 kbps down/up)': { cpu: 4, net: { offline: false, latency: 400, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8 } },
  '4x CPU + Fast 3G (150 ms RTT, 1.6 Mbps)': { cpu: 4, net: { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 } }
};

async function measure(browser, srv, name, prof, bank) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (prof.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.cpu });
  if (prof.net) await cdp.send('Network.emulateNetworkConditions', prof.net);
  let bytes = 0, reqs = 0; const sizes = {};
  cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; reqs++; });
  cdp.on('Network.responseReceived', (e) => { sizes[e.response.url.replace(srv.url, '/')] = e.response.headers['content-length'] || ''; });
  await page.addInitScript(() => { window.__long = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ type: 'longtask', buffered: true }); } catch (e) { /* unsupported */ } });
  const t0 = Date.now();
  await page.goto(srv.url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForSelector('#first', { timeout: 120000 });
  const loadMs = Date.now() - t0, loadBytes = bytes, loadReqs = reqs;
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const p = performance.getEntriesByType('paint').find((x) => x.name === 'first-contentful-paint'); return { fcp: p ? Math.round(p.startTime) : null, dcl: Math.round(n.domContentLoadedEventEnd) }; });
  const t1 = Date.now();
  await L.signIn(page); await page.waitForSelector('#begin-btn', { timeout: 120000 });
  const signInMs = Date.now() - t1;
  const t2 = Date.now();
  await page.click('#begin-btn'); await page.waitForSelector('.hero', { timeout: 120000 }); await page.click('.hero .btn'); await page.waitForSelector('.unit', { timeout: 120000 });
  const beginMs = Date.now() - t2;
  // one full interaction: label item (figure + 5 placements) then Check
  const first = Object.values(bank.pub)[0];
  const t3 = Date.now();
  await L.answer(page, first, bank.keys[first.id], true);
  const answerMs = Date.now() - t3;
  const long = await page.evaluate(() => window.__long.slice());
  const out = {
    profile: name, loadToSignInFormMs: loadMs, firstContentfulPaintMs: nav.fcp, transferKB: Math.round(loadBytes / 1024), requests: loadReqs,
    signInToReadyMs: signInMs, beginToFirstQuestionMs: beginMs, answerFiveLabelsAndCheckMs: answerMs,
    longTasks: long.length, totalBlockingMs: Math.round(long.reduce((a, d) => a + Math.max(0, d - 50), 0)), worstLongTaskMs: Math.round(Math.max(0, ...long))
  };
  await ctx.close();
  return out;
}

(async () => {
  const live = fs.existsSync(path.join(__dirname, '..', '..', 'private', 'itembank.json'));
  const srv = await start({ bank: live ? 'live' : 'demo' });
  const pub = L.itemsOf(await L.getJson(srv.url + (live ? 'content/items.json' : 'content/demo/items.json')));
  const keys = (await L.getJson(srv.url + '__test/bank')).items;
  const firstId = Object.keys(pub)[0];
  const browser = await chromium.launch();
  const results = [];
  for (const [name, prof] of Object.entries(PROFILES)) {
    await new L.Ctl(srv).reset();
    const r = await measure(browser, srv, name, prof, { pub: { [firstId]: pub[firstId] }, keys });
    results.push(r); console.log(JSON.stringify(r));
  }
  const files = {};
  for (const f of ['index.html', 'css/tokens.css', 'css/base.css', 'css/components.css', 'css/screens.css', 'css/teacher.css', 'js/app.js', 'js/api.js', 'js/util.js', 'js/timer.js', 'js/screens.js', 'js/assess.js', 'js/item.js', 'js/widgets.js', 'js/blocks.js', 'js/teacher.js', 'js/mock-api.js', 'content/' + (live ? 'items.json' : 'demo/items.json'), 'assets/fig-female-repro.svg', 'assets/fig-male-repro.svg']) {
    const p = path.join(__dirname, '..', '..', f); if (fs.existsSync(p)) { const b = fs.readFileSync(p); files[f] = { raw: b.length, gzip: require('zlib').gzipSync(b).length }; }
  }
  fs.writeFileSync(path.join(__dirname, 'last-run.json'), JSON.stringify({ when: new Date().toISOString(), contentSet: live ? 'live (40 items)' : 'demo', node: process.version, results, files }, null, 2) + '\n');
  await browser.close(); await srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
