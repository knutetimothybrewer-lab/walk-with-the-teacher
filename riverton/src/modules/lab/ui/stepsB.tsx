import { useState, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, FlaskConical, ClipboardCheck, Users, Clock, Droplets } from 'lucide-react';
import { useLabCtx } from './labCtx';
import { ACTIONS, interview, survey, waterSample, inspect, specimens, lineList, hoodName, EXPOSURE_LABELS, type Exposure } from '../labs/outbreak';
import type { ActionDef, ActionRecord } from '../engine/types';
import { RivertonMap } from '../../../platform/map/RivertonMap';
import { hash01 } from '../engine/hash';
import { pinFor } from './pins';
import type { LabRun } from './labStore';

const ICON: Record<string, ReactElement> = { interview_cases: <Users size={18} />, survey_residents: <ClipboardCheck size={18} />, water_sample: <Droplets size={18} />, inspect: <Search size={18} />, specimens: <FlaskConical size={18} />, active_case_finding: <Search size={18} />, wait: <Clock size={18} /> };

function ActionCard({ a, args, setArg, can, onGo }: { a: ActionDef; args: Record<string, string>; setArg: (k: string, v: string) => void; can: boolean; onGo: () => void }) {
  return (
    <div className="acard">
      <h3>{ICON[a.id]} {a.label}</h3><p>{a.description}</p>
      {a.params?.map((p) => (
        <label key={p.key} className="field" style={{ margin: '.3rem 0' }}>{p.label}
          <select value={args[p.key] ?? p.options[0].value} onChange={(e) => setArg(p.key, e.target.value)}>{p.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>))}
      <button className="btn" disabled={!can} onClick={onGo}>Do it <span className="chip">{a.cost} pts · {a.days} day{a.days === 1 ? '' : 's'}{a.resultDelay ? ` · +${a.resultDelay} for results` : ''}</span></button>
    </div>
  );
}

export function InvestigateStep() {
  const { run, patch, truth, sim, rows, go } = useLabCtx();
  const [args, setArgs] = useState<Record<string, Record<string, string>>>({});
  const [msg, setMsg] = useState('');
  const arg = (id: string, k: string, d: string) => args[id]?.[k] ?? d;

  const perform = (a: ActionDef) => {
    const p = args[a.id] ?? {};
    const get = (k: string) => p[k] ?? a.params!.find((x) => x.key === k)!.options[0].value;
    const day = run.day, after = day + a.days, ready = after + a.resultDelay;
    const rec: ActionRecord = { id: `${a.id}-${run.actions.length}`, actionId: a.id, args: p, day, readyDay: ready };
    const next: Partial<LabRun> = { day: after, daysUsed: run.daysUsed + a.days, budget: run.budget - a.cost, actions: [...run.actions, rec] };
    if (a.id === 'interview_cases') {
      const n = Number(get('n')); const have = new Set(run.caseInterviews.map((i) => i.id));
      const pool = lineList(truth, sim, after, run.found).filter((r) => !have.has(r.id)).sort((x, y) => hash01(truth.seed, x.id, 91) - hash01(truth.seed, y.id, 91)).slice(0, n);
      next.caseInterviews = [...run.caseInterviews, ...pool.map((r, k) => interview(truth, sim, r.id, after, true, `Case interview ${run.caseInterviews.length + k + 1}`))];
      setMsg(pool.length ? `Interviewed ${pool.length} case(s).` : 'No more reported cases to interview yet.');
    }
    if (a.id === 'survey_residents') {
      const rowsS = survey(truth, sim, after, Number(get('n')), get('scope'), run.caseDef, run.surveys.length);
      next.surveys = [...run.surveys, { id: rec.id, scope: get('scope'), n: Number(get('n')), day: after, draw: run.surveys.length, rows: rowsS }];
      setMsg(`Surveyed ${rowsS.length} residents: ${rowsS.filter((r) => r.ill).length} met your case definition.`);
    }
    if (a.id === 'water_sample') { next.results = [...run.results, { id: rec.id, kind: 'water', day, readyDay: ready, data: { ...waterSample(truth, get('hood'), after) } }]; setMsg(`Water sample sent. Results in ${a.resultDelay} days.`); }
    if (a.id === 'inspect') { next.results = [...run.results, { id: rec.id, kind: 'inspect', day, readyDay: ready, data: { ...inspect(truth, get('target') as 'wraps') } }]; setMsg('Inspection complete.'); }
    if (a.id === 'specimens') { next.results = [...run.results, { id: rec.id, kind: 'specimens', day, readyDay: ready, data: { ...specimens(truth, sim) } }]; setMsg('Specimens sent. Results in 2 days.'); }
    if (a.id === 'active_case_finding') { next.found = [...run.found, { hood: get('hood'), day: after }]; setMsg('Your team is calling clinics and households. New cases are added to the line list.'); }
    if (a.id === 'wait') setMsg('A day passes. Cases keep occurring and reports keep arriving.');
    patch(next);
  };
  const can = (a: ActionDef) => run.budget >= a.cost && run.daysUsed + a.days <= run.daysTotal;
  const pins = rows.map((r) => ({ ...pinFor(r.id, r.hood, truth.seed) }));
  const out = run.daysUsed >= run.daysTotal || run.budget <= 0;
  const ready = run.results.filter((r) => run.day >= r.readyDay), pending = run.results.filter((r) => run.day < r.readyDay);

  return (
    <section>
      <div className="invest">
        <div>
          <h2>Investigate</h2>
          <p className="hint">You have limited days and budget. Time keeps passing for the outbreak too.</p>
          {ACTIONS.map((a) => <ActionCard key={a.id} a={a} args={{ ...Object.fromEntries((a.params ?? []).map((p) => [p.key, arg(a.id, p.key, p.options[0].value)])) }} setArg={(k, v) => setArgs({ ...args, [a.id]: { ...(args[a.id] ?? {}), [k]: v } })} can={can(a)} onGo={() => perform(a)} />)}
        </div>
        <div>
          {msg && <div className="fb ok" role="status" style={{ marginBottom: '.8rem' }}>{msg}</div>}
          {out && <div className="fb try" style={{ marginBottom: '.8rem' }}>You are out of {run.daysUsed >= run.daysTotal ? 'investigation days' : 'budget'}. Move on to analyze what you collected.</div>}
          <div className="lab-panel" style={{ marginBottom: '1rem' }}>
            <h3>Spot map: reported cases so far</h3>
            <RivertonMap pins={pins} showLandmarks={false} />
          </div>
          <div className="lab-panel" style={{ marginBottom: '1rem' }}>
            <h3>Investigation board</h3>
            {!run.caseInterviews.length && !run.surveys.length && !run.results.length && <p>Nothing here yet. Interview some cases to see what they share.</p>}
            <div className="cardwall">
              <AnimatePresence>
                {run.caseInterviews.map((c, i) => (
                  <motion.div key={c.label} className="icard" initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ delay: (i % 5) * 0.08, type: 'spring', stiffness: 160, damping: 18 }}>
                    <b>{c.label}</b>: age {c.age}, {hoodName(c.hood)}
                    <ul style={{ margin: '.3rem 0 0 1rem', padding: 0 }}>{(Object.keys(EXPOSURE_LABELS) as Exposure[]).filter((e) => c.exposures[e]).map((e) => <li key={e}>{EXPOSURE_LABELS[e]}</li>)}</ul>
                    {c.clues.map((cl) => <div key={cl} className="clue">{cl}</div>)}
                  </motion.div>))}
                {ready.map((r) => (
                  <motion.div key={r.id} className="icard" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    {r.kind === 'water' && <><b>Water test: {hoodName(String(r.data.hood))}</b><br />{r.data.contaminated ? 'Contamination detected.' : 'No contamination detected.'}</>}
                    {r.kind === 'inspect' && <><b>Inspection: {String(r.data.target)}</b><br />{String(r.data.finding)}</>}
                    {r.kind === 'specimens' && <><b>Lab specimens</b><br />{String(r.data.note)} ({String(r.data.pathogen)})</>}
                  </motion.div>))}
              </AnimatePresence>
              {pending.map((r) => <div key={r.id} className="icard" style={{ opacity: 0.6 }}>Result pending… ready on day {r.readyDay - run.alertDay + 1}</div>)}
            </div>
            {run.surveys.length > 0 && <p style={{ marginTop: '.8rem' }}>Surveys collected: {run.surveys.map((s) => `${s.n} (${s.scope === 'all' ? 'anyone' : s.scope === 'festival' ? 'festival attendees' : hoodName(s.scope)})`).join(', ')}. Use them in the 2×2 table.</p>}
          </div>
          <button className="btn" onClick={() => go('analyze')}>Analyze the data</button>
        </div>
      </div>
    </section>
  );
}
