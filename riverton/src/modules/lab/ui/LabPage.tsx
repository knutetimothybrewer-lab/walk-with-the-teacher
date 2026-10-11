import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Siren, Wallet, CalendarDays, FlaskConical } from 'lucide-react';
import { useProfiles } from '../../../platform/profile/profileStore';
import { useTeacher } from '../../../platform/teacher/teacherStore';
import { useShared, complianceFromTrust } from '../../../platform/sharedState';
import { viableTruth, simulate, alert as findAlert, lineList, meetsDef, type Truth, type Sim } from '../labs/outbreak';
import { newRun, seedFor, STEPS, useLab, type Step } from './labStore';
import { Ctx, type LabCtx } from './labCtx';
import { FoundationsStep, AlertStep, CaseDefStep, HypothesisStep } from './stepsA';
import { InvestigateStep } from './stepsB';
import { AnalyzeStep } from './stepsC';
import { InterveneStep, ConclusionStep, LimitsStep, EthicsStep, DoneStep } from './stepsD';
import './lab.css';

const truthCache = new Map<string, Truth>();
const simCache = new Map<string, Sim>();
const getTruth = (seed: number, sc: string) => { const k = `${seed}|${sc}`; if (!truthCache.has(k)) truthCache.set(k, viableTruth(seed, sc as never)); return truthCache.get(k)!; };

export default function LabPage() {
  const me = useProfiles((s) => s.active());
  const teacher = useTeacher();
  const trust = useShared((s) => s.trust);
  const { runs, set, patch, clear } = useLab();
  const run = me ? runs[me.id] : undefined;
  const compliance = complianceFromTrust(trust);

  const truth = useMemo(() => (run ? getTruth(run.seed, run.scenario) : null), [run?.seed, run?.scenario]); // eslint-disable-line react-hooks/exhaustive-deps
  const simBase = useMemo(() => (truth ? simulate(truth, [], { compliance }) : null), [truth, compliance]);
  const sim = useMemo(() => {
    if (!truth || !run) return null;
    const k = `${run.seed}|${run.scenario}|${compliance}|${JSON.stringify(run.ivs)}`;
    if (!simCache.has(k)) simCache.set(k, simulate(truth, run.ivs, { compliance }));
    return simCache.get(k)!;
  }, [truth, run?.ivs, compliance]); // eslint-disable-line react-hooks/exhaustive-deps
  const alertAt = useMemo(() => (truth && simBase ? findAlert(truth, simBase) : null), [truth, simBase]);

  useEffect(() => { if (run && alertAt && run.alertDay === 0 && run.day === 0 && me) patch(me.id, { alertDay: alertAt.day, day: alertAt.day }); }, [run, alertAt, me, patch]);

  const rows = useMemo(() => (truth && sim && run ? lineList(truth, sim, run.day, run.found) : []), [truth, sim, run?.day, run?.found]); // eslint-disable-line react-hooks/exhaustive-deps
  const rowsInDef = useMemo(() => (run ? rows.filter((r) => meetsDef(run.caseDef, r, r.onsetDay, r.symptoms)) : []), [rows, run?.caseDef]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!me) return <main className="page"><h1>Sim Lab</h1><p>Add a student first on the <Link to="/">home screen</Link>.</p></main>;

  if (!run || !truth || !sim || !simBase) {
    const L = teacher.lab;
    return (
      <div className="lab-root"><main className="page lab-intro">
        <motion.div className="lab-panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <div className="lab-title"><FlaskConical size={34} /><div><h1>Sim Lab: Disease Detective</h1><p>Outbreak in Riverton</p></div></div>
          <p>The health department has called you in. You will detect an outbreak, define cases, collect data on a limited budget, analyze it with epidemiology tools, act, and then critique your own work.</p>
          <ul><li>{L.days} investigator days and {L.budget} budget points</li><li>Foundations lessons first (about 9 minutes)</li><li>Your investigation seed: {L.classSeed ?? 'unique to you'}</li></ul>
          <button className="btn" style={{ ['--accent-a' as string]: 'var(--lab-a)' }} onClick={() => set(me.id, newRun(L.classSeed ?? seedFor(me.id), L.scenario, L.budget, L.days))}>Begin investigation</button>
        </motion.div>
      </main></div>
    );
  }

  const ctx: LabCtx = { run, patch: (p) => patch(me.id, p), go: (s: Step) => patch(me.id, { step: s }), truth, sim, simBase, alertAt, compliance, rows, rowsInDef, pid: me.id };
  const idx = STEPS.findIndex((s) => s.id === run.step);
  const body = { foundations: <FoundationsStep />, alert: <AlertStep />, casedef: <CaseDefStep />, hypothesis: <HypothesisStep />, investigate: <InvestigateStep />, analyze: <AnalyzeStep />, intervene: <InterveneStep />, conclusion: <ConclusionStep />, limits: <LimitsStep />, ethics: <EthicsStep />, done: <DoneStep onRestart={() => clear(me.id)} /> }[run.step];
  const showHud = idx >= STEPS.findIndex((s) => s.id === 'investigate');

  return (
    <Ctx.Provider value={ctx}>
      <div className="lab-root">
        <main className="page lab-page">
          <nav className="lab-steps" aria-label="Investigation steps">
            {STEPS.map((s, i) => <button key={s.id} className={`lab-step ${i === idx ? 'now' : i < idx ? 'past' : ''}`} disabled={i > idx} onClick={() => i < idx && ctx.go(s.id)}>{i + 1}. {s.label}</button>)}
          </nav>
          {showHud && (
            <div className="lab-hud" role="status">
              <span><CalendarDays size={16} /> Day {run.day - run.alertDay + 1} since alert</span>
              <span><Siren size={16} /> {run.daysTotal - run.daysUsed} investigation days left</span>
              <span><Wallet size={16} /> {run.budget} budget points</span>
              <span>Reported cases: {rows.length}</span>
            </div>
          )}
          <motion.div key={run.step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>{body}</motion.div>
        </main>
      </div>
    </Ctx.Provider>
  );
}
