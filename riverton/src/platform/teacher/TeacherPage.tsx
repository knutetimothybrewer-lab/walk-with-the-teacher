import { useState } from 'react';
import { hashPin, useTeacher } from './teacherStore';
import { QUESTIONS } from '../content';
import type { MCQuestion } from '../questions/types';

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
        <section className="panel"><h2>Answer key</h2>
          <ul>{QUESTIONS.filter((q) => q.type === 'mc').map((q) => <li key={q.id}><b>{q.id}</b>: {(q as MCQuestion).options.find((o) => o.correct)?.text}</li>)}</ul>
        </section>
        <section className="panel"><h2>Coming in later phases</h2><p>Module locks, assignment presets, class roll-up import, Sheets sync setup, discussion and Town Hall modes.</p></section>
      </div>
      <p><button className="btn ghost" onClick={() => t.setUnlocked(false)}>Lock</button></p>
    </main>
  );
}
