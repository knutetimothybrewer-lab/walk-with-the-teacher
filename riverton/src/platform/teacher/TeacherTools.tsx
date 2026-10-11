import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Download, Upload, Plug } from 'lucide-react';
import { useTeacher } from './teacherStore';
import { usePreset, encodePreset, decodePreset, defaultPreset, type Preset } from '../preset';
import { SEGMENTS, DEFAULT_ORDER, pace, storyOf, type SegmentId } from '../storyline';
import { useSync, testConnection, flush } from '../sync/sync';
import { useProfiles, type Profile } from '../profile/profileStore';
import { rollup, studentsCsv, conceptsCsv, sheetToProfiles } from './rollup';
import { CONCEPTS, QUESTIONS } from '../content';
import { download } from '../profile/ProfileMenu';
import { MISSIONS } from '../../modules/city/game/missions';

const segTitle = (id: SegmentId) => SEGMENTS.find((s) => s.id === id)!.title;
const dl = (name: string, text: string, type = 'text/csv') => { const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };

export function PresetPanel() {
  const t = useTeacher(); const active = usePreset((s) => s.preset); const setActive = usePreset((s) => s.set); const sync = useSync((s) => s.config);
  const [p, setP] = useState<Preset>(active ?? defaultPreset()); const [withSync, setWithSync] = useState(false); const [msg, setMsg] = useState('');
  const move = (i: number, d: number) => { const o = [...p.order]; const j = i + d; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; setP({ ...p, order: o }); };
  const toggle = (k: 'off' | 'lockedMissions' | 'lockedScenarios', v: string) => setP({ ...p, [k]: (p[k] as string[]).includes(v) ? (p[k] as string[]).filter((x) => x !== v) : [...(p[k] as string[]), v] } as Preset);
  const built = (): Preset => ({ ...p, settings: { foundationsRequired: t.foundationsRequired, interruptCap: t.interruptCap, timeTargetMin: t.timeTargetMin, timedChoices: t.timedChoices, reteachStrictness: t.reteachStrictness, lab: t.lab }, sync: withSync && sync ? sync : undefined });
  const link = () => `${location.origin}${location.pathname}#/join/${encodePreset(built())}`;
  return (
    <section className="panel"><h2>Assignment preset</h2>
      <p className="note">Choose what is active for this lesson. Students load the preset from a link or a file so the whole class starts in the same place.</p>
      <label className="field">Name<input type="text" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></label>
      <h4>Chapters (order and on/off)</h4>
      {p.order.map((id, i) => <div key={id} className="toggle"><span>{i + 1}. {segTitle(id)}</span><span><button className="btn ghost sm" aria-label="Move up" onClick={() => move(i, -1)}><ArrowUp size={14} /></button><button className="btn ghost sm" aria-label="Move down" onClick={() => move(i, 1)}><ArrowDown size={14} /></button> <label><input type="checkbox" checked={!p.off.includes(id)} onChange={() => toggle('off', id)} /> active</label></span></div>)}
      <h4>Lock</h4>
      <div className="chipset">{MISSIONS.map((m) => <label key={m.id} className="toggle"><span>City: {m.title}</span><input type="checkbox" checked={p.lockedMissions.includes(m.id)} onChange={() => toggle('lockedMissions', m.id)} /></label>)}{['town-hall', 'rumor-mill'].map((s) => <label key={s} className="toggle"><span>Crossroads: {s === 'town-hall' ? 'Town Hall' : 'Rumor Mill'}</span><input type="checkbox" checked={p.lockedScenarios.includes(s)} onChange={() => toggle('lockedScenarios', s)} /></label>)}</div>
      <label className="toggle"><span>Include the Sheets connection in the preset (the link then carries your class code)</span><input type="checkbox" disabled={!sync} checked={withSync} onChange={(e) => setWithSync(e.target.checked)} /></label>
      <p><button className="btn" onClick={() => { setActive(built()); setMsg('Applied on this device.'); }}>Apply here</button> <button className="btn ghost" onClick={async () => { await navigator.clipboard?.writeText(link()).catch(() => {}); setMsg('Link copied. Share it with your class.'); }}><Copy size={14} /> Copy student link</button> <button className="btn ghost" onClick={() => download(`riverton-${p.name.replace(/\W+/g, '_')}.json`, built())}><Download size={14} /> Download file</button>
        <label className="btn ghost"><Upload size={14} /> Load file<input type="file" accept=".json,application/json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const x = decodePreset(await f.text()); if (x) { setP(x); setMsg('Loaded.'); } else setMsg('That is not a Riverton preset.'); e.target.value = ''; }} /></label></p>
      {msg && <p role="status">{msg}</p>}{active && <p className="note">Active preset on this device: <b>{active.name}</b>. <button className="btn ghost sm" onClick={() => { setActive(null); setP(defaultPreset()); }}>Clear</button></p>}
    </section>
  );
}

export function SyncPanel() {
  const cfg = useSync((s) => s.config); const setConfig = useSync((s) => s.setConfig); const status = useSync(); const [url, setUrl] = useState(cfg?.url ?? ''); const [code, setCode] = useState(cfg?.code ?? ''); const [msg, setMsg] = useState('');
  return (
    <section className="panel"><h2>Class sync (Google Sheets)</h2>
      <p className="note">Optional. Use your school Google account. Students are identified by name and period only. Check district policy first. See <code>google-apps-script/SETUP.md</code>.</p>
      <label className="field">Web app URL<input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" /></label>
      <label className="field">Class code<input type="text" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" /></label>
      <p><button className="btn" disabled={!url || !code} onClick={() => { setConfig({ url, code }); setMsg('Saved on this device.'); }}>Save</button> <button className="btn ghost" disabled={!url || !code} onClick={async () => { const r = await testConnection({ url, code }); setMsg(r.message); }}><Plug size={14} /> Send test</button> <button className="btn ghost" disabled={!cfg} onClick={async () => { await flush(); setMsg('Tried to send the queue.'); }}>Send now</button> {cfg && <button className="btn ghost" onClick={() => { setConfig(null); setMsg('Sync turned off.'); }}>Turn off</button>}</p>
      {msg && <p role="status">{msg}</p>}{cfg && <p className="note">Status: {status.status}. Waiting to send: {status.queue.length}.{status.lastError ? ` Last error: ${status.lastError}.` : ''}</p>}
    </section>
  );
}

export function PacingPanel() {
  const t = useTeacher(); const profiles = Object.values(useProfiles((s) => s.profiles)); const order = usePreset((s) => s.preset?.order ?? DEFAULT_ORDER);
  return (
    <section className="panel"><h2>Pacing (teachers only)</h2>
      <p className="note">Students never see a countdown. When a student falls behind, remaining full lessons switch to short versions; required checks and written responses are never skipped.</p>
      <label className="field">Time target (minutes)<select value={t.timeTargetMin} onChange={(e) => t.patch({ timeTargetMin: Number(e.target.value) })}>{[60, 90, 120, 150].map((m) => <option key={m}>{m}</option>)}</select></label>
      <label className="field">Pacing strictness<select value={t.pacing} onChange={(e) => t.patch({ pacing: e.target.value as 'off' | 'gentle' | 'strict' })}><option value="off">Off</option><option value="gentle">Gentle</option><option value="strict">Strict</option></select></label>
      {profiles.length === 0 ? <p>No students on this device yet.</p> : <table className="tbl"><thead><tr><th>Student</th><th>Chapter</th><th>Minutes</th><th>Pace</th></tr></thead><tbody>{profiles.map((p) => { const pc = pace(p, order, t.timeTargetMin); const cur = storyOf(p, order).find((i) => i.current); return <tr key={p.id}><td>{p.name}</td><td>{cur?.seg.title ?? 'Finished'}</td><td>{Math.round(pc.spent)}</td><td>{pc.behind ? 'Behind' : pc.ahead > 8 ? 'Ahead' : 'On pace'}</td></tr>; })}</tbody></table>}
    </section>
  );
}

export function RollUpPanel() {
  const cfg = useSync((s) => s.config); const [profiles, setProfiles] = useState<Profile[]>([]); const [msg, setMsg] = useState('');
  const r = useMemo(() => (profiles.length ? rollup(profiles, CONCEPTS as never, QUESTIONS) : null), [profiles]);
  const addFiles = async (files: FileList) => { const got: Profile[] = []; for (const f of Array.from(files)) { try { const b = JSON.parse(await f.text()); if (b?.app === 'riverton' && b.profile) got.push(b.profile as Profile); } catch { /* skip */ } } setProfiles((cur) => { const m = new Map(cur.map((x) => [x.id, x])); got.forEach((x) => m.set(x.id, x)); return [...m.values()]; }); setMsg(`${got.length} file(s) read.`); };
  return (
    <section className="panel wide"><h2>Class roll-up</h2>
      <p className="note">Drag in several student export files, or load from the class Sheet. Nothing is uploaded anywhere.</p>
      <p><label className="btn ghost"><Upload size={14} /> Add student files<input type="file" multiple accept=".json,application/json" hidden onChange={(e) => e.target.files && addFiles(e.target.files)} /></label> <button className="btn ghost" disabled={!cfg} onClick={async () => { try { const d = await (await fetch(`${cfg!.url}?code=${encodeURIComponent(cfg!.code)}&action=rollup`)).json(); if (!d.ok) throw new Error(d.error); setProfiles(sheetToProfiles(d)); setMsg('Loaded from the Sheet.'); } catch (e) { setMsg('Could not load from the Sheet: ' + (e instanceof Error ? e.message : 'error')); } }}>Load from Sheet</button> {profiles.length > 0 && <button className="btn ghost" onClick={() => setProfiles([])}>Clear</button>}</p>
      {msg && <p role="status">{msg}</p>}
      <div
        className="drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void addFiles(e.dataTransfer.files); }}>Drop student .json files here</div>
      {r && (<>
        <p><b>{r.students}</b> students. <button className="btn ghost sm" onClick={() => dl('riverton-students.csv', studentsCsv(profiles, CONCEPTS as never))}>Students CSV</button> <button className="btn ghost sm" onClick={() => dl('riverton-concepts.csv', conceptsCsv(r))}>Concepts CSV</button></p>
        <h4>Chapters finished</h4><div className="chipset">{SEGMENTS.map((s) => <span key={s.id} className="chip">{s.title}: {r.completion[s.id]}/{r.students}</span>)}</div>
        <h4>Mastery by concept</h4><table className="tbl small"><thead><tr><th>Concept</th><th>Not met</th><th>Introduced</th><th>Practiced</th><th>Mastered</th></tr></thead><tbody>{r.concepts.filter((c) => c.introduced + c.practiced + c.mastered > 0).map((c) => <tr key={c.id}><td>{c.label}</td><td>{c.none}</td><td>{c.introduced}</td><td>{c.practiced}</td><td>{c.mastered}</td></tr>)}</tbody></table>
        <h4>Most-missed questions</h4>{r.missed.length ? <ol>{r.missed.map((m) => <li key={m.qid}>{m.prompt} <small>({Math.round(m.rate * 100)}% missed of {m.attempts}){m.distractors[0] ? `; most chosen wrong answer: “${m.distractors[0].text}”` : ''}</small></li>)}</ol> : <p>None yet.</p>}
        {r.misconceptions.length > 0 && <><h4>Common misconceptions</h4><div className="chipset">{r.misconceptions.map((m) => <span key={m.id} className="chip">{m.id}: {m.count}</span>)}</div></>}
        <h4>Crossroads reasoning rubric (students scoring 0 / 1 / 2)</h4>{r.rubric.length ? <table className="tbl small"><tbody>{r.rubric.map((x) => <tr key={x.id}><td>{x.id}</td><td>{x.zero}</td><td>{x.one}</td><td>{x.two}</td></tr>)}</tbody></table> : <p>None yet.</p>}
        <h4>Sim Lab design choices</h4>{r.lab.n ? <p>{r.lab.n} investigations. Hypothesis correct: {Math.round(r.lab.hypothesisRightPct)}%. Targeted the true source: {Math.round(r.lab.targetedPct)}%. Surveyed a comparison group: {Math.round(r.lab.surveyedPct)}%. Average days {r.lab.avgDays.toFixed(1)}, budget {r.lab.avgBudget.toFixed(0)}. Interventions: {Object.entries(r.lab.interventions).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}.</p> : <p>None yet.</p>}
        <h4>City: Close the Gap</h4>{r.city.n ? <p>{r.city.n} plans; goal met by {Math.round(r.city.wonPct)}%. Average reduction {r.city.avgReduced.toFixed(1)} years; average displacement {r.city.avgDisplaced.toFixed(1)}%. Most-built: {Object.entries(r.city.built).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} ${v}`).join(', ')}.</p> : <p>None yet.</p>}
      </>)}
    </section>
  );
}
