import { useEffect, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { Building, BUILDINGS } from '../art/Buildings';
import { Character } from '../art/Character';
import { CAST, EXPRESSIONS } from '../art/characters';
import { useSettings } from '../settings';
import './styleguide.css';

const NEIGHBORHOODS = [
  ['Eastside', '--n-eastside'], ['Hillcrest', '--n-hillcrest'], ['Millworks', '--n-millworks'], ['Pinewood', '--n-pinewood'],
  ['Old Town', '--n-oldtown'], ['Riverside', '--n-riverside'], ['Westbrook', '--n-westbrook'], ['Southfield', '--n-southfield'],
];
const ACCENTS = [
  ['City', '--city-a', '--city-b'], ['Crossroads', '--cross-a', '--cross-b'], ['Sim Lab', '--lab-a', '--lab-b'],
];

function CountUp({ to }: { to: number }) {
  const v = useMotionValue(0);
  const txt = useTransform(v, (x) => x.toFixed(1));
  useEffect(() => { const c = animate(v, to, { duration: 1.4, ease: 'easeOut' }); return () => c.stop(); }, [to, v]);
  return <motion.span className="display big">{txt}</motion.span>;
}

function EpiCurve({ run }: { run: number }) {
  const pts = [2, 5, 12, 26, 41, 33, 20, 11, 6, 3];
  const w = 300, h = 110, bw = w / pts.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="epi" key={run} role="img" aria-label="Sample epidemic curve drawing itself">
      {pts.map((p, i) => (
        <motion.rect key={i} x={i * bw + 2} width={bw - 4} rx="3" fill="var(--lab-b)"
          initial={{ y: h, height: 0 }} animate={{ y: h - p * 2.4, height: p * 2.4 }} transition={{ delay: i * 0.08, type: 'spring', stiffness: 160, damping: 16 }} />
      ))}
    </svg>
  );
}

export default function StyleGuide() {
  const { theme, set } = useSettings();
  const [run, setRun] = useState(0);
  return (
    <main className="page sg">
      <h1>Riverton Style Guide</h1>
      <p className="lead">Phase 1a for approval. Everything here is drawn in code: SVG art, CSS tokens, Framer Motion. Toggle the theme to review both modes.</p>
      <button className="btn" onClick={() => set('theme', theme === 'dark' ? 'light' : 'dark')}>Switch to {theme === 'dark' ? 'light' : 'dark'} theme</button>

      <section className="hero-scene" aria-label="Riverton skyline sample">
        <div className="cloud c1" /><div className="cloud c2" />
        <div className="skyline">
          {(['factory', 'home', 'clinic', 'grocery', 'ymca', 'park', 'water', 'tree'] as const).map((k) => <Building key={k} kind={k} size={170} />)}
        </div>
        <div className="street"><div className="bus-run"><Building kind="bus" size={90} /></div></div>
      </section>

      <h2>Neighborhood colors</h2>
      <div className="swatches">
        {NEIGHBORHOODS.map(([n, v], i) => (
          <motion.div key={n} className="swatch" style={{ background: `var(${v})` }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <span>{n}</span><i className="pat" data-i={i} />
          </motion.div>
        ))}
      </div>
      <p className="note">Each hue is paired with a pattern and a text label so color is never the only signal.</p>

      <h2>Module accents</h2>
      <div className="accents">
        {ACCENTS.map(([n, a, b]) => (
          <div key={n} className={`accent ${n === 'Sim Lab' ? 'lab' : ''}`} style={{ background: `linear-gradient(135deg, var(${a}), var(${b}))` }}>
            <span className="display">{n}</span>
          </div>
        ))}
      </div>

      <h2>Data palette: blue is better, orange is worse</h2>
      <div className="data-row">
        <div className="delta better">▼ Asthma ER visits −18% <small>(improved)</small></div>
        <div className="delta worse">▲ Uninsured rate +3% <small>(worse)</small></div>
        <div className="delta neutral">● Life expectancy gap unchanged</div>
      </div>

      <h2>Typography</h2>
      <div className="panel">
        <div className="display" style={{ fontSize: '2.6rem' }}>Close the Gap</div>
        <h2>Display font: Fredoka</h2>
        <p>Body font: Nunito. A neighborhood’s <strong>life expectancy</strong> is the average number of years a newborn is expected to live if today’s conditions continue. Short chunks, plain words, defined terms.</p>
        <p>Big number: <CountUp to={12.4} /> <span className="chip">years gap</span></p>
      </div>

      <h2>Components</h2>
      <div className="row">
        <button className="btn">Primary</button>
        <button className="btn ghost">Secondary</button>
        <button className="btn" style={{ ['--accent-a' as string]: 'var(--cross-a)' }}>Crossroads</button>
        <button className="btn" style={{ ['--accent-a' as string]: 'var(--lab-a)' }}>Sim Lab</button>
        <span className="chip">Mastered</span><span className="chip" style={{ background: 'var(--better-soft)' }}>Practiced</span>
      </div>
      <div className="grid cols">
        <div className="panel"><h3>Panel</h3><p>Soft shadow, generous rounding.</p></div>
        <div className="panel feedback ok"><h3>Nice work</h3><p>Correct answers pop with a gentle glow.</p></div>
        <div className="panel feedback try"><h3>Not quite yet</h3><p>Incorrect answers get a gentle nudge and a hint, never a red flash.</p></div>
      </div>

      <h2>Characters: recurring cast</h2>
      <div className="cast">
        {CAST.map((c, i) => (
          <motion.figure key={c.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Character spec={c} expression={i % 2 ? 'neutral' : 'happy'} pose={i === 0 ? 'wave' : i === 4 ? 'think' : 'stand'} size={200} bob />
            <figcaption><b>{c.name}</b><br />{c.role}</figcaption>
          </motion.figure>
        ))}
      </div>
      <h3>Seven expressions</h3>
      <div className="cast small">
        {EXPRESSIONS.map((e) => (
          <figure key={e}><Character spec={CAST[2]} expression={e} size={110} crop="head" /><figcaption>{e}</figcaption></figure>
        ))}
      </div>

      <h2>Buildings and props</h2>
      <div className="cast small">
        {BUILDINGS.map((b) => <figure key={b.kind}><Building kind={b.kind} size={120} /><figcaption>{b.label}</figcaption></figure>)}
      </div>

      <h2>Motion samples</h2>
      <div className="grid cols">
        <div className="panel"><h3>Spring press</h3><motion.button className="btn" whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>Press me</motion.button></div>
        <div className="panel"><h3>Stagger in</h3>
          <motion.ul key={run} initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.1 } } }} className="stag">
            {['Define the problem', 'Listen', 'Weigh equity'].map((t) => <motion.li key={t} variants={{ h: { opacity: 0, x: -16 }, s: { opacity: 1, x: 0 } }}>{t}</motion.li>)}
          </motion.ul></div>
        <div className="panel"><h3>Correct-answer pop</h3><div key={run} className="pop-demo">✓ Correct</div></div>
        <div className="panel lab-panel"><h3>Command-center alert</h3><div className="alert-dot" /><small>GI illness ER visits above baseline</small></div>
        <div className="panel"><h3>Epi curve draws itself</h3><EpiCurve run={run} /></div>
        <div className="panel"><h3>Ambient life</h3><p>Clouds drift, characters bob, the bus rolls. All pause with Reduce motion.</p></div>
      </div>
      <p><button className="btn ghost" onClick={() => setRun((r) => r + 1)}>Replay motion samples</button></p>
    </main>
  );
}
