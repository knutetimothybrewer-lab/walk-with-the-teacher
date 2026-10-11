import type { Cond, Effect, Vars } from './types';

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v));
export function evalCond(c: Cond | undefined, v: Vars): boolean {
  if (!c) return true;
  if ('all' in c) return c.all.every((x) => evalCond(x, v));
  if ('any' in c) return c.any.some((x) => evalCond(x, v));
  if ('not' in c) return !evalCond(c.not, v);
  const x = v[c.var];
  switch (c.op) {
    case '>=': return num(x) >= num(c.value);
    case '<=': return num(x) <= num(c.value);
    case '>': return num(x) > num(c.value);
    case '<': return num(x) < num(c.value);
    case '==': return x === c.value;
    case '!=': return x !== c.value;
    case 'includes': return Array.isArray(x) && x.includes(c.value as string);
    case 'notIncludes': return !Array.isArray(x) || !x.includes(c.value as string);
  }
}
export function applyEffects(effects: Effect[] | undefined, v: Vars): Vars {
  const out: Vars = { ...v };
  for (const e of effects ?? []) {
    if ('set' in e) out[e.set] = e.value;
    else if ('add' in e) { const n = (num(out[e.add]) || 0) + e.delta; out[e.add] = Math.min(e.max ?? 100, Math.max(e.min ?? 0, n)); }
    else if ('push' in e) { const a = Array.isArray(out[e.push]) ? [...(out[e.push] as string[])] : []; if (!a.includes(e.value)) a.push(e.value); out[e.push] = a; }
  }
  return out;
}
