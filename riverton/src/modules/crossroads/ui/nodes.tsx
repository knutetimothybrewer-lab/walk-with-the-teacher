import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import world from '../../../content/shared/riverton-world.json';
import { Character } from '../../../platform/art/Character';
import { CheckRunner } from '../../../platform/questions/CheckRunner';
import { useProfiles } from '../../../platform/profile/profileStore';
import { useSettings } from '../../../platform/settings';
import { Stage, castOf } from './art';
import { Typewriter } from './Typewriter';
import { availableChoices, castVote, choose, listenAvailable, listenLimit, listenPick, proceed, submitProposal, submitReason, type Ctx } from '../engine/run';
import { acceptProposal } from '../engine/townHall';
import { COMPONENTS, GRANT, DEVELOPER_BONUS, PROTECTION_COST, emptyProposal, proposalBudget, proposalCost, proposalValid, type Projection, type Proposal } from '../engine/cityAdapter';
import type { Run, Scenario, Stakeholder } from '../engine/types';
import type { RumorResult } from '../engine/rumor';

export interface VoteResult { id: string; name: string; yes: boolean }
export interface NodeProps { sc: Scenario; run: Run; apply: (r: Run, votes?: VoteResult[]) => void; ctx: Ctx; timed: boolean }

const nameOf = (who?: string) => (who === 'narrator' ? '' : who === 'you' ? 'You' : who ? castOf(who)?.name ?? who : '');
const hood = (id: string) => world.neighborhoods.find((h) => h.id === id)!;
type H = (typeof world.neighborhoods)[number];
const citywide = (get: (h: H) => number) => { const tot = world.neighborhoods.reduce((a, h) => a + h.profile.population, 0); return world.neighborhoods.reduce((a, h) => a + get(h) * h.profile.population, 0) / tot; };
const metricOf = (path: string, h: H) => { const [k, v] = path.split('.'); return ((h as unknown as Record<string, Record<string, number>>)[k === 'out' ? 'outcomes' : k === 'det' ? 'determinants' : 'profile'])[v]; };
const nodeNow = (sc: Scenario, run: Run) => sc.nodes.find((x) => x.id === run.node)!;
const STK_CAST: Record<string, string> = { clinic: 'lin', developer: 'hale', storeowner: 'park', elder: 'whitfield', parent: 'alvarez', pastor: 'bell', teen: 'jordan' };

// ---------------------------------------------------------------- scenes
export function SceneView({ sc, run, apply, ctx }: NodeProps) {
  const n = nodeNow(sc, run); if (n.type !== 'scene') return null;
  const [i, setI] = useState(0); const [typed, setTyped] = useState(false);
  useEffect(() => { setI(0); setTyped(false); }, [n.id]);
  const line = n.lines[Math.min(i, n.lines.length - 1)]; const last = i >= n.lines.length - 1;
  const cast = (n.cast ?? []).map((c) => ({ ...c, expr: line?.who === c.who && line.expr ? line.expr : c.expr }));
  const crowd = run.vars.session === 'saturday' ? 26 : run.vars.session === 'evening' ? 5 : run.vars.session === 'online' ? 2 : 14;
  const proj = run.vars.proj as Projection | undefined; const rumor = run.vars.rumor as RumorResult | undefined;
  return (
    <div>
      <Stage scene={n.scene} cast={cast} crowd={crowd}>
        <div className="dialogue" role="group" aria-label="Dialogue">
          {nameOf(line.who) && <div className="speaker">{nameOf(line.who)}</div>}
          <p className={line.thought ? 'thought' : ''}><Typewriter key={`${n.id}-${i}`} text={line.thought ? `(${line.text})` : line.text} onDone={() => setTyped(true)} /></p>
          <div className="dnext">{!last ? <button className="btn" onClick={() => { setI(i + 1); setTyped(false); }}>{typed ? 'Next' : 'Skip'}</button> : <button className="btn" disabled={!typed} onClick={() => apply(proceed(sc, run, ctx))}>Continue</button>}</div>
        </div>
      </Stage>
      {n.scene === 'timeskip' && proj && <ProjectionCard run={run} proj={proj} />}
      {n.scene === 'outbreakCurve' && rumor && <RumorCard rumor={rumor} />}
    </div>
  );
}

export function ProjectionCard({ run, proj }: { run: Run; proj: Projection }) {
  const typ = run.vars.projTypical as Projection;
  const rows: [string, string, string, boolean][] = [['Life expectancy', 'lifeExpectancy', 'yrs', true], ['Preventable ER visits', 'preventableER', 'per 1,000', false], ['Childhood asthma', 'asthma', '%', false], ['Uninsured', 'uninsured', '%', false], ['Obesity', 'obesity', '%', false]];
  const luck = String(run.vars.luck);
  return (
    <div className="panel xr-card">
      <h3>What the City model projects for Eastside after {proj.years} years</h3>
      <table className="tbl"><thead><tr><th>Measure</th><th>Today</th><th>Year {proj.years}</th><th>Typical case</th></tr></thead>
        <tbody>{rows.map(([l, k, u, up]) => { const a = proj.before[k], b = proj.after[k], t = typ ? typ.after[k] : b; const better = up ? b > a + 0.005 : b < a - 0.005; return <tr key={k}><td>{l}</td><td>{a.toFixed(1)} {u}</td><td><b>{b.toFixed(1)}</b> <span className={better ? 'good' : ''}>{better ? '▲ better' : '● about the same'}</span></td><td>{t.toFixed(1)}</td></tr>; })}</tbody></table>
      <p>Health equity gap (best vs. worst neighborhood life expectancy): {proj.gapBefore.toFixed(1)} years → <b>{proj.gapAfter.toFixed(1)}</b> years.</p>
      <p>Longtime residents still living in Eastside: <b>{proj.originalShare.toFixed(0)}%</b>.{proj.displacedPct >= 2 ? ' Rising rents pushed some families out.' : ''}</p>
      <p className="note">Luck in this run: <b>{luck === 'lucky' ? 'better than expected' : luck === 'unlucky' ? 'worse than expected' : 'about as expected'}</b>. The last column shows what a typical run of your same decision would produce. Health outcomes move slowly, so five years shows only part of the effect. This is a simplified teaching model, not a forecast.</p>
    </div>
  );
}
export function RumorCard({ rumor }: { rumor: RumorResult }) {
  const data = rumor.weeklyBefore.map((v, i) => ({ week: `Week ${i + 1}`, before: v, after: rumor.weeklyAfter[i] }));
  return (
    <div className="panel xr-card">
      <h3>How many people followed the guidance, and what it did to the curve</h3>
      <p>Compliance with the boil-water notice: {Math.round(rumor.c0 * 100)}% before → <b>{Math.round(rumor.c1 * 100)}%</b> after your choices.</p>
      <div style={{ height: 260 }}><ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#8884" /><XAxis dataKey="week" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
        <Bar dataKey="before" name="Before your messages" fill="#9aa5b1" /><Bar dataKey="after" name="After your messages" fill="#f26b50" isAnimationActive animationDuration={1200} /></BarChart></ResponsiveContainer></div>
      <p><b>{rumor.casesBefore}</b> cases expected before your messages; <b>{rumor.casesAfter}</b> after. {rumor.delta <= 0 ? `${-rumor.delta} fewer people got sick.` : `${rumor.delta} more people got sick.`}</p>
    </div>
  );
}

// ---------------------------------------------------------------- phone chat
export function ChatView({ sc, run, apply, ctx }: NodeProps) {
  const n = nodeNow(sc, run); if (n.type !== 'chat') return null;
  const reduce = useSettings((s) => s.reduceMotion); const [shown, setShown] = useState(reduce ? n.messages.length : 0);
  useEffect(() => { if (shown >= n.messages.length) return; const t = setTimeout(() => setShown((x) => x + 1), 900); return () => clearTimeout(t); }, [shown, n.messages.length]);
  return (
    <div className="chat-wrap">
      <div className="phone" role="log" aria-label={`Group chat ${n.group}`}>
        <div className="phone-head">{n.group}</div>
        {n.messages.slice(0, shown).map((m, i) => (
          <motion.div key={i} className={`bubble ${m.me ? 'me' : ''}`} initial={{ y: 30, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
            <b>{m.from}</b><br />{m.text}</motion.div>))}
      </div>
      <p><button className="btn" disabled={shown < n.messages.length} onClick={() => apply(proceed(sc, run, ctx))}>Continue</button></p>
    </div>
  );
}

// ---------------------------------------------------------------- data and compare
export function DataView({ sc, run, apply, ctx }: NodeProps) {
  const n = nodeNow(sc, run); if (n.type !== 'data') return null;
  const [done, setDone] = useState(!n.question);
  return (
    <div className="panel xr-card">
      <h2>{n.title}</h2><p>{n.intro}</p>
      <table className="tbl"><thead><tr><th>Measure</th><th>Eastside</th><th>Hillcrest</th><th>Riverton overall</th><th>Eastside ÷ Hillcrest</th></tr></thead>
        <tbody>{n.items.map((it) => { const e = metricOf(it.metric, hood('eastside')), h = metricOf(it.metric, hood('hillcrest')), c = citywide((x) => metricOf(it.metric, x)); return <tr key={it.metric}><td>{it.label}</td><td><b>{e}</b> {it.unit}</td><td>{h} {it.unit}</td><td>{c.toFixed(1)} {it.unit}</td><td>{(e / h).toFixed(1)}×</td></tr>; })}</tbody></table>
      <p className="note">Health equity gap in life expectancy: {(hood('hillcrest').outcomes.lifeExpectancy - hood('eastside').outcomes.lifeExpectancy).toFixed(1)} years between Hillcrest and Eastside.</p>
      {n.question && !done && <CheckRunner questionId={n.question} onDone={() => setDone(true)} />}
      <p><button className="btn" disabled={!done} onClick={() => apply(proceed(sc, run, ctx))}>Continue</button></p>
    </div>
  );
}
export function CompareView({ sc, run, apply, ctx }: NodeProps) {
  const n = nodeNow(sc, run); if (n.type !== 'compare') return null;
  return (
    <div className="panel xr-card"><h2>{n.title}</h2><p>{n.prompt}</p>
      <div className="grid2">
        <div><h3>What people say</h3>{n.perceptions.map((p) => <motion.blockquote key={p.quote} className="quote" initial={{ x: -12, opacity: 0 }} animate={{ x: 0, opacity: 1 }}><b>{p.who}:</b> {p.quote}</motion.blockquote>)}</div>
        <div><h3>What the data shows</h3>{n.data.map((d) => <motion.div key={d.label} className="datacard" initial={{ x: 12, opacity: 0 }} animate={{ x: 0, opacity: 1 }}><b>{d.label}</b><br />{d.value}</motion.div>)}</div>
      </div>
      <p><button className="btn" onClick={() => apply(proceed(sc, run, ctx))}>Continue</button></p></div>
  );
}

// ---------------------------------------------------------------- choices
export function ChoiceView({ sc, run, apply, ctx, timed }: NodeProps) {
  const n = nodeNow(sc, run); if (n.type !== 'choice') return null;
  const reduce = useSettings((s) => s.reduceMotion); const limit = n.timed && timed ? n.timed : 0;
  const [left, setLeft] = useState(limit);
  useEffect(() => { setLeft(limit); }, [n.id, limit]);
  useEffect(() => { if (!limit) return; if (left <= 0) { apply(choose(sc, run, n.defaultChoice ?? n.choices[0].id, ctx)); return; } const t = setTimeout(() => setLeft((x) => x - 1), 1000); return () => clearTimeout(t); }, [left, limit]); // eslint-disable-line react-hooks/exhaustive-deps
  const av = availableChoices(n, run.vars);
  const crowd = run.vars.session === 'saturday' ? 26 : run.vars.session === 'evening' ? 5 : 14;
  return (
    <div>
      {n.scene && <Stage scene={n.scene} crowd={crowd} />}
      <div className="panel xr-card">
        <h2>{n.prompt}</h2>
        {limit > 0 && <div className="timer" role="timer" aria-label={`${left} seconds left`}><div style={{ width: `${(left / limit) * 100}%`, transition: reduce ? 'none' : 'width 1s linear' }} /><span>{left}s</span></div>}
        <div className="opts">{av.map((c) => <button key={c.id} className="opt" onClick={() => apply(choose(sc, run, c.id, ctx))}><b>{c.label}</b>{c.detail && <div className="detail">{c.detail}</div>}</button>)}</div>
        {n.id.includes('pause') && <p className="note">There is no timer now. Take your time.</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- listening
export function ListenView({ sc, run, apply, ctx }: NodeProps) {
  const n = nodeNow(sc, run); if (n.type !== 'listen') return null;
  const [open, setOpen] = useState<Stakeholder | null>(null); const [li, setLi] = useState(0); const [typed, setTyped] = useState(false);
  const heard = (run.vars.heard as string[]) ?? []; const limit = listenLimit(n, run.vars); const avail = new Set(listenAvailable(n, run.vars).map((s) => s.id));
  const pick = (s: Stakeholder) => { if (heard.includes(s.id)) { setOpen(s); setLi(0); setTyped(false); return; } if (heard.length >= limit || !avail.has(s.id)) return; apply(listenPick(sc, run, s.id)); setOpen(s); setLi(0); setTyped(false); };
  if (open) {
    const l = open.lines[li]; const spec = castOf(STK_CAST[open.id]) ?? castOf(l.who ?? '');
    return (
      <div className="panel xr-card"><h2>{open.name}</h2><p className="note">{open.role}</p>
        <div className="convo">{spec && <Character spec={spec} expression={(l.expr as never) ?? 'neutral'} size={190} bob />}
          <div className="dialogue static"><p><Typewriter key={li} text={l.text} onDone={() => setTyped(true)} /></p></div></div>
        {li < open.lines.length - 1 ? <button className="btn" onClick={() => { setLi(li + 1); setTyped(false); }}>{typed ? 'Next' : 'Skip'}</button> : <>
          {open.fact && <div className="datacard"><b>What the data adds:</b> {open.fact}</div>}
          <p><button className="btn" onClick={() => setOpen(null)}>Back to the room</button></p></>}
      </div>);
  }
  return (
    <div className="panel xr-card">
      <h2>{n.prompt}</h2>
      <p>You can hear from <b>{limit}</b> people. {heard.length} of {limit} chosen.</p>
      <div className="stk-grid">
        {n.stakeholders.map((s) => { const spec = castOf(STK_CAST[s.id])!; const on = heard.includes(s.id); const can = avail.has(s.id);
          return (<button key={s.id} className={`stk ${on ? 'on' : ''}`} disabled={!can || (!on && heard.length >= limit)} onClick={() => pick(s)} aria-label={`${s.name}, ${s.role}`}>
            <Character spec={spec} expression={on ? 'happy' : 'neutral'} size={130} /><b>{s.name}</b><small>{s.role}</small>{!can && <small className="note">Could not attend this session</small>}{on && <small className="note">Heard. Tap to review.</small>}</button>); })}
      </div>
      <p><button className="btn" disabled={heard.length < Math.min(limit, avail.size)} onClick={() => apply(proceed(sc, run, ctx))}>{heard.length < limit ? `Choose ${limit - heard.length} more` : 'Continue'}</button></p>
    </div>
  );
}

// ---------------------------------------------------------------- reasoning capture
const DATA_EVIDENCE = [{ id: 'data:le', label: 'Life expectancy gap: 12.4 years between Hillcrest and Eastside' }, { id: 'data:er', label: 'Preventable ER visits: 142 per 1,000 in Eastside vs. 38 in Hillcrest' }, { id: 'data:asthma', label: 'Childhood asthma: 17.8% in Eastside vs. 6.5% in Hillcrest' }, { id: 'data:food', label: 'Food access: 22 out of 100 in Eastside vs. 88 in Hillcrest' }, { id: 'data:uninsured', label: 'Uninsured: 17.5% in Eastside vs. 3.1% in Hillcrest' }];
export function ReasonView({ sc, run, apply, ctx }: NodeProps) {
  const n = nodeNow(sc, run); if (n.type !== 'reason') return null;
  const recordWritten = useProfiles((s) => s.recordWritten);
  const listen = sc.nodes.find((x) => x.type === 'listen'); const stakeholders = listen && listen.type === 'listen' ? listen.stakeholders : [];
  const heard = (run.vars.heard as string[]) ?? [];
  const [ids, setIds] = useState<string[]>([]); const [assign, setAssign] = useState<Record<string, string>>({}); const [dir, setDir] = useState(''); const [whom, setWhom] = useState('');
  const [gives, setGives] = useState<string[]>([]); const [text, setText] = useState(''); const [other, setOther] = useState(''); const [approach, setApproach] = useState('');
  useEffect(() => { setIds([]); setAssign({}); setDir(''); setWhom(''); setGives([]); setText(''); setOther(''); setApproach(''); }, [n.id]);
  const lastChoice = String((run.vars.choices as string[] | undefined)?.slice(-1)[0] ?? '');
  const shallow = sc.nodes.some((x) => x.type === 'choice' && x.choices.some((c) => c.shallow && `${x.id}:${c.id}` === lastChoice));
  const send = (payload: unknown, writeText?: string) => { if (writeText) recordWritten({ kind: 'justification', qid: n.id, module: 'crossroads', text: writeText }); apply(submitReason(sc, run, payload, ctx)); };
  const Go = ({ ok, onGo }: { ok: boolean; onGo: () => void }) => <p><button className="btn" disabled={!ok} onClick={onGo}>Save my thinking and continue</button></p>;
  return (
    <div className="panel xr-card reason">
      <span className="chip">Reasoning check</span><h2>{n.prompt}</h2>
      {shallow && <div className="fb try">You chose a quick, popular option. People often pick these because they feel fast or safe. What might this option miss, and who might it leave out?</div>}
      {n.kind === 'evidence' && (<><div className="chk">{[...DATA_EVIDENCE, ...stakeholders.filter((s) => heard.includes(s.id)).map((s) => ({ id: s.evidenceId, label: `${s.name} (${s.role}): ${s.needs}` }))].map((e) => <label key={e.id} className="toggle"><span>{e.label}</span><input type="checkbox" checked={ids.includes(e.id)} onChange={(ev) => setIds(ev.target.checked ? [...ids, e.id] : ids.filter((x) => x !== e.id))} /></label>)}</div><Go ok={ids.length > 0} onGo={() => send({ ids })} /></>)}
      {n.kind === 'impact' && (<><div className="impact">{stakeholders.map((s) => <div key={s.id} className="imp-row"><span>{s.name} <small>({s.role})</small></span><div className="chipset">{[['benefits', 'Benefits'], ['costs', 'Bears costs'], ['left', 'Left out']].map(([v, l]) => <button key={v} className={`tog ${assign[s.id] === v ? 'on' : ''}`} aria-pressed={assign[s.id] === v} onClick={() => setAssign({ ...assign, [s.id]: v })}>{l}</button>)}</div></div>)}</div><Go ok={Object.keys(assign).length >= 3} onGo={() => send({ assignments: assign })} /></>)}
      {n.kind === 'equity' && (<><div className="chipset">{[['narrows', 'Narrows the gap'], ['widens', 'Widens the gap'], ['unclear', 'Not sure yet']].map(([v, l]) => <button key={v} className={`tog ${dir === v ? 'on' : ''}`} onClick={() => setDir(v)}>{l}</button>)}</div>
        <label className="field">For whom?<select value={whom} onChange={(e) => setWhom(e.target.value)}><option value="">Choose…</option>{['Eastside families overall', 'Longtime residents', 'Newcomers to the neighborhood', 'Families with children', 'Older adults', 'Local business owners', 'Not sure'].map((x) => <option key={x}>{x}</option>)}</select></label>
        <Go ok={!!dir && !!whom} onGo={() => send({ direction: dir, forWhom: whom })} /></>)}
      {n.kind === 'tradeoffs' && (<><div className="chk">{n.options?.map((o) => <label key={o.id} className="toggle"><span>{o.label}</span><input type="checkbox" checked={gives.includes(o.id)} onChange={(ev) => setGives(ev.target.checked ? [...gives, o.id] : gives.filter((x) => x !== o.id))} /></label>)}</div>
        <label className="field">Anything else you are giving up?<input type="text" value={other} onChange={(e) => setOther(e.target.value)} /></label><Go ok={gives.length > 0 || other.trim().length > 3} onGo={() => send({ gives, other }, other || undefined)} /></>)}
      {(n.kind === 'alternatives' || n.kind === 'justify') && (<><textarea rows={4} aria-label="Your answer" value={text} onChange={(e) => setText(e.target.value)} placeholder={n.kind === 'justify' ? '1 to 3 sentences' : 'An alternative, and why you set it aside'} /><Go ok={text.trim().length >= 15} onGo={() => send({ text }, text)} /></>)}
      {n.kind === 'comms' && (<><div className="chipset">{[['facts', 'Share facts'], ['empathy', 'Empathize, then redirect'], ['messenger', 'Use a trusted messenger'], ['verify', 'Verify before sharing'], ['language', 'Reach people in their language']].map(([v, l]) => <button key={v} className={`tog ${approach === v ? 'on' : ''}`} onClick={() => setApproach(v)}>{l}</button>)}</div>
        <textarea rows={3} aria-label="Why" value={text} onChange={(e) => setText(e.target.value)} placeholder="Why this approach for this audience?" /><Go ok={!!approach && text.trim().length >= 15} onGo={() => send({ approach, text }, text)} /></>)}
      {n.kind === 'decisionVsOutcome' && <CheckRunner questionId="q-xr-dvo" onDone={(correct) => send({ correct })} />}
    </div>
  );
}

// ---------------------------------------------------------------- proposal and vote
export function ProposalView({ sc, run, apply, ctx }: NodeProps) {
  const n = nodeNow(sc, run); if (n.type !== 'proposal') return null;
  const [p, setP] = useState<Proposal>(emptyProposal());
  const cost = proposalCost(p), budget = proposalBudget(p), ok = proposalValid(p);
  const set = (k: keyof Proposal, v: unknown) => setP({ ...p, [k]: v } as Proposal);
  return (
    <div className="panel xr-card">
      <h2>{n.prompt}</h2>
      <div className="budget" role="status"><div className="gauge"><i style={{ width: `${Math.min(100, (cost / budget) * 100)}%` }} /></div><b>${cost.toFixed(1)}M of ${budget.toFixed(1)}M</b>{cost > budget && <span className="bad"> Over budget</span>}</div>
      <div className="comp-grid">
        {COMPONENTS.map((c) => (<div key={c.id} className="comp"><h3>{c.label}</h3><p>{c.blurb}</p>
          <div className="chipset">{c.levels.map((l, i) => <button key={i} className={`tog ${p[c.id] === i ? 'on' : ''}`} aria-pressed={p[c.id] === i} onClick={() => set(c.id, i)}>{l.label}</button>)}</div></div>))}
        <div className="comp"><h3>Developer’s offer: +${DEVELOPER_BONUS.toFixed(1)}M</h3><p>Market-rate apartments on part of the lot. It doubles the budget and changes who lives next door.</p>
          <button className={`tog ${p.developer ? 'on' : ''}`} aria-pressed={p.developer} onClick={() => set('developer', !p.developer)}>{p.developer ? 'Accepted' : 'Accept the offer'}</button></div>
        <div className="comp"><h3>Housing protections (${PROTECTION_COST.toFixed(1)}M)</h3><p>Tenant protections and rent stabilization so longtime residents can stay.</p>
          <button className={`tog ${p.protections ? 'on' : ''}`} aria-pressed={p.protections} onClick={() => set('protections', !p.protections)}>{p.protections ? 'Included' : 'Add protections'}</button></div>
      </div>
      <p className="note">The grant is ${GRANT.toFixed(1)}M. Residents asked for many things; no option can do everything.</p>
      <p><button className="btn" disabled={!ok} onClick={() => { const acc = acceptProposal(run.vars, p); if (acc) apply(submitProposal(sc, run, acc, ctx)); }}>Submit proposal to the commission</button></p>
    </div>
  );
}

export function VoteView({ sc, run, apply, ctx }: NodeProps) {
  const n = nodeNow(sc, run); if (n.type !== 'vote') return null;
  const p = run.vars.proposal as Proposal | null;
  return (
    <div>
      <Stage scene="cityHall" crowd={run.vars.session === 'saturday' ? 24 : 8} />
      <div className="panel xr-card"><h2>{n.prompt}</h2>
        {p && <p>Your proposal: {COMPONENTS.filter((c) => p[c.id] > 0).map((c) => c.levels[p[c.id]].label).join(', ') || 'no buildings'}{p.developer ? '; developer deal accepted' : ''}{p.protections ? '; housing protections' : ''}.</p>}
        <p>Community trust in the process: <b>{Math.round(Number(run.vars.trust))}</b> / 100.</p>
        <button className="btn" onClick={() => { const r = castVote(sc, run, ctx); apply(r.run, r.votes); }}>Call the vote</button></div>
    </div>
  );
}
export function VoteReveal({ votes, need, onDone }: { votes: VoteResult[]; need: number; onDone: () => void }) {
  const reduce = useSettings((s) => s.reduceMotion); const [k, setK] = useState(reduce ? votes.length : 0);
  useEffect(() => { if (k >= votes.length) return; const t = setTimeout(() => setK(k + 1), 700); return () => clearTimeout(t); }, [k, votes.length]);
  const yes = votes.slice(0, k).filter((v) => v.yes).length, no = k - yes;
  return (
    <div className="panel xr-card"><h2>The vote</h2>
      <div className="votes">{votes.map((v, i) => <motion.div key={v.id} className={`vote ${i < k ? (v.yes ? 'yes' : 'no') : ''}`} initial={false} animate={{ scale: i < k ? [0.8, 1.08, 1] : 1, opacity: i < k ? 1 : 0.4 }}><b>{v.name}</b><span>{i < k ? (v.yes ? 'Yes' : 'No') : '…'}</span></motion.div>)}</div>
      <p className="tally"><span className="stat">{yes}</span> yes · <span className="stat">{no}</span> no · {need} needed</p>
      <button className="btn" disabled={k < votes.length} onClick={onDone}>Continue</button></div>
  );
}

export function ReflectView({ sc, run, apply, ctx }: NodeProps) {
  const n = nodeNow(sc, run); if (n.type !== 'reflect') return null;
  return <div className="panel xr-card"><h2>Reflect</h2><CheckRunner questionId={n.question} onDone={() => apply(proceed(sc, run, ctx))} /></div>;
}
