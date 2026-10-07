// Serves the REPO ROOT (like GitHub Pages project site: /<repo>/wildcats-wellness-quest/) and checks relative paths, 404s and external requests.
// NODE_PATH=$(npm root -g) node tests/subpath-and-network.js
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '../..'); const BASE = '/walk-with-the-teacher/'; // simulated GitHub Pages project-site prefix
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
let fails = 0, passes = 0; const ok = (c, m) => { if (c) { passes++; console.log('  ok  :', m); } else { fails++; console.log('  FAIL:', m); } };
const server = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (!u.startsWith(BASE)) { res.writeHead(404); return res.end('nf'); } let f = path.join(ROOT, u.slice(BASE.length)); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
server.listen(0, async () => {
  const port = server.address().port, browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage(); const reqs = [], bad = [], errs = [];
  page.on('request', r => reqs.push(r.url())); page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); }); page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://localhost:${port}${BASE}wildcats-wellness-quest/`); await page.waitForSelector('#stage-title'); await page.waitForTimeout(300);
  ok(bad.length === 0, 'no 404/4xx responses under the repository subpath ' + bad.join(','));
  ok(reqs.every(u => u.startsWith(`http://localhost:${port}`) || u.startsWith('data:')), 'no external network requests (all same-origin or data URIs)');
  ok(errs.length === 0, 'no console errors ' + errs.join('|'));
  ok((await page.evaluate(() => typeof WWQ === 'object' && WWQ.ITEMS.length)) === 49, 'app boots under subpath with 49 items');
  const src = fs.readdirSync(path.join(ROOT, 'wildcats-wellness-quest/js'), { recursive: true }).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(ROOT, 'wildcats-wellness-quest/js', f), 'utf8')).join('\n') + fs.readFileSync(path.join(ROOT, 'wildcats-wellness-quest/index.html'), 'utf8') + fs.readFileSync(path.join(ROOT, 'wildcats-wellness-quest/teacher/passcode-setup.html'), 'utf8');
  ok(!/(src|href)=["']\/(?!\/)/.test(src), 'no root-absolute src/href in HTML');
  ok(!/https?:\/\/(?!www\.w3\.org)/.test(fs.readFileSync(path.join(ROOT, 'wildcats-wellness-quest/index.html'), 'utf8')), 'index.html references no external hosts');
  ok(!/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\b/.test(fs.readdirSync(path.join(ROOT, 'wildcats-wellness-quest/js'), { recursive: true }).filter(f => f.endsWith('.js') && !/(^|[\\/])sync\.js$/.test(f)).map(f => fs.readFileSync(path.join(ROOT, 'wildcats-wellness-quest/js', f), 'utf8')).join('\n')), 'application code uses no fetch/XHR/WebSocket/beacon outside the optional js/sync.js (no server, no API key by default)');
  ok(/backend:\s*\{\s*url:\s*''/.test(fs.readFileSync(path.join(ROOT, 'wildcats-wellness-quest/js/config.js'), 'utf8')), 'Google Sheet backend is OFF in the shipped defaults (js/config.js); the teacher turns it on in teacher-config.js');
  await browser.close(); server.close(); console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
});
