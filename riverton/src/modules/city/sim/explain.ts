import { TUNING } from './config';
import type { Beh, CityState, Contribution, Det, Out } from './types';

export interface Chain {
  src: string; label: string;
  steps: { kind: 'det' | 'beh' | 'out'; key: string; delta: number }[];
  share: number; // part of the outcome change this chain accounts for (same unit as the outcome)
}
export interface Explanation { hood: string; out: Out; from: number; to: number; delta: number; chains: Chain[]; bySource: { src: string; label: string; share: number }[] }

const bySrc = (l?: Contribution[]) => { const m = new Map<string, { label: string; amount: number }>(); for (const c of l ?? []) { const e = m.get(c.src) ?? { label: c.label, amount: 0 }; e.amount += c.amount; m.set(c.src, e); } return m; };
function srcDeltas(a?: Contribution[], b?: Contribution[]) {
  const A = bySrc(a), B = bySrc(b); const out: { src: string; label: string; d: number }[] = [];
  for (const k of new Set([...A.keys(), ...B.keys()])) out.push({ src: k, label: (B.get(k) ?? A.get(k))!.label, d: (B.get(k)?.amount ?? 0) - (A.get(k)?.amount ?? 0) });
  return out.filter((x) => Math.abs(x.d) > 1e-9);
}

/** "Why did this change?": trace an outcome change back through behaviors and determinants to named interventions. */
export function explainChange(state: CityState, hood: string, out: Out, m0: number, m1: number): Explanation {
  const s0 = state.history[m0]?.hoods[hood], s1 = state.history[m1]?.hoods[hood];
  if (!s0 || !s1) throw new Error('month outside history');
  const t = TUNING.outcomes[out];
  const delta = s1.out[out] - s0.out[out];
  const terms: { kind: 'beh' | 'det' | 'acute'; key: string; v: number }[] = [];
  for (const [k, c] of Object.entries(t.beh)) terms.push({ kind: 'beh', key: k, v: c * (s1.beh[k as Beh] - s0.beh[k as Beh]) });
  for (const [k, c] of Object.entries(t.det)) terms.push({ kind: 'det', key: k, v: c * (s1.det[k as Det] - s0.det[k as Det]) });
  if (t.acute) terms.push({ kind: 'acute', key: 'acute', v: t.acute * (s1.acute - s0.acute) });
  const total = terms.reduce((a, x) => a + x.v, 0);
  const scale = Math.abs(total) > 1e-12 ? delta / total : 0;
  const chains: Chain[] = [];

  const viaDet = (d: Det, share: number, pre: Chain['steps']) => {
    const parts = srcDeltas(s0.contribDet[d], s1.contribDet[d]); const den = parts.reduce((a, p) => a + p.d, 0);
    if (Math.abs(den) < 1e-9) return;
    const dd = s1.det[d] - s0.det[d];
    for (const p of parts) chains.push({ src: p.src, label: p.label, share: share * (p.d / den), steps: [{ kind: 'det', key: d, delta: dd * (p.d / den) }, ...pre, { kind: 'out', key: out, delta: share * (p.d / den) }] });
  };
  for (const term of terms) {
    const share = term.v * scale;
    if (Math.abs(share) < 1e-12) continue;
    if (term.kind === 'det') { viaDet(term.key as Det, share, []); continue; }
    if (term.kind === 'acute') { chains.push({ src: 'acute', label: 'Emergency care capacity', share, steps: [{ kind: 'out', key: out, delta: share }] }); continue; }
    const b = term.key as Beh;
    const parts: { src: string; label: string; d: number; via?: Det }[] = srcDeltas(s0.contribBeh[b], s1.contribBeh[b]).map((x) => ({ ...x }));
    for (const [d, coef] of Object.entries(TUNING.behaviorFromDeterminant[b])) {
      const dd = s1.det[d as Det] - s0.det[d as Det];
      for (const p of srcDeltas(s0.contribDet[d as Det], s1.contribDet[d as Det])) parts.push({ src: p.src, label: p.label, d: coef * p.d, via: d as Det });
    }
    const den = parts.reduce((a, p) => a + p.d, 0);
    if (Math.abs(den) < 1e-9) continue;
    const bd = s1.beh[b] - s0.beh[b];
    for (const p of parts) {
      const f = p.d / den;
      const steps: Chain['steps'] = [];
      if (p.via) steps.push({ kind: 'det', key: p.via, delta: p.d / (TUNING.behaviorFromDeterminant[b][p.via] || 1) });
      steps.push({ kind: 'beh', key: b, delta: bd * f }, { kind: 'out', key: out, delta: share * f });
      chains.push({ src: p.src, label: p.label, share: share * f, steps });
    }
  }
  const agg = new Map<string, { label: string; share: number }>();
  for (const c of chains) { const e = agg.get(c.src) ?? { label: c.label, share: 0 }; e.share += c.share; agg.set(c.src, e); }
  chains.sort((a, b) => Math.abs(b.share) - Math.abs(a.share));
  return { hood, out, from: s0.out[out], to: s1.out[out], delta, chains, bySource: [...agg].map(([src, v]) => ({ src, ...v })).sort((a, b) => Math.abs(b.share) - Math.abs(a.share)) };
}
