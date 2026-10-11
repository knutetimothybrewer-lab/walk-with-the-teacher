import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, GitBranch, Undo2, ClipboardCheck } from 'lucide-react';
import { Character } from '../../../platform/art/Character';
import { castOf } from './art';
import { ProjectionCard, RumorCard } from './nodes';
import { scoreReasoning } from '../engine/scoring';
import { replayWith } from '../engine/replay';
import type { Ctx } from '../engine/run';
import type { Run, Scenario, ChoiceNode, EndNode } from '../engine/types';
import type { Projection } from '../engine/cityAdapter';
import type { RumorResult } from '../engine/rumor';
import { useProfiles } from '../../../platform/profile/profileStore';
import { useXr } from './xrStore';
import { questionById } from '../../../platform/content';
import type { CERQuestion } from '../../../platform/questions/types';

function EndingCard({ sc, run }: { sc: Scenario; run: Run }) {
  const end = sc.nodes.find((n) => n.id === run.node) as EndNode;
  return (
    <motion.div className={`panel xr-card ending ${end.ending.tone}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <span className="chip"><Trophy size={14} /> Ending</span><h2>{end.ending.title}</h2><p>{end.ending.summary}</p>
      <div className="stories">{end.lines?.map((l, i) => { const spec = l.who ? castOf(l.who) : undefined; return (
        <motion.div key={i} className="story" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.25 }}>
          {spec && <Character spec={spec} expression={(l.expr as never) ?? 'neutral'} size={110} />}<div><b>{spec?.name}</b><br />“{l.text}”</div></motion.div>); })}</div>
    </motion.div>
  );
}

export function Debrief({ sc, run, ctx, runKey: key }: { sc: Scenario; run: Run; ctx: Ctx; runKey: string }) {
  const [tab, setTab] = useState<'rubric' | 'branches' | 'whatif'>('rubric');
  const alt = useXr((s) => s.alt[key]); const setAlt = useXr((s) => s.setAlt);
  const recordWritten = useProfiles((s) => s.recordWritten);
  const score = useMemo(() => scoreReasoning(run), [run]);
  const cer = questionById(sc.debrief.cer) as CERQuestion;
  const [self, setSelf] = useState<string[]>([]); const [selfDone, setSelfDone] = useState(false);
  const decisions = sc.nodes.filter((n): n is ChoiceNode => n.type === 'choice' && !!n.decision);
  const picked = (id: string) => run.history.find((h) => h.node === id && h.kind === 'choice')?.pick;
  const trustAt = (idx: number) => { const next = run.history[idx + 1]; return next ? Number(next.vars.trust) : Number(run.vars.trust); };
  const startOf = (idx: number) => Number(run.history[idx].vars.trust);
  const proj = run.vars.proj as Projection | undefined; const rumor = run.vars.rumor as RumorResult | undefined;
  const endOf = (r: Run) => (sc.nodes.find((n) => n.id === r.node) as EndNode | undefined)?.ending;

  const tryAlt = (histIdx: number, choiceId: string) => { try { setAlt(key, replayWith(sc, run, histIdx, choiceId, ctx)); setTab('whatif'); } catch { setAlt(key, null); } };
  const summary = (r: Run) => { const p = r.vars.proj as Projection | undefined; const u = r.vars.rumor as RumorResult | undefined; return [
    ['Ending', endOf(r)?.title ?? '—'], ['Community trust', `${Math.round(Number(r.vars.trust))}`],
    ...(p ? [['Eastside preventable ER visits (yr 5)', `${p.after.preventableER.toFixed(0)} per 1,000`], ['Life expectancy gap', `${p.gapAfter.toFixed(1)} years`], ['Longtime residents remaining', `${p.originalShare.toFixed(0)}%`]] : []),
    ...(u ? [['Compliance with guidance', `${Math.round(u.c1 * 100)}%`], ['Outbreak cases', `${u.casesAfter}`]] : [])]; };

  return (
    <div>
      <EndingCard sc={sc} run={run} />
      {proj && <ProjectionCard run={run} proj={proj} />}
      {rumor && <RumorCard rumor={rumor} />}
      <div className="tabs-x">{[['rubric', 'Reasoning rubric', ClipboardCheck], ['branches', 'Branch map', GitBranch], ['whatif', 'What if…', Undo2]].map(([id, l, Ic]) => { const I = Ic as typeof Trophy; return <button key={id as string} className={`tog ${tab === id ? 'on' : ''}`} onClick={() => setTab(id as 'rubric')}><I size={14} /> {l as string}</button>; })}</div>

      {tab === 'rubric' && (
        <div className="panel xr-card"><h2>How you reasoned</h2><p>{sc.debrief.rubricNote}</p>
          <table className="tbl"><thead><tr><th>Criterion</th><th>Score</th><th>What we noticed</th></tr></thead>
            <tbody>{score.dims.map((d) => <tr key={d.id}><td>{d.label}</td><td><div className="gauge" style={{ width: 90 }}><i style={{ width: `${(d.score / d.max) * 100}%` }} /></div> {d.score}/{d.max}</td><td>{d.note}</td></tr>)}</tbody></table>
          <p><b>{score.total} of {score.max}</b>. These scores come only from your structured reasoning. Your written answers are saved for your teacher and are never auto-graded.</p>
          <h3>Self-assessment of your reflection</h3>
          <p>Compare your written answer with the rubric and the sample answer you saw, and check what you did.</p>
          {cer.rubric.map((r) => <label key={r.id} className="toggle"><span>{r.criterion}</span><input type="checkbox" checked={self.includes(r.id)} onChange={(e) => setSelf(e.target.checked ? [...self, r.id] : self.filter((x) => x !== r.id))} /></label>)}
          <p><button className="btn" disabled={selfDone} onClick={() => { recordWritten({ kind: 'justification', qid: `${sc.id}-self`, module: 'crossroads', text: `Self-assessment: met ${self.length} of ${cer.rubric.length} rubric criteria (${self.join(', ') || 'none'}).` }); setSelfDone(true); }}>{selfDone ? 'Saved' : 'Save self-assessment'}</button></p>
        </div>)}

      {tab === 'branches' && (
        <div className="panel xr-card"><h2>Your path, and the paths not taken</h2><p>Gray options were not chosen. Tap one to see what would have happened.</p>
          {decisions.map((d) => { const idx = run.history.findIndex((h) => h.node === d.id && h.kind === 'choice'); if (idx < 0) return null; const pk = picked(d.id); const dt = trustAt(idx) - startOf(idx); return (
            <div key={d.id} className="branch"><div className="bprompt">{d.prompt}</div>
              <div className="bopts">{d.choices.map((c) => <button key={c.id} className={`bopt ${c.id === pk ? 'taken' : 'untaken'}`} onClick={() => c.id !== pk && tryAlt(idx, c.id)} disabled={c.id === pk} title={c.id === pk ? 'Your choice' : 'Try this instead'}>{c.label}</button>)}</div>
              {dt !== 0 && <div className="note">Community trust changed by {dt > 0 ? '+' : ''}{Math.round(dt)} here.</div>}</div>); })}
        </div>)}

      {tab === 'whatif' && (
        <div className="panel xr-card"><h2>Compare two runs</h2>
          {!alt ? <p>Pick an option you did not choose in the Branch map to replay your other answers on a different path.</p> : (
            <><table className="tbl"><thead><tr><th></th><th>Your run</th><th>The other path</th></tr></thead><tbody>{summary(run).map(([l, v], i) => <tr key={l}><td>{l}</td><td>{v}</td><td>{summary(alt)[i]?.[1] ?? '—'}</td></tr>)}</tbody></table>
              <p className="note">Same seed, same luck draws where the path allows. The comparison includes the City model’s projected health outcomes.</p>
              <button className="btn ghost" onClick={() => setAlt(key, null)}>Clear</button></>)}
        </div>)}
    </div>
  );
}
