import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLabCtx, dynamicMC } from './labCtx';
import { epiCurve, twoByTwo, survey, hoodName, EXPOSURES, EXPOSURE_LABELS, type Exposure, type Interview } from '../labs/outbreak';
import { CheckRunner } from '../../../platform/questions/CheckRunner';
import { RivertonMap, HOODS } from '../../../platform/map/RivertonMap';
import { HypothesisBuilder } from './stepsA';
import { pinFor } from './pins';

type Tab = 'list' | 'curve' | 'map' | 'table' | 'resample';
const TABS: { id: Tab; label: string }[] = [{ id: 'list', label: 'Line list' }, { id: 'curve', label: 'Epi curve' }, { id: 'map', label: 'Spot map' }, { id: 'table', label: '2×2 table & relative risk' }, { id: 'resample', label: 'Resample' }];
const pct = (x: number) => `${Math.round(x * 100)}%`;

function pooledRows(surveys: { rows: Interview[] }[]): Interview[] {
  const m = new Map<number, Interview>(); for (const s of surveys) for (const r of s.rows) m.set(r.id, r); return [...m.values()];
}

export function AnalyzeStep() {
  const { run, patch, go, truth, rowsInDef, rows, sim } = useLabCtx();
  const [tab, setTab] = useState<Tab>('curve');
  const [bin, setBin] = useState(24);
  const [shapePick, setShapePick] = useState(false);
  const [exp, setExp] = useState<Exposure>('wraps');
  const [rrAsk, setRrAsk] = useState(false);
  const [sampleAsk, setSampleAsk] = useState(false);
  const [resample, setResample] = useState<{ ar1: number; ar0: number; rr: number | null }[] | null>(null);
  const pool = useMemo(() => pooledRows(run.surveys), [run.surveys]);
  const tbl = useMemo(() => twoByTwo(pool, exp), [pool, exp]);

  const curve = useMemo(() => epiCurve(rowsInDef, bin, truth.days).filter((b) => b.start / 24 <= run.day + 1).map((b) => ({ label: bin >= 24 ? `Day ${Math.floor(b.start / 24) + 1}` : `D${Math.floor(b.start / 24) + 1} ${Math.round(b.start % 24)}h`, count: b.count })), [rowsInDef, bin, truth.days, run.day]);
  const binMsg = bin <= 6 && rowsInDef.length < 80 ? 'Narrow bins with few cases make the bars jumpy, so the shape is hard to see.' : bin >= 48 ? 'Wide bins smooth everything out and can hide the shape.' : bin === 24 ? 'Daily bins are a good start for an outbreak lasting a few weeks.' : 'Reasonable. Try other widths to see how the picture changes.';

  const shapeQ = dynamicMC('dyn-shape', 'epi-curves', 'Look at your epi curve. Which type of source does its shape suggest?', [
    { id: 'a', text: 'Point source: one brief exposure, one sharp peak', feedback: truth.source.curve === 'point' ? 'Yes: a single narrow peak means almost everyone was exposed at about the same time.' : 'A point source gives one sharp, narrow peak. Compare with your curve.', correct: truth.source.curve === 'point', misconception: truth.source.curve === 'point' ? undefined : 'epi-shape-confusion' },
    { id: 'b', text: 'Continuous source: exposure kept going, so a long plateau', feedback: truth.source.curve === 'continuous' ? 'Yes: a broad plateau means people kept being exposed until the source was removed.' : 'A continuous source gives a long plateau. Compare with your curve.', correct: truth.source.curve === 'continuous', misconception: truth.source.curve === 'continuous' ? undefined : 'epi-shape-confusion' },
    { id: 'c', text: 'Propagated: person-to-person, with repeated waves', feedback: truth.source.curve === 'propagated' ? 'Yes: repeating waves, one incubation period apart, show cases infecting others.' : 'Propagated spread gives repeated waves about one incubation period apart. Compare with your curve.', correct: truth.source.curve === 'propagated', misconception: truth.source.curve === 'propagated' ? undefined : 'epi-shape-confusion' },
  ], 'Curve shape reflects how long and how many times people were exposed.', 'Is there one peak, a plateau, or several waves?');

  const rrQ = (() => {
    if (tbl.rr == null || !isFinite(tbl.rr)) return null;
    const high = tbl.rr >= 1.5;
    return dynamicMC(`dyn-rr-${exp}`, 'relative-risk', `In your survey, the relative risk for "${EXPOSURE_LABELS[exp]}" is ${tbl.rr.toFixed(1)}. What does that mean?`, [
      { id: 'a', text: high ? `People with this exposure were about ${tbl.rr.toFixed(1)} times as likely to be ill. It is a clue, but it does not prove cause by itself.` : 'Ill and well people had similar exposure, so there is little sign of an association.', feedback: 'Yes: relative risk compares the attack rate in exposed to the attack rate in unexposed.', correct: true },
      { id: 'b', text: 'This exposure is proven to be the cause of the outbreak.', feedback: 'A high RR is a clue, not proof. Check for confounding and other evidence.', misconception: 'conf-rr-proves' },
      { id: 'c', text: 'This exposure protected people from getting sick.', feedback: 'An RR above 1 means higher risk in the exposed. Below 1 would suggest protection.', misconception: 'rr-inverted' },
      { id: 'd', text: `${tbl.rr.toFixed(1)}% of exposed people got sick.`, feedback: 'The RR is a ratio of two attack rates, not a percent of people.', misconception: 'rr-difference' },
    ], 'RR = attack rate in exposed ÷ attack rate in unexposed.', 'Divide the two attack rates.');
  })();

  const lastSurvey = run.surveys[run.surveys.length - 1];
  const doResample = () => {
    if (!lastSurvey) return;
    const out = [0, 1, 2, 3, 4].map((k) => { const rws = survey(truth, sim, run.day, lastSurvey.n, lastSurvey.scope, run.caseDef, 1000 + k); const t = twoByTwo(rws, exp); return { ar1: t.arExposed, ar0: t.arUnexposed, rr: t.rr }; });
    setResample(out);
  };

  const hoodCounts = HOODS.map((h) => ({ id: h.id, name: h.name, n: rowsInDef.filter((r) => r.hood === h.id).length, pop: truth.residents.filter((r) => r.hood === h.id).length })).sort((a, b) => b.n / b.pop - a.n / a.pop);
  const ready = run.shapeAnswered && run.rrAnswered && !!run.h2;

  return (
    <section className="lab-panel">
      <h2>Analyze</h2>
      <p>You are working with {rows.length} reported cases ({rowsInDef.length} meet your case definition) and {pool.length} surveyed residents.</p>
      <div className="tabs">{TABS.map((t) => <button key={t.id} className={`tog ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>

      {tab === 'list' && (
        <div className="scroll"><table className="tbl"><thead><tr><th>Case</th><th>Age</th><th>Sex</th><th>Neighborhood</th><th>Onset</th><th>Symptoms</th><th>Reported</th><th>How found</th></tr></thead>
          <tbody>{rowsInDef.map((r) => <tr key={r.id}><td>{r.label}</td><td>{r.age}</td><td>{r.sex}</td><td>{hoodName(r.hood)}</td><td>Day {r.onsetDay + 1}</td><td>{r.symptoms.join(', ')}</td><td>Day {r.reportDay + 1}</td><td>{r.found ? 'Active case finding' : r.er ? 'ER' : 'Lab report'}</td></tr>)}</tbody></table></div>
      )}

      {tab === 'curve' && (
        <div>
          <label className="field" style={{ maxWidth: 260 }}>Bin width<select value={bin} onChange={(e) => setBin(Number(e.target.value))}>{[6, 12, 24, 48].map((b) => <option key={b} value={b}>{b} hours</option>)}</select></label>
          <p className="hint">{binMsg}</p>
          <div style={{ height: 280 }}><ResponsiveContainer><BarChart data={curve} barCategoryGap={1}>
            <CartesianGrid stroke="#323a86" strokeDasharray="3 3" /><XAxis dataKey="label" stroke="#b3b9e6" interval="preserveStartEnd" /><YAxis stroke="#b3b9e6" allowDecimals={false} /><Tooltip contentStyle={{ background: '#0f1230', border: '1px solid #323a86' }} />
            <Bar dataKey="count" name="Cases by onset" fill="#22d3ee" isAnimationActive animationDuration={900} />
          </BarChart></ResponsiveContainer></div>
          <p className="hint">Recent days look low because of reporting delay.</p>
          {!shapePick ? <button className="btn" onClick={() => setShapePick(true)}>What shape is this?</button> : !run.shapeAnswered ? <CheckRunner question={shapeQ} onDone={() => patch({ shapeAnswered: true })} /> : <div className="fb ok">Shape identified.</div>}
        </div>
      )}

      {tab === 'map' && (
        <div className="grid2">
          <RivertonMap pins={rowsInDef.map((r) => pinFor(r.id, r.hood, truth.seed))} showLandmarks={false} />
          <div><h3>Cases by neighborhood</h3><table className="tbl"><thead><tr><th>Neighborhood</th><th>Cases</th><th>Per 1,000 residents</th></tr></thead>
            <tbody>{hoodCounts.map((h) => <tr key={h.id}><td>{h.name}</td><td>{h.n}</td><td>{((h.n / h.pop) * 1000).toFixed(1)}</td></tr>)}</tbody></table>
            <p className="hint">Count alone can mislead: larger neighborhoods have more people. Compare rates.</p></div>
        </div>
      )}

      {tab === 'table' && (
        <div>
          {!pool.length ? <p>You have no surveyed residents yet. Go back to Investigate and survey a sample of residents (ill and not ill) to compare attack rates.</p> : (
            <>
              <label className="field" style={{ maxWidth: 420 }}>Exposure<select value={exp} onChange={(e) => { setExp(e.target.value as Exposure); setRrAsk(false); }}>{EXPOSURES.map((e) => <option key={e} value={e}>{EXPOSURE_LABELS[e]}</option>)}</select></label>
              <table className="twoby"><thead><tr><th></th><th>Ill</th><th>Not ill</th><th>Total</th><th>Attack rate</th></tr></thead>
                <tbody><tr><th>Exposed</th><td>{tbl.a}</td><td>{tbl.b}</td><td>{tbl.a + tbl.b}</td><td>{pct(tbl.arExposed)}</td></tr><tr><th>Not exposed</th><td>{tbl.c}</td><td>{tbl.d}</td><td>{tbl.c + tbl.d}</td><td>{pct(tbl.arUnexposed)}</td></tr></tbody></table>
              <p>Attack rate in exposed = {tbl.a} ÷ {tbl.a + tbl.b} = {pct(tbl.arExposed)}. In not exposed = {tbl.c} ÷ {tbl.c + tbl.d} = {pct(tbl.arUnexposed)}.</p>
              <p>Relative risk = {pct(tbl.arExposed)} ÷ {pct(tbl.arUnexposed)} = <span className="stat">{tbl.rr == null ? 'n/a' : isFinite(tbl.rr) ? tbl.rr.toFixed(1) : '∞'}</span></p>
              {tbl.a + tbl.c < 8 && <p className="hint">Few ill people in this sample: the numbers are shaky. A bigger sample would help.</p>}
              {(tbl.rr == null || !isFinite(tbl.rr)) && <p className="hint">The relative risk is undefined here because nobody in the unexposed group was ill (or the group is empty). A larger sample can fix that.</p>}
              {!rrAsk ? <button className="btn" onClick={() => setRrAsk(true)}>Check my understanding</button> : rrQ ? <CheckRunner key={rrQ.id} question={rrQ} onDone={() => patch({ rrAnswered: true })} /> : <CheckRunner key="rr-generic" questionId="q-rr-1p" onDone={() => patch({ rrAnswered: true })} />}
              <p className="hint">Tip: if one neighborhood has most of the cases, survey just that neighborhood and compare. A confounder can hide in the overall numbers.</p>
            </>)}
        </div>
      )}

      {tab === 'resample' && (
        <div>
          {!lastSurvey ? <p>Run a survey in Investigate first.</p> : (
            <>
              <p>Draw five different random samples of {lastSurvey.n} residents (same group as your last survey) and watch how much the answer moves.</p>
              <label className="field" style={{ maxWidth: 420 }}>Exposure<select value={exp} onChange={(e) => { setExp(e.target.value as Exposure); setResample(null); }}>{EXPOSURES.map((e) => <option key={e} value={e}>{EXPOSURE_LABELS[e]}</option>)}</select></label>
              <button className="btn" onClick={doResample}>Draw 5 new samples</button>
              {resample && (<>
                <table className="tbl" style={{ marginTop: '.8rem', maxWidth: 520 }}><thead><tr><th>Sample</th><th>Attack rate (exposed)</th><th>Attack rate (not exposed)</th><th>Relative risk</th></tr></thead>
                  <tbody>{resample.map((r, i) => <tr key={i}><td>{i + 1}</td><td>{pct(r.ar1)}</td><td>{pct(r.ar0)}</td><td>{r.rr == null ? 'n/a' : isFinite(r.rr) ? r.rr.toFixed(1) : '∞'}</td></tr>)}</tbody></table>
                <p>The relative risk ranged from {Math.min(...resample.map((r) => (r.rr != null && isFinite(r.rr) ? r.rr : 0))).toFixed(1)} to {Math.max(...resample.map((r) => (r.rr != null && isFinite(r.rr) ? r.rr : 0))).toFixed(1)}. Smaller samples bounce around more.</p>
                {!sampleAsk ? <button className="btn" onClick={() => setSampleAsk(true)}>Check my understanding</button> : <CheckRunner questionId="q-lab-sample" onDone={() => setSampleAsk(false)} />}
              </>)}
            </>)}
        </div>
      )}

      <hr style={{ borderColor: '#323a86', margin: '1.4rem 0' }} />
      <HypothesisBuilder title="Restate your hypothesis after seeing the data" value={run.h2} onSave={(h) => patch({ h2: h })} />
      {run.h1 && run.h2 && <p className="hint">First guess: {run.h1.source}. Now: {run.h2.source}. {run.h1.source === run.h2.source ? 'Your idea did not change. Is the evidence strong enough?' : 'Your idea changed as the data came in. That is how investigations work.'}</p>}
      <p style={{ marginTop: '1rem' }}>
        <button className="btn ghost" onClick={() => go('investigate')}>Back to investigation</button>{' '}
        <button className="btn" disabled={!ready} onClick={() => go('intervene')}>{ready ? 'Choose an intervention' : 'Identify the curve shape, check your RR, and restate your hypothesis'}</button>
      </p>
    </section>
  );
}
