import { useMemo, useState } from 'react';
import { useProfiles } from '../profile/profileStore';
import { warmupOrder } from '../learn/mastery';
import { QUESTIONS } from '../content';
import { CheckRunner } from '../questions/CheckRunner';
import { getItem, setItem } from '../storage';

/** Spaced retrieval: 2 quick questions at the start of a session, weighted toward concepts missed or not seen lately. */
export default function WarmUp() {
  const me = useProfiles((s) => s.active()); const day = new Date().toDateString(); const key = `riverton.warmup.${me?.id}`;
  const [n, setN] = useState(0); const [skipped, setSkipped] = useState(getItem(key) === day);
  const ids = useMemo(() => {
    if (!me) return []; const order = warmupOrder(me.mastery).slice(0, 6); const out: string[] = [];
    for (const c of order) { const q = QUESTIONS.find((x) => x.concept === c && x.type === 'mc' && x.parallel && !out.includes(x.id)); if (q) out.push(q.id); if (out.length >= 2) break; }
    return out;
  }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!me || skipped || !ids.length || n >= ids.length) return null;
  return (
    <div className="panel warm"><span className="chip">Warm-up {n + 1} of {ids.length}</span><h3>A quick look back</h3>
      <CheckRunner key={ids[n]} questionId={ids[n]} onDone={() => { if (n + 1 >= ids.length) setItem(key, day); setN(n + 1); }} />
      <p><button className="btn ghost" onClick={() => { setItem(key, day); setSkipped(true); }}>Skip for today</button></p></div>
  );
}
