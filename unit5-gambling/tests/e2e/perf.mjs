// Rough performance check.  CPU throttling in Chromium approximates a slower Chromebook; it is NOT a measurement of real hardware.
//   node tests/e2e/perf.mjs [cpuSlowdown=4]
import { startServer, launch, login, begin, CODES } from './lib.mjs';
const slow = Number(process.argv[2] || 4);
const srv = await startServer(Number(process.env.E2E_PORT || 8900 + Math.floor(Math.random() * 90)));
const b = await launch(); const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } }); const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: slow });
let bytes = 0, files = 0; page.on('response', async (r) => { try { const buf = await r.body(); bytes += buf.length; files++; } catch { /* ignore */ } });
const frames = () => page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
const timed = async (label, fn) => { const t0 = Date.now(); await fn(); await frames(); const ms = Date.now() - t0; console.log(`${label.padEnd(54)} ${String(ms).padStart(6)} ms`); return ms; };
console.log(`CPU slowdown ${slow}x (Chromium emulation)`);
const t0 = Date.now(); await page.goto(srv.base + '/'); await page.waitForSelector('form'); await frames();
console.log(`${'cold load to the sign-in screen'.padEnd(54)} ${String(Date.now() - t0).padStart(6)} ms   (${files} files, ${(bytes / 1024).toFixed(0)} KB uncompressed)`);
await login(page, srv, { first: 'Perf', last: 'Test', id: 'PERF-1', block: 'Block 6/7' }); await begin(page);
const b1 = bytes; console.log(`${'assessment shell loaded'.padEnd(54)} +${((bytes - b1) / 1024).toFixed(0)} KB (running total ${(bytes / 1024).toFixed(0)} KB)`);
const results = {};
await page.evaluate(() => 0);
// open each lab through the preview-free path: use the harness page so no gating is needed
await page.goto(srv.base + '/tests/e2e/sim-harness.html?sim=coin&ch=2'); await page.waitForFunction('window.__ready === true');
results.coin = await timed('coin lab: +1,000 flips (charts redraw)', () => page.click('button:text-is("+1,000")'));
results.coin5 = await timed('coin lab: +1,000 flips again, now 2,000', () => page.click('button:text-is("+1,000")'));
await page.goto(srv.base + '/tests/e2e/sim-harness.html?sim=house&ch=2'); await page.waitForFunction('window.__ready === true');
results.house = await timed('house edge: class experiment (200 rounds)', () => page.click('button:has-text("Run the class experiment")'));
await page.click('text=1,000 players'); results.crowd = await timed('house edge: simulate 1,000 players x 200 rounds', () => page.click('button:has-text("Simulate 1,000")'));
await page.goto(srv.base + '/tests/e2e/sim-harness.html?sim=sports&ch=4'); await page.waitForFunction('window.__ready === true');
await page.locator('.sim-tab').nth(2).click(); results.slips = await timed('sports desk: run 10,000 slips', () => page.click('button:has-text("Run 10,000")'));
await page.goto(srv.base + '/tests/e2e/sim-harness.html?sim=brain&ch=3'); await page.waitForFunction('window.__ready === true');
results.teen = await timed('neuroscience lab: open teen-brain tab', () => page.locator('.sim-tab').nth(3).click());
const worst = Math.max(...Object.values(results));
console.log(`\nslowest interaction at ${slow}x CPU slowdown: ${worst} ms ${worst < 1000 ? '(under 1 second)' : '(OVER 1 second)'}`);
await b.close(); srv.stop(); process.exit(worst < 2000 ? 0 : 1);
