import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONCEPTS, GLOSSARY, LESSONS, QUESTIONS } from '../content';
import { useProfiles } from '../profile/profileStore';
import './concept.css';

const MOD: Record<string, string> = { shared: 'All modules', city: 'City', crossroads: 'Crossroads', lab: 'Sim Lab' };
const MODCLS: Record<string, string> = { city: 'city', crossroads: 'xr', lab: 'lab', shared: 'sh' };
const LVL: Record<string, string> = { none: 'Not met yet', introduced: 'Introduced', practiced: 'Practiced', mastered: 'Mastered' };

/** Shared glossary plus a concept map: where each idea appears across modules, and how well you know it. */
export default function ConceptMap() {
  const me = useProfiles((s) => s.active()); const addTerm = useProfiles((s) => s.addTerm); const [q, setQ] = useState('');
  const info = useMemo(() => CONCEPTS.map((c) => {
    const mods = new Set<string>(); QUESTIONS.filter((x) => x.concept === c.id).forEach((x) => mods.add(x.module)); LESSONS.filter((l) => l.concepts.includes(c.id)).forEach((l) => mods.add(l.module)); if (c.module !== 'shared') mods.add(c.module);
    return { ...c, mods: [...mods].filter((m) => m !== 'shared'), lesson: LESSONS.find((l) => l.concepts.includes(c.id)), qn: QUESTIONS.filter((x) => x.concept === c.id).length };
  }), []);
  const level = (id: string) => me?.mastery[id]?.level ?? 'none';
  const bridges = info.filter((c) => c.mods.length >= 2);
  const terms = GLOSSARY.filter((g) => (g.term + ' ' + g.definition).toLowerCase().includes(q.toLowerCase()));
  return (
    <main className="page cmap">
      <h1>Glossary and concept map</h1>
      <section className="panel"><h2>Glossary</h2><label className="field">Search<input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. confounding" /></label>
        <div className="terms">{terms.map((g) => <p key={g.term}><button className="chip" onClick={() => addTerm(g.term)} title="Save to my Notebook">{g.term}</button> {g.definition}</p>)}</div></section>
      {bridges.length > 0 && <section className="panel"><h2>Ideas that show up in more than one place</h2><p className="note">These concepts connect the modules.</p><div className="bridges">{bridges.map((c) => <div key={c.id} className="bridge"><b>{c.label}</b><span>{c.mods.map((m) => <i key={m} className={`mb ${MODCLS[m]}`}>{MOD[m]}</i>)}</span></div>)}</div></section>}
      {(['shared', 'city', 'crossroads', 'lab'] as const).map((m) => (
        <section key={m} className="panel"><h2><i className={`mb ${MODCLS[m]}`}>{MOD[m]}</i> concepts</h2>
          <div className="cgrid">{info.filter((c) => c.module === m).map((c) => (
            <div key={c.id} className={`ccard lvl-${level(c.id)}`}><b>{c.label}</b>{c.core && <span className="chip">Core</span>}
              <div className="meter" role="img" aria-label={LVL[level(c.id)]}><i style={{ width: { none: '0%', introduced: '33%', practiced: '66%', mastered: '100%' }[level(c.id)] }} /></div>
              <small>{LVL[level(c.id)]} · {c.qn} question{c.qn === 1 ? '' : 's'}{c.mods.length ? ` · ${c.mods.map((x) => MOD[x]).join(', ')}` : ''}</small>
              {c.lesson ? <Link className="btn ghost xs" to={`/lesson/${c.lesson.id}`} state={{ from: '/glossary' }}>Lesson</Link> : <small className="note">Lesson coming as a bonus</small>}</div>))}</div></section>))}
    </main>
  );
}
