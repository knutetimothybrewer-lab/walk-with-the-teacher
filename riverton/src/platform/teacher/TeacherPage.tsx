import { useState } from 'react';
import { hashPin, useTeacher } from './teacherStore';
import { QUESTIONS } from '../content';
import type { MCQuestion } from '../questions/types';
import { viableTruth, simulate, trueCases, alertDay } from '../../modules/lab/labs/outbreak';
import { SCENARIOS, ORDER } from '../../modules/crossroads/ui/scenarios';
import type { ChoiceNode, EndNode } from '../../modules/crossroads/engine/types';

export default function TeacherPage() {
  const t = useTeacher();
  const [pin, setPin] = useState(''); const [err, setErr] = useState('');

  if (!t.unlocked) {
    const first = !t.pinHash;
    return (
      <main className="page"><div className="panel" style={{ maxWidth: 440 }}>
        <h1>Teacher mode</h1>
        <p>{first ? 'Choose a PIN (4+ characters). It is stored only on this device; it keeps students out of the answer keys but is not strong security.' : 'Enter your PIN.'}</p>
        <label className="field">PIN<input type="password" value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="off" /></label>
        {err && <p role="alert">{err}</p>}
        <button className="btn" onClick={async () => {
          if (pin.length < 4) return setErr('Use at least 4 characters.');
          const h = await hashPin(pin);
          if (first) { t.patch({ pinHash: h }); t.setUnlocked(true); } else if (h === t.pinHash) t.setUnlocked(true); else setErr('That PIN does not match.');
        }}>{first ? 'Set PIN' : 'Unlock'}</button>
      </div></main>
    );
  }
  return (
    <main className="page">
      <h1>Teacher dashboard</h1>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
        <section className="panel"><h2>Class settings</h2>
          <label className="toggle">Foundations lessons required<input type="checkbox" checked={t.foundationsRequired} onChange={(e) => t.patch({ foundationsRequired: e.target.checked })} /></label>
          <label className="toggle">Timed choices (Crossroads)<input type="checkbox" checked={t.timedChoices} onChange={(e) => t.patch({ timedChoices: e.target.checked })} /></label>
          <label className="field">Reteach strictness
            <select value={t.reteachStrictness} onChange={(e) => t.patch({ reteachStrictness: e.target.value as 'gentle' | 'standard' | 'strict' })}><option>gentle</option><option>standard</option><option>strict</option></select></label>
          <label className="field">Unprompted checks per 10 min
            <input type="number" min={1} max={10} value={t.interruptCap} onChange={(e) => t.patch({ interruptCap: Number(e.target.value) })} /></label>
          <label className="field">Total time target (minutes)
            <select value={t.timeTargetMin} onChange={(e) => t.patch({ timeTargetMin: Number(e.target.value) })}>{[60, 90, 120, 150].map((m) => <option key={m}>{m}</option>)}</select></label>
        </section>
        <section className="panel"><h2>Sim Lab settings</h2>
          <label className="field">Outbreak source
            <select value={t.lab.scenario} onChange={(e) => t.patch({ lab: { ...t.lab, scenario: e.target.value as typeof t.lab.scenario } })}><option value="random">Random (by seed)</option><option value="water">Water main break</option><option value="vendor">Festival food vendor</option><option value="pool">Public pool</option><option value="person">Person-to-person</option></select></label>
          <label className="field">Class seed (blank = a unique seed per student)
            <input type="number" value={t.lab.classSeed ?? ''} onChange={(e) => t.patch({ lab: { ...t.lab, classSeed: e.target.value === '' ? null : Number(e.target.value) } })} /></label>
          <label className="field">Budget points<input type="number" min={20} max={300} value={t.lab.budget} onChange={(e) => t.patch({ lab: { ...t.lab, budget: Number(e.target.value) } })} /></label>
          <label className="field">Investigation days<input type="number" min={3} max={30} value={t.lab.days} onChange={(e) => t.patch({ lab: { ...t.lab, days: Number(e.target.value) } })} /></label>
          {(() => { const tr = viableTruth(t.lab.classSeed ?? 1, t.lab.scenario); const sm = simulate(tr); return (
            <div className="panel"><h3>Answer key{t.lab.classSeed == null ? ' (example seed 1)' : ''}</h3>
              <p><b>{tr.source.label}</b>. {tr.source.detail}</p><p>Curve: {tr.source.curve}. True cases: {trueCases(sm)}. Alert on day {(alertDay(tr, sm) ?? 0) + 1}.</p>
              <p>Ideal path: confirm the outbreak, build a balanced case definition, interview cases, survey residents to compare attack rates, inspect or test the true source, check confounders, then order the targeted intervention early.</p></div>); })()}
        </section>
        <section className="panel"><h2>Crossroads: branches and rubric</h2>
          <p>Choices are never scored right or wrong. The reasoning rubric has 7 criteria, each 0 to 2: uses data as evidence, considers multiple stakeholders, includes community voice, weighs equity, identifies trade-offs, generates alternatives, and separates decision quality from outcome. Free-text answers are exported for you to score against the same rubric.</p>
          <label className="toggle">Timed choices on<input type="checkbox" checked={t.timedChoices} onChange={(e) => t.patch({ timedChoices: e.target.checked })} /></label>
          {ORDER.map((id) => { const sc = SCENARIOS[id]; return (
            <details key={id}><summary><b>{sc.title}</b>: {sc.nodes.filter((n) => n.type === 'end').length} endings, {sc.nodes.filter((n) => n.type === 'choice' && n.decision).length} decisions</summary>
              {sc.nodes.filter((n): n is ChoiceNode => n.type === 'choice').map((n) => <div key={n.id}><b>{n.prompt}</b><ul>{n.choices.map((c) => <li key={c.id}>{c.label}{c.shallow ? ' (popular but shallow: prompts a push-back on reasoning)' : ''}</li>)}</ul></div>)}
              <b>Endings</b><ul>{sc.nodes.filter((n): n is EndNode => n.type === 'end').map((n) => <li key={n.id}>{n.ending.title}: {n.ending.summary}</li>)}</ul></details>); })}
        </section>
        <section className="panel"><h2>Answer key</h2>
          <ul>{QUESTIONS.filter((q) => q.type === 'mc').map((q) => <li key={q.id}><b>{q.id}</b>: {(q as MCQuestion).options.find((o) => o.correct)?.text}</li>)}</ul>
        </section>
        <section className="panel"><h2>Coming in later phases</h2><p>Module locks, assignment presets, class roll-up import, Sheets sync setup, discussion and Town Hall modes.</p></section>
      </div>
      <p><button className="btn ghost" onClick={() => t.setUnlocked(false)}>Lock</button></p>
    </main>
  );
}
