/**
 * dev_server.js - try the whole system on your own computer with NO Google account:
 *     node tests/dev_server.js
 * then open  http://localhost:8787/teacher.html  (passcode: teacher)  and  http://localhost:8787/  (class code BLUE1, ID 10001).
 * It runs the real apps-script/*.gs files against an in-memory sheet and serves site/ next to it. Data resets on restart.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createEnv, ROOT } = require('./gas_harness');

function demoEnv({ students = 25 } = {}) {
  const env = createEnv();
  env.setup();
  env.setRows('Periods', [{ period: '1', class_code: 'BLUE1', label: 'Period 1' }, { period: '3', class_code: 'RED3', label: 'Period 3' }, { period: '5', class_code: 'GREEN5', label: 'Period 5' }]);
  env.setRows('Control', [{ period: '1' }, { period: '3' }, { period: '5' }]);
  const first = ['Ava', 'Ben', 'Cam', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jay', 'Kai', 'Lia', 'Max', 'Nia', 'Oz', 'Pia', 'Quin', 'Rae', 'Sol', 'Tia', 'Uma', 'Vic', 'Wes', 'Xia', 'Yul'];
  const last = ['Adams', 'Brooks', 'Clark', 'Diaz', 'Evans', 'Foster', 'Green', 'Hill', 'Ito', 'Jones'];
  const R = [];
  ['1', '3', '5'].forEach((p, pi) => { for (let i = 0; i < students; i++) R.push({ student_id: String(10001 + pi * 1000 + i), last: last[(i * 3 + pi) % last.length], first: first[i % first.length], period: p, active: 'Y' }); });
  env.setRows('Roster', R);
  env.loadItemBank();
  env.props.TEACHER_PASSCODE = 'teacher';
  return env;
}

function serve(env, port, pollSeconds = 2) {
  const SITE = path.join(ROOT, 'site');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
  return http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    if (req.method === 'POST' && url === '/api') {
      let body = ''; req.on('data', c => (body += c));
      req.on('end', () => {
        const out = env.ctx.doPost({ postData: { contents: body } });
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(out.getContent());
      });
      return;
    }
    if (url === '/config.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(`window.CONFIG={API_URL:'/api',POLL_SECONDS:${pollSeconds}};`); }
    const file = path.join(SITE, url === '/' ? 'index.html' : url);
    if (!file.startsWith(SITE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'text/plain' }); res.end(fs.readFileSync(file));
  }).listen(port);
}

if (require.main === module) {
  const PORT = Number(process.env.PORT) || 8787;
  serve(demoEnv(), PORT).on('listening', () => console.log(`Dev server: http://localhost:${PORT}/  (student)   http://localhost:${PORT}/teacher.html  (teacher, passcode: teacher)`));
}
module.exports = { demoEnv, serve };
