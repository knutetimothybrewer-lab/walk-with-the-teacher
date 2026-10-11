import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Modal } from '../../../platform/ui/Modal';
import { CheckRunner } from '../../../platform/questions/CheckRunner';
import type { ClassifyQuestion, MCQuestion, OrderQuestion, Question } from '../../../platform/questions/types';
import { useProfiles } from '../../../platform/profile/profileStore';
import { useShared } from '../../../platform/sharedState';
import { explainChange, INTERVENTIONS, type Out } from '../sim';
import { useGame } from '../game/store';
import { evaluate, stars } from '../game/missions';
import { BEH, DET, OUTL, fmt, unitOf } from './labels';
import world from '../../../content/shared/riverton-world.json';

const name = (k: string, kind: string) => (kind === 'det' ? DET[k]?.[0] : kind === 'beh' ? BEH[k]?.[0] : OUTL[k]) ?? k;
const hn = (id: string) => world.neighborhoods.find((h) => h.id === id)!.name;

export function EndPanel() {
  const { city, mission, startGap, log, exit, done } = useGame(); const upd = useProfiles((s) => s.update); const shared = useShared();
  const [step, setStep] = useState(0);
  const status = mission ? evaluate(mission, city, startGap) : null; // the city is mutated in place, so never memoize on its identity
  const qs = useMemo<Question[]>(() => {
    if (!done || !mission || mission.id !== 'close-the-gap') return [];
    const out: Question[] = []; const first = city.history[0];
    // 1. data interpretation from the student's own graphs
    const o: Out = 'preventableER'; const rows = world.neighborhoods.map((h) => ({ id: h.id, d: city.hoods[h.id].out[o] - first.hoods[h.id].out[o], pct: ((city.hoods[h.id].out[o] - first.hoods[h.id].out[o]) / first.hoods[h.id].out[o]) * 100 })).sort((a, b) => a.d - b.d);
    if (Math.abs(rows[0].pct) >= 0.5) {
      const best = rows[0]; const others = rows.slice(1).filter((r) => r.id !== best.id).slice(0, 3);
      const opts = [{ id: 'a', text: hn(best.id), feedback: `Yes: ${hn(best.id)} dropped the most (${fmt(best.d)} per 1,000, ${best.pct.toFixed(1)}%). Check the neighborhood panel's trend line.`, correct: true }, ...others.map((r, i) => ({ id: 'bcd'[i], text: hn(r.id), feedback: `${hn(r.id)} changed by ${fmt(r.d)} per 1,000 (${r.pct.toFixed(1)}%), less than ${hn(best.id)}. Compare the sizes of the changes, not just the direction.`, misconception: 'graph-misread' }))];
      out.push({ id: 'dyn-data', module: 'city', concept: 'reading-graphs', type: 'mc', difficulty: 2, trigger: 'sim-data', prompt: `Look at your Trends charts. Which neighborhood's preventable ER visits fell the most since the start of the mission?`, options: opts, explanation: 'Compare the size of each change, using the same starting year for every neighborhood.', context: 'sim:city', hint: 'Open the Trends tab and compare the lines.' } as MCQuestion);
    }
    // 2. causal chain ordering from the student's own biggest change in Eastside
    for (const oc of ['preventableER', 'obesity', 'asthma', 'leadElevated', 'waterborne', 'uninsured', 'lifeExpectancy'] as Out[]) {
      try { const ex = explainChange(city, 'eastside', oc, 0, city.month); const c = ex.chains.find((x) => x.steps.length >= 3); if (!c) continue;
        const items = [{ id: 'i0', text: c.label }, ...c.steps.map((s, i) => ({ id: 'i' + (i + 1), text: s.kind === 'out' ? `${name(s.key, s.kind)} changes in Eastside` : name(s.key, s.kind) }))];
        const order = items.map((i) => i.id); const shuffled = [...items].sort((a, b) => ((a.id.charCodeAt(1) * 7) % 5) - ((b.id.charCodeAt(1) * 7) % 5));
        if (JSON.stringify(shuffled.map((i) => i.id)) === JSON.stringify(order)) shuffled.reverse();
        out.push({ id: 'dyn-chain', module: 'city', concept: 'upstream-downstream', type: 'order', difficulty: 2, trigger: 'sim-chain', prompt: `Put this cause-and-effect chain from your city in order, from the action to the health outcome.`, items: shuffled, correctOrder: order, explanation: 'Interventions change conditions, conditions change behaviors and exposures, and those change health outcomes.', context: 'sim:city', hint: 'Start with what you built. The health outcome comes last.' } as OrderQuestion); break; } catch { /* try next outcome */ }
    }
    // 3. classify the prevention level of what the student built
    const types = [...new Set(log.filter((a) => a.k === 'place').map((a) => (a as { type: string }).type))].filter((t) => INTERVENTIONS[t]).slice(0, 4);
    if (types.length >= 2) out.push({ id: 'dyn-prev', module: 'city', concept: 'prevention-levels', type: 'classify', difficulty: 2, trigger: 'sim-classify', prompt: 'Classify each thing you built: primary prevention stops a problem before it starts, secondary catches it early, tertiary manages an existing problem.', categories: [{ id: 'primary', label: 'Primary' }, { id: 'secondary', label: 'Secondary' }, { id: 'tertiary', label: 'Tertiary' }], items: types.map((t) => ({ id: t, text: INTERVENTIONS[t].name, category: INTERVENTIONS[t].prevention, misconception: 'pl-levels' })), explanation: 'Primary prevention acts before illness, secondary finds it early, tertiary limits harm from existing illness.', context: 'sim:city', hint: 'Ask: is this before illness, early detection, or treatment of existing illness?' } as ClassifyQuestion);
    out.push({ id: 'q-city-cer', } as Question);
    return out;
  }, [done, city.month, mission, log.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!mission || !done || !status) return null;
  const isCtg = mission.id === 'close-the-gap'; const cur = qs[step];
  const finish = () => {
    upd((p) => ({ ...p, progress: { ...p.progress, city: { ...(p.progress.city ?? { minutes: 0, completed: [] }), completed: [...new Set([...(p.progress.city?.completed ?? []), mission.id])] } } }));
    const built = [...new Set(log.filter((a) => a.k === 'place').map((a) => (a as { type: string }).type))];
    if (isCtg) { upd((p) => ({ ...p, city: { missions: { ...(p.city?.missions ?? {}), [mission.id]: { gapStart: startGap, gapEnd: status.gapNow, reduced: status.reduced, target: status.target, won: status.won, stars: stars(status), displacedPct: status.displacedPct, built, at: Date.now() } } } }));
      shared.patch({ cityResult: { gapStart: startGap, gapEnd: status.gapNow, reduced: status.reduced, won: status.won, stars: stars(status), displacedPct: status.displacedPct } }); }
    shared.patch({ interventions: built }); exit();
  };
  return (
    <Modal open onClose={() => { /* finish with the button */ }} title={isCtg ? (status.won ? 'Mission complete' : 'The ten years are up') : 'Tutorial complete'}>
      {isCtg ? (
        <>
          <p>The gap between the best neighborhood and Eastside went from <b>{startGap.toFixed(1)}</b> to <b>{status.gapNow.toFixed(1)}</b> years: a reduction of <b>{status.reduced.toFixed(2)}</b> (goal: {status.target}).</p>
          <div className="stars" aria-label={`${stars(status)} of 3 stars`}>{[0, 1, 2].map((i) => <Star key={i} size={30} fill={i < stars(status) ? 'var(--cross-b)' : 'none'} />)}</div>
          <ul className="note"><li>{status.won ? 'Goal reached.' : 'Goal not reached. Compare your plan with what moved fastest.'}</li><li>{status.displacedPct < 3 ? 'Longtime Eastside residents stayed.' : `About ${status.displacedPct.toFixed(1)}% of longtime Eastside residents were displaced.`}</li><li>{status.cash >= 0 ? `Budget stayed positive: $${status.cash.toFixed(1)}M left.` : 'You ran out of operating funds, so some programs cut hours.'}</li></ul>
          {step < qs.length && cur && (cur.id === 'q-city-cer' ? <CheckRunner key="cer" questionId="q-city-cer" onDone={() => setStep(step + 1)} /> : <CheckRunner key={cur.id} question={cur} onDone={() => setStep(step + 1)} />)}
          {step >= qs.length && <p><button className="btn" onClick={finish}>Finish mission</button></p>}
        </>) : <><p>You placed a clinic, watched time pass, and asked why an outcome changed. That is the whole loop: build, predict, observe, explain.</p><p><button className="btn" onClick={finish}>Back to missions</button></p></>}
      <p className="note"><Link to="/">Home</Link></p>
    </Modal>
  );
}
export { unitOf };
