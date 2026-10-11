import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import world from '../../content/shared/riverton-world.json';
import { RivertonMap } from '../map/RivertonMap';
import { Character } from '../art/Character';
import { CAST } from '../art/characters';
import { useProfiles } from '../profile/profileStore';
import { useSettings } from '../settings';
import { useTeacher } from '../teacher/teacherStore';
import './orientation.css';

const TOUR = [
  { id: 'hillcrest', text: 'Hillcrest: leafy, well served, and the longest lives in the city.' }, { id: 'oldtown', text: 'Old Town: dense, older homes, and the busiest buses.' },
  { id: 'millworks', text: 'Millworks: next to the factory and the highway.' }, { id: 'eastside', text: 'Eastside: the shortest lives, the fewest groceries, and a vacant lot waiting for a decision.' }];

/** The orientation flyover: the camera glides over Riverton, neighborhoods light up, and the life-expectancy gap counts up. */
export default function Orientation() {
  const me = useProfiles((s) => s.active()); const update = useProfiles((s) => s.update); const reduce = useSettings((s) => s.reduceMotion); const foundations = useTeacher((s) => s.foundationsRequired);
  const [i, setI] = useState(reduce ? TOUR.length - 1 : 0); const [gap, setGap] = useState(reduce ? 12.4 : 0); const [phase, setPhase] = useState<'fly' | 'appoint'>('fly');
  useEffect(() => { if (reduce || phase !== 'fly') return; const t = setInterval(() => setI((x) => Math.min(TOUR.length - 1, x + 1)), 3500); return () => clearInterval(t); }, [reduce, phase]);
  useEffect(() => { if (i < TOUR.length - 1 || gap >= 12.4) return; const t = setInterval(() => setGap((g) => Math.min(12.4, +(g + 0.4).toFixed(1))), 60); return () => clearInterval(t); }, [i, gap]);
  if (!me) return <main className="page"><p>Add a student first on the <Link to="/">home screen</Link>.</p></main>;
  const lessonDone = me.lessonsDone.includes('orientation-community-health'); const done = !!me.progress.orientation?.completed.includes('orientation');
  const okafor = CAST[0]; const cur = TOUR[i]; const h = world.neighborhoods.find((x) => x.id === cur.id)!;
  const finish = () => update((p) => ({ ...p, progress: { ...p.progress, orientation: { ...(p.progress.orientation ?? { minutes: 0, completed: [] }), completed: ['orientation'] } } }));
  return (
    <main className="page orient">
      <h1>Welcome to Riverton</h1>
      {phase === 'fly' ? (
        <section className="fly panel">
          <motion.div className="fly-map" animate={{ scale: reduce ? 1 : 1.9, x: reduce ? 0 : (500 - h.label[0]) * 0.9, y: reduce ? 0 : (320 - h.label[1]) * 0.9 }} transition={{ duration: reduce ? 0 : 2.4, ease: 'easeInOut' }}>
            <RivertonMap highlight={[cur.id]} showLandmarks />
          </motion.div>
          <motion.div key={cur.id} className="fly-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <b>{h.name}</b><p>{cur.text}</p>
            <p className="gapnum">{i === TOUR.length - 1 ? <>Life expectancy gap: <span className="stat">{gap.toFixed(1)}</span> years</> : <>Life expectancy: <b>{h.outcomes.lifeExpectancy}</b> years</>}</p>
          </motion.div>
          <p><button className="btn ghost" onClick={() => setI(Math.min(TOUR.length - 1, i + 1))}>{i < TOUR.length - 1 ? 'Next place' : ''}</button> <button className="btn" onClick={() => setPhase('appoint')}>Skip to the commission</button></p>
        </section>
      ) : (
        <section className="panel appoint">
          <Character spec={okafor} expression="happy" pose="wave" size={230} bob />
          <div><h2>You are appointed</h2><p>I’m Dr. Okafor, Riverton’s Health Director. Two neighborhoods three miles apart have a {gap.toFixed(1)}-year difference in life expectancy. As the Health Commission’s newest youth member, your job this year is to understand why, and help close the gap.</p>
            <p className="note">Your year: plan the city, decide the Elm Street lot, investigate an outbreak, fight a rumor, and write the commission’s report.</p>
            <div className="acard"><h3>{lessonDone ? 'Done: ' : ''}What is community health? <span className="chip">~3 min</span></h3><Link className="btn" to="/lesson/orientation-community-health" state={{ from: '/orientation' }}>{lessonDone ? 'Review lesson' : 'Start lesson'}</Link></div>
            <p>{done ? <Link className="btn" to="/">Back to the storyline</Link> : <button className="btn" disabled={foundations && !lessonDone} onClick={finish}>{foundations && !lessonDone ? 'Finish the lesson to continue' : 'Accept the appointment'}</button>}</p></div>
        </section>)}
    </main>
  );
}
