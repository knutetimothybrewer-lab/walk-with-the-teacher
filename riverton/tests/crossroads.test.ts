import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import townHall from '../src/modules/crossroads/content/town-hall.json';
import rumorMill from '../src/modules/crossroads/content/rumor-mill.json';
import { startRun, proceed, choose, submitReason, listenPick, listenLimit, listenAvailable, castVote, submitProposal, rewindTo, current, availableChoices, setVars, nodeOf, type Ctx } from '../src/modules/crossroads/engine/run';
import { validateScenario } from '../src/modules/crossroads/engine/validate';
import { acceptProposal, townHallProject } from '../src/modules/crossroads/engine/townHall';
import { COMPONENTS, emptyProposal, projectProposal, buildCity, proposalCost, proposalValid, LOT, type Proposal } from '../src/modules/crossroads/engine/cityAdapter';
import { rumorProject, applyCompliance, DEFAULT_WEEKLY } from '../src/modules/crossroads/engine/rumor';
import { scoreReasoning } from '../src/modules/crossroads/engine/scoring';
import type { Run, Scenario, Vars } from '../src/modules/crossroads/engine/types';
import { CAST } from '../src/platform/art/characters';
import { createCity, placeIntervention, advance } from '../src/modules/city/sim';

const TH = townHall as unknown as Scenario, RM = rumorMill as unknown as Scenario;
const qIds = new Set<string>(readdirSync('src/content/shared/questions').flatMap((f) => (JSON.parse(readFileSync(`src/content/shared/questions/${f}`, 'utf8')) as { id: string }[]).map((q) => q.id)));
const cast = new Set(CAST.map((c) => c.id));
const ctxTH: Ctx = { project: townHallProject }; const ctxRM: Ctx = { project: rumorProject };

// tiny deterministic picker for random playthroughs
const mk = (seed: number) => { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
function randomProposal(r: () => number): Proposal {
  for (;;) { const p: Proposal = { clinic: Math.floor(r() * 3) as 0, coop: Math.floor(r() * 3) as 0, park: Math.floor(r() * 3) as 0, housing: Math.floor(r() * 3) as 0, developer: r() < 0.4, protections: r() < 0.5 }; if (proposalValid(p)) return p; }
}
function play(sc: Scenario, seed: number, ctx: Ctx, extra: Vars = {}): Run {
  const r = mk(seed * 7919 + 13); let run = startRun(sc, seed, extra, ctx);
  for (let i = 0; i < 400 && !run.done; i++) {
    const n = current(sc, run);
    if (n.type === 'choice') { const c = availableChoices(n, run.vars); run = choose(sc, run, c[Math.floor(r() * c.length)].id, ctx); }
    else if (n.type === 'listen') { for (let k = 0; k < listenLimit(n, run.vars); k++) { const av = listenAvailable(n, run.vars).filter((s) => !(run.vars.heard as string[]).includes(s.id)); if (av.length) run = listenPick(sc, run, av[Math.floor(r() * av.length)].id); } run = proceed(sc, run, ctx); }
    else if (n.type === 'reason') run = submitReason(sc, run, n.kind === 'evidence' ? { ids: ['data:er', 'voice:elder'] } : n.kind === 'impact' ? { assignments: { elder: 'benefits', parent: 'left', pastor: 'costs', teen: 'benefits', developer: 'benefits' } } : n.kind === 'equity' ? { direction: 'narrows', forWhom: 'Eastside families' } : n.kind === 'tradeoffs' ? { gives: ['smaller'] } : n.kind === 'alternatives' ? { text: 'Hold a second session on a weekend.' } : { text: 'Because it seemed fair.', correct: true }, ctx);
    else if (n.type === 'proposal') { const p = randomProposal(r); run = submitProposal(sc, run, acceptProposal(run.vars, p)!, ctx); }
    else if (n.type === 'vote') run = castVote(sc, run, ctx).run;
    else run = proceed(sc, run, ctx);
  }
  return run;
}

describe('scenario validation', () => {
  it('both shipped scenarios pass the content checks', () => {
    for (const sc of [TH, RM]) { const r = validateScenario(sc, { questionIds: qIds, castIds: cast }); expect(r.errors).toEqual([]); expect(r.reachable).toBe(r.total); }
  });
  it('Town Hall has at least 4 endings and Rumor Mill at least 3', () => {
    expect(validateScenario(TH, { questionIds: qIds, castIds: cast }).endings.length).toBeGreaterThanOrEqual(4);
    expect(validateScenario(RM, { questionIds: qIds, castIds: cast }).endings.length).toBeGreaterThanOrEqual(3);
  });
  it('catches dead ends, broken links, unreachable nodes, missing reflection and unfollowed decisions', () => {
    const bad = structuredClone(TH) as Scenario;
    (nodeOf(bad, 'th_intro') as { next: string }).next = 'nowhere';
    bad.nodes.push({ id: 'orphan', type: 'scene', scene: 'cityHall', lines: [{ text: 'x' }], next: 'th_data' });
    expect(validateScenario(bad, { questionIds: qIds, castIds: cast }).errors.join('|')).toMatch(/missing node nowhere[\s\S]*unreachable/);
    const noReason = structuredClone(TH) as Scenario;
    (noReason.nodes.find((n) => n.id === 'th_engage') as { choices: { next: string }[] }).choices[0].next = 'th_vote_move';
    expect(validateScenario(noReason, { questionIds: qIds, castIds: cast }).errors.join('|')).toContain('not followed by a reasoning prompt');
    const noReflect = structuredClone(TH) as Scenario; noReflect.nodes = noReflect.nodes.filter((n) => n.type !== 'reflect'); (noReflect.nodes.find((n) => n.id === 'th_r_dvo') as { next: string }).next = 'th_route_end';
    expect(validateScenario(noReflect, { questionIds: qIds, castIds: cast }).errors.join('|')).toContain('reflection prompt');
  });
});

describe('branching engine', () => {
  it('is deterministic for a seed, and different seeds can differ', () => {
    const a = play(TH, 5, ctxTH), b = play(TH, 5, ctxTH);
    expect(JSON.stringify(a.vars)).toBe(JSON.stringify(b.vars));
    expect(new Set([1, 2, 3, 4, 5, 6].map((s) => play(TH, s, ctxTH).ending)).size).toBeGreaterThan(1);
  });
  it('every Town Hall and Rumor Mill ending can be reached', () => {
    const th = new Set<string>(), rm = new Set<string>();
    for (let s = 1; s <= 600; s++) { th.add(play(TH, s, ctxTH, { trust: 20 + (s % 7) * 10 }).ending!); rm.add(play(RM, s, ctxRM, { trust: 15 + (s % 8) * 10, trust0: 15 + (s % 8) * 10 }).ending!); }
    expect([...th].sort()).toEqual(['displaced', 'distrust', 'lapsed', 'mixed', 'shared', 'stalled']);
    expect([...rm].sort()).toEqual(['contained', 'partial', 'wins']);
  }, 120000);
  it('the Saturday session lets the parent be heard and allows a fourth listening slot', () => {
    let run = startRun(TH, 1, {}, ctxTH);
    run = proceed(TH, run, ctxTH); run = proceed(TH, run, ctxTH); // intro, data
    run = choose(TH, run, 'saturday', ctxTH); run = submitReason(TH, run, { assignments: {} }, ctxTH); run = proceed(TH, run, ctxTH);
    const n = current(TH, run); if (n.type !== 'listen') throw new Error('expected listen');
    expect(listenLimit(n, run.vars)).toBe(4); expect(listenAvailable(n, run.vars).map((s) => s.id)).toContain('parent');
    for (const id of ['elder', 'parent', 'pastor', 'teen', 'clinic']) run = listenPick(TH, run, id);
    expect(run.vars.heard).toEqual(['elder', 'parent', 'pastor', 'teen']);
    const evening = choose(TH, proceed(TH, proceed(TH, startRun(TH, 1, {}, ctxTH), ctxTH), ctxTH), 'evening', ctxTH);
    expect(listenAvailable(n, evening.vars).map((s) => s.id)).not.toContain('parent'); expect(listenLimit(n, evening.vars)).toBe(3);
  });
  it('what-if: rewinding to a decision restores state and lets another branch be taken', () => {
    let run = startRun(TH, 2, {}, ctxTH); run = proceed(TH, run, ctxTH); run = proceed(TH, run, ctxTH);
    const before = structuredClone(run.vars); run = choose(TH, run, 'online', ctxTH);
    expect(run.vars.session).toBe('online');
    const back = rewindTo(TH, run, 0); expect(back.node).toBe('th_engage'); expect(back.vars).toEqual(before);
    expect(choose(TH, back, 'saturday', ctxTH).vars.session).toBe('saturday');
  });
  it('shallow options exist and are never scored as wrong: scoring ignores which choice was made', () => {
    const run = startRun(TH, 1, {}, ctxTH);
    const a = scoreReasoning({ ...run, reasoning: [{ node: 'x', kind: 'alternatives', payload: { text: 'a real alternative here' } }], vars: { ...run.vars, choices: ['th_engage:saturday'] } });
    const b = scoreReasoning({ ...run, reasoning: [{ node: 'x', kind: 'alternatives', payload: { text: 'a real alternative here' } }], vars: { ...run.vars, choices: ['th_engage:online'] } });
    expect(a.dims).toEqual(b.dims);
    expect(TH.nodes.some((n) => n.type === 'choice' && n.choices.some((c) => c.shallow))).toBe(true);
    expect(RM.nodes.some((n) => n.type === 'choice' && n.choices.some((c) => c.shallow))).toBe(true);
  });
  it('the vote is a real contest: strong proposals usually pass, the rushed crowd-pleaser often fails', () => {
    const rate = (mkRun: (s: number) => Run) => { let y = 0; for (let s = 1; s <= 200; s++) { const run = mkRun(s); if (run.vars.votePassed) y++; } return y / 200; };
    const reach = (s: number, p: Proposal, extra: Vars) => { let run = startRun(TH, s, extra, ctxTH); run = setVars(run, { ...acceptProposal(run.vars, p)!, node: 'th_vote' }); run.node = 'th_vote'; return castVote(TH, run, ctxTH).run; };
    const strong: Proposal = { clinic: 1, coop: 0, park: 1, housing: 0, developer: false, protections: true };
    const weak: Proposal = { clinic: 0, coop: 0, park: 1, housing: 0, developer: true, protections: false };
    expect(rate((s) => reach(s, strong, { trust: 70 }))).toBeGreaterThan(0.8);
    expect(rate((s) => reach(s, weak, { trust: 30, majorityFlag: 1 }))).toBeLessThan(0.7);
  }, 60000);
});

describe('Town Hall consequences come from the City engine', () => {
  const seed = 11;
  it('projection equals what City produces for the same interventions', () => {
    const p: Proposal = { clinic: 1, coop: 1, park: 0, housing: 0, developer: false, protections: false };
    const proj = projectProposal(p, { seed });
    let s = createCity({ seed, startingCash: 100, annualBudget: 14 });
    s = (placeIntervention(s, { type: 'clinic', hood: 'eastside', at: LOT, scale: COMPONENTS[0].levels[1].scale }) as { state: typeof s }).state;
    s = (placeIntervention(s, { type: 'supermarket', hood: 'eastside', at: LOT, scale: COMPONENTS[1].levels[1].scale }) as { state: typeof s }).state;
    const direct = advance(s, 60);
    expect(proj.after.preventableER).toBeCloseTo(direct.hoods.eastside.out.preventableER, 9);
    expect(proj.after.lifeExpectancy).toBeCloseTo(direct.hoods.eastside.out.lifeExpectancy, 9);
    expect(buildCity(p, seed).placed.map((x) => x.type)).toEqual(['clinic', 'supermarket']);
  });
  it('building health infrastructure improves Eastside; doing nothing changes nothing', () => {
    const none = projectProposal(emptyProposal(), { seed }); expect(none.after.lifeExpectancy).toBeCloseTo(none.before.lifeExpectancy, 9);
    const c = projectProposal({ ...emptyProposal(), clinic: 2, coop: 0, park: 1 }, { seed });
    expect(c.after.preventableER).toBeLessThan(c.before.preventableER); expect(c.gapAfter).toBeLessThan(c.gapBefore);
  });
  it('the developer deal brings more buildings but displaces residents unless protections are on', () => {
    const base: Proposal = { clinic: 1, coop: 1, park: 1, housing: 0, developer: true, protections: false };
    const open = projectProposal(base, { seed }), prot = projectProposal({ ...base, protections: true }, { seed });
    expect(open.displacedPct).toBeGreaterThan(prot.displacedPct); expect(open.originalShare).toBeLessThan(100);
    expect(proposalCost({ ...base, protections: true })).toBeGreaterThan(proposalCost(base));
  });
  it('luck changes the projection; a typical run is the reference for judging decision vs outcome', () => {
    const p: Proposal = { clinic: 1, coop: 1, park: 0, housing: 0, developer: false, protections: false };
    const lucky = projectProposal(p, { seed, luck: 1.25 }), bad = projectProposal(p, { seed, luck: 0.75 });
    expect(lucky.after.preventableER).toBeLessThan(bad.after.preventableER);
  });
  it('proposals over budget are rejected', () => {
    expect(proposalValid({ clinic: 2, coop: 2, park: 0, housing: 0, developer: false, protections: false })).toBe(false);
    expect(proposalValid({ clinic: 2, coop: 2, park: 0, housing: 0, developer: true, protections: false })).toBe(true);
  });
});

describe('Rumor Mill changes the outbreak case count', () => {
  const base: Vars = { trust: 50, trust0: 50, weekly: DEFAULT_WEEKLY };
  const best = rumorProject({ ...base, shareChoice: 'pause', verifyChoice: 'lateral', neighborChoice: 'empathy', messenger: 'pastor', languages: 'multi', viral: 'contained' }).rumor as { casesAfter: number; casesBefore: number; c1: number };
  const worst = rumorProject({ ...base, shareChoice: 'share', verifyChoice: 'author', neighborChoice: 'link', messenger: 'none', languages: 'one', viral: 'viral' }).rumor as { casesAfter: number; c1: number };
  it('better communication means more people follow the guidance and fewer cases', () => {
    expect(best.c1).toBeGreaterThan(worst.c1 + 0.2); expect(best.casesAfter).toBeLessThan(best.casesBefore); expect(worst.casesAfter).toBeGreaterThan(best.casesBefore); expect(worst.casesAfter - best.casesAfter).toBeGreaterThan(20);
  });
  it('week 1 (already happened) is untouched; later weeks scale with compliance', () => {
    const w = applyCompliance([10, 50, 40, 20], 1, 0.6, 0.8); expect(w[0]).toBe(10); expect(w[1]).toBeLessThan(50);
    expect(applyCompliance([10, 50], 1, 0.6, 0.4)[1]).toBeGreaterThan(50);
  });
  it('uses a default curve when the Lab has not been played, and reads the Lab curve when it has', () => {
    const d = rumorProject({ trust: 50, trust0: 50, weekly: [] }).rumor as { weeklyBefore: number[] }; expect(d.weeklyBefore).toEqual(DEFAULT_WEEKLY);
    const l = rumorProject({ trust: 50, trust0: 50, weekly: [5, 9, 3] }).rumor as { weeklyBefore: number[] }; expect(l.weeklyBefore).toEqual([5, 9, 3]);
  });
  it('higher starting trust (from Town Hall) means higher baseline compliance', () => {
    const lo = rumorProject({ ...base, trust: 20, trust0: 20 }).rumor as { c0: number }, hi = rumorProject({ ...base, trust: 80, trust0: 80 }).rumor as { c0: number };
    expect(hi.c0).toBeGreaterThan(lo.c0);
  });
});

describe('purity', () => {
  it('engine files import no React or DOM code', () => {
    for (const f of readdirSync('src/modules/crossroads/engine')) { const src = readFileSync(`src/modules/crossroads/engine/${f}`, 'utf8'); expect(src).not.toMatch(/from ['"](react|framer|pixi|recharts)/); expect(src).not.toMatch(/\b(window|document|localStorage)\b/); }
  });
});

import { replayWith } from '../src/modules/crossroads/engine/replay';
describe('what-if replay', () => {
  it('replays the rest of the student’s run on a different branch and reaches an ending', () => {
    const orig = play(TH, 4, ctxTH, { trust: 55 });
    const i = orig.history.findIndex((h) => h.node === 'th_engage');
    const picked = orig.history[i].pick!; const alt = picked === 'saturday' ? 'online' : 'saturday';
    const other = replayWith(TH, orig, i, alt, ctxTH);
    expect(other.done).toBe(true); expect(other.vars.session).toBe(alt);
    expect(other.vars.session).not.toBe(orig.vars.session);
    // the City projection is part of the comparison
    expect((other.vars.proj as { after: object }).after).toBeDefined();
  });
});
