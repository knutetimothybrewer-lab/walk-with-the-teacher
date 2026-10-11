import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Compass, Lock } from 'lucide-react';
import { useProfiles } from '../../../platform/profile/profileStore';
import { useTeacher } from '../../../platform/teacher/teacherStore';
import { lessonById } from '../../../platform/content';
import { getJSON } from '../../../platform/storage';
import { MISSIONS } from '../game/missions';
import { usePreset } from '../../../platform/preset';
import { useGame } from '../game/store';
import GameView from './GameView';
import './city.css';
const NONE: string[] = [];

const LESSONS = ['city-sdoh', 'city-upstream', 'city-equity'];

export default function CityPage() {
  const me = useProfiles((s) => s.active()); const foundations = useTeacher((s) => s.foundationsRequired); const g = useGame(); const lockedM = usePreset((s) => s.preset?.lockedMissions ?? NONE);
  useEffect(() => () => { useGame.getState().save(); useGame.setState({ speed: 0, until: null }); }, []);
  if (!me) return <main className="page"><p>Add a student first on the <Link to="/">home screen</Link>.</p></main>;
  if (g.mission && g.profileId === me.id) return <main className="page city-page"><GameView /></main>;
  const done = LESSONS.every((l) => me.lessonsDone.includes(l)); const open = done || !foundations;
  const saved = getJSON<Record<string, { month: number; done: boolean }>>(`riverton.city.${me.id}`, {});
  const completed = me.progress.city?.completed ?? [];
  return (
    <main className="page city-page">
      <h1>City: Plan</h1><p>Riverton’s health is shaped by where people live. Place interventions, advance time, and watch which neighborhoods change, by how much, and why.</p>
      <section className="panel" style={{ marginBottom: '1rem' }}>
        <h2><BookOpen size={20} /> Foundations</h2>
        <p className="note">Three short lessons first: social determinants of health, upstream vs. downstream prevention, and equity vs. equality.</p>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>{LESSONS.map((l) => { const ls = lessonById(l)!; const ok = me.lessonsDone.includes(l); return <div key={l} className="acard"><h3>{ok ? 'Done: ' : ''}{ls.title} <span className="chip">~{ls.minutes} min</span></h3><Link className="btn" to={`/lesson/${l}`} state={{ from: '/city' }}>{ok ? 'Review' : 'Start'}</Link></div>; })}</div>
      </section>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
        {MISSIONS.map((m, i) => { const sv = saved[m.id]; const locked = !open || lockedM.includes(m.id); return (
          <motion.div key={m.id} className="panel mod city-mod" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <div className="mod-art">{locked ? <Lock size={28} /> : <Compass size={28} />}</div><h2>{m.title}{!m.core && <span className="chip" style={{ marginLeft: 8 }}>Bonus</span>}</h2><p>{m.blurb}</p>
            <p className="note">{completed.includes(m.id) ? 'Completed. ' : ''}{sv && !sv.done ? `In progress: year ${Math.floor(sv.month / 12) + 1}.` : ''}</p>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              {sv && !sv.done && <button className="btn" disabled={locked} onClick={() => g.start(me.id, m.id, true)}>Continue</button>}
              <button className={`btn ${sv && !sv.done ? 'ghost' : ''}`} disabled={locked} onClick={() => g.start(me.id, m.id, false)}>{sv ? 'Start over' : 'Start'}</button>
            </div>
          </motion.div>); })}
      </div>
    </main>
  );
}
