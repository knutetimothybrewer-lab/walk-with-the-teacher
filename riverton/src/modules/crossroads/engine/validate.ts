import type { Cond, Node, Scenario } from './types';

export interface ScenarioReport { errors: string[]; warnings: string[]; endings: string[]; reachable: number; total: number }

const edges = (n: Node): string[] => {
  switch (n.type) {
    case 'end': return [];
    case 'choice': return n.choices.map((c) => c.next);
    case 'vote': return [n.passNext, n.failNext];
    case 'route': return [...n.routes.map((r) => r.next), n.default];
    default: return [n.next];
  }
};
const condVars = (c: Cond | undefined): string[] => !c ? [] : 'all' in c ? c.all.flatMap(condVars) : 'any' in c ? c.any.flatMap(condVars) : 'not' in c ? condVars(c.not) : [c.var];

/** Static checks: dead ends, unreachable nodes, broken references, missing reflection prompts, ending counts. */
export function validateScenario(sc: Scenario, ctx: { questionIds: Set<string>; castIds: Set<string> }): ScenarioReport {
  const errors: string[] = []; const warnings: string[] = []; const err = (m: string) => errors.push(`${sc.id}: ${m}`);
  const byId = new Map<string, Node>();
  for (const n of sc.nodes) { if (byId.has(n.id)) err(`duplicate node id ${n.id}`); byId.set(n.id, n); }
  if (!byId.has(sc.start)) err(`start node ${sc.start} does not exist`);
  for (const n of sc.nodes) for (const t of edges(n)) if (!byId.has(t)) err(`${n.id} points to missing node ${t}`);

  const seen = new Set<string>(); const stack = [sc.start];
  while (stack.length) { const id = stack.pop()!; if (seen.has(id) || !byId.has(id)) continue; seen.add(id); stack.push(...edges(byId.get(id)!)); }
  for (const n of sc.nodes) if (!seen.has(n.id)) err(`node ${n.id} is unreachable`);

  const reachableEnds = [...seen].map((id) => byId.get(id)!).filter((n) => n.type === 'end') as Extract<Node, { type: 'end' }>[];
  const endings = [...new Set(reachableEnds.map((e) => e.ending.id))];
  if (endings.length < sc.minEndings) err(`needs at least ${sc.minEndings} reachable endings, has ${endings.length}`);
  for (const n of sc.nodes) if (n.type !== 'end' && edges(n).length === 0) err(`${n.id} is a dead end`);

  // every decision must be followed by a reasoning prompt before the next decision or an ending
  const followedByReason = (start: string, visited = new Set<string>()): boolean => {
    if (visited.has(start)) return true; visited.add(start);
    const n = byId.get(start); if (!n) return false;
    if (n.type === 'reason') return true;
    if (n.type === 'choice' || n.type === 'end' || n.type === 'reflect') return false;
    return edges(n).every((t) => followedByReason(t, visited));
  };
  for (const n of sc.nodes) if (n.type === 'choice' && n.decision) for (const c of n.choices) if (!followedByReason(c.next)) err(`decision ${n.id}/${c.id} is not followed by a reasoning prompt`);

  if (!sc.nodes.some((n) => n.type === 'chance')) err('needs at least one probabilistic (chance) outcome');
  if (!sc.nodes.some((n) => n.type === 'compare')) err('needs a data-vs-perception moment (compare node)');
  if (!sc.nodes.some((n) => n.type === 'reflect')) err('needs a reflection prompt');
  if (!ctx.questionIds.has(sc.debrief.cer)) err(`debrief CER question ${sc.debrief.cer} is missing`);

  const declared = new Set(Object.keys(sc.vars));
  for (const n of sc.nodes) {
    if (n.type === 'reflect' && !ctx.questionIds.has(n.question)) err(`${n.id}: reflection question ${n.question} is missing`);
    if (n.type === 'data' && n.question && !ctx.questionIds.has(n.question)) err(`${n.id}: question ${n.question} is missing`);
    if (n.type === 'choice') {
      if (n.choices.length < 2) err(`${n.id}: a choice needs at least two options`);
      if (n.defaultChoice && !n.choices.some((c) => c.id === n.defaultChoice)) err(`${n.id}: defaultChoice is not an option`);
      if (n.choices.every((c) => c.if)) warnings.push(`${n.id}: every option is conditional`);
      for (const c of n.choices) for (const v of condVars(c.if)) if (!declared.has(v)) warnings.push(`${n.id}/${c.id}: condition uses undeclared variable ${v}`);
    }
    if (n.type === 'chance' && Math.abs(n.outcomes.reduce((a, o) => a + o.p, 0) - 1) > 1e-6) err(`${n.id}: probabilities must sum to 1`);
    const lines = n.type === 'scene' ? n.lines : n.type === 'end' ? n.lines ?? [] : n.type === 'listen' ? n.stakeholders.flatMap((s) => s.lines) : [];
    for (const l of lines) { if (!l.text?.trim()) err(`${n.id}: empty dialogue line`); if (l.who && !ctx.castIds.has(l.who) && !['narrator', 'you', 'crowd'].includes(l.who)) err(`${n.id}: unknown speaker ${l.who}`); }
    if (n.type === 'scene') for (const c of n.cast ?? []) if (!ctx.castIds.has(c.who)) err(`${n.id}: unknown cast member ${c.who}`);
  }
  return { errors, warnings, endings, reachable: seen.size, total: sc.nodes.length };
}
