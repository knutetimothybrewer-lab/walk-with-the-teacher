import { useState } from 'react';
import { motion } from 'framer-motion';
import { evaluate } from './engine';
import type { Answer, CERQuestion, ClassifyQuestion, EvalResult, MCQuestion, OrderQuestion, Question, SliderQuestion } from './types';
import './question.css';

export interface CardProps {
  q: Question;
  locked?: boolean;
  onSubmit: (a: Answer, r: EvalResult) => void;
}

/** One question, any type. Feedback is encouraging, never punitive. */
export function QuestionCard({ q, locked, onSubmit }: CardProps) {
  const [sel, setSel] = useState<Answer | null>(null);
  const [order, setOrder] = useState<string[]>(q.type === 'order' ? (q as OrderQuestion).items.map((i) => i.id) : []);
  const [cls, setCls] = useState<Record<string, string>>({});
  const [num, setNum] = useState<number>(q.type === 'slider' ? ((q as SliderQuestion).min + (q as SliderQuestion).max) / 2 : 0);
  const [text, setText] = useState('');

  const submit = (a: Answer) => onSubmit(a, evaluate(q, a));
  const move = (i: number, d: number) => setOrder((o) => { const n = [...o]; const j = i + d; if (j < 0 || j >= n.length) return o; [n[i], n[j]] = [n[j], n[i]]; return n; });

  return (
    <div className="qcard">
      <p className="qprompt">{q.prompt}</p>
      {(q.type === 'mc' || q.type === 'vocab') && (
        <div className="opts" role="radiogroup" aria-label="Answer choices">
          {(q as MCQuestion).options.map((o) => (
            <button key={o.id} role="radio" aria-checked={sel === o.id} disabled={locked} className={`opt ${sel === o.id ? 'sel' : ''}`} onClick={() => setSel(o.id)}>{o.text}</button>
          ))}
          <button className="btn" disabled={sel == null || locked} onClick={() => submit(sel as string)}>Check answer</button>
        </div>
      )}
      {q.type === 'order' && (
        <div className="opts">
          {order.map((id, i) => (
            <motion.div layout key={id} className="opt ord">
              <span>{i + 1}. {(q as OrderQuestion).items.find((x) => x.id === id)?.text}</span>
              <span><button className="btn ghost sm" aria-label="Move up" onClick={() => move(i, -1)}>↑</button><button className="btn ghost sm" aria-label="Move down" onClick={() => move(i, 1)}>↓</button></span>
            </motion.div>
          ))}
          <button className="btn" disabled={locked} onClick={() => submit(order)}>Check order</button>
        </div>
      )}
      {q.type === 'classify' && (
        <div className="opts">
          {(q as ClassifyQuestion).items.map((it) => (
            <label key={it.id} className="opt ord">{it.text}
              <select value={cls[it.id] ?? ''} onChange={(e) => setCls({ ...cls, [it.id]: e.target.value })}>
                <option value="">Choose…</option>
                {(q as ClassifyQuestion).categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
          ))}
          <button className="btn" disabled={locked || Object.keys(cls).length < (q as ClassifyQuestion).items.length} onClick={() => submit(cls)}>Check</button>
        </div>
      )}
      {q.type === 'slider' && (
        <div className="opts">
          <input type="range" aria-label="Estimate" min={(q as SliderQuestion).min} max={(q as SliderQuestion).max} value={num} onChange={(e) => setNum(Number(e.target.value))} />
          <strong>{num} {(q as SliderQuestion).unit}</strong>
          <button className="btn" disabled={locked} onClick={() => submit(num)}>Check</button>
        </div>
      )}
      {q.type === 'cer' && (
        <div className="opts">
          <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Claim, evidence, reasoning…" aria-label="Your written response" />
          <button className="btn" disabled={locked || text.trim().length < 15} onClick={() => submit(text)}>Submit</button>
          {locked && <div className="panel"><h3>Rubric</h3><ul>{(q as CERQuestion).rubric.map((r) => <li key={r.id}>{r.criterion}</li>)}</ul><h3>Sample strong answer</h3><p>{(q as CERQuestion).sampleAnswer}</p></div>}
        </div>
      )}
    </div>
  );
}
