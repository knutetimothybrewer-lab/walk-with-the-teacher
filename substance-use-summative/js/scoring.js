// Three-attempt scoring. An "attempt" is one press of CHECK ANSWER.
// 1st try = 100%, 2nd = 85%, 3rd = 75%, never correct = 0.
export const ATTEMPT_CREDIT = [1, 0.85, 0.75];
export const MAX_ATTEMPTS = 3;

export const creditFor = (attemptNo) => ATTEMPT_CREDIT[attemptNo - 1] || 0;
export const roundPts = (x) => Math.round(x * 100) / 100;

// rec = { attempts:[{n, correct, resp, t}], status:'open'|'correct'|'locked' }
export function earnedFor(pts, rec) {
  if (!rec) return 0;
  const hit = rec.attempts.find((a) => a.correct);
  return hit ? roundPts(pts * creditFor(hit.n)) : 0;
}

export const DOMAINS = [
  ['brain', 'Brain & Addiction'],
  ['nicotine', 'Nicotine, Tobacco & Vaping'],
  ['alcohol', 'Alcohol'],
  ['cannabisRx', 'Cannabis & Prescription Drugs'],
  ['opioid', 'Opioids, Fentanyl & Emergency Response'],
  ['decision', 'Decision-Making & Refusal'],
  ['literacy', 'Health Literacy']
];
export const DOMAIN_NAME = Object.fromEntries(DOMAINS);

// parts: array of question definitions in the student's plan; answers: map id -> rec
export function totals(parts, answers) {
  const out = { earned: 0, possible: 0, first: 0, second: 0, third: 0, missed: 0, unanswered: 0, byDomain: {} };
  for (const [d] of DOMAINS) out.byDomain[d] = { earned: 0, possible: 0 };
  for (const q of parts) {
    const rec = answers[q.id];
    const e = earnedFor(q.pts, rec);
    out.possible += q.pts;
    out.earned += e;
    const bd = out.byDomain[q.domain];
    bd.possible += q.pts; bd.earned += e;
    const hit = rec && rec.attempts.find((a) => a.correct);
    if (hit) { if (hit.n === 1) out.first++; else if (hit.n === 2) out.second++; else out.third++; }
    else if (rec && rec.status === 'locked') out.missed++;
    else out.unanswered++;
  }
  out.earned = roundPts(out.earned); out.possible = roundPts(out.possible);
  for (const d of Object.values(out.byDomain)) { d.earned = roundPts(d.earned); d.possible = roundPts(d.possible); }
  out.pct = out.possible ? Math.round((out.earned / out.possible) * 1000) / 10 : 0;
  return out;
}
