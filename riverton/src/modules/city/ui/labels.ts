import labels from '../content/labels.json';
import { TUNING } from '../sim';
export const DET = labels.det as unknown as Record<string, [string, string]>;
export const BEH = labels.beh as unknown as Record<string, [string, string]>;
export const OUTL = labels.out as Record<string, string>;
export const SHORT = labels.short as Record<string, string>;
export const unitOf = (o: string) => (o === 'displacement' ? '%' : TUNING.outcomes[o]?.unit ?? '');
export const better = (o: string): 1 | -1 => (TUNING.outcomes[o]?.better ?? -1) as 1 | -1;
export const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));
export const monthName = (m: number) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m % 12];
export const season = (m: number) => { const k = m % 12; return k >= 2 && k <= 4 ? 'Spring' : k >= 5 && k <= 7 ? 'Summer' : k >= 8 && k <= 10 ? 'Fall' : 'Winter'; };
export const OVERLAYS: { id: string; label: string; kind: 'out' | 'det'; key: string; better: 1 | -1 }[] = [
  ...['lifeExpectancy', 'obesity', 'diabetes', 'hypertension', 'asthma', 'waterborne', 'leadElevated', 'infantMortality', 'preventableER', 'vaccination', 'uninsured', 'mentalDays'].map((o) => ({ id: 'out:' + o, label: OUTL[o], kind: 'out' as const, key: o, better: better(o) })),
  ...Object.entries(DET).map(([k, [n]]) => ({ id: 'det:' + k, label: n + ' (index)', kind: 'det' as const, key: k, better: 1 as const })),
];
