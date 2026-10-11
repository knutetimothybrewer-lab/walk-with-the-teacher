import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Volume2 } from 'lucide-react';
import { lessonById, GLOSSARY, questionById } from '../content';
import { CheckRunner } from '../questions/CheckRunner';
import { QuestionCard } from '../questions/QuestionCard';
import { RivertonMap } from '../map/RivertonMap';
import { useProfiles } from '../profile/profileStore';
import { useSettings } from '../settings';
import { useTeacher } from '../teacher/teacherStore';
import { usePreset } from '../preset';
import { DEFAULT_ORDER, pace } from '../storyline';
import type { Block, VisualStep } from './types';
import './lesson.css';

const rich = (s: string): ReactNode[] => s.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) =>
  p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p.startsWith('*') ? <em key={i}>{p.slice(1, -1)}</em> : p);
const plain = (s: string) => s.replace(/\*/g, '');

function speak(text: string) {
  try { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(plain(text))); } catch { /* unsupported */ }
}

function Term({ t }: { t: string }) {
  const [open, setOpen] = useState(false);
  const addTerm = useProfiles((s) => s.addTerm);
  const g = GLOSSARY.find((x) => x.term === t);
  return (
    <span className="term"><button className="chip" aria-expanded={open} onClick={() => { setOpen(!open); addTerm(t); }}>{t}</button>{open && g && <span className="def"> {g.definition}</span>}</span>
  );
}

function Visual({ title, steps }: { title: string; steps: VisualStep[] }) {
  const [i, setI] = useState(0);
  const s = steps[i];
  return (
    <div className="visual">
      <h3>{title}</h3>
      {s.map && <RivertonMap highlight={s.map} showLandmarks={false} />}
      {s.nodes && (
        <div className="chain">
          {s.nodes.map((n, k) => (
            <motion.div key={n} className={`node ${s.active?.includes(k) ? 'on' : ''}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: s.active?.includes(k) ? 1.05 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              {n}{k < s.nodes!.length - 1 && <span className="arrow" aria-hidden>→</span>}
            </motion.div>
          ))}
        </div>
      )}
      <p className="cap" aria-live="polite">{s.caption}</p>
      <div className="stepper">
        <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeft size={16} /> Back</button>
        <span>Step {i + 1} of {steps.length}</span>
        <button className="btn" disabled={i === steps.length - 1} onClick={() => setI(i + 1)}>Next <ArrowRight size={16} /></button>
      </div>
    </div>
  );
}

function blockText(b: Block): string {
  switch (b.type) {
    case 'hook': return b.text;
    case 'explain': return b.chunks.map((c) => c.text).join(' ');
    case 'worked': return b.title + '. ' + b.steps.join(' ');
    case 'summary': return b.bullets.join(' ');
    case 'visual': return b.title;
    default: return '';
  }
}

export default function LessonPlayer() {
  const { id = '' } = useParams();
  const lesson = lessonById(id);
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const { introduce, completeLesson } = useProfiles();
  const readAloud = useSettings((s) => s.readAloud);
  const [i, setI] = useState(0);
  const [chk, setChk] = useState(0);
  const [ready, setReady] = useState(true);
  const me = useProfiles((s) => s.active()); const tt = useTeacher(); const order = usePreset((s) => s.preset?.order ?? DEFAULT_ORDER);
  const quick = !!me && tt.pacing !== 'off' && pace(me, order, tt.timeTargetMin).behind && !me.lessonsDone.includes(id);
  const blocks = useMemo(() => (lesson ? (quick ? lesson.blocks.filter((b) => b.type !== 'visual' && b.type !== 'worked') : lesson.blocks) : []), [lesson, quick]);
  const gate = useMemo(() => blocks.map((b) => b.type === 'check' || b.type === 'guided'), [blocks]);

  useEffect(() => { lesson?.concepts.forEach(introduce); /* eslint-disable-next-line */ }, [id]);
  useEffect(() => { setReady(!gate[i]); setChk(0); }, [i, gate]);
  useEffect(() => { if (readAloud && lesson && blocks[i]) speak(blockText(blocks[i])); }, [i, readAloud, lesson, blocks]);
  if (!lesson) return <main className="page"><h1>Lesson not found</h1><Link to="/">Home</Link></main>;

  const b = blocks[i];
  const last = i === blocks.length - 1;
  const finish = () => { completeLesson(lesson.id, b.type === 'summary' ? [b.cardId] : []); nav(from); };

  return (
    <main className="page lesson">
      <div className="lhead"><h1>{lesson.title}</h1><span className="chip">~{quick ? Math.max(1, Math.round(lesson.minutes * 0.6)) : lesson.minutes} min{quick ? ' · short version' : ''}</span></div>
      <div className="dots" role="img" aria-label={`Part ${i + 1} of ${blocks.length}`}>{blocks.map((_, k) => <i key={k} className={k <= i ? 'on' : ''} />)}</div>
      <AnimatePresence mode="wait">
        <motion.section key={i} className="panel lbody" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
          {blockText(b) && <button className="btn ghost sm read" aria-label="Read this part aloud" onClick={() => speak(blockText(b))}><Volume2 size={16} /></button>}
          {b.type === 'hook' && (<><span className="chip">Hook</span><p className="big-q">{b.text}</p>{b.map && <RivertonMap highlight={b.map} showLandmarks={false} />}</>)}
          {b.type === 'explain' && b.chunks.map((c, k) => (
            <motion.div key={k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.15 }}>
              <p>{rich(c.text)}</p>{c.terms?.map((t) => <Term key={t} t={t} />)}
            </motion.div>))}
          {b.type === 'visual' && <Visual title={b.title} steps={b.steps} />}
          {b.type === 'worked' && (<><span className="chip">I do</span><h3>{b.title}</h3><ol>{b.steps.map((s, k) => <motion.li key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: k * 0.2 }}>{s}</motion.li>)}</ol></>)}
          {b.type === 'guided' && (<><span className="chip">We do</span><GuidedQ id={b.questionId} onDone={() => setReady(true)} /></>)}
          {b.type === 'check' && (
            <><span className="chip">You do · question {chk + 1} of {b.questionIds.length}</span>
              <CheckRunner key={b.questionIds[chk]} questionId={b.questionIds[chk]} onDone={() => (chk + 1 < b.questionIds.length ? setChk(chk + 1) : setReady(true))} /></>)}
          {b.type === 'summary' && (<><span className="chip">Saved to your Notebook</span><h3>What to remember</h3><ul>{b.bullets.map((s) => <li key={s}>{s}</li>)}</ul></>)}
        </motion.section>
      </AnimatePresence>
      <div className="stepper">
        <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeft size={16} /> Back</button>
        {last ? <button className="btn" onClick={finish}>Finish lesson</button>
          : <button className="btn" disabled={!ready} onClick={() => setI(i + 1)}>Next <ArrowRight size={16} /></button>}
      </div>
    </main>
  );
}

function GuidedQ({ id, onDone }: { id: string; onDone: () => void }) {
  const q = questionById(id)!;
  const [fb, setFb] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  return (
    <div>
      <p className="hint">Scaffold: {(q as { hint?: string }).hint}</p>
      <QuestionCard key={String(fb)} q={q} locked={ok} onSubmit={(_a, r) => { setFb(r.feedback); if (r.correct) { setOk(true); onDone(); } }} />
      {fb && <div className={`fb ${ok ? 'ok' : 'try'}`} role="status" style={{ marginTop: '.6rem' }}>{fb}</div>}
    </div>
  );
}
