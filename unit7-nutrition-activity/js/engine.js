// Plan building (pools, branches, shuffling), session state, grading and submission payloads.
import { canon, answerHash, isComplete } from './canon.js';
import { MAX_ATTEMPTS, earnedFor, totals } from './scoring.js';
import { rng, seedFrom, shuffled, uid, sha256 } from './util.js';
import { deobf } from './obf.js';
import { NAMES } from './names.js';

export const stageKey = (s) => (s.kind === 'q' ? s.q.id : s.id);
export const partsOf = (s) => (s.kind === 'q' ? [s.q] : s.qs || []);

// ---- fictional-name substitution -------------------------------------------------------------------------
export function namesFor(seed) { return shuffled(NAMES, rng(seedFrom('names|' + seed))).slice(0, 3); }
export function subst(value, names) {
  if (typeof value === 'string') return value.replace(/\{N([123])\}/g, (_, d) => names[+d - 1]);
  if (Array.isArray(value)) return value.map((v) => subst(v, names));
  if (value && typeof value === 'object') { const o = {}; for (const [k, v] of Object.entries(value)) o[k] = (k === 'h' || k === 'x') ? v : subst(v, names); return o; }
  return value;
}

// ---- plan ----------------------------------------------------------------------------------------------
/** choices: map of choice-stage id -> chosen option key (unscored branching). Unchosen branches default to the first group. */
export function resolveMission(mission, seed, choices = {}) {
  const out = [];
  for (const st of mission.stages) {
    if (st.kind === 'pool') {
      const groups = st.by ? st.groups.filter((g) => g.when === (choices[st.by] || st.groups[0].when)) : st.groups;
      groups.forEach((g, gi) => {
        const r = rng(seedFrom(`${seed}|${st.id}|${gi}`));
        out.push(...shuffled(g.items, r).slice(0, g.pick));
      });
    } else out.push(st);
  }
  const res = [];
  for (let i = 0; i < out.length;) {
    const b = out[i].block;
    if (!b || out[i].kind === 'choice') { res.push(out[i++]); continue; }
    let j = i; while (j < out.length && out[j].block === b && out[j].kind !== 'choice') j++;
    const run = out.slice(i, j);
    res.push(...shuffled(run, rng(seedFrom(`${seed}|${mission.id}|${b}`))));
    i = j;
  }
  return res;
}
export function buildPlan(content, seed, choices = {}) {
  const names = namesFor(seed);
  const missions = content.missions.map((m) => ({ ...m, resolved: subst(resolveMission(m, seed, choices), names) }));
  const ids = missions.flatMap((m) => m.resolved.filter((s) => s.kind !== 'choice').map(stageKey));
  const versionId = 'V-' + sha256('v|' + seed).slice(0, 6).toUpperCase();
  return { missions, versionId, ids, names };
}
export const planParts = (plan) => plan.missions.flatMap((m) => m.resolved.flatMap(partsOf));

// ---- shuffled presentation of a question (deterministic per session) ------------------------------------
export function presentation(q, seed) {
  const r = rng(seedFrom(`${seed}|${q.id}`));
  const p = {};
  if (q.opts) p.opts = q.fixedOrder ? q.opts.slice() : shuffled(q.opts, r);
  if (q.items) p.items = shuffled(q.items, r);
  if (q.choices) p.choices = shuffled(q.choices, r);
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
  const plan = buildPlan(content, seed, {});
  return {
    v: 1, sid: 'S-' + uid(12), seed, versionId: plan.versionId, contentVersion: content.version,
    student, demo: !!demo, startedAt: Date.now(), activeMs: 0, screen: 'orient',
    pos: { m: -1, s: -1 }, stageIds: plan.ids, answers: {}, sims: {}, choices: {},
    submit: { status: 'none' }, completedAt: null, tamper: false, log: []
  };
}

export class Session {
  constructor(state, content, store, { onSave } = {}) {
    this.state = state; this.content = content; this.store = store; this.onSave = onSave;
    this.rebuild();
    this._t = Date.now();
  }
  rebuild() {
    this.plan = buildPlan(this.content, this.state.seed, this.state.choices || {});
    this.parts = planParts(this.plan);
    this.byId = Object.fromEntries(this.parts.map((q) => [q.id, q]));
    this.state.stageIds = this.plan.ids;
  }
  /** Unscored branching decision. Rebuilds the plan so later pools follow the choice. */
  setChoice(id, val) { this.state.choices = this.state.choices || {}; this.state.choices[id] = val; this.rebuild(); this.save(); }
  save() { this.store.saveSession(this.state); this.onSave && this.onSave(); }
  tickActive() { const now = Date.now(); const d = now - this._t; this._t = now; if (d > 0 && d < 60000 && !document.hidden) this.state.activeMs += d; }
  rec(qid) { return this.state.answers[qid]; }
  status(qid) { const r = this.rec(qid); return r ? r.status : 'open'; }
  isDone(qid) { const s = this.status(qid); return s === 'correct' || s === 'locked'; }
  attemptsUsed(qid) { const r = this.rec(qid); return r ? r.attempts.length : 0; }
  stageDone(stage) {
    if (stage.kind === 'choice') return !!(this.state.choices && this.state.choices[stage.id]);
    return partsOf(stage).every((q) => this.isDone(q.id));
  }
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
  cancelAttempt(q, pend) { pend.rec.attempts = pend.rec.attempts.filter((x) => x !== pend.a); this.save(); }
  /** Attempts left unresolved by a closed tab count as incorrect. */
  settlePending() {
    let changed = false;
    for (const rec of Object.values(this.state.answers)) {
      for (const a of rec.attempts) if (a.correct === null) { a.correct = false; changed = true; }
      if (rec.status === 'open' && rec.attempts.length >= MAX_ATTEMPTS && !rec.attempts.some((x) => x.correct)) { rec.status = 'locked'; changed = true; }
    }
    if (changed) this.save();
  }
  totals() { return totals(this.parts, this.state.answers); }
  allDone() { return this.parts.every((q) => this.isDone(q.id)); }
  /** Answered or locked parts / all parts, for the progress bar. */
  progress() { const done = this.parts.filter((q) => this.isDone(q.id)).length; return { done, total: this.parts.length, frac: this.parts.length ? done / this.parts.length : 0 }; }
  explanation(q) { return q.x ? subst(deobf(q.x, this.content.salt + q.id), this.plan.names) : (this.serverExplain && subst(this.serverExplain[q.id], this.plan.names)) || ''; }
}

// ---- local grading -------------------------------------------------------------------------------------
export function gradeLocal(content, q, resp) {
  if (!q.h) return null;
  return q.h.includes(answerHash(content.salt, q.id, canon(q.type, resp)));
}

// ---- submission payload ---------------------------------------------------------------------------------
export function buildSubmission(session, assessmentId) {
  const s = session.state, t = session.totals();
  return {
    action: 'submit', sid: s.sid, student: s.student, demo: s.demo, assessmentId, seed: s.seed, versionId: s.versionId, contentVersion: s.contentVersion,
    startedAt: s.startedAt, completedAt: s.completedAt, activeMs: s.activeMs, tamper: !!s.tamper, choices: s.choices || {},
    stageIds: s.stageIds,
    attempts: session.parts.flatMap((q) => {
      const rec = s.answers[q.id];
      return (rec ? rec.attempts : []).map((a) => ({ q: q.id, n: a.n, c: a.c, t: a.t }));
    }),
    clientScore: { earned: t.earned, possible: t.possible }
  };
}
export { isComplete };
