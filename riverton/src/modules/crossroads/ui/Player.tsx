import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Modal } from '../../../platform/ui/Modal';
import { useProfiles } from '../../../platform/profile/profileStore';
import { useTeacher } from '../../../platform/teacher/teacherStore';
import { useShared } from '../../../platform/sharedState';
import { lessonById } from '../../../platform/content';
import { startRun } from '../engine/run';
import { scoreReasoning } from '../engine/scoring';
import { COMPONENTS, type Proposal } from '../engine/cityAdapter';
import type { Run, Vars } from '../engine/types';
import { CTX, SCENARIOS } from './scenarios';
import { runKey, useXr } from './xrStore';
import { ChatView, CompareView, ChoiceView, DataView, ListenView, ProposalView, ReasonView, ReflectView, SceneView, VoteReveal, VoteView, type VoteResult } from './nodes';
import { Debrief } from './Debrief';
import './xr.css';

const MODEL = ['Define the problem with data', 'Identify who is affected', 'Listen to the community', 'Consider evidence-based options', 'Weigh equity and trade-offs', 'Decide', 'Evaluate'];

export default function Player() {
  const { id = '' } = useParams(); const sc = SCENARIOS[id]; const ctx = CTX[id];
  const me = useProfiles((s) => s.active()); const update = useProfiles((s) => s.update);
  const teacher = useTeacher(); const shared = useShared();
  const { runs, set } = useXr(); const [votes, setVotes] = useState<{ votes: VoteResult[]; need: number } | null>(null); const [model, setModel] = useState(false);
  if (!sc || !ctx) return <main className="page"><h1>Scenario not found</h1><Link to="/crossroads">Back</Link></main>;
  if (!me) return <main className="page"><p>Add a student first on the <Link to="/">home screen</Link>.</p></main>;
  const key = runKey(me.id, id); const run = runs[key];
  const done = me.lessonsDone; const lessonsOk = sc.lessons.every((l) => done.includes(l)) || !teacher.foundationsRequired;

  const begin = () => {
    const extra: Vars = id === 'town-hall' ? { trust: shared.trust } : { trust: shared.trust, trust0: shared.trust, weekly: shared.outbreakCases ?? [] };
    set(key, startRun(sc, Math.floor(Math.random() * 1e6), extra, ctx));
  };
  const apply = (r: Run, v?: VoteResult[]) => { set(key, r); if (v) setVotes({ votes: v, need: (sc.nodes.find((n) => n.type === 'vote') as { need: number }).need }); };

  // finish: write shared state, progress, and the reasoning record once
  useEffect(() => {
    if (!run?.done || me.crossroads?.[id]) return;
    const r = scoreReasoning(run);
    update((p) => ({ ...p, progress: { ...p.progress, crossroads: { ...(p.progress.crossroads ?? { minutes: 0, completed: [] }), completed: [...new Set([...(p.progress.crossroads?.completed ?? []), id])] } }, crossroads: { ...(p.crossroads ?? {}), [id]: { ending: run.ending ?? '', reasoning: run.reasoning, rubric: r.dims.map((d) => ({ id: d.id, score: d.score, max: d.max })), at: Date.now() } } }));
    if (id === 'town-hall') { const p = run.vars.proposal as Proposal | null; shared.patch({ trust: Number(run.vars.trust), townHallChoice: run.ending ?? null, interventions: p ? COMPONENTS.filter((c) => p[c.id] > 0).map((c) => c.cityType) : [] }); }
    if (id === 'rumor-mill') shared.patch({ trust: Number(run.vars.trust), rumorOutcome: run.ending ?? null });
  }, [run?.done]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!run) {
    return (
      <main className="page xr-page"><div className="panel xr-card">
        <h1>{sc.title}</h1><p>{sc.tagline}</p><p className="note">About {sc.minutes} minutes. You play a youth member of the Riverton Health Commission. Your reasoning is what gets scored, never which option you pick.</p>
        {sc.lessons.map((l) => { const ls = lessonById(l)!; const ok = done.includes(l); return <div key={l} className="acard"><h3>{ok ? 'Done: ' : ''}{ls.title} <span className="chip">~{ls.minutes} min</span></h3><Link className="btn" to={`/lesson/${l}`} state={{ from: `/crossroads/${id}` }}>{ok ? 'Review lesson' : 'Start lesson'}</Link></div>; })}
        {id === 'rumor-mill' && <p className="note">{shared.outbreakCases ? 'Using the outbreak from your Sim Lab investigation.' : 'You have not run the Sim Lab outbreak yet, so a default outbreak will be used.'} Community trust right now: {Math.round(shared.trust)}.</p>}
        <p><button className="btn" style={{ ['--accent-a' as string]: 'var(--cross-a)' }} disabled={!lessonsOk} onClick={begin}>{lessonsOk ? 'Begin' : 'Finish the lesson to begin'}</button></p>
      </div></main>
    );
  }
  const node = sc.nodes.find((n) => n.id === run.node)!;
  const props = { sc, run, apply, ctx, timed: teacher.timedChoices };
  const body = votes ? <VoteReveal votes={votes.votes} need={votes.need} onDone={() => setVotes(null)} /> : {
    scene: <SceneView {...props} />, chat: <ChatView {...props} />, data: <DataView {...props} />, compare: <CompareView {...props} />, choice: <ChoiceView {...props} />, listen: <ListenView {...props} />,
    reason: <ReasonView {...props} />, proposal: <ProposalView {...props} />, vote: <VoteView {...props} />, reflect: <ReflectView {...props} />, end: <Debrief sc={sc} run={run} ctx={ctx} runKey={key} />,
    project: null, chance: null, route: null }[node.type];
  return (
    <main className="page xr-page">
      <div className="xr-head"><h1>{sc.title}</h1><span className="grow" /><button className="btn ghost" onClick={() => setModel(true)}><Compass size={16} /> Decision model</button>
        {run.done && <><Link className="btn ghost" to="/crossroads">Back to Crossroads</Link></>}</div>
      <Modal open={model} onClose={() => setModel(false)} title="Community health decision model"><ol className="model">{MODEL.map((m) => <li key={m}>{m}</li>)}</ol><p className="note">Use these steps to check your thinking at any time.</p></Modal>
      {body}
    </main>
  );
}
