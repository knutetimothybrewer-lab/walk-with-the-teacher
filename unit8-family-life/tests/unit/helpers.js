'use strict';
const path = require('path');
const W8 = require('../../server/core.js');
const Mem = require('../../server/memory-store.js');
const { build } = require('../../tools/lib/builder.js');

const ROOT = path.join(__dirname, '..', '..');
const T0 = Date.UTC(2026, 9, 8, 14, 0, 0); // fixed "now" so tests are deterministic

function demoBuild() { return build(require(path.join(ROOT, 'content/demo/authoring.js')), { demo: true }); }

function setup(opts) {
  opts = opts || {};
  const built = opts.built || demoBuild();
  if (built.errors.length) throw new Error('demo bank has lint errors: ' + built.errors.join('; '));
  const clock = { t: T0, advance(ms) { this.t += ms; return this.t; } };
  let n = 0;
  const env = {
    now: () => clock.t,
    uuid: () => { n++; return 'uuid-' + n + '-' + W8.sha256Hex('u' + n).slice(0, 24); },
    debug: true,
    log: (m) => { if (opts.verbose) console.error(m); }
  };
  const store = Mem.create({
    now: () => clock.t,
    bank: built.bank,
    config: {
      classCodes: { 'Block 1/2': 'CODE12', 'Block 3/4': 'CODE34', 'Block 6/7': 'CODE67', 'Block 8/9': 'CODE89' },
      defaultMinutes: 90, showScore: true, open: true, disabledItems: []
    }
  });
  const salt = 'salt';
  store.setTeacherHash({ salt, hash: W8.hashPassword('teacher-pass-1', salt) });
  env.store = store;
  const server = W8.createServer(env);
  const api = (action, payload) => server.handle(Object.assign({ action }, payload || {}));
  const S = { built, bank: built.bank, clock, store, server, api, env, log: [] };

  S.login = (o) => api('login', Object.assign({ firstName: 'Ada', lastName: 'Lovelace', studentId: 'S1001', block: 'Block 1/2', classCode: 'CODE12' }, o || {}));
  S.student = (o) => { const r = S.login(o); if (!r.ok) throw new Error('login failed: ' + JSON.stringify(r)); return r.token; };
  S.begin = (o) => { const token = S.student(o); const b = api('begin', { token }); if (!b.ok) throw new Error('begin failed: ' + JSON.stringify(b)); return { token, begin: b }; };
  S.teacher = () => { const r = api('teacherLogin', { password: 'teacher-pass-1' }); if (!r.ok) throw new Error('teacher login failed'); return r.teacherToken; };
  S.ids = () => Object.keys(S.bank.items).sort((a, b) => S.bank.items[a].order - S.bank.items[b].order);
  return S;
}

function correctResponse(bi) {
  const k = bi.key;
  switch (bi.type) {
    case 'single': return { choice: k.correct };
    case 'multi': return { choices: k.correct.slice() };
    case 'assign': return { map: Object.assign({}, k.map) };
    case 'order': return { order: k.order.slice() };
    case 'numeric': return { value: k.value };
  }
}
function wrongResponse(bi) {
  const k = bi.key, st = bi.struct;
  switch (bi.type) {
    case 'single': return { choice: st.optionIds.find((id) => id !== k.correct) };
    case 'multi': return { choices: [k.correct[0]] };
    case 'assign': {
      const map = Object.assign({}, k.map), keys = Object.keys(map);
      if (st.fill === 'targets') { const a = keys[0], b = keys[1]; const t = map[a]; map[a] = map[b]; map[b] = t; }
      else {
        const k0 = keys[0]; const other = st.targetIds.find((t) => t !== map[k0]); map[k0] = other;
      }
      return { map };
    }
    case 'order': { const o = k.order.slice(); const t = o[0]; o[0] = o[1]; o[1] = t; return { order: o }; }
    case 'numeric': return { value: k.value + 1 };
  }
}

module.exports = { setup, correctResponse, wrongResponse, T0, ROOT, W8, Mem, demoBuild };
