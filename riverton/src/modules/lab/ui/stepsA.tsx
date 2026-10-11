import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Siren, CheckCircle2, BookOpen } from 'lucide-react';
import { useLabCtx } from './labCtx';
import { outbreakLab, evalCaseDef, hoodName, SYMPTOMS, baselineMean, alertThreshold, type CaseDef, type Symptom } from '../labs/outbreak';
import { CheckRunner } from '../../../platform/questions/CheckRunner';
import { useProfiles } from '../../../platform/profile/profileStore';
import { useTeacher } from '../../../platform/teacher/teacherStore';
import { lessonById } from '../../../platform/content';
import { HOODS } from '../../../platform/map/RivertonMap';

export function FoundationsStep() {
  const { go } = useLabCtx();
  const done = useProfiles((s) => s.active()?.lessonsDone ?? []);
  const required = useTeacher((s) => s.foundationsRequired);
  const ids = outbreakLab.content.lessons;
  const all = ids.every((i) => done.includes(i));
  return (
    <section className="lab-panel">
      <h2><BookOpen size={22} /> Foundations</h2>
      <p>Three short lessons give you the tools detectives use. Each ends with checks for understanding.</p>
      {ids.map((id) => { const l = lessonById(id)!; const d = done.includes(id); return (
        <div key={id} className="acard"><h3>{d && <CheckCircle2 size={16} />} {l.title} <span className="chip">~{l.minutes} min</span></h3>
          <Link className="btn" to={`/lesson/${id}`} state={{ from: '/lab' }}>{d ? 'Review lesson' : 'Start lesson'}</Link></div>); })}
      <p><button className="btn" disabled={required && !all} onClick={() => go('alert')}>{all || !required ? 'Go to the alert' : 'Finish the lessons to continue'}</button></p>
    </section>
  );
}

export function AlertStep() {
  const { truth, simBase, alertAt, run, go } = useLabCtx();
  const [done, setDone] = useState(false);
  const day = alertAt?.day ?? 5;
  const data = Array.from({ length: Math.min(day + 1, truth.days) }, (_, d) => ({ day: d + 1, er: simBase.er[d], expected: baselineMean() }));
  void run;
  return (
    <section className="lab-panel">
      <div className="alert-banner"><Siren size={34} /><div><b>{outbreakLab.content.alert.headline}</b><br />{alertAt?.kind === 'cluster' ? 'Several lab-confirmed stomach-illness cases have just been reported in the same area.' : outbreakLab.content.alert.body}</div></div>
      <h3 style={{ marginTop: '1rem' }}>ER visits for stomach illness, per day</h3>
      <div style={{ height: 260 }}>
        <ResponsiveContainer>
          <ComposedChart data={data}>
            <CartesianGrid stroke="#323a86" strokeDasharray="3 3" /><XAxis dataKey="day" stroke="#b3b9e6" /><YAxis stroke="#b3b9e6" /><Tooltip contentStyle={{ background: '#0f1230', border: '1px solid #323a86' }} />
            <Bar dataKey="er" name="ER visits" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            <Line dataKey="expected" name="Expected (baseline)" stroke="#f2a93b" dot={false} strokeDasharray="5 4" />
            <ReferenceLine y={alertThreshold()} stroke="#ff7ab6" label={{ value: 'Alert level', fill: '#ff7ab6', position: 'insideTopRight' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p>Compare the bars with the expected line. An <b>outbreak</b> is more cases than expected for a place and time.</p>
      {!done ? <CheckRunner questionId="q-lab-alert" onDone={() => setDone(true)} /> : <button className="btn" onClick={() => go('casedef')}>Start the investigation</button>}
    </section>
  );
}

const SYM_LABEL: Record<Symptom, string> = { diarrhea: 'Diarrhea', vomiting: 'Vomiting', cramps: 'Stomach cramps', nausea: 'Nausea', fever: 'Fever', headache: 'Headache', cough: 'Cough' };

export function CaseDefStep() {
  const { run, patch, truth, sim, go } = useLabCtx();
  const def = run.caseDef;
  const upd = (p: Partial<CaseDef>) => patch({ caseDef: { ...def, ...p } });
  const ev = evalCaseDef(truth, sim, def);
  const verdictCls = ev.verdict === 'balanced' ? 'ok' : 'try';
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const [checked, setChecked] = useState(false);
  return (
    <section className="lab-panel">
      <h2>Build a case definition</h2>
      <p>A case definition says who counts as a case: <b>person</b>, <b>place</b>, <b>time</b>, and <b>symptoms</b>. You will see how well it catches true cases (<b>sensitivity</b>) and leaves out non-cases (<b>specificity</b>).</p>
      <div className="grid2">
        <div>
          <h3>Symptoms</h3>
          <div className="chipset">{SYMPTOMS.map((s) => <button key={s} className={`tog ${def.symptoms.includes(s) ? 'on' : ''}`} aria-pressed={def.symptoms.includes(s)} onClick={() => upd({ symptoms: def.symptoms.includes(s) ? def.symptoms.filter((x) => x !== s) : [...def.symptoms, s] })}>{SYM_LABEL[s]}</button>)}</div>
          <label className="field">Must have at least how many of the chosen symptoms?
            <select value={def.need} onChange={(e) => upd({ need: Number(e.target.value) })}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <h3>Person</h3>
          <label className="field">Age<select value={`${def.ageMin}-${def.ageMax}`} onChange={(e) => { const [a, b] = e.target.value.split('-').map(Number); upd({ ageMin: a, ageMax: b }); }}>
            <option value="0-120">Any age</option><option value="0-17">Children (under 18)</option><option value="18-120">Adults</option></select></label>
          <h3>Place</h3>
          <div className="chipset"><button className={`tog ${def.hoods === 'any' ? 'on' : ''}`} onClick={() => upd({ hoods: 'any' })}>Anywhere in Riverton</button>
            {HOODS.map((h) => { const on = def.hoods !== 'any' && def.hoods.includes(h.id); return <button key={h.id} className={`tog ${on ? 'on' : ''}`} onClick={() => upd({ hoods: on ? ((def.hoods as string[]).filter((x) => x !== h.id).length ? (def.hoods as string[]).filter((x) => x !== h.id) : 'any') : [...(def.hoods === 'any' ? [] : def.hoods), h.id] })}>{h.name}</button>; })}</div>
          <h3>Time (onset day)</h3>
          <label className="field">Became ill between day {def.onsetFrom + 1} and day {Math.min(def.onsetTo, 99) + 1}
            <select value={def.onsetTo} onChange={(e) => upd({ onsetTo: Number(e.target.value) })}><option value={99}>Any time</option><option value={20}>First 3 weeks</option><option value={12}>First 12 days</option><option value={6}>First week only</option></select></label>
        </div>
        <div>
          <h3>How well does it work?</h3>
          {[['Sensitivity (true cases caught)', ev.sensitivity], ['Specificity (non-cases excluded)', ev.specificity], ['Share of "cases" that are real', ev.ppv]].map(([l, v]) => (
            <div key={l as string}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{l as string}</span><b>{pct(v as number)}</b></div><div className="gauge"><i style={{ width: pct(v as number) }} /></div></div>))}
          <div className={`fb ${verdictCls}`} style={{ marginTop: '1rem' }} role="status">
            {ev.verdict === 'balanced' && 'Balanced: this definition catches most real cases and leaves out most non-cases.'}
            {ev.verdict === 'too broad' && 'Too broad: it counts many people who are sick with something else (low specificity). Add place, time, or a more specific symptom.'}
            {ev.verdict === 'too narrow' && 'Too narrow: it misses many real cases (low sensitivity). Loosen a requirement.'}
          </div>
          <p className="hint">Out of {ev.tp + ev.fn} true cases, your definition catches {ev.tp}. It also counts {ev.fp} people who are not outbreak cases.</p>
        </div>
      </div>
      {!checked ? <CheckRunner questionId="q-cd-1" onDone={() => { setChecked(true); }} /> : null}
      <p><button className="btn" disabled={!checked} onClick={() => { patch({ caseDefTries: run.caseDefTries + 1 }); go('hypothesis'); }}>Use this definition</button></p>
    </section>
  );
}

const SOURCES = [['water', 'The water supply'], ['vendor', 'A food vendor at the festival'], ['diner', 'The popular restaurant (Maple Street Diner)'], ['pool', 'The public pool'], ['person', 'Person-to-person spread (school or nursing home)']];
const REASONS = ['Most cases live in one neighborhood', 'Many cases share a meal or event', 'Many cases are children', 'Cases are linked to one building or institution', 'It is a very popular place', 'I have no evidence yet, just a guess'];

export function HypothesisBuilder({ value, onSave, title }: { value: { source: string; because: string } | null; onSave: (h: { source: string; because: string }) => void; title: string }) {
  const [source, setSource] = useState(value?.source ?? ''); const [because, setBecause] = useState(value?.because ?? '');
  return (
    <div>
      <h3>{title}</h3>
      <p>We think the source is <select aria-label="Suspected source" value={source} onChange={(e) => setSource(e.target.value)}><option value="">choose…</option>{SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select> because{' '}
        <select aria-label="Reason" value={because} onChange={(e) => setBecause(e.target.value)}><option value="">choose…</option>{REASONS.map((r) => <option key={r}>{r}</option>)}</select>.</p>
      <button className="btn" disabled={!source || !because} onClick={() => onSave({ source, because })}>Save hypothesis</button>
    </div>
  );
}

export function HypothesisStep() {
  const { run, patch, go } = useLabCtx();
  return (
    <section className="lab-panel">
      <h2>Form a hypothesis</h2>
      <p>A <b>hypothesis</b> is a testable guess about the source and how it spreads. It is fine to be wrong at this stage. You will restate it after you have data.</p>
      <HypothesisBuilder title="Your first hypothesis" value={run.h1} onSave={(h) => { patch({ h1: h }); go('investigate'); }} />
    </section>
  );
}
export { hoodName };
