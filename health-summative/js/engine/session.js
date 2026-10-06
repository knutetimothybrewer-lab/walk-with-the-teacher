/* session.js — one student's progress. Autosaved to localStorage on every change. */
import { storage } from './storage.js';
import { hashStr } from './rng.js';
import { itemOutcome, totals } from './scoring.js';

export const studentKey = (s) =>
  `${s.first} ${s.last}`.trim().toLowerCase().replace(/\s+/g, ' ') + '|' + String(s.period).toLowerCase() + '|' + String(s.code).toLowerCase();

const key = (cfg, sk) => `wwt:${cfg.assessmentVersion}:s:${sk}`;
const activeKey = (cfg) => `wwt:${cfg.assessmentVersion}:active`;

export class Session {
  constructor(data, cfg) { Object.assign(this, data); this.cfg = cfg; }

  static create(student, cfg, { retakeNo = 0, settings = {}, codeVerified = 'local' } = {}) {
    const sk = studentKey(student);
    const now = Date.now();
    return new Session({
      v: 1, sk, student, retakeNo, codeVerified,
      seed: `${sk}|${retakeNo}|${cfg.assessmentVersion}`,
      startedAt: now, endedAt: null, activeMs: 0, lastTouch: now,
      pos: { station: 0, step: 0, phase: 'intro' },   // phase: intro | item | done
      stationsDone: [], items: {}, helpOpens: 0, status: 'in-progress',
      settings, result: null, sent: false,
    }, cfg);
  }

  static load(cfg, sk) {
    const d = storage.get(key(cfg, sk));
    return d ? new Session(d, cfg) : null;
  }
  static activeKey(cfg) { return storage.get(activeKey(cfg)); }
  static setActive(cfg, sk) { storage.set(activeKey(cfg), sk); }
  static clearActive(cfg) { storage.remove(activeKey(cfg)); }
  static remove(cfg, sk) { storage.remove(key(cfg, sk)); }

  save() {
    const { cfg, ...data } = this;
    storage.set(key(this.cfg, this.sk), data);
    Session.setActive(this.cfg, this.sk);
  }

  /** Count active time (gaps over 2 minutes count as 5 seconds). */
  touch() {
    const now = Date.now();
    const gap = now - this.lastTouch;
    this.activeMs += gap < 120000 ? gap : 5000;
    this.lastTouch = now;
  }

  itemState(id) { return (this.items[id] ||= { attempts: [], done: false, skipped: false, earned: 0, solved: false }); }

  /** Record one attempt. Returns the item state. */
  recordAttempt(rec, { fraction, resp, wrongSummary }) {
    this.touch();
    const st = this.itemState(rec.id);
    st.attempts.push({ fraction, t: Date.now() });
    st.resp = resp;
    if (st.attempts.length === 1 && fraction < 1 - 1e-9) st.firstWrong = wrongSummary || '';
    const out = itemOutcome(rec.points, st.attempts, this.cfg);
    st.earned = out.earned; st.solved = out.solved;
    st.done = out.solved || st.attempts.length >= this.cfg.maxAttempts;
    this.save();
    return st;
  }

  skip(rec) {
    this.touch();
    const st = this.itemState(rec.id);
    st.skipped = true; st.done = true; st.solved = true; st.earned = rec.points; st.attempts = [];
    this.save();
    return st;
  }

  rows(plan) {
    return plan.all.map(r => {
      const st = this.items[r.id];
      return { id: r.id, station: r.station, topic: r.topic, points: r.points, earned: st ? st.earned : 0 };
    });
  }

  totals(plan) { return totals(this.rows(plan)); }

  /** Seeded fingerprint for "same student, same device" checks. */
  fingerprint() { return hashStr(this.sk + this.startedAt).toString(36); }
}
