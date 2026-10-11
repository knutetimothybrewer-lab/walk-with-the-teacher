import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, Landmark, FlaskConical, Play } from 'lucide-react';
import world from '../../content/shared/riverton-world.json';
import { RivertonMap } from '../map/RivertonMap';
import { Character } from '../art/Character';
import { CAST } from '../art/characters';
import { useProfiles } from '../profile/profileStore';
import { CONCEPTS } from '../content';
import './home.css';
import StoryView from '../story/StoryView';
import WarmUp from '../story/WarmUp';
import { usePreset } from '../preset';

const MODULES = [
  { id: 'city', name: 'City', blurb: 'Plan interventions and watch Riverton’s health and equity change.', icon: Compass, accent: ['--city-a', '--city-b'], phase: 'Open City', href: '/city' },
  { id: 'crossroads', name: 'Crossroads', blurb: 'Branching community decisions: Town Hall and Rumor Mill.', icon: Landmark, accent: ['--cross-a', '--cross-b'], phase: 'Open Crossroads', href: '/crossroads' },
  { id: 'lab', name: 'Sim Lab', blurb: 'Disease Detective: investigate an outbreak with real epidemiology tools.', icon: FlaskConical, accent: ['--lab-a', '--lab-b'], phase: 'Open Sim Lab', href: '/lab' },
] as const satisfies readonly { id: string; name: string; blurb: string; icon: unknown; accent: readonly string[]; phase: string; href?: string }[];

function Welcome() {
  const create = useProfiles((s) => s.create);
  const [name, setName] = useState(''); const [period, setPeriod] = useState('');
  const okafor = CAST[0];
  return (
    <main className="page welcome">
      <motion.div className="panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="wrow"><Character spec={okafor} expression="happy" pose="wave" size={220} bob />
          <div>
            <h1>Welcome to Riverton</h1>
            <p>I’m Dr. Okafor, Riverton’s Health Director. We’ve just appointed you as our newest <b>youth member of the Health Commission</b>. Two neighborhoods three miles apart have a 12-year gap in life expectancy, and we need your help to understand it.</p>
            <label className="field">Your name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="field">Class period (optional)<input value={period} onChange={(e) => setPeriod(e.target.value)} /></label>
            <button className="btn" disabled={!name.trim()} onClick={() => create(name, period)}><Play size={16} /> Join the commission</button>
          </div>
        </div>
      </motion.div>
    </main>
  );
}

export default function Home() {
  const me = useProfiles((s) => s.active()); const preset = usePreset((s) => s.preset);
  if (!me) return <Welcome />;
  const off = (ids: string[]) => !!preset && ids.every((i) => preset.off.includes(i as never));
  const pct = (mod: string) => {
    const ids = CONCEPTS.filter((c) => c.module === mod || (mod === 'city' && c.module === 'shared')).map((c) => c.id);
    const m = ids.filter((id) => me.mastery[id]?.level === 'mastered').length;
    return ids.length ? Math.round((m / ids.length) * 100) : 0;
  };
  return (
    <main className="page">
      <h1>Hello, {me.name}</h1>
      <WarmUp />
      <div className="hub-top">
        <div className="panel mapcard"><RivertonMap /><p className="note">{world.city.description}</p></div>
        <StoryView />
      </div>
      <div className="grid mods">
        {MODULES.map((m, i) => (
          <motion.div key={m.id} className="panel mod" style={{ ['--a' as string]: `var(${m.accent[0]})`, ['--b' as string]: `var(${m.accent[1]})` }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}>
            <div className="mod-art"><m.icon size={34} /></div>
            <h2>{m.name}</h2><p>{m.blurb}</p>
            <div className="meter" role="img" aria-label={`Mastery ${pct(m.id)}%`}><i style={{ width: `${pct(m.id)}%` }} /></div>
            <small>Mastery {pct(m.id)}%</small>
            {off(m.id === 'city' ? ['city'] : m.id === 'lab' ? ['outbreak'] : ['townhall', 'rumor']) ? <button className="btn" disabled>Not assigned</button> : <Link className="btn" to={m.href} style={{ ['--accent-a' as string]: `var(${m.accent[0]})`, textDecoration: 'none' }}>{m.phase}</Link>}
          </motion.div>
        ))}
      </div>
    </main>
  );
}
