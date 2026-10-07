'use strict';
const crypto = require('crypto');
const split = require('../tools/split');
const { createEngine } = require('../server/core');
const MemoryStore = require('../server/stores/memory');

const env = { sha256: s => crypto.createHash('sha256').update(s).digest('hex'), randomId: n => crypto.randomBytes(n).toString('base64url').replace(/[-_]/g, 'x').slice(0, n) };

function setup(extra) {
  const { pub, priv } = split.load();
  if (!priv) throw new Error('PRIVATE_KEYS_MISSING');
  const salt = 'testsalt';
  const store = new MemoryStore({ teacher: { salt, hash: env.sha256(salt + 'teach-pass'), emails: [] } });
  store.saveClass({ code: 'PERIOD3', name: 'Health P3', section: 'P3', version: pub.version, status: 'open', opensAt: '', closesAt: '', requireRoster: false, revealMode: 'final', pacingFactor: 1 });
  let t = Date.parse('2026-10-08T14:00:00Z');
  const clock = { now: () => t, advance: ms => { t += ms; } };
  const engine = createEngine(Object.assign({ pub, priv, store, env, now: clock.now }, extra || {}));
  const call = (a, p) => engine.handle(a, p);
  let n = 0; const rid = () => 'req-' + (++n) + '-' + Math.random().toString(36).slice(2, 8);
  return { pub, priv, store, engine, call, rid, clock, env };
}
function joinStudent(ctx, rosterId, name) {
  const r = ctx.call('join', { classCode: 'period3', rosterId: rosterId || 'stu001', name: name || 'Test Student', period: '3' });
  if (!r.ok) throw new Error('join failed ' + JSON.stringify(r));
  return r;
}
function teacher(ctx) { const r = ctx.call('teacherLogin', { passcode: 'teach-pass' }); if (!r.ok) throw new Error('login'); return r.teacherToken; }
module.exports = { hasKeys: () => !!split.load().priv, setup, joinStudent, teacher, env };
