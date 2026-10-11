import { Link } from 'react-router-dom';
import { useProfiles } from '../profile/profileStore';
import { CONCEPTS, LESSONS } from '../content';
import { needsWork } from '../learn/mastery';

export default function Notebook() {
  const p = useProfiles((s) => s.active());
  if (!p) return <main className="page"><p>Add a student first. <Link to="/">Home</Link></p></main>;
  const cards = LESSONS.flatMap((l) => l.blocks.flatMap((b) => (b.type === 'summary' && p.notebook.summaryCards.includes(b.cardId) ? [{ lesson: l.title, bullets: b.bullets }] : [])));
  const label = (id: string) => CONCEPTS.find((c) => c.id === id)?.label ?? id;
  return (
    <main className="page">
      <h1>{p.name}’s Notebook</h1><p><button className="btn ghost" onClick={() => window.print()}>Print</button></p>
      <section className="panel"><h2>Summary cards</h2>{cards.length ? cards.map((c) => <div key={c.lesson}><h3>{c.lesson}</h3><ul>{c.bullets.map((b) => <li key={b}>{b}</li>)}</ul></div>) : <p>Finish a lesson to save its takeaways here.</p>}</section>
      <section className="panel" style={{ marginTop: '1rem' }}><h2>Terms I’ve met</h2>{p.notebook.terms.length ? p.notebook.terms.map((t) => <span className="chip" key={t} style={{ margin: 3 }}>{t}</span>) : <p>Tap a highlighted term in a lesson or the glossary to save it.</p>}</section>
      <section className="panel" style={{ marginTop: '1rem' }}><h2>My written responses</h2>{p.written.length ? p.written.map((w) => <blockquote key={w.id}>{w.text}</blockquote>) : <p>None yet.</p>}</section>
      <section className="panel" style={{ marginTop: '1rem' }}><h2>Concepts I’m still working on</h2>{needsWork(p.mastery).length ? <ul>{needsWork(p.mastery).map((c) => <li key={c}>{label(c)}</li>)}</ul> : <p>Nothing flagged right now.</p>}</section>
    </main>
  );
}
