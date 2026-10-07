'use strict';
// Local development / classroom-free testing server. Implements POST /api with the SAME engine as the Apps Script backend,
// stored in a JSON file (.devdata). NOT a production backend: use the Apps Script deployment for real classes.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const split = require('./split');
const { createEngine } = require('../server/core');
const FileStore = require('../server/stores/file');

function start(opts) {
  opts = opts || {};
  const port = opts.port != null ? opts.port : Number(process.env.PORT || 8080);
  const dir = opts.dataDir || path.join(__dirname, '..', '.devdata');
  const { pub, priv } = split.load(); if (!priv) throw new Error('private/keys.json is required to run the server');
  const env = { sha256: s => crypto.createHash('sha256').update(s).digest('hex'), randomId: n => crypto.randomBytes(n).toString('base64url').replace(/[-_]/g, 'x').slice(0, n) };
  const pass = opts.teacherPasscode || process.env.CHM_TEACHER_PASSCODE || 'teacher-dev-pass';
  const salt = 'dev-salt';
  const store = new FileStore(dir, { teacher: { salt, hash: env.sha256(salt + pass), emails: [] }, now: opts.now });
  store.teacher = { salt, hash: env.sha256(salt + pass), emails: [] };
  if (!store.getClass('DEVCLASS')) store.saveClass({ code: 'DEVCLASS', name: 'Dev class', section: 'DEV', version: pub.version, status: 'open', opensAt: '', closesAt: '', requireRoster: false, revealMode: 'final', pacingFactor: 1 });
  const engine = createEngine({ pub, priv, store, env, now: opts.clock });
  const html = () => fs.readFileSync(path.join(__dirname, '..', 'dist', 'web', 'index.html'));
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/?'))) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end(html()); }
    if (req.method === 'POST' && req.url === '/api') {
      let body = ''; req.on('data', c => { body += c; if (body.length > 60000) req.destroy(); });
      req.on('end', () => {
        let out;
        try { const r = JSON.parse(body); out = engine.handle(String(r.action), r.payload || {}); } catch (e) { out = { ok: false, code: 'BAD_REQUEST', message: 'Bad request.' }; }
        if (opts.dropResponse && opts.dropResponse(out)) { req.socket.destroy(); return; }   // test hook: lose the response AFTER processing
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(out));
      });
      return;
    }
    res.writeHead(404); res.end('not found');
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port, store, engine, pub, priv, pass })));
}
module.exports = { start };
if (require.main === module) start().then(s => console.log('Dev server: http://127.0.0.1:' + s.port + '/  (class code DEVCLASS, teacher passcode ' + s.pass + ')'));
