'use strict';
const crypto = require('crypto');
const { createEngine } = require('../server/engine.js');
const { MemoryStore } = require('../server/stores/memory.js');
const G = require('../server/grading.js');
const U5 = require('../shared/core.js');

const env = {
  sha256: (s) => crypto.createHash('sha256').update(s).digest('hex'),
  randomId: (n) => crypto.randomBytes(Math.ceil(n)).toString('base64url').replace(/[-_]/g, 'x').slice(0, n)
};
function makeClock(start) { const c = { t: start || Date.UTC(2026, 9, 12, 14, 0, 0), now: () => c.t, adv(ms) { c.t += ms; return c.t; }, min(m) { c.t += m * 60000; return c.t; } }; return c; }
const CODES = { 'Block 1/2': 'GAMB1-AAAA', 'Block 3/4': 'GAMB2-BBBB', 'Block 6/7': 'GAMB3-CCCC', 'Block 8/9': 'GAMB4-DDDD' };
function setup(bank, opts) {
  opts = opts || {};
  const clock = opts.clock || makeClock();
  const store = new MemoryStore({ now: clock.now, roster: opts.roster });
  const engine = createEngine({ bank, store, env, now: clock.now, debug: true, pwIter: 5, timeLimitMin: opts.timeLimitMin });
  const codes = {}; U5.BLOCKS.forEach((b) => { codes[b] = { code: CODES[b], open: true }; });
  store.saveConfig({ codes, settings: {} });
  const salt = 'salt123';
  store.setTeacher({ salt, hash: engine.pwHash(salt, 'Teacher-Pass-1') });
  const call = (a, p) => engine.handle(a, p);
  const teacher = () => call('teacherLogin', { password: 'Teacher-Pass-1' }).teacherToken;
  return { engine, store, clock, call, teacher, codes: CODES };
}
function student(t, over) {
  const p = Object.assign({ firstName: 'Ada', lastName: 'Lovelace', studentId: '123456', block: 'Block 6/7', code: CODES['Block 6/7'] }, over || {});
  const r = t.call('login', p);
  return Object.assign({ r, p }, r.ok ? { sid: r.sessionId, token: r.token } : {});
}
let rid = 0;
function submit(t, st, itemId, response, extra) {
  return t.call('submit', Object.assign({ sessionId: st.sid, token: st.token, itemId, response, requestId: 'req-' + (++rid) + '-' + Math.random().toString(36).slice(2, 8) }, extra || {}));
}
// get the instantiated (private) item for a student, to craft correct/wrong answers
function itemFor(t, st, itemId) {
  const sess = t.store.getSession(st.sid);
  return G.instantiate(t.engine.index.items[itemId], sess);
}
module.exports = { env, makeClock, setup, student, submit, itemFor, CODES, G, U5 };
