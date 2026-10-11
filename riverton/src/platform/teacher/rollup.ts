import type { Profile } from '../profile/profileStore';
import type { ConceptDef } from '../learn/types';
import type { MCQuestion, Question } from '../questions/types';
import { isDone, SEGMENTS, type SegmentId } from '../storyline';

export interface Rollup {
  students: number; completion: Record<SegmentId, number>;
  concepts: { id: string; label: string; none: number; introduced: number; practiced: number; mastered: number }[];
  missed: { qid: string; prompt: string; attempts: number; wrong: number; rate: number; distractors: { text: string; count: number }[] }[];
  misconceptions: { id: string; count: number }[];
  rubric: { id: string; zero: number; one: number; two: number }[]; endings: Record<string, Record<string, number>>;
  lab: { n: number; hypothesisRightPct: number; targetedPct: number; surveyedPct: number; avgDays: number; avgBudget: number; scenarios: Record<string, number>; verdicts: Record<string, number>; interventions: Record<string, number> };
  city: { n: number; wonPct: number; avgReduced: number; avgDisplaced: number; built: Record<string, number> };
}
const inc = (o: Record<string, number>, k: string, by = 1) => { o[k] = (o[k] ?? 0) + by; };
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

/** Class roll-up from student profiles (exported files, or rebuilt from the Sheet). Pure. */
export function rollup(profiles: Profile[], concepts: ConceptDef[], bank: Question[]): Rollup {
  const completion = Object.fromEntries(SEGMENTS.map((s) => [s.id, 0])) as Record<SegmentId, number>;
  const byQ = new Map(bank.map((q) => [q.id, q])); const misc: Record<string, number> = {};
  const stat = new Map<string, { attempts: number; wrong: number; ch: Record<string, number> }>();
  for (const p of profiles) {
    for (const s of SEGMENTS) if (isDone(p, s.id)) completion[s.id]++;
    for (const r of p.responses) {
      if (r.correct == null || r.type === 'poe') continue; const e = stat.get(r.qid) ?? { attempts: 0, wrong: 0, ch: {} }; e.attempts++;
      if (r.correct === false) { e.wrong++; if (r.chosen) inc(e.ch, r.chosen); if (r.misconception) inc(misc, r.misconception); } stat.set(r.qid, e);
    }
  }
  const crows = concepts.map((c) => { const row = { id: c.id, label: c.label, none: 0, introduced: 0, practiced: 0, mastered: 0 }; for (const p of profiles) { const l = p.mastery[c.id]?.level ?? 'none'; row[l]++; } return row; });
  const missed = [...stat.entries()].filter(([, v]) => v.attempts >= 1 && v.wrong > 0).map(([qid, v]) => {
    const q = byQ.get(qid) as MCQuestion | undefined;
    return { qid, prompt: q?.prompt ?? qid, attempts: v.attempts, wrong: v.wrong, rate: v.wrong / v.attempts, distractors: Object.entries(v.ch).sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ text: q?.options?.find((o) => o.id === id)?.text ?? id, count })) };
  }).sort((a, b) => b.rate - a.rate || b.wrong - a.wrong).slice(0, 12);
  const rub: Record<string, [number, number, number]> = {}; const endings: Record<string, Record<string, number>> = {};
  for (const p of profiles) for (const [sc, c] of Object.entries(p.crossroads ?? {})) { inc((endings[sc] ??= {}), c.ending); for (const d of c.rubric) { const r = (rub[d.id] ??= [0, 0, 0]); r[Math.min(2, Math.max(0, Math.round((d.score / d.max) * 2)))]++; } }
  const labs = profiles.map((p) => p.lab).filter(Boolean) as NonNullable<Profile['lab']>[]; const scen: Record<string, number> = {}, ver: Record<string, number> = {}, iv: Record<string, number> = {};
  labs.forEach((l) => { inc(scen, l.scenario); inc(ver, l.caseDefVerdict); l.interventions.forEach((i) => inc(iv, i.kind)); });
  const cities = profiles.map((p) => p.city?.missions['close-the-gap']).filter(Boolean) as NonNullable<Profile['city']>['missions'][string][]; const built: Record<string, number> = {}; cities.forEach((c) => c.built.forEach((b) => inc(built, b)));
  return {
    students: profiles.length, completion, concepts: crows, missed, misconceptions: Object.entries(misc).map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    rubric: Object.entries(rub).map(([id, [zero, one, two]]) => ({ id, zero, one, two })), endings,
    lab: { n: labs.length, hypothesisRightPct: avg(labs.map((l) => +l.hypothesisRight)) * 100, targetedPct: avg(labs.map((l) => +l.targeted)) * 100, surveyedPct: avg(labs.map((l) => +(l.surveys > 0))) * 100, avgDays: avg(labs.map((l) => l.daysUsed)), avgBudget: avg(labs.map((l) => l.budgetUsed)), scenarios: scen, verdicts: ver, interventions: iv },
    city: { n: cities.length, wonPct: avg(cities.map((c) => +c.won)) * 100, avgReduced: avg(cities.map((c) => c.reduced)), avgDisplaced: avg(cities.map((c) => c.displacedPct)), built },
  };
}

const esc = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(esc).join(',')).join('\n');
export function studentsCsv(profiles: Profile[], concepts: ConceptDef[]): string {
  const head = ['student', 'period', ...SEGMENTS.map((s) => `done_${s.id}`), 'minutes_total', 'mastered_count', ...concepts.map((c) => c.id)];
  return toCsv([head, ...profiles.map((p) => [p.name, p.period, ...SEGMENTS.map((s) => (isDone(p, s.id) ? 1 : 0)), Math.round(Object.values(p.progress).reduce((a, m) => a + m.minutes, 0)), Object.values(p.mastery).filter((m) => m.level === 'mastered').length, ...concepts.map((c) => p.mastery[c.id]?.level ?? 'none')])]);
}
export function conceptsCsv(r: Rollup): string { return toCsv([['concept', 'not_met', 'introduced', 'practiced', 'mastered'], ...r.concepts.map((c) => [c.label, c.none, c.introduced, c.practiced, c.mastered])]); }

/** Rebuild lightweight profiles from the Sheet's roll-up endpoint so the same roll-up works without collecting files. */
export function sheetToProfiles(d: { events?: Record<string, unknown>[]; progress?: Record<string, unknown>[]; roster?: Record<string, unknown>[] }): Profile[] {
  const key = (n: unknown, per: unknown) => `${n}|${per}`; const m = new Map<string, Profile>();
  const get = (n: unknown, per: unknown) => { const k = key(n, per); if (!m.has(k)) m.set(k, { id: k, name: String(n), period: String(per ?? ''), created: 0, lastSeen: 0, progress: {}, mastery: {}, responses: [], written: [], notebook: { summaryCards: [], terms: [] }, lessonsDone: [] }); return m.get(k)!; };
  for (const r of d.roster ?? []) get(r.student, r.period);
  for (const e of d.events ?? []) { const p = get(e.student, e.period); p.responses.push({ id: String(e.id), t: Date.parse(String(e.timestamp)) || 0, qid: String(e.item), module: String(e.module) as never, concept: String(e.concept), type: String(e.type), correct: e.correct === '' ? null : e.correct === true || e.correct === 'TRUE', attempts: Number(e.attempts) || 1, hintUsed: e.hint_used === true || e.hint_used === 'TRUE', chosen: String(e.chosen ?? '') || undefined }); }
  const lvl = (n: number) => (n >= 100 ? 'mastered' : n >= 66 ? 'practiced' : n >= 33 ? 'introduced' : 'none');
  for (const pr of d.progress ?? []) { const p = get(pr.student, pr.period); const mod = String(pr.module); p.progress[mod] = { completed: String(pr.completed ?? '').split(',').map((x) => x.trim()).filter(Boolean), minutes: Number(pr.minutes) || 0 };
    try { for (const [c, v] of Object.entries(JSON.parse(String(pr.mastery_pct_by_concept ?? '{}')) as Record<string, number>)) p.mastery[c] = { level: lvl(v) as never, contexts: [], correct: 0, attempts: 0, lastSeen: 0 }; } catch { /* ignore */ } }
  return [...m.values()];
}
