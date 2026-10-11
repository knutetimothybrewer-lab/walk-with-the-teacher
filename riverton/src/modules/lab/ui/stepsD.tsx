import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useLabCtx } from './labCtx';
import { outbreakLab, counterfactual, epiCurve, TARGETING, twoByTwo, evalCaseDef, hoodName, EXPOSURES, type Iv } from '../labs/outbreak';
import { CheckRunner } from '../../../platform/questions/CheckRunner';
import { useProfiles } from '../../../platform/profile/profileStore';
import { useShared } from '../../../platform/sharedState';
import { HOODS } from '../../../platform/map/RivertonMap';

const dailyTrue = (infs: { sym: boolean; onsetHr: number }[], days: number) => epiCurve(infs.filter((i) => i.sym), 24, days).map((b) => b.count);

export function InterveneStep() {
  const { run, patch, go, truth, sim, simBase, compliance } = useLabCtx();
  const [cfDone, setCfDone] = useState(false);
  const patchShared = useShared((s) => s.patch);
  const cf = useMemo(() => (run.ivs.length ? counterfactual(truth, run.ivs, { compliance }) : null), [truth, run.ivs, compliance]);
  const data = useMemo(() => {
    const a = dailyTrue(sim.infections, truth.days), b = dailyTrue(simBase.infections, truth.days);
    return a.map((v, d) => ({ day: d + 1, actual: v, noAction: b[d] }));
  }, [sim, simBase, truth.days]);
  useEffect(() => { if (run.ivs.length) { const d = dailyTrue(sim.infections, truth.days); const weeks: number[] = []; for (let i = 0; i < d.length; i += 7) weeks.push(d.slice(i, i + 7).reduce((x, y) => x + y, 0)); patchShared({ outbreakCases: weeks }); } }, [sim, run.ivs.length, truth.days, patchShared]);
  const targeted = (k: Iv['kind']) => TARGETING[truth.scenario].includes(k);
  const last = run.ivs[run.ivs.length - 1];
  const anyTargeted = run.ivs.some((i) => targeted(i.kind));

  return (
    <section className="lab-panel">
      <h2>Intervene</h2>
      <p>It is day {run.day - run.alertDay + 1} since the alert. Pick an action. It takes effect after a short delay, and how many people follow it depends on <b>community trust</b> ({Math.round(compliance * 100)}% of residents are expected to comply).</p>
      <div className="cardwall">
        {outbreakLab.interventions.map((iv) => (
          <div key={iv.id} className="acard"><h3>{iv.label}</h3><p>{iv.description}</p>
            <button className="btn" disabled={run.ivs.some((x) => x.kind === iv.id)} onClick={() => patch({ ivs: [...run.ivs, { kind: iv.id as Iv['kind'], day: run.day }] })}>{run.ivs.some((x) => x.kind === iv.id) ? 'Already ordered' : `Order on day ${run.day - run.alertDay + 1}`}</button></div>))}
      </div>
      {cf && last && (
        <div style={{ marginTop: '1rem' }}>
          <div className={`fb ${anyTargeted ? 'ok' : 'try'}`} role="status">{anyTargeted ? 'The curve bends: your action targeted the true source of the outbreak.' : 'The curve barely moved. That action does not address how this outbreak is spreading, and every day of delay lets more people get sick. Try another action.'}</div>
          <div style={{ height: 280 }}><ResponsiveContainer><AreaChart data={data}>
            <CartesianGrid stroke="#323a86" strokeDasharray="3 3" /><XAxis dataKey="day" stroke="#b3b9e6" /><YAxis stroke="#b3b9e6" allowDecimals={false} /><Tooltip contentStyle={{ background: '#0f1230', border: '1px solid #323a86' }} /><Legend />
            <Area type="monotone" dataKey="noAction" name="If no action" stroke="#ff7ab6" fill="#ff7ab633" strokeDasharray="5 4" isAnimationActive animationDuration={1200} />
            <Area type="monotone" dataKey="actual" name="With your actions" stroke="#22d3ee" fill="#22d3ee55" isAnimationActive animationDuration={1200} />
          </AreaChart></ResponsiveContainer></div>
          <p><b>Actual cases:</b> {cf.actual}. <b>With no action:</b> {cf.noAction}. <b>Prevented by your action:</b> {cf.prevented}. If you had acted 3 days earlier, about <b>{cf.preventedIfEarlier}</b> cases would have been prevented.</p>
          {!cfDone ? <CheckRunner questionId="q-lab-cf" onDone={() => setCfDone(true)} /> : null}
        </div>)}
      <p style={{ marginTop: '1rem' }}><button className="btn ghost" onClick={() => go('analyze')}>Back to analysis</button> <button className="btn" disabled={!cf || !cfDone} onClick={() => go('conclusion')}>Write your conclusion</button></p>
    </section>
  );
}

export function ConclusionStep() {
  const { run, go, truth, sim } = useLabCtx();
  const [done, setDone] = useState(false);
  const ev = useMemo(() => {
    const rows = new Map<number, ReturnType<typeof Object>>(); void rows;
    const pool = new Map<number, (typeof run.surveys)[number]['rows'][number]>(); run.surveys.forEach((s) => s.rows.forEach((r) => pool.set(r.id, r)));
    const all = [...pool.values()]; const best = Math.max(0, ...EXPOSURES.map((e) => { const r = twoByTwo(all, e).rr; return r != null && isFinite(r) ? r : 0; }));
    const confirmed = run.results.some((r) => run.day >= r.readyDay && (r.data.violation === true || r.data.contaminated === true));
    const scopes = new Set(run.surveys.map((s) => s.scope));
    return [
      { ok: best >= 3, text: `Strength of association: your largest relative risk was ${best ? best.toFixed(1) : 'none yet'} (a value of 3 or more is a strong clue).` },
      { ok: confirmed, text: 'Independent confirmation: an inspection or water test supports your suspected source.' },
      { ok: scopes.size >= 2, text: 'Alternatives considered: you compared more than one group of residents, which helps rule out confounding.' },
      { ok: run.shapeAnswered, text: 'Timing fits: the epi curve shape is consistent with how people were exposed.' },
    ];
  }, [run]);
  void truth; void sim;
  return (
    <section className="lab-panel">
      <h2>Write your conclusion</h2>
      <p>Use the claim, evidence, reasoning format. Then check whether your evidence supports <b>causation</b> and not just association.</p>
      {!done ? <CheckRunner questionId="q-lab-cer" onDone={() => setDone(true)} /> : (
        <>
          <h3>Does the evidence support causation?</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>{ev.map((e) => <li key={e.text} style={{ display: 'flex', gap: '.5rem', margin: '.4rem 0' }}>{e.ok ? <CheckCircle2 color="#22d3ee" /> : <XCircle color="#ff9a4d" />}<span>{e.text}</span></li>)}</ul>
          <p>{ev.filter((e) => e.ok).length >= 3 ? 'Your evidence is fairly strong. Association plus confirmation, timing, and ruling out alternatives is how investigators move from correlation toward causation.' : 'Your evidence is thin. Association alone is not causation. More confirmation or comparison groups would make the case stronger.'}</p>
          <button className="btn" onClick={() => go('limits')}>Evaluate limitations</button>
        </>)}
    </section>
  );
}

export function LimitsStep() {
  const { run, patch, go } = useLabCtx();
  const [q, setQ] = useState(0);
  const U = outbreakLab.content.underTheHood;
  return (
    <section className="lab-panel">
      <h2>Evaluate limitations</h2>
      <p>Required in two parts. Good scientists say what their work cannot show.</p>
      <h3>Part 1: Limitations of your investigation</h3>
      {!run.limitsInv ? (q === 0 ? <CheckRunner key="q1" questionId="q-lab-limit-inv" onDone={() => setQ(1)} /> : <CheckRunner key="q2" questionId="q-lab-bias" onDone={() => patch({ limitsInv: true })} />) : <div className="fb ok">Part 1 complete.</div>}
      <h3 style={{ marginTop: '1.2rem' }}>Part 2: Under the hood: limitations of the model</h3>
      <div className="acard"><h3>Assumptions</h3><ul>{U.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></div>
      <div className="acard"><h3>Parameters</h3><table className="tbl"><tbody>{U.parameters.map((p) => <tr key={p.name}><th>{p.name}</th><td>{p.value}</td><td>{p.note}</td></tr>)}</tbody></table></div>
      <div className="acard"><h3>What this model leaves out</h3><ul>{U.limitations.map((a) => <li key={a}>{a}</li>)}</ul></div>
      <div className="acard"><h3>Sources</h3><ul>{U.sources.map((a) => <li key={a}>{a}</li>)}</ul></div>
      {run.limitsInv && !run.limitsModel && <CheckRunner questionId="q-lab-limit-model" onDone={() => patch({ limitsModel: true })} />}
      {run.limitsModel && <div className="fb ok">Part 2 complete.</div>}
      <p style={{ marginTop: '1rem' }}><button className="btn" disabled={!(run.limitsInv && run.limitsModel)} onClick={() => go('ethics')}>{run.limitsInv && run.limitsModel ? 'Ethics and privacy' : 'Complete both parts to continue'}</button></p>
    </section>
  );
}

const FIELDS: { id: string; label: string; risk: 'high' | 'med' | 'low' }[] = [
  { id: 'name', label: 'Names of people who got sick', risk: 'high' }, { id: 'address', label: 'Exact home addresses', risk: 'high' }, { id: 'age', label: 'Exact ages', risk: 'med' },
  { id: 'ageband', label: 'Age group (child, adult, older adult)', risk: 'low' }, { id: 'hood', label: 'Neighborhood of each case', risk: 'med' }, { id: 'onset', label: 'Date illness started', risk: 'low' },
  { id: 'source', label: 'Suspected source and what the public should do', risk: 'low' },
];
export function EthicsStep() {
  const { run, patch, go, rowsInDef } = useLabCtx();
  const [picks, setPicks] = useState<string[]>(run.ethicsChoices);
  const [wording, setWording] = useState('');
  const [shown, setShown] = useState(false);
  const counts = HOODS.map((h) => ({ n: rowsInDef.filter((r) => r.hood === h.id).length, name: h.name })).filter((c) => c.n > 0).sort((a, b) => a.n - b.n);
  const small = counts.filter((c) => c.n < 5);
  const risky = picks.includes('name') || picks.includes('address') || (picks.includes('age') && picks.includes('hood') && small.length > 0);
  return (
    <section className="lab-panel">
      <h2>Ethics and privacy</h2>
      <p>The public deserves to know how to protect themselves. Sick people deserve privacy. Choose what to release.</p>
      <div className="chipset">{FIELDS.map((f) => <button key={f.id} className={`tog ${picks.includes(f.id) ? 'on' : ''}`} aria-pressed={picks.includes(f.id)} onClick={() => setPicks(picks.includes(f.id) ? picks.filter((x) => x !== f.id) : [...picks, f.id])}>{f.label}</button>)}</div>
      <h3 style={{ marginTop: '1rem' }}>How should the announcement describe the outbreak?</h3>
      <label className="toggle"><span>“The outbreak is a problem among {hoodName(truth_hood(counts))} residents.”</span><input type="radio" name="w" checked={wording === 'stig'} onChange={() => setWording('stig')} /></label>
      <label className="toggle"><span>“Cases are linked to a specific source. Here is what everyone should do to stay safe.”</span><input type="radio" name="w" checked={wording === 'neutral'} onChange={() => setWording('neutral')} /></label>
      <p><button className="btn" disabled={!picks.length || !wording} onClick={() => { setShown(true); patch({ ethicsChoices: picks }); }}>See the privacy review</button></p>
      {shown && (
        <div className={`fb ${risky || wording === 'stig' ? 'try' : 'ok'}`}>
          <ul>
            {picks.includes('name') && <li>Names identify people and are not needed to protect the public.</li>}
            {picks.includes('address') && <li>Exact addresses can identify people, especially in small areas.</li>}
            {picks.includes('age') && picks.includes('hood') && small.length > 0 && <li>Exact age plus neighborhood: {small.map((s) => `${s.name} has only ${s.n} case(s)`).join('; ')}. With numbers this small, someone could be identified.</li>}
            {wording === 'stig' && <li>Pointing at a neighborhood’s residents stigmatizes them. Describe the source, not the people.</li>}
            {!risky && wording === 'neutral' && <li>Good balance: the public gets the information it needs and individuals stay private.</li>}
          </ul>
        </div>)}
      {shown && !run.ethicsDone && <CheckRunner questionId="q-lab-privacy" onDone={() => patch({ ethicsDone: true })} />}
      <p><button className="btn" disabled={!run.ethicsDone} onClick={() => go('done')}>See the results</button></p>
    </section>
  );
}
const truth_hood = (c: { name: string }[]) => (c.length ? HOODS.find((h) => h.name === c[c.length - 1].name)!.id : 'millworks');

export function DoneStep({ onRestart }: { onRestart: () => void }) {
  const { run, patch, truth, sim, compliance, pid } = useLabCtx();
  const upd = useProfiles((s) => s.update);
  useEffect(() => {
    if (!run.finished) { patch({ finished: true }); upd((p) => ({ ...p, progress: { ...p.progress, lab: { ...(p.progress.lab ?? { minutes: 0, completed: [] }), completed: [...new Set([...(p.progress.lab?.completed ?? []), 'outbreak'])] } } })); }
  }, [run.finished, patch, upd]);
  void pid; void sim; void compliance;
  const ev = evalCaseDef(truth, sim, run.caseDef);
  const hypoRight = run.h2?.source === truth.source.type;
  const cf = counterfactual(truth, run.ivs, { compliance });
  const usedSource = run.results.some((r) => r.kind !== 'specimens' && (r.data.violation === true || r.data.contaminated === true));
  const items = [
    { ok: ev.verdict === 'balanced', text: `Case definition: ${ev.verdict} (sensitivity ${Math.round(ev.sensitivity * 100)}%, specificity ${Math.round(ev.specificity * 100)}%).` },
    { ok: run.surveys.length > 0, text: run.surveys.length ? 'You collected a comparison group of residents who were not ill.' : 'You never surveyed a comparison group, so attack rates could not be compared.' },
    { ok: usedSource, text: usedSource ? 'You found direct confirmation (inspection or water test) at the true source.' : 'You did not find direct lab or inspection confirmation of the true source.' },
    { ok: hypoRight, text: hypoRight ? 'Your final hypothesis matches the true source.' : 'Your final hypothesis did not match the true source.' },
    { ok: run.ivs.some((i) => TARGETING[truth.scenario].includes(i.kind)), text: `You ordered ${run.ivs.length} action(s); ${cf.prevented} cases were prevented compared with doing nothing.` },
  ];
  return (
    <section className="lab-panel">
      <h2>Debrief</h2>
      <div className="reveal"><h3>The truth</h3><p><b>{truth.source.label}.</b> {truth.source.detail}</p><p>Epi curve type: <b>{truth.source.curve}</b>. The popular diner and the festival (when the source was something else) were red herrings, and festival attendance was linked to neighborhood.</p></div>
      <h3 style={{ marginTop: '1rem' }}>How your investigation went</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>{items.map((e) => <li key={e.text} style={{ display: 'flex', gap: '.5rem', margin: '.4rem 0' }}>{e.ok ? <CheckCircle2 color="#22d3ee" /> : <XCircle color="#ff9a4d" />}<span>{e.text}</span></li>)}</ul>
      <p>You used {run.daysUsed} of {run.daysTotal} days and {run.budgetTotal - run.budget} of {run.budgetTotal} budget points.</p>
      <p><Link className="btn" to="/">Back to Riverton</Link> <button className="btn ghost" onClick={onRestart}>Investigate again</button></p>
    </section>
  );
}
export type { Iv };
