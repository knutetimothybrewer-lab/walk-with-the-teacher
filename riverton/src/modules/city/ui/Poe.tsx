import { useState } from 'react';
import { Modal } from '../../../platform/ui/Modal';
import world from '../../../content/shared/riverton-world.json';
import { explainChange, type Out } from '../sim';
import { useGame } from '../game/store';
import { MAGNITUDES, POE, POE_OUTCOMES, OUT_LABEL, judge, nameOf, valuesOf, magnitudeOf, type Magnitude } from '../game/poe';
import { useProfiles } from '../../../platform/profile/profileStore';
import { fmt, unitOf } from './labels';

const hoodName = (id: string) => world.neighborhoods.find((h) => h.id === id)!.name;

/** Predict, then Observe, then Explain. The core learning loop of the City module. */
export function PoeModals() {
  const { poe, answerPredict, finishPoe, city } = useGame();
  const rec = useProfiles((s) => s.recordResponse); const written = useProfiles((s) => s.recordWritten);
  const pred = poe.find((p) => p.stage === 'predict'); const obs = poe.find((p) => p.stage === 'observe');
  const [outcome, setOutcome] = useState(''); const [dir, setDir] = useState<-1 | 0 | 1 | null>(null); const [mag, setMag] = useState<Magnitude | ''>(''); const [nb, setNb] = useState(''); const [text, setText] = useState('');
  if (pred) {
    const p = pred.pred;
    return (
      <Modal open onClose={() => { /* must answer */ }} title={`Predict: ${nameOf(p.type)}`}>
        <p>Before time passes, make a prediction. There is no penalty for being wrong, since the point is to learn why.</p>
        <label className="field">Which outcome do you expect to change the most?
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)}><option value="">Choose…</option>{POE_OUTCOMES.map((o) => <option key={o} value={o}>{OUT_LABEL[o]}</option>)}</select></label>
        <div className="field">Which direction?<div className="chipset">{([[-1, 'Goes down'], [0, 'No change'], [1, 'Goes up']] as const).map(([v, l]) => <button key={v} className={`tog ${dir === v ? 'on' : ''}`} aria-pressed={dir === v} onClick={() => setDir(v)}>{l}</button>)}</div></div>
        <div className="field">How big will the change be after a few years?<div className="chipset">{MAGNITUDES.map((m) => <button key={m.id} className={`tog ${mag === m.id ? 'on' : ''}`} aria-pressed={mag === m.id} title={m.hint} onClick={() => setMag(m.id)}>{m.label}</button>)}</div></div>
        <label className="field">Which neighborhood will benefit most?
          <select value={nb} onChange={(e) => setNb(e.target.value)}><option value="">Choose…</option>{world.neighborhoods.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
        <p><button className="btn" disabled={!outcome || dir == null || !mag || !nb} onClick={() => { answerPredict({ ...p, outcome, direction: dir!, magnitude: mag as Magnitude, neighborhood: nb }); setOutcome(''); setDir(null); setMag(''); setNb(''); }}>Lock in my prediction</button></p>
      </Modal>
    );
  }
  if (obs) {
    const p = obs.pred; const res = judge(p, obs.before, valuesOf(city));
    let top = ''; try { const ex = explainChange(city, p.neighborhood, (p.outcome === 'displacement' ? 'lifeExpectancy' : p.outcome) as Out, obs.pred.month, city.month); top = ex.chains[0]?.label ?? ''; } catch { /* no history */ }
    const done = () => {
      rec({ qid: `poe-${p.type}`, module: 'city', concept: POE[p.type].concept, type: 'poe', correct: res.correct, attempts: 1, hintUsed: false, chosen: `${p.outcome}:${p.direction}:${p.magnitude}:${p.neighborhood}`, prediction: JSON.stringify({ outcome: p.outcome, direction: p.direction, magnitude: p.magnitude, neighborhood: p.neighborhood, actual: +res.actual.toFixed(3) }) }, 'sim:city');
      written({ kind: 'justification', qid: `poe-${p.type}`, module: 'city', text }); finishPoe(p.type); setText('');
    };
    return (
      <Modal open onClose={() => { /* must answer */ }} title={`Observe and explain: ${nameOf(p.type)}`}>
        <table className="tbl small"><thead><tr><th></th><th>You predicted</th><th>What happened</th></tr></thead><tbody>
          <tr><td>Outcome</td><td>{OUT_LABEL[p.outcome]}</td><td>{res.outcomeOk ? 'This is one of the outcomes it affects.' : 'Not a main effect of this action.'}</td></tr>
          <tr><td>Direction in {hoodName(p.neighborhood)}</td><td>{p.direction === 0 ? 'No change' : p.direction < 0 ? 'Down' : 'Up'}</td><td>{res.actual === 0 ? 'No change' : res.actual < 0 ? 'Down' : 'Up'} ({res.actual > 0 ? '+' : ''}{fmt(res.actual)} {unitOf(p.outcome)}) {res.directionOk ? '✓' : ''}</td></tr>
          <tr><td>Size</td><td>{MAGNITUDES.find((m) => m.id === p.magnitude)!.label}</td><td>{MAGNITUDES.find((m) => m.id === magnitudeOf(res.relPct))!.label} ({Math.abs(res.relPct).toFixed(1)}%)</td></tr>
          <tr><td>Most benefit</td><td>{hoodName(p.neighborhood)}</td><td>{hoodName(res.bestHood)}</td></tr></tbody></table>
        <p className={res.correct ? 'good' : ''}>{res.correct ? 'Your prediction matched the model.' : 'The model did something different from your prediction. That is useful: figure out why.'}</p>
        <label className="field">In one or two sentences, explain why. What is the chain from the action to the result, and why did it take this long?
          <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Because… so… which led to…" /></label>
        <p><button className="btn" disabled={text.trim().length < 15} onClick={done}>Save my explanation</button></p>
        {text.trim().length >= 15 && <div className="datacard"><b>How it works.</b> {POE[p.type].lag}{top ? ` Biggest cause in your city: ${top}.` : ''}</div>}
      </Modal>
    );
  }
  return null;
}
