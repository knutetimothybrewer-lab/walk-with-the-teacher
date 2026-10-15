'use strict';
const path = require('path');
const W6 = require('../../server/core.js');
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
    uuid: () => { n++; return 'uuid-' + n + '-' + W6.sha256Hex('u' + n).slice(0, 24); },
    debug: true,
    log: (m) => { if (opts.verbose) console.error(m); }
  };
  const store = Mem.create({
    now: () => clock.t,
    bank: built.bank,
    config: {
      classCodes: { 'Block 1/2': 'CODE12', 'Block 3/4': 'CODE34', 'Block 8/9': 'CODE89' },
      defaultMinutes: 90, showScore: true, open: true, disabledItems: []
    }
  });
  const salt = 'salt';
  store.setTeacherHash({ salt, hash: W6.hashPassword('teacher-pass-1', salt) });
  env.store = store;
  const server = W6.createServer(env);
  const api = (action, payload) => server.handle(Object.assign({ action }, payload || {}));
  const S = { built, bank: built.bank, clock, store, server, api, env, log: [] };

  S.sid = (o) => W6.normName((o && o.firstName) || 'Ada').toUpperCase() + '.' + W6.normName((o && o.lastName) || 'Lovelace').toUpperCase();
  // Students are identified by first + last name. A test that needs another student passes `studentId` as a short tag, which becomes the first name.
  S.login = (o) => { o = Object.assign({ firstName: 'Ada', lastName: 'Lovelace', block: 'Block 1/2', classCode: 'CODE12' }, o || {}); if (o.studentId) { o.firstName = String(o.studentId).replace(/[^A-Za-z0-9]/g, ''); } delete o.studentId; return api('login', o); };
  S.student = (o) => { const r = S.login(o); if (!r.ok) throw new Error('login failed: ' + JSON.stringify(r)); return r.token; };
  S.gates = () => { const g = new Set(); Object.values(S.bank.items).forEach((i) => (i.gate || []).forEach((x) => g.add(x))); return Array.from(g); };
  // begin() also marks every simulation chip as done (as a student who finished the sims would). beginLocked() does not.
  S.beginLocked = (o) => { const token = S.student(o); const b = api('begin', { token }); if (!b.ok) throw new Error('begin failed: ' + JSON.stringify(b)); return { token, begin: b }; };
  S.begin = (o) => { const r = S.beginLocked(o); api('position', { token: r.token, ui: { ev: S.gates() } }); return r; };
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
    case 'numeric': case 'slider': return { value: k.value };
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
    case 'numeric': case 'slider': return { value: k.value + 1 };
  }
}

module.exports = { setup, correctResponse, wrongResponse, T0, ROOT, W6, Mem, demoBuild };
