import { useMemo, useState } from 'react';
import { Modal } from './Modal';
import { CheckRunner } from '../questions/CheckRunner';
import { QUESTIONS } from '../content';
import { useProfiles } from '../profile/profileStore';
import { warmupOrder, type MasteryMap } from '../learn/mastery';

const EMPTY: MasteryMap = {};

export function QuizMe({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mastery = useProfiles((s) => s.active()?.mastery ?? EMPTY);
  const [n, setN] = useState(0);
  const id = useMemo(() => {
    const concepts = warmupOrder(mastery);
    const pool = QUESTIONS.filter((q) => q.type !== 'cer');
    const prefer = pool.filter((q) => concepts.includes(q.concept));
    const list = prefer.length ? prefer : pool;
    return list[(n + Math.floor(Math.random() * list.length)) % list.length]?.id;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, open]);
  return (
    <Modal open={open} onClose={onClose} title="Quiz me">
      {id ? <CheckRunner key={id + n} questionId={id} onDone={() => setN(n + 1)} /> : <p>No questions yet.</p>}
    </Modal>
  );
}
