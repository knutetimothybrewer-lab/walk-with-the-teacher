/* A tiny stand-in for the Apps Script web app, implementing the same protocol,
   so the browser tests can check what the app sends and how it retries. */
import http from 'node:http';

export function mockBackend({ codes = ['trail1', 'trail2'] } = {}) {
  const state = { finals: new Map(), submissions: [], starts: 0, down: false, resets: 0 };
  const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, ' ');
  const key = (st) => `${norm(st.first + ' ' + st.last)}|${norm(st.period)}|${norm(st.code)}`;
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    let body = '';
    req.on('data', d => { body += d; });
    req.on('end', () => {
      if (state.down) { res.writeHead(503); return res.end('down'); }
      let b; try { b = JSON.parse(body); } catch { res.writeHead(400); return res.end('{}'); }
      const send = (o) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
      if (b.action === 'start') {
        state.starts++;
        if (!codes.includes(norm(b.student.code))) return send({ ok: false, reason: 'code' });
        return send({ ok: true, status: state.finals.has(key(b.student)) ? 'duplicate' : 'new' });
      }
      if (b.action === 'submit') {
        const p = b.payload;
        if ([...state.finals.values()].some(x => x.completion === p.completion)) return send({ ok: true, dedup: true });
        if (state.finals.has(key(p.student))) return send({ ok: false, reason: 'duplicate' });
        state.finals.set(key(p.student), p); state.submissions.push(p);
        return send({ ok: true });
      }
      send({ ok: false, reason: 'unknown' });
    });
  });
  return new Promise(r => server.listen(0, () => {
    const port = server.address().port;
    r({ state, url: `http://localhost:${port}/exec`, close: () => server.close(), reset: (st) => { state.finals.delete(key(st)); state.resets++; } });
  }));
}
