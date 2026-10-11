import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Landmark, MessageCircle, Lock } from 'lucide-react';
import { useProfiles } from '../../../platform/profile/profileStore';
import { runKey, useXr } from './xrStore';
import { SCENARIOS, ORDER } from './scenarios';
import './xr.css';

const ICON = { 'town-hall': Landmark, 'rumor-mill': MessageCircle } as const;
export default function CrossroadsHub() {
  const me = useProfiles((s) => s.active()); const runs = useXr((s) => s.runs);
  if (!me) return <main className="page"><p>Add a student first on the <Link to="/">home screen</Link>.</p></main>;
  return (
    <main className="page xr-page">
      <h1>Crossroads</h1><p>Branching community decisions in Riverton. There are no right or wrong options, only better and worse reasoning.</p>
      <div className="grid mods">
        {ORDER.map((id, i) => { const sc = SCENARIOS[id]; const I = ICON[id as keyof typeof ICON]; const run = runs[runKey(me.id, id)]; const finished = !!me.crossroads?.[id];
          return (
            <motion.div key={id} className="panel mod xr-mod" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <div className="mod-art"><I size={30} /></div><h2>{sc.title}</h2><p>{sc.tagline}</p><span className="chip">~{sc.minutes} min</span>
              <Link className="btn" to={`/crossroads/${id}`} style={{ ['--accent-a' as string]: 'var(--cross-a)', textDecoration: 'none' }}>{finished ? 'Review or replay' : run ? 'Continue' : 'Start'}</Link>
            </motion.div>); })}
        {['Community Health Worker for a Day', 'Heat Wave Check-ins', 'Youth Mental Health Summit', 'Underage Drinking as a Community Issue'].map((t) => (
          <div key={t} className="panel mod xr-mod ext"><div className="mod-art ghost"><Lock size={24} /></div><h3>{t}</h3><span className="chip">Extension: coming later</span></div>))}
      </div>
    </main>
  );
}
