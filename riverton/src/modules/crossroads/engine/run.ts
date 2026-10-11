import { applyEffects, evalCond } from './cond';
import type { Choice, Node, Reasoning, Run, Scenario, Vars, VoteNode, ChoiceNode, ListenNode, ChanceNode, RouteNode } from './types';

export interface Ctx { project?: (vars: Vars, seed: number) => Vars }

const nodeMap = new WeakMap<Scenario, Map<string, Node>>();
export function nodeOf(sc: Scenario, id: string): Node {
  let m = nodeMap.get(sc); if (!m || m.size !== sc.nodes.length) { m = new Map(sc.nodes.map((n) => [n.id, n])); nodeMap.set(sc, m); }
  const n = m.get(id); if (!n) throw new Error(`Unknown node ${id} in ${sc.id}`); return n;
}
export const current = (sc: Scenario, run: Run) => nodeOf(sc, run.node);

function rnd(run: { rng: number }): number {
  run.rng = (run.rng + 0x6d2b79f5) >>> 0; let t = run.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const clone = (r: Run): Run => structuredClone(r);

export function startRun(sc: Scenario, seed: number, extraVars: Vars = {}, ctx: Ctx = {}): Run {
  const run: Run = { scenarioId: sc.id, node: sc.start, vars: { ...sc.vars, ...extraVars }, rng: (seed ^ 0xa5a5a5a5) >>> 0, seed, history: [], reasoning: [], visited: [], done: false };
  return enter(sc, run, sc.start, ctx);
}

/** Move to a node, apply its onEnter effects, and resolve automatic nodes (chance, project, route). */
function enter(sc: Scenario, run: Run, id: string, ctx: Ctx): Run {
  let nid = id;
  for (let guard = 0; guard < 50; guard++) {
    const n = nodeOf(sc, nid);
    run.node = nid; run.visited.push(nid);
    if (n.onEnter) run.vars = applyEffects(n.onEnter, run.vars);
    if (n.type === 'end') { run.done = true; run.ending = n.ending.id; return run; }
    if (n.type === 'chance') {
      const c = n as ChanceNode; let u = rnd(run), pick = c.outcomes[c.outcomes.length - 1];
      for (const o of c.outcomes) { if (u < o.p) { pick = o; break; } u -= o.p; }
      run.history.push({ node: nid, kind: 'chance', pick: pick.id, vars: structuredClone(run.vars), rng: run.rng });
      run.vars = applyEffects(pick.effects, { ...run.vars, [c.key]: pick.id }); nid = c.next; continue;
    }
    if (n.type === 'project') {
      if (ctx.project) run.vars = ctx.project(run.vars, run.seed);
      nid = n.next; continue;
    }
    if (n.type === 'route') {
      const r = n as RouteNode; nid = (r.routes.find((x) => evalCond(x.if, run.vars))?.next) ?? r.default; continue;
    }
    return run;
  }
  throw new Error('Automatic node loop in ' + sc.id);
}

/** Continue from a linear node (scene, chat, data, compare, reflect, listen, proposal, project). */
export function proceed(sc: Scenario, run: Run, ctx: Ctx = {}): Run {
  const n = current(sc, run); const r = clone(run);
  if (!('next' in n)) throw new Error(`Node ${n.id} has no next`);
  return enter(sc, r, n.next, ctx);
}

export const availableChoices = (n: ChoiceNode, vars: Vars): Choice[] => n.choices.filter((c) => evalCond(c.if, vars));

export function choose(sc: Scenario, run: Run, choiceId: string, ctx: Ctx = {}): Run {
  const n = current(sc, run); if (n.type !== 'choice') throw new Error('Not a choice node');
  const c = availableChoices(n, run.vars).find((x) => x.id === choiceId); if (!c) throw new Error(`Choice ${choiceId} unavailable`);
  const r = clone(run);
  r.history.push({ node: n.id, kind: 'choice', pick: c.id, vars: structuredClone(run.vars), rng: run.rng });
  r.vars = applyEffects(c.effects, r.vars);
  r.vars = applyEffects([{ push: 'choices', value: `${n.id}:${c.id}` }], r.vars);
  return enter(sc, r, c.next, ctx);
}

export function submitReason(sc: Scenario, run: Run, payload: unknown, ctx: Ctx = {}): Run {
  const n = current(sc, run); if (n.type !== 'reason') throw new Error('Not a reason node');
  const r = clone(run); r.reasoning.push({ node: n.id, kind: n.kind, payload } as Reasoning);
  r.history.push({ node: n.id, kind: 'reason', vars: structuredClone(run.vars), rng: run.rng });
  return enter(sc, r, n.next, ctx);
}

export function listenLimit(n: ListenNode, vars: Vars): number { return n.pickBase + (n.pickBonus && evalCond(n.pickBonus.if, vars) ? n.pickBonus.extra : 0); }
export function listenAvailable(n: ListenNode, vars: Vars) { return n.stakeholders.filter((s) => evalCond(s.requires, vars)); }
export function listenPick(sc: Scenario, run: Run, stakeholderId: string): Run {
  const n = current(sc, run); if (n.type !== 'listen') throw new Error('Not a listen node');
  const heard = (run.vars.heard as string[] | undefined) ?? [];
  if (heard.includes(stakeholderId) || heard.length >= listenLimit(n, run.vars)) return run;
  if (!listenAvailable(n, run.vars).some((s) => s.id === stakeholderId)) return run;
  const r = clone(run); r.vars = applyEffects([{ push: 'heard', value: stakeholderId }], r.vars);
  r.reasoning.push({ node: n.id, kind: 'listen', payload: stakeholderId });
  return r;
}

export function castVote(sc: Scenario, run: Run, ctx: Ctx = {}): { run: Run; votes: { id: string; name: string; yes: boolean; score: number }[] } {
  const n = current(sc, run) as VoteNode; if (n.type !== 'vote') throw new Error('Not a vote node');
  const r = clone(run);
  const votes = n.voters.map((v) => {
    const score = v.base + v.lean.reduce((a, l) => a + l.w * (Number(r.vars[l.var]) || 0), 0) + (rnd(r) - 0.5) * 0.6;
    return { id: v.id, name: v.name, yes: score > 0, score };
  });
  const yes = votes.filter((v) => v.yes).length;
  r.vars = { ...r.vars, votesYes: yes, votesNo: votes.length - yes, votePassed: yes >= n.need };
  r.history.push({ node: n.id, kind: 'vote', pick: yes >= n.need ? 'pass' : 'fail', vars: structuredClone(run.vars), rng: run.rng });
  return { run: enter(sc, r, yes >= n.need ? n.passNext : n.failNext, ctx), votes };
}

export function setVars(run: Run, patch: Vars): Run { const r = clone(run); r.vars = { ...r.vars, ...patch }; return r; }

/** What-if: rewind to a recorded decision so a different branch can be tried. */
export function rewindTo(sc: Scenario, run: Run, historyIndex: number): Run {
  const h = run.history[historyIndex]; if (!h) throw new Error('No such history entry');
  const r = clone(run);
  r.history = r.history.slice(0, historyIndex); r.vars = structuredClone(h.vars); r.rng = h.rng; r.node = h.node; r.done = false; r.ending = undefined;
  r.reasoning = r.reasoning.slice(0, r.reasoning.filter((x) => r.history.some((e) => e.node === x.node)).length);
  r.visited = r.visited.slice(0, Math.max(1, r.visited.lastIndexOf(h.node) + 1));
  void sc; return r;
}

/** Town Hall proposal submission: validates the budget and records the features that drive the vote. */
export function submitProposal(sc: Scenario, run: Run, accepted: Vars, ctx: Ctx = {}): Run {
  const n = current(sc, run); if (n.type !== 'proposal') throw new Error('Not a proposal node');
  const r = clone(run); r.vars = { ...r.vars, ...accepted };
  r.reasoning.push({ node: n.id, kind: 'proposal', payload: accepted.proposal });
  r.history.push({ node: n.id, kind: 'proposal', vars: structuredClone(run.vars), rng: run.rng });
  return enter(sc, r, n.next, ctx);
}
