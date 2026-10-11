import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Printer, Download } from 'lucide-react';
import world from '../../content/shared/riverton-world.json';
import { useProfiles, type Profile } from '../profile/profileStore';
import { useShared } from '../sharedState';
import { useSettings } from '../settings';
import { CheckRunner } from '../questions/CheckRunner';
import { CONCEPTS } from '../content';
import { needsWork } from '../learn/mastery';
import { COMPONENTS } from '../../modules/crossroads/engine/cityAdapter';
import { SCENARIOS } from '../../modules/crossroads/ui/scenarios';
import { download } from '../profile/ProfileMenu';
import type { EndNode } from '../../modules/crossroads/engine/types';
import { INTERVENTIONS } from '../../modules/city/sim';
import './report.css';

const hood = (id: string) => world.neighborhoods.find((h) => h.id === id)!;
const ending = (sc: string, id?: string) => (SCENARIOS[sc].nodes.find((n) => n.type === 'end' && n.ending.id === id) as EndNode | undefined)?.ending;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const CER_IDS: [string, string][] = [['q-city-cer', 'City: Plan'], ['q-xr-th-cer', 'Town Hall'], ['q-lab-cer', 'Outbreak'], ['q-xr-rm-cer', 'Rumor Mill'], ['q-wrap-cer', 'Executive summary']];

export function writtenFor(p: Profile, qid: string) { return [...p.written].reverse().find((w) => w.qid === qid)?.text; }

export default function Report() {
  const me = useProfiles((s) => s.active()); const update = useProfiles((s) => s.update); const shared = useShared(); const reduce = useSettings((s) => s.reduceMotion);
  const [shown, setShown] = useState(reduce ? 99 : 1); const [writing, setWriting] = useState(false);
  useEffect(() => { if (reduce || shown >= 12) return; const t = setTimeout(() => setShown((x) => x + 1), 900); return () => clearTimeout(t); }, [shown, reduce]);
  const rubric = useMemo(() => { if (!me?.crossroads) return [] as { id: string; avg: number }[]; const acc: Record<string, number[]> = {}; for (const r of Object.values(me.crossroads)) for (const d of r.rubric) (acc[d.id] ??= []).push(d.score / d.max); return Object.entries(acc).map(([id, v]) => ({ id, avg: v.reduce((a, b) => a + b, 0) / v.length })); }, [me]);
  if (!me) return <main className="page"><p>Add a student first on the <Link to="/">home screen</Link>.</p></main>;
  const city = me.city?.missions['close-the-gap']; const th = me.crossroads?.['town-hall']; const rm = me.crossroads?.['rumor-mill']; const lab = me.lab;
  const thS = th?.summary as { trust?: number; session?: string; heard?: string[]; proposal?: Record<string, number | boolean>; passed?: boolean; luck?: string; proj?: { after: Record<string, number>; before: Record<string, number>; gapBefore: number; gapAfter: number; originalShare: number } } | undefined;
  const rmS = rm?.summary as { rumor?: { c0: number; c1: number; casesBefore: number; casesAfter: number }; messenger?: string } | undefined;
  const concepts = needsWork(me.mastery).map((c) => CONCEPTS.find((x) => x.id === c)?.label ?? c);
  const mastered = Object.values(me.mastery).filter((m) => m.level === 'mastered').length;
  const rubricLabels: Record<string, string> = { data: 'Uses data as evidence', stakeholders: 'Considers multiple stakeholders', voice: 'Includes community voice', equity: 'Weighs equity', tradeoffs: 'Identifies trade-offs', alternatives: 'Generates alternatives', decision: 'Decision vs. outcome' };
  const page = (n: number, title: string, body: React.ReactNode) => shown >= n && <motion.section className="rpage panel" initial={{ opacity: 0, y: 24, rotateX: -8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.5 }}><h2>{title}</h2>{body}</motion.section>;
  const summary = me.report?.summary;
  return (
    <main className="page report">
      <div className="no-print"><h1>Riverton Health Commission: Annual Report</h1><p className="note">Your report assembles itself from your own results. Chapters you have not played yet are marked, and you can come back to fill them in.</p>
        <p><button className="btn ghost" onClick={() => window.print()}><Printer size={16} /> Print or save as PDF</button> <button className="btn ghost" onClick={() => download(`riverton-portfolio-${me.name.replace(/\W+/g, '_')}.json`, { app: 'riverton', version: 1, exported: Date.now(), profile: me })}><Download size={16} /> Export portfolio</button></p></div>

      {page(1, 'Cover', <div className="cover"><h1>Riverton Health Commission</h1><h3>Annual Report: Youth Commissioner {me.name}{me.period ? `, period ${me.period}` : ''}</h3><p>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p></div>)}
      {page(2, 'Riverton’s health gap', <><p>Riverton is a fictional city of about 155,000 people. Life expectancy ranges from <b>{hood('hillcrest').outcomes.lifeExpectancy}</b> years in Hillcrest to <b>{hood('eastside').outcomes.lifeExpectancy}</b> in Eastside: a gap of <b>12.4 years</b> between neighborhoods three miles apart. The commission’s job this year was to understand that gap and act on it.</p></>)}
      {page(3, 'City: the plan', city ? <><p>The plan narrowed the gap between the best-off neighborhood and Eastside from <b>{city.gapStart.toFixed(1)}</b> to <b>{city.gapEnd.toFixed(1)}</b> years: a reduction of <b>{city.reduced.toFixed(1)}</b> (goal: {city.target}). {city.won ? 'The goal was met.' : 'The goal was not met.'} Stars: {city.stars} of 3.</p><p>Built: {city.built.map((b) => INTERVENTIONS[b]?.name ?? b).join(', ')}.</p><p>{city.displacedPct >= 3 ? `About ${city.displacedPct.toFixed(1)}% of longtime Eastside residents were displaced, an unintended consequence of the amenities.` : 'Longtime Eastside residents largely stayed.'}</p></> : <p className="note">Not completed yet. Play the City chapter to add its results here.</p>)}
      {page(4, 'Town Hall: the Lot on Elm Street', th && thS ? <><p>The commission held its listening session <b>{thS.session === 'saturday' ? 'on a Saturday at the Eastside community center' : thS.session === 'evening' ? 'on a weekday evening at City Hall' : 'as an online survey'}</b> and heard from {(thS.heard ?? []).length} stakeholders. The proposal: {COMPONENTS.filter((c) => (thS.proposal?.[c.id] as number) > 0).map((c) => c.levels[thS.proposal![c.id] as number].label).join(', ') || 'no buildings'}{thS.proposal?.developer ? '; developer deal accepted' : ''}{thS.proposal?.protections ? '; housing protections' : ''}. The vote {thS.passed ? 'passed' : 'did not pass'}.</p>
        {thS.proj && <p>Projected five years on: preventable ER visits in Eastside {thS.proj.before.preventableER.toFixed(0)} → <b>{thS.proj.after.preventableER.toFixed(0)}</b> per 1,000; longtime residents remaining <b>{thS.proj.originalShare.toFixed(0)}%</b>. Community trust ended at <b>{Math.round(Number(thS.trust))}</b>.</p>}
        <p>Outcome: <b>{ending('town-hall', th.ending)?.title}</b>. {ending('town-hall', th.ending)?.summary}</p></> : <p className="note">Not completed yet.</p>)}
      {page(5, 'Outbreak investigation', lab ? <><p>The outbreak’s source was <b>{lab.source.toLowerCase()}</b> and its epi curve was a <b>{lab.curve}</b> pattern. {lab.hypothesisRight ? 'Your final hypothesis matched the true source.' : 'Your final hypothesis did not match the true source.'} Your case definition was judged <b>{lab.caseDefVerdict}</b>.</p><p>You interviewed {lab.interviews} cases, surveyed {lab.surveys} groups of residents, ran {lab.waterTests} water tests and {lab.inspections} inspections{lab.activeFinding ? ', and used active case finding' : ''}. {lab.interventions.length ? `You ordered ${lab.interventions.map((i) => `${i.kind.replace('_', ' ')} (day ${i.day})`).join(', ')}, which ${lab.targeted ? 'targeted' : 'did not target'} the true source and prevented about <b>${lab.casesPrevented}</b> cases.` : ''}</p></> : <p className="note">Not completed yet.</p>)}
      {page(6, 'Rumor Mill', rm && rmS?.rumor ? <><p>With a rumor spreading about the boil-water notice, compliance with the guidance went from <b>{pct(rmS.rumor.c0)}</b> to <b>{pct(rmS.rumor.c1)}</b> after your choices{rmS.messenger && rmS.messenger !== 'none' ? `, including asking a trusted messenger (${rmS.messenger})` : ''}. Expected outbreak cases moved from <b>{rmS.rumor.casesBefore}</b> to <b>{rmS.rumor.casesAfter}</b>.</p><p>Outcome: <b>{ending('rumor-mill', rm.ending)?.title}</b>.</p></> : <p className="note">Not completed yet.</p>)}
      {page(7, 'How you reasoned', rubric.length ? <><p>These scores come only from your structured reasoning in Crossroads, never from which option you chose.</p><table className="tbl">{rubric.map((r) => <tr key={r.id}><td>{rubricLabels[r.id] ?? r.id}</td><td><div className="gauge" style={{ width: 160 }}><i style={{ width: pct(r.avg) }} /></div></td><td>{pct(r.avg)}</td></tr>)}</table></> : <p className="note">Play a Crossroads chapter to see your reasoning profile.</p>)}
      {page(8, 'What you know and what to revisit', <><p>You have mastered <b>{mastered}</b> concepts so far.{concepts.length ? ' Still working on:' : ' Nothing is flagged right now.'}</p>{concepts.length > 0 && <ul>{concepts.map((c) => <li key={c}>{c}</li>)}</ul>}</>)}
      {page(9, 'Your written reasoning', <>{CER_IDS.filter(([id]) => id !== 'q-wrap-cer').map(([id, t]) => { const w = writtenFor(me, id); return w ? <div key={id}><h4>{t}</h4><blockquote>{w}</blockquote></div> : null; })}{!CER_IDS.slice(0, 4).some(([id]) => writtenFor(me, id)) && <p className="note">Your written responses from each chapter will appear here.</p>}</>)}
      {page(10, 'Executive summary', summary ? <><blockquote>{summary}</blockquote><p className="good">Report saved to your portfolio.</p></> : writing ? <CheckRunner questionId="q-wrap-cer" onDone={() => { const p = useProfiles.getState().active(); const t = p ? writtenFor(p, 'q-wrap-cer') : ''; if (t) update((x) => ({ ...x, report: { summary: t, at: Date.now() }, progress: { ...x.progress, wrapup: { ...(x.progress.wrapup ?? { minutes: 0, completed: [] }), completed: ['report'] } } })); }} /> : <><p>The last step is yours: write the commission’s executive summary. It should tie your chapters together.</p><button className="btn" onClick={() => setWriting(true)}>Write the executive summary</button></>)}
      <p className="note no-print">Community trust at the end of the year: {Math.round(shared.trust)} / 100. <Link to="/">Back to the storyline</Link></p>
    </main>
  );
}
