import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { decodePreset, usePreset, type Preset } from '../preset';
import { useTeacher } from './teacherStore';
import { useSync } from '../sync/sync';
import { segment } from '../storyline';

/** Students open a link or load a file, and everyone starts in the same place. */
export default function Join() {
  const { data = '' } = useParams(); return <JoinInner key={data} data={data} />;
}

function JoinInner({ data }: { data: string }) {
  const nav = useNavigate(); const setPreset = usePreset((s) => s.set); const patch = useTeacher((s) => s.patch); const setSync = useSync((s) => s.setConfig);
  const [pre, setPre] = useState<Preset | null>(() => decodePreset(decodeURIComponent(data))); const [applied, setApplied] = useState(false);
  const apply = (p: Preset) => { setPreset(p); const st = p.settings; patch({ ...(st.foundationsRequired != null ? { foundationsRequired: st.foundationsRequired } : {}), ...(st.interruptCap != null ? { interruptCap: st.interruptCap } : {}), ...(st.timeTargetMin != null ? { timeTargetMin: st.timeTargetMin } : {}), ...(st.timedChoices != null ? { timedChoices: st.timedChoices } : {}), ...(st.reteachStrictness ? { reteachStrictness: st.reteachStrictness } : {}), ...(st.lab ? { lab: st.lab as never } : {}) }); if (p.sync) setSync(p.sync); setApplied(true); };
  return (
    <main className="page"><div className="panel" style={{ maxWidth: 560 }}>
      <h1>Join your class</h1>
      {!pre ? <><p>This link or file is not a Riverton assignment. Ask your teacher for a new one.</p><label className="btn ghost">Load an assignment file<input type="file" accept=".json,application/json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPre(decodePreset(await f.text())); }} /></label></>
        : <><p>Assignment: <b>{pre.name}</b></p><ol>{pre.order.map((id) => <li key={id} style={{ opacity: pre.off.includes(id) ? 0.45 : 1 }}>{segment(id).title}{pre.off.includes(id) ? ' (not assigned)' : ''}</li>)}</ol>
          {pre.sync && <p className="note">Your teacher turned on class sync. Your name, period, answers, and written work will be saved to your teacher’s class sheet.</p>}
          {applied ? <p><Link className="btn" to="/" onClick={() => nav('/')}>Go to Riverton</Link></p> : <button className="btn" onClick={() => apply(pre)}>Start this assignment</button>}</>}
    </div></main>
  );
}
