import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import * as M from '../src/modules/lab/labs/outbreak';
import { outbreakLab, viableTruth } from '../src/modules/lab/labs/outbreak';

const SEEDS = [1, 2, 3, 4, 5, 6];
const dayCounts = (s: M.Sim) => M.epiCurve(s.infections.filter((i) => i.sym).map((i) => ({ onsetHr: i.onsetHr })), 24).map((b) => b.count);
const cases = (t: M.Truth, iv: M.Iv[] = [], c = 0.6) => M.trueCases(M.simulate(t, iv, { compliance: c }));

describe('determinism', () => {
  it('same seed gives an identical outbreak; different seeds differ', () => {
    const a = M.simulate(viableTruth(3, 'water')), b = M.simulate(viableTruth(3, 'water')), c = M.simulate(viableTruth(4, 'water'));
    expect(JSON.stringify(a.infections)).toBe(JSON.stringify(b.infections));
    expect(JSON.stringify(a.infections)).not.toBe(JSON.stringify(c.infections));
  });
  it('random scenario is chosen by the seed and reproducible', () => {
    expect(viableTruth(9, 'random').scenario).toBe(viableTruth(9, 'random').scenario);
    const seen = new Set(SEEDS.concat([7, 8, 9, 10, 11, 12]).map((s) => viableTruth(s, 'random').scenario));
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });
});

describe('epi curve shape matches source type', () => {
  for (const sc of M.SCENARIOS) {
    it(`${sc}: viable seeds produce a ${sc === 'person' ? 'propagated' : sc === 'vendor' ? 'point' : 'continuous'} curve and an alert`, () => {
      for (const seed of SEEDS) {
        const t = viableTruth(seed, sc); const s = M.simulate(t);
        expect(M.classifyCurve(dayCounts(s))).toBe(t.source.curve);
        expect(M.alertDay(t, s)).not.toBeNull();
      }
    });
  }
  it('each source has its own spatial pattern', () => {
    const share = (t: M.Truth, pred: (r: M.Resident) => boolean) => { const s = M.simulate(t); const c = s.infections.filter((i) => i.sym); return c.filter((i) => pred(t.residents[i.id])).length / c.length; };
    const w = viableTruth(1, 'water'); expect(share(w, (r) => r.hood === w.hood)).toBeGreaterThan(0.85);
    const p = viableTruth(1, 'pool'); expect(share(p, (r) => r.age < 18)).toBeGreaterThan(0.35);
    const v = viableTruth(1, 'vendor'); expect(share(v, (r) => r.festival)).toBeGreaterThan(0.7);
    const hoods = new Set(M.simulate(v).infections.map((i) => v.residents[i.id].hood)); expect(hoods.size).toBe(8);
  });
});

describe('surveillance and underreporting', () => {
  it('reported cases are a small fraction of true cases and arrive late', () => {
    const t = viableTruth(2, 'vendor'); const s = M.simulate(t);
    const reported = s.infections.filter((i) => i.reported);
    expect(reported.length).toBeLessThan(M.trueCases(s) * 0.25);
    expect(reported.every((i) => i.reportDay! >= i.onsetDay + 3)).toBe(true);
    const d = M.alertDay(t, s)!;
    expect(M.lineList(t, s, d).length).toBeLessThan(M.lineList(t, s, d + 10).length);
  });
  it('active case finding adds cases the routine system missed', () => {
    const t = viableTruth(2, 'water'); const s = M.simulate(t);
    const base = M.lineList(t, s, 8).length;
    const found = M.lineList(t, s, 8, [{ hood: 'all', day: 8 }]);
    expect(found.length).toBeGreaterThan(base * 2);
    expect(found.some((r) => r.found)).toBe(true);
  });
});

describe('recall bias', () => {
  it('people forget true exposures more the longer ago they happened', () => {
    const t = viableTruth(1, 'vendor'); const s = M.simulate(t);
    const ill = s.infections.filter((i) => i.sym).map((i) => i.id);
    const recalled = (day: number) => { let yes = 0, n = 0; for (const id of ill) { if (!t.residents[id].festival) continue; n++; if (M.interview(t, s, id, day, true, 'x').exposures.festival) yes++; } return yes / n; };
    expect(recalled(4)).toBeGreaterThan(recalled(24) + 0.1);
  });
});

describe('interventions only help when they target the true source', () => {
  const day = 6;
  it('water: repairing the main or a well-followed boil notice cuts cases; unrelated actions do not', () => {
    const t = viableTruth(2, 'water'); const base = cases(t);
    expect(cases(t, [{ kind: 'fix_main', day }])).toBeLessThan(base * 0.75);
    expect(cases(t, [{ kind: 'boil_water', day }])).toBeLessThan(base * 0.9);
    expect(cases(t, [{ kind: 'close_pool', day }])).toBe(base);
    expect(cases(t, [{ kind: 'close_vendor', day }])).toBe(base);
  });
  it('boil-water notices work less when community trust (compliance) is low', () => {
    const t = viableTruth(2, 'water'); const iv: M.Iv[] = [{ kind: 'boil_water', day: 6 }];
    expect(cases(t, iv, 0.9)).toBeLessThan(cases(t, iv, 0.3));
  });
  it('vendor: closing the vendor prevents later cases; fixing the water main does nothing', () => {
    const t = viableTruth(2, 'vendor'); const base = cases(t);
    expect(cases(t, [{ kind: 'close_vendor', day: 5 }])).toBeLessThan(base * 0.92);
    expect(cases(t, [{ kind: 'fix_main', day: 5 }])).toBe(base);
    expect(cases(t, [{ kind: 'boil_water', day: 5 }])).toBe(base);
  });
  it('pool: closing the pool works; closing the vendor does not', () => {
    const t = viableTruth(2, 'pool'); const base = cases(t);
    expect(cases(t, [{ kind: 'close_pool', day: 4 }])).toBeLessThan(base * 0.7);
    expect(cases(t, [{ kind: 'close_vendor', day: 4 }])).toBe(base);
  });
  it('person-to-person: exclusion and hygiene reduce spread; source-control actions do not', () => {
    const t = viableTruth(3, 'person'); const base = cases(t);
    expect(cases(t, [{ kind: 'exclusion', day: 8 }])).toBeLessThan(base * 0.9);
    expect(cases(t, [{ kind: 'hand_hygiene', day: 8 }])).toBeLessThan(base);
    expect(cases(t, [{ kind: 'fix_main', day: 8 }])).toBe(base);
  });
  it('acting earlier prevents more cases; the counterfactual reports both comparisons', () => {
    const t = viableTruth(2, 'water'); const cf = M.counterfactual(t, [{ kind: 'fix_main', day: 8 }]);
    expect(cf.prevented).toBeGreaterThan(0);
    expect(cf.preventedIfEarlier).toBeGreaterThan(cf.prevented);
    expect(cf.noAction).toBe(cases(t));
  });
});

describe('case definitions', () => {
  const t = viableTruth(2, 'vendor'); const s = M.simulate(t);
  it('"any symptom" is sensitive but not specific; an over-narrow definition misses real cases', () => {
    const broad = M.evalCaseDef(t, s, { ...M.defaultCaseDef() });
    const narrow = M.evalCaseDef(t, s, { ...M.defaultCaseDef(), symptoms: ['diarrhea', 'vomiting', 'fever', 'headache'], need: 4, hoods: ['hillcrest'] });
    const good = M.evalCaseDef(t, s, { ...M.defaultCaseDef(), symptoms: ['diarrhea', 'vomiting'], need: 1, onsetFrom: 0, onsetTo: 20 });
    expect(broad.sensitivity).toBeGreaterThan(0.95); expect(broad.specificity).toBeLessThan(good.specificity);
    expect(narrow.sensitivity).toBeLessThan(0.1);
    expect(good.sensitivity).toBeGreaterThan(0.8); expect(good.specificity).toBeGreaterThan(0.95);
    expect(broad.verdict).toBe('too broad'); expect(narrow.verdict).toBe('too narrow'); expect(good.verdict).toBe('balanced');
  });
});

describe('analysis: attack rates, relative risk, sample size', () => {
  const def: M.CaseDef = { ...M.defaultCaseDef(), symptoms: ['diarrhea', 'vomiting'], need: 1 };
  it('the true vendor has a large RR; the popular diner (red herring) does not', () => {
    const t = viableTruth(2, 'vendor'); const s = M.simulate(t);
    const rows = M.survey(t, s, 8, 600, 'festival', def);
    expect(M.twoByTwo(rows, 'wraps').rr!).toBeGreaterThan(3);
    const diner = M.twoByTwo(rows, 'diner').rr!; expect(diner).toBeGreaterThan(0.5); expect(diner).toBeLessThan(1.8);
  });
  it('water: festival attendance looks associated with illness only because of neighborhood (confounding)', () => {
    const t = viableTruth(2, 'water'); const s = M.simulate(t);
    const all = M.survey(t, s, 8, 1500, 'all', def);
    const crude = M.twoByTwo(all, 'festival').rr!;
    const within = M.twoByTwo(M.survey(t, s, 8, 1500, t.hood!, def), 'festival').rr!;
    expect(crude).toBeGreaterThan(1.5);
    expect(within).toBeLessThan(crude * 0.75);
  });
  it('small samples vary more between draws than large samples', () => {
    const t = viableTruth(2, 'vendor'); const s = M.simulate(t);
    const sd = (n: number) => { const v = [0, 1, 2, 3, 4, 5, 6, 7].map((d) => Math.min(30, M.twoByTwo(M.survey(t, s, 8, n, 'festival', def, d), 'wraps').rr ?? 0)); const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); };
    expect(sd(15)).toBeGreaterThan(sd(150));
  });
});

describe('investigation actions return data that matches the truth', () => {
  it('water samples are positive in the affected neighborhood and negative elsewhere (mostly)', () => {
    const t = viableTruth(2, 'water');
    const draws = Array.from({ length: 40 }, (_, i) => M.waterSample(t, t.hood!, 5, i).contaminated);
    expect(draws.filter(Boolean).length / 40).toBeGreaterThan(0.7); // imperfect test: some false negatives
    const others = ['hillcrest', 'pinewood', 'eastside'].filter((h) => h !== t.hood).map((h) => M.waterSample(t, h, 5).contaminated);
    expect(others.every((x) => !x)).toBe(true);
  });
  it('inspections find the true source and not the red herring', () => {
    const v = viableTruth(2, 'vendor'); expect(M.inspect(v, 'wraps').violation).toBe(true); expect(M.inspect(v, 'diner').violation).toBe(false);
    const p = viableTruth(2, 'pool'); expect(M.inspect(p, 'pool').violation).toBe(true); expect(M.inspect(p, 'wraps').violation).toBe(false);
  });
});

describe('lab engine interface and purity', () => {
  it('outbreak implements LabModule fully', () => {
    expect(outbreakLab.actions.length).toBeGreaterThanOrEqual(6);
    expect(outbreakLab.interventions.map((i) => i.id)).toEqual(['boil_water', 'fix_main', 'close_vendor', 'close_pool', 'hand_hygiene', 'exclusion']);
    expect(outbreakLab.tools).toContain('epiCurve');
    expect(outbreakLab.content.underTheHood.limitations.length).toBeGreaterThan(2);
    expect(outbreakLab.simulate(outbreakLab.generate(1, 'pool'), []).infections.length).toBeGreaterThan(50);
  });
  it('model and engine folders import no React or DOM code', () => {
    for (const dir of ['src/modules/lab/engine', 'src/modules/lab/labs/outbreak']) for (const f of readdirSync(dir).filter((x) => x.endsWith('.ts'))) {
      const src = readFileSync(`${dir}/${f}`, 'utf8'); expect(src).not.toMatch(/from ['"](react|framer|zustand|pixi|recharts)/); expect(src).not.toMatch(/\b(window|document|localStorage)\b/);
    }
  });
});
