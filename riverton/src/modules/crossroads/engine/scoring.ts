import type { Run } from './types';

export interface RubricDim { id: string; label: string; score: 0 | 1 | 2; max: 2; note: string }
const get = <T,>(run: Run, kind: string): T[] => run.reasoning.filter((r) => r.kind === kind).map((r) => r.payload as T);
const RESIDENTS = ['elder', 'parent', 'teen', 'pastor', 'storeowner'];

/** Scores the reasoning, never the choices. Structured inputs only; free text is for the teacher. */
export function scoreReasoning(run: Run): { dims: RubricDim[]; total: number; max: number } {
  const evidence = get<{ ids: string[] }>(run, 'evidence').flatMap((e) => e.ids);
  const data = evidence.filter((i) => i.startsWith('data:')).length, voices = new Set(evidence.filter((i) => i.startsWith('voice:'))).size;
  const impact = get<{ assignments: Record<string, string> }>(run, 'impact');
  const placed = Math.max(0, ...impact.map((i) => Object.keys(i.assignments).length)); const left = impact.some((i) => Object.values(i.assignments).includes('left'));
  const heard = (run.vars.heard as string[] | undefined) ?? [];
  const resident = heard.filter((h) => RESIDENTS.includes(h)).length;
  const equity = get<{ direction: string; forWhom: string }>(run, 'equity');
  const trade = get<{ gives: string[] }>(run, 'tradeoffs'); const alts = get<{ text: string }>(run, 'alternatives');
  const dvo = get<{ correct: boolean }>(run, 'decisionVsOutcome');
  const proj = run.vars.proj as { gapBefore: number; gapAfter: number } | undefined;
  const narrowed = proj ? proj.gapAfter < proj.gapBefore - 0.05 : undefined;
  const eqOk = equity.length > 0 && equity[equity.length - 1].forWhom && (narrowed === undefined ? true : (equity[equity.length - 1].direction === 'narrows') === narrowed || equity[equity.length - 1].direction === 'unclear');
  const dim = (id: string, label: string, score: 0 | 1 | 2, note: string): RubricDim => ({ id, label, score, max: 2, note });
  const dims = [
    dim('data', 'Uses data as evidence', data >= 2 ? 2 : data === 1 ? 1 : 0, data ? `You cited ${data} data point(s).` : 'No data was cited. Data shows patterns residents may not see.'),
    dim('stakeholders', 'Considers multiple stakeholders', placed >= 5 || voices >= 3 ? 2 : placed >= 3 || voices >= 2 ? 1 : 0, `You placed ${placed} stakeholder(s) on the impact board and cited ${voices} voice(s).`),
    dim('voice', 'Includes community voice', resident >= 3 ? 2 : resident >= 1 ? 1 : 0, `You listened to ${resident} resident stakeholder(s).${run.vars.session === 'saturday' ? ' Your Saturday session made it possible for more residents to attend.' : ''}`),
    dim('equity', 'Weighs equity', equity.length && eqOk ? 2 : equity.length ? 1 : 0, equity.length ? (eqOk ? 'Your equity judgment matches what the projection shows, or you acknowledged uncertainty.' : 'Your equity judgment differs from the projection. Revisit who benefits.') : 'No equity check was recorded.'),
    dim('tradeoffs', 'Identifies trade-offs', trade.some((t) => t.gives.length) ? 2 : trade.length ? 1 : 0, trade.length ? 'You named what is given up.' : 'Every choice has a cost: say what it is.'),
    dim('alternatives', 'Generates alternatives', alts.some((a) => a.text.trim().length >= 15) ? 2 : alts.length ? 1 : 0, alts.length ? 'You named an alternative.' : 'Think about what else could be done.'),
    dim('decision', 'Separates decision quality from outcome', dvo.length ? (dvo[dvo.length - 1].correct ? 2 : 1) : 0, dvo.length ? 'You reflected on luck versus judgment.' : 'Not yet answered.'),
  ];
  void left;
  return { dims, total: dims.reduce((a, d) => a + d.score, 0), max: dims.length * 2 };
}
