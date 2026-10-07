// Plan building (pools, shuffling), session state, grading and submission payloads.
import { canon, answerHash, isComplete } from './canon.js';
import { MAX_ATTEMPTS, earnedFor, totals } from './scoring.js';
import { rng, seedFrom, shuffled, uid, sha256 } from './util.js';
import { runChat } from './chatmodel.js';
import { deobf } from './obf.js';

export const stageKey = (s) => (s.kind === 'q' ? s.q.id : s.id);
export const partsOf = (s) => (s.kind === 'q' ? [s.q] : s.qs || []);

// ---- plan ----------------------------------------------------------------------------------------------
export function resolveMission(mission, seed) {
  const out = [];
  for (const st of mission.stages) {
    if (st.kind === 'pool') {
      st.groups.forEach((g, gi) => {
        const r = rng(seedFrom(`${seed}|${st.id}|${gi}`));
        const picks = shuffled(g.items, r).slice(0, g.pick);
        out.push(...picks);
      });
    } else out.push(st);
  }
  // shuffle runs of stages that share a `block` tag
  const res = [];
  for (let i = 0; i < out.length;) {
    const b = out[i].block;
    if (!b) { res.push(out[i++]); continue; }
    let j = i; while (j < out.length && out[j].block === b) j++;
    const run = out.slice(i, j);
    res.push(...shuffled(run, rng(seedFrom(`${seed}|${mission.id}|${b}`))));
    i = j;
  }
  return res;
}
export function buildPlan(content, seed) {
  const missions = content.missions.map((m) => ({ ...m, resolved: resolveMission(m, seed) }));
  const ids = missions.flatMap((m) => m.resolved.map(stageKey));
  const versionId = 'V-' + sha256(ids.join(',')).slice(0, 6).toUpperCase();
  return { missions, versionId, ids };
}
export const planParts = (plan) => plan.missions.flatMap((m) => m.resolved.flatMap(partsOf));

// ---- shuffled presentation of a question (deterministic per session) ------------------------------------
export function presentation(q, seed) {
  const r = rng(seedFrom(`${seed}|${q.id}`));
  const pins = q.pin || [];
  const sh = (arr, fixed) => (fixed ? arr.slice() : shuffled(arr, r));
  const pinSort = (arr) => [...arr.filter((o) => !pins.includes(o[0])), ...arr.filter((o) => pins.includes(o[0]))];
  const p = {};
  if (q.opts) p.opts = q.fixedOrder || q.type === 'predict' ? q.opts.slice() : pinSort(shuffled(q.opts.filter((o) => !pins.includes(o[0])), r).concat(q.opts.filter((o) => pins.includes(o[0]))));
  if (q.items) p.items = sh(q.items);
  if (q.choices) p.choices = sh(q.choices);
  if (q.slots) p.slots = q.slots.map((s) => ({ ...s, opts: shuffled(s.opts, r) }));
  if (q.steps) {
    let st = shuffled(q.steps, r);
    if (q.type === 'seq' && st.every((s, i) => s[0] === q.steps[i][0])) st = st.slice(1).concat(st.slice(0, 1));
    p.steps = st;
  }
  return p;
}

// ---- session -------------------------------------------------------------------------------------------
export function newState({ student, demo, content, seed }) {
  seed = seed || uid(12);
  const plan = buildPlan(content, seed);
  return {
    v: 1, sid: 'S-' + uid(12), seed, versionId: plan.versionId, contentVersion: content.version,
    student, demo: !!demo, startedAt: Date.now(), activeMs: 0, screen: 'orient',
    pos: { m: -1, s: -1 }, stageIds: plan.ids, answers: {}, sims: {}, practice: {},
    submit: { status: 'none' }, completedAt: null, tamper: false, log: []
  };
}

export class Session {
  constructor(state, content, store, { onSave } = {}) {
    this.state = state; this.content = content; this.store = store; this.onSave = onSave;
    this.plan = buildPlan(content, state.seed);
    this.parts = planParts(this.plan);
    this.byId = Object.fromEntries(this.parts.map((q) => [q.id, q]));
    this._t = Date.now();
  }
  save() { this.store.saveSession(this.state); this.onSave && this.onSave(); }
  tickActive() { const now = Date.now(); const d = now - this._t; this._t = now; if (d > 0 && d < 60000 && !document.hidden) this.state.activeMs += d; }
  rec(qid) { return this.state.answers[qid]; }
  status(qid) { const r = this.rec(qid); return r ? r.status : 'open'; }
  isDone(qid) { const s = this.status(qid); return s === 'correct' || s === 'locked'; }
  attemptsUsed(qid) { const r = this.rec(qid); return r ? r.attempts.length : 0; }
  stageDone(stage) { return partsOf(stage).every((q) => this.isDone(q.id)); }
  partAvailable(q, sceneId) {
    if (!q.after) return true;
    if (q.after === '@sim') return !!(this.state.sims[sceneId] && this.state.sims[sceneId].ready);
    return this.isDone(q.after);
  }
  /** Writes the attempt BEFORE grading so a refresh cannot undo it. Returns the pending record. */
  beginAttempt(q, resp) {
    const rec = this.state.answers[q.id] || (this.state.answers[q.id] = { attempts: [], status: 'open' });
    if (rec.status !== 'open') return null;
    const a = { n: rec.attempts.length + 1, resp, c: canon(q.type, resp), t: Date.now(), correct: null };
    rec.attempts.push(a);
    this.save();
    return { rec, a };
  }
  finishAttempt(q, pend, correct) {
    const { rec, a } = pend;
    a.correct = !!correct;
    if (correct) rec.status = 'correct';
    else if (a.n >= MAX_ATTEMPTS) rec.status = 'locked';
    this.save();
    return rec.status;
  }
  cancelAttempt(q, pend) { // only used when a server never saw the attempt
    pend.rec.attempts = pend.rec.attempts.filter((x) => x !== pend.a); this.save();
  }
  /** Attempts left unresolved by a closed tab count as incorrect. */
  settlePending() {
    let changed = false;
    for (const [qid, rec] of Object.entries(this.state.answers)) {
      for (const a of rec.attempts) if (a.correct === null) { a.correct = false; changed = true; }
      if (rec.status === 'open' && rec.attempts.length >= MAX_ATTEMPTS && !rec.attempts.some((x) => x.correct)) { rec.status = 'locked'; changed = true; }
    }
    if (changed) this.save();
  }
  totals() { return totals(this.parts, this.state.answers); }
  allDone() { return this.parts.every((q) => this.isDone(q.id)); }
  explanation(q) { return q.x ? deobf(q.x, this.content.salt + q.id) : (this.serverExplain && this.serverExplain[q.id]) || ''; }
}

// ---- local grading -------------------------------------------------------------------------------------
export function gradeLocal(content, q, resp) {
  if (!q.h) return null;
  return q.h.includes(answerHash(content.salt, q.id, canon(q.type, resp)));
}

// ---- submission payload ---------------------------------------------------------------------------------
export function buildSubmission(session) {
  const s = session.state, t = session.totals();
  return {
    action: 'submit', sid: s.sid, student: s.student, demo: s.demo, versionId: s.versionId, contentVersion: s.contentVersion,
    startedAt: s.startedAt, completedAt: s.completedAt, activeMs: s.activeMs, tamper: !!s.tamper,
    stageIds: s.stageIds,
    attempts: session.parts.flatMap((q) => {
      const rec = s.answers[q.id];
      return (rec ? rec.attempts : []).map((a) => ({ q: q.id, n: a.n, c: a.c, t: a.t }));
    }),
    clientScore: { earned: t.earned, possible: t.possible }
  };
}
export { isComplete, runChat };
