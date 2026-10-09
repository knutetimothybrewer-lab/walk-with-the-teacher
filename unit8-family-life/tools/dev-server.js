#!/usr/bin/env node
'use strict';
/*
 * Local dev + end-to-end test server.
 *   - serves the static site (this folder)
 *   - serves the SAME JSON API as the Apps Script web app at POST /api (text/plain body), backed by server/core.js
 *     and the in-memory store, so the real client code path (fetch, retry queue, timer) is exercised.
 *   - /js/config.js is generated so API_URL points at /api (live mode against this local server)
 *   - test hooks under /__test/ : advance the SERVER clock, inject network failures, read state
 *
 *   node tools/dev-server.js                      demo bank (public practice set)
 *   node tools/dev-server.js --bank=live          the real item bank from private/itembank.json (needs the vault unlocked)
 *   node tools/dev-server.js --port=8080
 * Never deploy this. It is for local testing only.
 */
const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const W8 = require('../server/core.js');
const Mem = require('../server/memory-store.js');

const root = path.join(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/plain; charset=utf-8' };

function start(opts) {
  opts = opts || {};
  const bankName = opts.bank || 'demo';
  const bank = JSON.parse(fs.readFileSync(path.join(root, bankName === 'live' ? 'private/itembank.json' : 'content/demo/bank.json'), 'utf8'));
  const ctl = { skew: 0, fail: { count: 0, mode: 'drop' }, delayMs: 0, calls: 0, log: [] };
  const now = () => Date.now() + ctl.skew;
  let n = 0;
  const store = Mem.create({
    now, bank,
    config: { classCodes: { 'Block 1/2': 'CODE12', 'Block 3/4': 'CODE34', 'Block 6/7': 'CODE67', 'Block 8/9': 'CODE89' }, defaultMinutes: 90, showScore: true, open: true, disabledItems: [] }
  });
  const salt = 'e2e-salt';
  store.setTeacherHash({ salt, hash: W8.hashPassword('teacher-pass-1', salt) });
  const server = W8.createServer({ now, uuid: () => require('crypto').randomUUID(), store, debug: true, log: (m) => ctl.log.push(String(m).slice(0, 300)) });

  const web = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const p = decodeURIComponent(url.pathname);

    if (p === '/api' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        ctl.calls++;
        if (ctl.fail.count > 0) {
          ctl.fail.count--;
          if (ctl.fail.mode === 'drop') { req.socket.destroy(); return; }
          res.writeHead(503, { 'content-type': 'text/plain' }); res.end('unavailable'); return;
        }
        const reply = () => {
          let out; try { out = server.handle(JSON.parse(body)); } catch (e) { out = { ok: false, error: { code: 'BAD_REQUEST', message: 'bad json' }, serverNow: now() }; }
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(out));
        };
        if (ctl.delayMs) setTimeout(reply, ctl.delayMs); else reply();
      });
      return;
    }
    if (p.startsWith('/__test/')) {
      res.setHeader('content-type', 'application/json');
      if (p === '/__test/advance') { ctl.skew += Number(url.searchParams.get('ms') || 0); return res.end(JSON.stringify({ skew: ctl.skew })); }
      if (p === '/__test/sweep') return res.end(JSON.stringify({ finalized: server.sweep() }));
      if (p === '/__test/fail') { ctl.fail = { count: Number(url.searchParams.get('n') || 1), mode: url.searchParams.get('mode') || 'drop' }; return res.end('{}'); }
      if (p === '/__test/delay') { ctl.delayMs = Number(url.searchParams.get('ms') || 0); return res.end('{}'); }
      if (p === '/__test/store') return res.end(JSON.stringify({ sessions: store.listSessions(), preview: store.getPreview(), history: store.listHistory(), responses: store.listResponses(), calls: ctl.calls, log: ctl.log }));
      if (p === '/__test/bank') return res.end(JSON.stringify(bank));
      if (p === '/__test/reset') { store.setConfig({ classCodes: { 'Block 1/2': 'CODE12', 'Block 3/4': 'CODE34', 'Block 6/7': 'CODE67', 'Block 8/9': 'CODE89' }, defaultMinutes: 90, showScore: true, open: true, disabledItems: [] }); store.setTeacherHash({ salt, hash: W8.hashPassword('teacher-pass-1', salt) }); Object.keys(store._state.sessions).forEach((k) => delete store._state.sessions[k]); store._state.preview = null; store._state.teacherTokens = {}; store._state.history.length = 0; store._state.responses.length = 0; ctl.skew = 0; ctl.fail = { count: 0, mode: 'drop' }; ctl.delayMs = 0; ctl.calls = 0; return res.end('{}'); }
      res.statusCode = 404; return res.end('{}');
    }
    if (p === '/js/config.js' && !opts.demoMode) {
      res.writeHead(200, { 'content-type': MIME['.js'], 'cache-control': 'no-store' });
      return res.end('window.W8_CONFIG = { API_URL: "/api", APP_VERSION: "dev" };');
    }
    // never serve secrets even locally
    if (/^\/(authoring|private|vault|tests|tools|docs|node_modules)(\/|$)/.test(p)) { res.statusCode = 404; return res.end('not found'); }
    let f = path.join(root, p === '/' ? 'index.html' : p);
    if (!f.startsWith(root)) { res.statusCode = 403; return res.end('no'); }
    fs.readFile(f, (err, data) => {
      if (err) { res.statusCode = 404; return res.end('not found'); }
      const type = MIME[path.extname(f)] || 'application/octet-stream';
      // GitHub Pages gzips text assets; do the same so performance numbers are realistic
      if (/text|javascript|json|svg/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '')) {
        res.writeHead(200, { 'content-type': type, 'content-encoding': 'gzip', 'cache-control': 'no-store' });
        return res.end(zlib.gzipSync(data));
      }
      res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    web.listen(opts.port || 0, '127.0.0.1', () => {
      const port = web.address().port;
      resolve({ web, port, url: 'http://127.0.0.1:' + port + '/', ctl, store, server, bank, close: () => new Promise((r) => web.close(r)) });
    });
  });
}

module.exports = { start };

if (require.main === module) {
  const arg = (k, d) => { const m = process.argv.find((a) => a.startsWith('--' + k + '=')); return m ? m.split('=')[1] : d; };
  start({ port: Number(arg('port', 8080)), bank: arg('bank', 'demo') }).then((s) => {
    console.log('Unit 8 dev server: ' + s.url + '  (bank: ' + arg('bank', 'demo') + ')');
    console.log('Class codes: CODE12 / CODE34 / CODE67 / CODE89   Teacher password: teacher-pass-1');
  });
}
