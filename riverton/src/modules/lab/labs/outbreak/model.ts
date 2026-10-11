import world from '../../../../content/shared/riverton-world.json';
import P from './params.json';
import { hash01, normal, poisson } from '../../engine/hash';
import { next as rngNext } from '../../engine/rng';

export type Scenario = 'water' | 'vendor' | 'pool' | 'person';
export const SCENARIOS: readonly Scenario[] = ['water', 'vendor', 'pool', 'person'];
export const SYMPTOMS = ['diarrhea', 'vomiting', 'cramps', 'nausea', 'fever', 'headache', 'cough'] as const;
export type Symptom = (typeof SYMPTOMS)[number];
export const EXPOSURES = ['festival', 'tacos', 'wraps', 'lemonade', 'diner', 'pool', 'tapWater'] as const;
export type Exposure = (typeof EXPOSURES)[number];
export const EXPOSURE_LABELS: Record<Exposure, string> = {
  festival: 'Went to the Riverton Community Festival', tacos: 'Ate at Lopez Tacos (festival)', wraps: 'Ate at Big Al’s Wraps (festival)',
  lemonade: 'Drank Sweet Bites lemonade (festival)', diner: 'Ate at Maple Street Diner', pool: 'Swam at the Riverside public pool', tapWater: 'Drank tap water at home',
};

export interface Resident {
  id: number; hood: string; age: number; sex: 'F' | 'M'; hh: number; school: number | null; nursing: boolean;
  festival: boolean; tacos: boolean; wraps: boolean; lemonade: boolean; diner: boolean; pool: boolean; tap: boolean;
  bg: Symptom[] | null; // symptoms of a background (non-outbreak) illness during the outbreak period
}
export interface Truth {
  seed: number; scenario: Scenario; hood: string | null; institution: { kind: 'school' | 'nursing'; id: number; hood: string } | null;
  residents: Resident[]; days: number; baselineER: number[];
  source: { type: Scenario; label: string; curve: 'point' | 'continuous' | 'propagated'; detail: string };
}
export type Iv = { kind: 'boil_water' | 'fix_main' | 'close_vendor' | 'close_pool' | 'hand_hygiene' | 'exclusion'; day: number };
export interface Infection {
  id: number; expHr: number; onsetHr: number; onsetDay: number; sym: boolean; symptoms: Symptom[]; dur: number;
  primary: boolean; care: boolean; er: boolean; erDay: number | null; reported: boolean; reportDay: number | null;
}
export interface Sim { infections: Infection[]; byId: Map<number, Infection>; er: number[]; days: number }

const SCENARIO_LABEL: Record<Scenario, string> = {
  water: 'Contaminated water after a main break', vendor: 'Contaminated food from a festival vendor', pool: 'Contaminated public pool', person: 'Person-to-person spread',
};
const hoodDefs = world.neighborhoods;

// ------------------------------------------------------------------ truth
export function generateTruth(seed: number, scenario: Scenario | 'random' = 'random'): Truth {
  const s = { rng: (seed ^ 0x51ed270b) >>> 0 };
  const sc: Scenario = scenario === 'random' ? SCENARIOS[Math.floor(rngNext(s) * 4)] : scenario;
  const N = P.population; const totalPop = hoodDefs.reduce((a, h) => a + h.profile.population, 0);
  const residents: Resident[] = []; let id = 0; let hh = 0;
  const waterHood = rngNext(s) < 0.5 ? 'oldtown' : 'riverside';
  for (const h of hoodDefs) {
    const n = Math.round((N * h.profile.population) / totalPop);
    let left = 0;
    for (let i = 0; i < n; i++) {
      if (left === 0) { hh++; left = 1 + Math.floor(rngNext(s) * 5); }
      left--;
      const u = rngNext(s); const age = u < 0.22 ? Math.floor(rngNext(s) * 18) : u < 0.84 ? 18 + Math.floor(rngNext(s) * 47) : 65 + Math.floor(rngNext(s) * 28);
      const festival = rngNext(s) < (P.festivalByHood as Record<string, number>)[h.id];
      const diner = rngNext(s) < (festival ? P.exposure.dinerGivenFestival : P.exposure.diner);
      const bgR = rngNext(s);
      const bg: Symptom[] | null = bgR < P.background.gi ? pick(s, P.background.symptomsGI as Symptom[]) : bgR < P.background.gi + P.background.other ? pick(s, P.background.symptomsOther as Symptom[]) : null;
      residents.push({
        id: id++, hood: h.id, age, sex: rngNext(s) < 0.5 ? 'F' : 'M', hh, school: age >= 5 && age < 18 ? hoodDefs.indexOf(h) * 10 + Math.floor((age - 5) / 4) : null, nursing: false,
        festival, tacos: festival && rngNext(s) < P.exposure.tacos, wraps: festival && rngNext(s) < P.exposure.wraps, lemonade: festival && rngNext(s) < P.exposure.lemonade, diner,
        pool: rngNext(s) < (age < 18 ? P.exposure.poolChild : P.exposure.poolAdult), tap: rngNext(s) < P.exposure.tap, bg,
      });
    }
  }
  // nursing home: 45 older Southfield residents share an institution (household id of their own)
  const nh = residents.filter((r) => r.hood === 'southfield' && r.age >= 70).slice(0, 45);
  nh.forEach((r) => { r.nursing = true; r.hh = 100000; });
  residents.filter((r) => r.hood === 'southfield' && r.age >= 25 && r.age < 60 && !r.nursing).slice(0, P.contact.nursingStaff).forEach((r) => { r.nursing = true; }); // staff keep their own households
  let institution: Truth['institution'] = null; let hood: string | null = null;
  let label = SCENARIO_LABEL[sc]; let detail = '';
  if (sc === 'water') { hood = waterHood; detail = `A water main break contaminated the supply in ${name(hood)}.`; }
  if (sc === 'vendor') detail = 'Big Al’s Wraps, a food vendor at the Riverton Community Festival, served contaminated food.';
  if (sc === 'pool') detail = 'The Riverside public pool was contaminated; children who swam were most affected.';
  if (sc === 'person') {
    if (rngNext(s) < 0.5) { institution = { kind: 'nursing', id: 100000, hood: 'southfield' }; hood = 'southfield'; detail = 'The outbreak started at a Southfield nursing home and spread person to person.'; }
    else { const kid = residents.filter((r) => r.school != null && r.hood === 'millworks'); const sid = kid[Math.floor(rngNext(s) * kid.length)].school!; institution = { kind: 'school', id: sid, hood: 'millworks' }; hood = 'millworks'; detail = 'The outbreak started in a Millworks school class and spread person to person.'; }
  }
  const baselineER = Array.from({ length: P.days }, (_, d) => poisson(P.baselineER.mean, seed, d, 999));
  return {
    seed, scenario: sc, hood, institution, residents, days: P.days, baselineER,
    source: { type: sc, label, curve: sc === 'person' ? 'propagated' : sc === 'vendor' ? 'point' : 'continuous', detail },
  };
}
const name = (id: string) => hoodDefs.find((h) => h.id === id)!.name;
export const hoodName = name;
function pick<T>(s: { rng: number }, l: T[]): Symptom[] { return [l[Math.floor(rngNext(s) * l.length)] as unknown as Symptom]; }

// ------------------------------------------------------------------ the epidemic
const lagOf = (k: Iv['kind']) => (P.interventions.lagDays as Record<string, number>)[k];
const active = (ivs: Iv[], kind: Iv['kind'], d: number) => ivs.filter((x) => x.kind === kind && d >= x.day + lagOf(kind));

export interface SimOpts { compliance?: number }

/** Full ground-truth epidemic. Pure and deterministic; interventions only change hazards, never the draws. */
export function simulate(t: Truth, ivs: Iv[] = [], opts: SimOpts = {}): Sim {
  const comp = opts.compliance ?? 0.6;
  const infections: Infection[] = []; const byId = new Map<number, Infection>();
  const R = t.residents;
  const instSize = new Map<number, number>();
  for (const r of R) { const k = r.nursing ? 100000 : r.school; if (k != null) instSize.set(k, (instSize.get(k) ?? 0) + 1); }

  const infect = (r: Resident, day: number, primary: boolean) => {
    const expHr = day * 24 + 24 * hash01(t.seed, r.id, day, 8);
    const z = normal(t.seed, r.id, 3);
    const inc = Math.min(P.incubation.maxHours, Math.max(P.incubation.minHours, Math.exp(Math.log(P.incubation.medianHours) + P.incubation.sigma * z)));
    const onsetHr = expHr + inc; const onsetDay = Math.floor(onsetHr / 24);
    const sym = hash01(t.seed, r.id, 4) < P.symptomaticShare;
    const symptoms: Symptom[] = [];
    if (sym) for (const [k, p] of Object.entries(P.symptomProbs)) if (hash01(t.seed, r.id, 5, k.length * 7 + k.charCodeAt(0)) < p) symptoms.push(k as Symptom);
    if (sym && !symptoms.includes('diarrhea') && !symptoms.includes('vomiting')) symptoms.push('diarrhea');
    const schoolCase = t.institution?.kind === 'school' && r.school === t.institution.id;
    const care = sym && hash01(t.seed, r.id, 6) < (r.nursing ? P.contact.nursingCare : schoolCase ? P.contact.schoolReported : P.pyramid.seekCare);
    const er = care && hash01(t.seed, r.id, 7) < P.pyramid.er;
    const tested = care && hash01(t.seed, r.id, 9) < P.pyramid.tested;
    const reported = tested && hash01(t.seed, r.id, 10) < P.pyramid.reported;
    const dl = P.pyramid.reportDelayDays;
    const inf: Infection = {
      id: r.id, expHr, onsetHr, onsetDay, sym, symptoms, dur: P.durationDays[0] + Math.floor(hash01(t.seed, r.id, 11) * (P.durationDays[1] - P.durationDays[0] + 1)),
      primary, care, er, erDay: er ? onsetDay + 1 : null, reported, reportDay: reported ? onsetDay + dl[0] + Math.floor(hash01(t.seed, r.id, 12) * (dl[1] - dl[0] + 1)) : null,
    };
    infections.push(inf); byId.set(r.id, inf);
  };

  for (let d = 0; d < t.days; d++) {
    // seed cases for person-to-person outbreaks
    if (d === 0 && t.scenario === 'person' && t.institution) {
      const members = R.filter((r) => (t.institution!.kind === 'nursing' ? r.nursing : r.school === t.institution!.id));
      const k = P.contact.personSeedCases;
      const order = [...members].sort((a, b) => hash01(t.seed, a.id, 55) - hash01(t.seed, b.id, 55));
      for (let i = 0; i < Math.min(k, order.length); i++) infect(order[i], 0, true);
    }
    // who is infectious today
    const hhInf = new Map<number, number>(); const instInf = new Map<number, number>(); const hoodInf = new Map<string, number>();
    for (const inf of infections) {
      if (d < inf.onsetDay || d > inf.onsetDay + inf.dur) continue;
      const w = inf.sym ? 1 : P.contact.asymptomaticWeight; const r = R[inf.id];
      hhInf.set(r.hh, (hhInf.get(r.hh) ?? 0) + w);
      const inst = r.nursing ? 100000 : r.school;
      if (inst != null) instInf.set(inst, (instInf.get(inst) ?? 0) + w);
      hoodInf.set(r.hood, (hoodInf.get(r.hood) ?? 0) + w);
    }
    const hyg = active(ivs, 'hand_hygiene', d).length ? 1 - P.interventions.hygieneEffect * comp : 1;
    const exI = active(ivs, 'exclusion', d).length ? 1 - P.interventions.exclusionInst * comp : 1;
    const exH = active(ivs, 'exclusion', d).length ? 1 - P.interventions.exclusionHh * comp : 1;
    const pm = t.scenario === 'person' ? P.contact.personMult : { household: 1, school: 1, nursing: 1 };
    const boil = active(ivs, 'boil_water', d).length ? 1 - P.interventions.boilEffect * comp : 1;
    const mainFixed = active(ivs, 'fix_main', d).length > 0;
    const poolClosed = active(ivs, 'close_pool', d).length > 0;
    const vendorClosedAfter = ivs.filter((x) => x.kind === 'close_vendor').map((x) => x.day);
    const vendorClosed = (day: number) => vendorClosedAfter.some((c) => day > c);
    for (const r of R) {
      if (byId.has(r.id)) continue;
      let h = 0; let hp = 0;
      if (t.scenario === 'water' && r.hood === t.hood && r.tap && !mainFixed) h += P.hazard.water * boil;
      if (t.scenario === 'vendor') for (const [ed, att] of P.vendor.events) if (ed === d && r.festival && !vendorClosed(ed) && hash01(t.seed, r.id, ed, 21) < att && (ed === 0 ? r.wraps : hash01(t.seed, r.id, ed, 22) < P.vendor.laterEatShare && r.wraps)) h += P.hazard.vendor;
      if (t.scenario === 'pool' && r.pool && !poolClosed && d < 10 && hash01(t.seed, r.id, d, 23) < P.hazard.poolSwimDay) h += P.hazard.pool;
      hp = h;
      h += P.contact.household * pm.household * hyg * exH * (hhInf.get(r.hh) ?? 0);
      const inst = r.nursing ? 100000 : r.school;
      if (inst != null) h += (r.nursing ? P.contact.nursing * pm.nursing : P.contact.school * pm.school) * hyg * exI * ((instInf.get(inst) ?? 0) / (instSize.get(inst) ?? 1));
      h += P.contact.community * hyg * (hoodInf.get(r.hood) ?? 0);
      if (h > 0 && hash01(t.seed, r.id, d, 1) < 1 - Math.exp(-h)) infect(r, d, hash01(t.seed, r.id, d, 2) < hp / h);
    }
  }
  const er = t.baselineER.slice();
  for (const i of infections) if (i.erDay != null && i.erDay < t.days) er[i.erDay] += 1;
  return { infections, byId, er, days: t.days };
}

/** First day the health department would notice: an ER spike above baseline, or a cluster of lab-confirmed reports. */
export function alertDay(t: Truth, s: Sim): number | null { return alert(t, s)?.day ?? null; }
export function alert(t: Truth, s: Sim): { day: number; kind: 'er' | 'cluster' } | null {
  const mean = P.baselineER.mean, sd = Math.sqrt(mean);
  const thr = mean + P.baselineER.alertSigma * sd;
  for (let d = 0; d < s.days; d++) {
    if (s.er[d] >= thr || (d > 0 && s.er[d] >= mean + 2 * sd && s.er[d - 1] >= mean + 2 * sd)) return { day: d, kind: 'er' };
    const reported = s.infections.filter((i) => i.reported && i.reportDay! <= d).length;
    if (reported >= P.cluster.reportedThreshold) return { day: d, kind: 'cluster' };
  }
  void t; return null;
}
export const alertThreshold = () => P.baselineER.mean + P.baselineER.alertSigma * Math.sqrt(P.baselineER.mean);
export const baselineMean = () => P.baselineER.mean;

// ------------------------------------------------------------------ surveillance (what students can see)
export interface LineRow { id: number; label: string; age: number; sex: 'F' | 'M'; hood: string; onsetDay: number; onsetHr: number; symptoms: Symptom[]; reportDay: number; er: boolean; found: boolean }

/** Reported cases visible on `day`. Active case finding adds the cases that were never going to be reported. */
export function lineList(t: Truth, s: Sim, day: number, found: { hood: string; day: number }[] = []): LineRow[] {
  const rows: LineRow[] = [];
  for (const i of s.infections) {
    if (!i.sym) continue;
    const r = t.residents[i.id];
    const f = found.find((x) => (x.hood === 'all' || x.hood === r.hood) && i.onsetDay <= x.day && hash01(t.seed, i.id, 31) < 0.7);
    const labKnown = i.reported && i.reportDay! <= day; const erKnown = i.er && i.erDay! <= day;
    if (labKnown || erKnown) rows.push({ id: i.id, label: `Case ${rows.length + 1}`, age: r.age, sex: r.sex, hood: r.hood, onsetDay: i.onsetDay, onsetHr: i.onsetHr, symptoms: i.symptoms, reportDay: labKnown ? i.reportDay! : i.erDay!, er: i.er, found: false });
    else if (f) rows.push({ id: i.id, label: `Case ${rows.length + 1}`, age: r.age, sex: r.sex, hood: r.hood, onsetDay: i.onsetDay, onsetHr: i.onsetHr, symptoms: i.symptoms, reportDay: f.day, er: i.er, found: true });
  }
  rows.sort((a, b) => a.onsetDay - b.onsetDay || a.id - b.id);
  return rows.map((r, k) => ({ ...r, label: `Case ${k + 1}` }));
}

// ------------------------------------------------------------------ case definition
export interface CaseDef { hoods: string[] | 'any'; ageMin: number; ageMax: number; onsetFrom: number; onsetTo: number; symptoms: Symptom[]; need: number }
export const defaultCaseDef = (): CaseDef => ({ hoods: 'any', ageMin: 0, ageMax: 120, onsetFrom: 0, onsetTo: 99, symptoms: [], need: 1 });
export function meetsDef(def: CaseDef, r: { hood: string; age: number }, onsetDay: number | null, symptoms: Symptom[]): boolean {
  if (def.hoods !== 'any' && !def.hoods.includes(r.hood)) return false;
  if (r.age < def.ageMin || r.age > def.ageMax) return false;
  if (onsetDay == null || onsetDay < def.onsetFrom || onsetDay > def.onsetTo) return false;
  if (def.symptoms.length === 0) return symptoms.length > 0;
  return def.symptoms.filter((x) => symptoms.includes(x)).length >= Math.min(def.need, def.symptoms.length);
}
/** Ill status of a resident (true outbreak case or background illness) as the symptoms/onset a nurse would record. */
export function illness(t: Truth, s: Sim, r: Resident, bgOnset: number): { onset: number | null; symptoms: Symptom[]; truth: boolean } {
  const i = s.byId.get(r.id);
  if (i && i.sym) return { onset: i.onsetDay, symptoms: i.symptoms, truth: true };
  if (r.bg) return { onset: Math.floor(hash01(t.seed, r.id, 41) * 28) + 2, symptoms: r.bg, truth: false };
  void bgOnset; return { onset: null, symptoms: [], truth: false };
}
export function evalCaseDef(t: Truth, s: Sim, def: CaseDef) {
  let tp = 0, fn = 0, fp = 0, tn = 0;
  for (const r of t.residents) {
    const ill = illness(t, s, r, 0);
    const meets = ill.onset != null && meetsDef(def, r, ill.onset, ill.symptoms);
    if (ill.truth) meets ? tp++ : fn++; else meets ? fp++ : tn++;
  }
  const se = tp / Math.max(1, tp + fn), sp = tn / Math.max(1, tn + fp), ppv = tp / Math.max(1, tp + fp);
  return { tp, fn, fp, tn, sensitivity: se, specificity: sp, ppv, verdict: se < 0.6 ? 'too narrow' : sp < 0.9 || ppv < 0.6 ? 'too broad' : 'balanced' };
}

// ------------------------------------------------------------------ interviews, surveys, samples, inspections
export interface Interview { id: number; label: string; ill: boolean; exposures: Partial<Record<Exposure, boolean>>; clues: string[]; hood: string; age: number }

/** Self-reported exposures. Recall error grows with the time between exposure and interview; cases search harder for explanations. */
export function interview(t: Truth, s: Sim, id: number, day: number, ill: boolean, label: string): Interview {
  const r = t.residents[id]; const ex: Partial<Record<Exposure, boolean>> = {};
  const since = Math.max(0, day - 2); const fMiss = Math.min(P.recall.forgetMax, P.recall.forgetPerDay * since); // same memory loss for everyone; only cases over-report
  for (const e of EXPOSURES) {
    const truthV = e === 'tapWater' ? r.tap : r[e];
    const u = hash01(t.seed, id, 61, e.length * 13 + e.charCodeAt(0));
    ex[e] = truthV ? u >= fMiss : u < P.recall.falseYes + (ill ? P.recall.caseFalseYes : 0);
  }
  const clues: string[] = [];
  if (r.festival && hash01(t.seed, id, 62) < 0.5) clues.push('In the photo they shared, a green Riverton Festival wristband is visible on their wrist.');
  if (r.pool && r.age < 18 && hash01(t.seed, id, 63) < 0.4) clues.push('A wet swim bag sits by the door.');
  if (r.nursing) clues.push('Lives in the Maple Grove nursing home.');
  if (r.school != null && t.scenario === 'person' && t.institution?.kind === 'school' && r.school === t.institution.id) clues.push('Mentions several classmates have been out sick.');
  return { id, label, ill, exposures: ex, clues, hood: r.hood, age: r.age };
}

export type SurveyScope = 'all' | 'festival' | string;
/** A random sample of residents (ill or not), the basis for attack rates and relative risk. `draw` changes the random sample. */
export function survey(t: Truth, s: Sim, day: number, n: number, scope: SurveyScope, def: CaseDef, draw = 0): Interview[] {
  let pool = t.residents.filter((r) => scope === 'all' ? true : scope === 'festival' ? r.festival : r.hood === scope);
  pool = [...pool].sort((a, b) => hash01(t.seed, a.id, 71, draw) - hash01(t.seed, b.id, 71, draw)).slice(0, n);
  return pool.map((r, k) => { const il = illness(t, s, r, 0); const ill = il.onset != null && meetsDef(def, r, il.onset, il.symptoms); return interview(t, s, r.id, day, ill, `Resident ${k + 1}`); });
}

export function waterSample(t: Truth, hood: string, day: number, i = 0): { hood: string; contaminated: boolean } {
  const bad = t.scenario === 'water' && t.hood === hood;
  const u = hash01(t.seed, hoodDefs.findIndex((h) => h.id === hood), 81, i, day);
  return { hood, contaminated: bad ? u >= P.water.falseNegative : u < P.water.falsePositive };
}
export function inspect(t: Truth, target: 'wraps' | 'tacos' | 'diner' | 'pool'): { target: string; finding: string; violation: boolean } {
  const trueViolation = (target === 'wraps' && t.scenario === 'vendor') || (target === 'pool' && t.scenario === 'pool');
  if (target === 'wraps') return { target: 'Big Al’s Wraps', violation: trueViolation, finding: trueViolation ? 'Chicken held at 52°F for hours (should be below 41°F). Staff report one worker was sick last week.' : 'Temperatures logged correctly. No violations.' };
  if (target === 'tacos') return { target: 'Lopez Tacos', violation: false, finding: 'Clean kitchen, temperatures in range, no violations.' };
  if (target === 'diner') return { target: 'Maple Street Diner', violation: false, finding: 'Minor paperwork issue (a missing label). No food-safety violations.' };
  return { target: 'Riverside public pool', violation: trueViolation, finding: trueViolation ? 'Chlorine well below the safe level; a fecal incident was logged on opening day.' : 'Chlorine and pH are in range.' };
}
export function specimens(t: Truth, s: Sim): { pathogen: string; confirmed: number; note: string } {
  const lab = s.infections.filter((i) => i.reported).length;
  return { pathogen: P.pathogen.name, confirmed: Math.min(lab, 8), note: 'Lab results confirm the same GI pathogen in every specimen. This tells you what is making people sick, but not where it came from.' };
}

// ------------------------------------------------------------------ analysis tools
export function epiCurve(rows: { onsetHr: number }[], binHours: number, daysTotal = P.days): { start: number; count: number }[] {
  const nb = Math.ceil((daysTotal * 24) / binHours); const bins = Array.from({ length: nb }, (_, i) => ({ start: i * binHours, count: 0 }));
  for (const r of rows) { const b = Math.floor(r.onsetHr / binHours); if (b >= 0 && b < nb) bins[b].count++; }
  return bins;
}
/** Shape classification from the (day-binned) curve: one peak and narrow = point; plateau = continuous; repeated peaks = propagated. */
export function classifyCurve(counts: number[]): 'point' | 'continuous' | 'propagated' | 'unclear' {
  const total = counts.reduce((a, b) => a + b, 0); if (total < 8) return 'unclear';
  const sm = counts.map((_, i) => ((counts[i - 1] ?? counts[i]) + counts[i] + (counts[i + 1] ?? counts[i])) / 3);
  const max = Math.max(...sm);
  // local maxima that stand out, merged when closer than 3 days
  let peaks: number[] = [];
  for (let i = 1; i < sm.length - 1; i++) if (sm[i] >= sm[i - 1] && sm[i] > sm[i + 1] && sm[i] >= max * 0.35) peaks.push(i);
  peaks = peaks.reduce<number[]>((acc, p) => { if (acc.length && p - acc[acc.length - 1] < 3) { if (sm[p] > sm[acc[acc.length - 1]]) acc[acc.length - 1] = p; } else acc.push(p); return acc; }, []);
  let waves = peaks.length ? 1 : 0;
  for (let k = 1; k < peaks.length; k++) {
    const trough = Math.min(...sm.slice(peaks[k - 1], peaks[k] + 1));
    if (trough < 0.6 * Math.min(sm[peaks[k - 1]], sm[peaks[k]])) waves++;
  }
  if (waves >= 2) return 'propagated';
  const width = sm.filter((v) => v >= max * 0.5).length;
  return width <= 5 ? 'point' : 'continuous';
}
export interface Table2x2 { a: number; b: number; c: number; d: number; arExposed: number; arUnexposed: number; rr: number | null }
export function twoByTwo(rows: Interview[], e: Exposure): Table2x2 {
  let a = 0, b = 0, c = 0, d = 0;
  for (const r of rows) { const x = !!r.exposures[e]; if (x && r.ill) a++; else if (x) b++; else if (r.ill) c++; else d++; }
  const arE = a / Math.max(1, a + b), arU = c / Math.max(1, c + d);
  return { a, b, c, d, arExposed: arE, arUnexposed: arU, rr: a + b > 0 && c > 0 ? arE / arU : c === 0 && a > 0 ? Infinity : null };
}

// ------------------------------------------------------------------ results
export function trueCases(s: Sim) { return s.infections.filter((i) => i.sym).length; }
export interface Counterfactual { actual: number; noAction: number; earlier: number; prevented: number; preventedIfEarlier: number }
export function counterfactual(t: Truth, ivs: Iv[], opts: SimOpts = {}): Counterfactual {
  const actual = trueCases(simulate(t, ivs, opts)); const none = trueCases(simulate(t, [], opts));
  const early = trueCases(simulate(t, ivs.map((i) => ({ ...i, day: Math.max(0, i.day - 3) })), opts));
  return { actual, noAction: none, earlier: early, prevented: none - actual, preventedIfEarlier: none - early };
}
export const TARGETING: Record<Scenario, Iv['kind'][]> = { water: ['boil_water', 'fix_main'], vendor: ['close_vendor'], pool: ['close_pool'], person: ['exclusion', 'hand_hygiene'] };
