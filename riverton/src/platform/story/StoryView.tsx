import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Lock, Play, Flag } from 'lucide-react';
import { useProfiles } from '../profile/profileStore';
import { usePreset, isAssigned } from '../preset';
import { DEFAULT_ORDER, nextSegment, storyOf } from '../storyline';

/** The year on the commission: six chapters in order, a save point after each, and one big "continue" button. */
export default function StoryView() {
  const me = useProfiles((s) => s.active()); const preset = usePreset((s) => s.preset);
  if (!me) return null;
  const items = storyOf(me, preset?.order ?? DEFAULT_ORDER, (id) => isAssigned(preset, id)); const next = nextSegment(items);
  const doneAll = items.filter((i) => i.assigned).every((i) => i.done);
  return (
    <div className="panel story">
      <h2>Your year on the commission</h2>
      <ol className="storyline">
        {items.map((it, i) => (
          <motion.li key={it.seg.id} className={`${it.current ? 'now' : ''} ${it.done ? 'done' : ''} ${!it.assigned ? 'off' : ''}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
            <span className="ico" aria-hidden>{it.done ? <CheckCircle2 size={18} /> : !it.assigned ? <Lock size={16} /> : it.current ? <Play size={16} /> : <span className="dot" />}</span>
            <span><b>{it.seg.title}</b><small>{it.seg.blurb}</small></span>
            {it.done && <span className="chip" title="Progress is saved here"><Flag size={12} /> saved</span>}
            {!it.assigned && <span className="chip">Not assigned</span>}
          </motion.li>))}
      </ol>
      {next && <Link className="btn" to={next.route} style={{ textDecoration: 'none' }}>{items.some((x) => x.done) ? 'Continue' : 'Begin'}: {next.title}</Link>}
      {doneAll && <p className="good">You have finished the year. <Link to="/report">Open your report</Link>.</p>}
      <p className="note"><Link to="/glossary">Glossary and concept map</Link> · <Link to="/notebook">Notebook</Link></p>
    </div>
  );
}
