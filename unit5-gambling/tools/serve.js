'use strict';
// Local development server: serves the static site and runs the REAL engine at POST /api with a file-backed store.
//   node tools/serve.js [port]
// Dev-only extras (never part of the production backend):
//   POST /dev/advance  {minutes}   moves the server clock forward (to test deadlines)
//   POST /dev/reset                wipes .devdata
// Environment: U5_TEACHER_PW (default "dev-teacher-pass-1"), U5_LIMIT_MIN (default 90).
// Needs the private bank (authoring/).  Without it, use demo/ (public demo bank).
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const U5 = require('../shared/core.js');
const { createEngine } = require('../server/engine.js');
const { MemoryStore } = require('../server/stores/memory.js');

const PORT = Number(process.argv[2] || process.env.PORT || 8080);
const DATA = path.join(ROOT, '.devdata', 'state.json');
const offset = { ms: 0 };
const now = () => Date.now() + offset.ms;

function makeStore() {
  const store = new MemoryStore({ now });
  try { if (fs.existsSync(DATA) && !process.env.U5_FRESH) { const j = JSON.parse(fs.readFileSync(DATA, 'utf8')); store.d = j.d; offset.ms = j.offset || 0; } } catch (e) { /* start fresh */ }
  let t = null;
  store.onChange = () => { clearTimeout(t); t = setTimeout(() => { fs.mkdirSync(path.dirname(DATA), { recursive: true }); fs.writeFileSync(DATA, JSON.stringify({ d: store.d, offset: offset.ms })); }, 150); };
  return store;
}
const env = { sha256: (s) => crypto.createHash('sha256').update(s).digest('hex'), randomId: (n) => crypto.randomBytes(Math.ceil(n)).toString('base64url').replace(/[-_]/g, 'x').slice(0, n) };

function boot() {
  const bank = process.env.U5_BANK ? require(path.resolve(process.env.U5_BANK)) : require('../authoring');
  const store = makeStore();
  const engine = createEngine({ bank, store, env, now, timeLimitMin: Number(process.env.U5_LIMIT_MIN || U5.TIME_LIMIT_MIN), pwIter: 50 });
  if (!store.getConfig() || !store.getConfig().codes || !store.getConfig().codes['Block 1/2']) {
    const codes = {}; U5.BLOCKS.forEach((b, i) => { codes[b] = { code: 'DEV' + (i + 1) + '-TEST', open: true }; });
    store.saveConfig({ codes, settings: {} });
  }
  if (!store.getTeacher()) { const salt = env.randomId(12); store.setTeacher({ salt, hash: engine.pwHash(salt, process.env.U5_TEACHER_PW || 'dev-teacher-pass-1') }); }
  return { engine, store };
}
const { engine, store } = boot();
// emulate the 1-minute watcher
setInterval(() => { try { engine.sweepExpired(); } catch (e) { /* ignore */ } }, 5000).unref();

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8' };
const BLOCKED = /^\/(authoring|private|\.devdata|server|tools|tests(?!\/e2e\/sim-harness\.html)|node_modules|\.git)(\/|$)/;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && (url.pathname === '/api' || url.pathname.startsWith('/dev/'))) {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 100000) req.destroy(); });
    req.on('end', () => {
      let out;
      try {
        const j = body ? JSON.parse(body) : {};
        if (url.pathname === '/api') out = engine.handle(String(j.action || ''), j.payload || {});
        else if (url.pathname === '/dev/advance') { offset.ms += (Number(j.minutes) || 0) * 60000; store.onChange(); out = { ok: true, serverTime: new Date(now()).toISOString() }; }
        else if (url.pathname === '/dev/reset') { try { fs.rmSync(path.dirname(DATA), { recursive: true, force: true }); } catch (e) { /* ignore */ } out = { ok: true, note: 'restart the server to reload fresh state' }; }
        else if (url.pathname === '/dev/solve') {      // tests only: the correct (or a wrong) response for one question in one student's session
          const G = require('../server/grading.js'), sess = store.getSession(j.sessionId) || store.getPreview(j.sessionId), entry = sess && engine.index.items[j.itemId];
          if (!entry) out = { ok: false, code: 'NOT_FOUND' };
          else { const it = G.instantiate(entry, sess); out = { ok: true, response: j.mode === 'wrong' ? G.makeWrong(it, j.k || 1) : G.makeCorrect(it), pts: it.pts }; }
        }
        else out = { ok: false, code: 'NOT_FOUND' };
      } catch (e) { out = { ok: false, code: 'BAD_REQUEST', message: String(e.message || e) }; }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(out));
    });
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  if (BLOCKED.test(p)) { res.writeHead(404); return res.end('Not found'); }
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
});
server.listen(PORT, () => {
  console.log(`Unit 5 dev server: http://localhost:${PORT}/`);
  console.log('  class codes: ' + U5.BLOCKS.map((b, i) => `${b} = DEV${i + 1}-TEST`).join(', '));
  console.log('  teacher entry code: WALK-TEACHER   teacher password: ' + (process.env.U5_TEACHER_PW || 'dev-teacher-pass-1'));
});
module.exports = { server, engine, store, offset };
