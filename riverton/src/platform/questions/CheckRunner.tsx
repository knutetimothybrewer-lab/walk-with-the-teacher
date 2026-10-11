import { useState } from 'react';
import { QuestionCard } from './QuestionCard';
import { nextStep } from './engine';
import { questionById, RETEACH } from '../content';
import { useProfiles } from '../profile/profileStore';
import type { Answer, EvalResult, Question, ReteachCard } from './types';

/** Runs one check: retry once, then hint + reteach card + the parallel question. */
export function CheckRunner({ questionId, onDone }: { questionId: string; onDone: (correct: boolean) => void }) {
  const first = questionById(questionId) as Question;
  const [q, setQ] = useState<Question>(first);
  const [misses, setMisses] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [res, setRes] = useState<EvalResult | null>(null);
  const [reteach, setReteach] = useState<ReteachCard | null>(null);
  const [key, setKey] = useState(0);
  const rec = useProfiles((s) => s.recordResponse);
  const written = useProfiles((s) => s.recordWritten);

  const finish = (a: Answer, r: EvalResult, m: number, hinted = hintUsed) => rec({
    qid: q.id, module: q.module, concept: q.concept, type: q.type, correct: r.scored ? r.correct : null,
    attempts: m + 1, hintUsed: hinted, chosen: typeof a === 'string' ? a : undefined, misconception: r.misconception,
  }, q.context);

  const submit = (a: Answer, r: EvalResult) => {
    setRes(r);
    if (q.type === 'cer') { written({ kind: 'cer', qid: q.id, module: q.module, text: String(a) }); finish(a, r, 0); return; }
    if (r.correct) { finish(a, r, misses); return; }
    const m = misses + 1; setMisses(m);
    if (nextStep(m) === 'reteach') {
      setHintUsed(true); finish(a, r, m, true);
      setReteach(RETEACH.find((c) => c.id === r.misconception) as ReteachCard | null ?? null);
    }
  };
  const retry = () => { setRes(null); setKey((k) => k + 1); };
  const toParallel = () => {
    const p = q.parallel ? questionById(q.parallel) : undefined;
    if (p && p.id !== q.id) { setQ(p); setMisses(0); setRes(null); setReteach(null); setKey((k) => k + 1); } else onDone(false);
  };
  const hint = (q as { hint?: string }).hint;
  const settled = !!res && (res.correct || !res.scored);
  const needReteach = !!res && !res.correct && res.scored && misses >= 2;

  return (
    <div>
      <QuestionCard key={key + q.id} q={q} locked={settled || needReteach} onSubmit={submit} />
      {res && (
        <div className={`fb ${res.correct || !res.scored ? 'ok' : 'try'}`} role="status" style={{ marginTop: '.8rem' }}>
          {res.correct ? 'Nice work. ' : res.scored ? 'Not quite yet. ' : ''}{res.feedback}
          {settled && q.explanation && res.scored && <p>{q.explanation}</p>}
          {needReteach && hint && <p className="hint">Hint: {hint}</p>}
        </div>
      )}
      {res && !settled && !needReteach && <p><button className="btn ghost" onClick={retry}>Try again</button></p>}
      {needReteach && (
        <div className="panel" style={{ marginTop: '.8rem' }}>
          {reteach ? (<><h3>{reteach.title}</h3>{reteach.body.map((t, i) => <p key={i}>{t}</p>)}
            {reteach.steps && <ol>{reteach.steps.map((s) => <li key={s.caption}><b>{s.caption}.</b> {s.art}</li>)}</ol>}</>) : <p>Let’s look at this idea a different way.</p>}
          <button className="btn" onClick={toParallel}>Try a new example</button>
        </div>
      )}
      {settled && <p><button className="btn" onClick={() => onDone(res!.correct)}>Continue</button></p>}
    </div>
  );
}
