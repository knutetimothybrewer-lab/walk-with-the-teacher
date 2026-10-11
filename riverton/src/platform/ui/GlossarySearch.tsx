import { useState } from 'react';
import { Modal } from './Modal';
import { GLOSSARY } from '../content';
import { useProfiles } from '../profile/profileStore';

export function GlossarySearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const addTerm = useProfiles((s) => s.addTerm);
  const hits = GLOSSARY.filter((g) => (g.term + ' ' + g.definition).toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal open={open} onClose={onClose} title="Glossary">
      <label className="field">Search terms<input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. life expectancy" /></label>
      {hits.map((g) => (
        <p key={g.term}><button className="chip" onClick={() => addTerm(g.term)} title="Save to my Notebook">{g.term}</button> {g.definition}</p>
      ))}
      {!hits.length && <p>No matching term yet.</p>}
    </Modal>
  );
}
