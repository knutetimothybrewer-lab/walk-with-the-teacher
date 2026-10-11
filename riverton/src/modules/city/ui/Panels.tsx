import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { HelpCircle, Trash2 } from 'lucide-react';
import world from '../../../content/shared/riverton-world.json';
import { explainChange, INTERVENTIONS, POLICIES, preview, type CityState, type Out } from '../sim';
import { useGame } from '../game/store';
import { DET, BEH, OUTL, better, fmt, unitOf, SHORT } from './labels';
import { storyFor } from '../game/stories';
import { Character } from '../../../platform/art/Character';
import { CAST } from '../../../platform/art/characters';
import { Modal } from '../../../platform/ui/Modal';

const hoodDef = (id: string) => world.neighborhoods.find((h) => h.id === id)!;
const OUTS: Out[] = ['lifeExpectancy', 'obesity', 'diabetes', 'hypertension', 'asthma', 'waterborne', 'leadElevated', 'infantMortality', 'preventableER', 'vaccination', 'uninsured', 'mentalDays'];

function Spark({ city, hood, out }: { city: CityState; hood: string; out: Out }) {
  const pts = city.history.filter((_, i) => i % 3 === 0 || i === city.history.length - 1).map((s) => s.hoods[hood].out[out]); if (pts.length < 2) return <span className="spark" />;
  const mn = Math.min(...pts), mx = Math.max(...pts), span = mx - mn || 1;
  return <svg className="spark" viewBox="0 0 60 18" aria-hidden><polyline fill="none" stroke="var(--city-a)" strokeWidth="1.6" points={pts.map((p, i) => `${(i / (pts.length - 1)) * 58 + 1},${16 - ((p - mn) / span) * 14}`).join(' ')} /></svg>;
}

export function NeighborhoodPanel() {
  const { city, hood, openWhy, v } = useGame(); const [story, setStory] = useState<ReturnType<typeof storyFor> | null>(null);
  void v; if (!hood) return <div className="panel"><h3>Neighborhoods</h3><p>Click a neighborhood on the map to see its profile, outcomes, and trends.</p></div>;
  const h = city.hoods[hood], d = hoodDef(hood), b = city.base[hood];
  return (
    <div className="panel np">
      <h3 style={{ borderLeft: `8px solid var(${d.color})`, paddingLeft: 8 }}>{d.name}</h3>
      <p className="note">{d.archetype}. Population (model sample) {h.pop.toLocaleString()}. Median income ${h.income.toLocaleString()}. {h.displacedPct >= 0.5 ? `About ${h.displacedPct.toFixed(1)}% of longtime residents have moved away.` : ''}</p>
      <table className="tbl small"><thead><tr><th>Outcome</th><th>Now</th><th>Change</th><th></th><th></th></tr></thead>
        <tbody>{OUTS.map((o) => { const now = h.out[o], d0 = now - b.out[o]; const good = d0 * better(o) > 0.005; const bad = d0 * better(o) < -0.005; return (
          <tr key={o}><td>{OUTL[o]}</td><td>{fmt(now)} <small>{unitOf(o)}</small></td><td className={good ? 'good' : bad ? 'bad' : ''}>{Math.abs(d0) < 0.005 ? '●' : d0 * better(o) > 0 ? '▲' : '▼'} {fmt(Math.abs(d0))}</td><td><Spark city={city} hood={hood} out={o} /></td>
            <td><button className="btn ghost xs" aria-label={`Why did ${OUTL[o]} change?`} onClick={() => openWhy({ hood, out: o })}><HelpCircle size={14} /></button></td></tr>); })}</tbody></table>
      <h4>Conditions that shape health</h4>
      {Object.entries(DET).map(([k, [n, desc]]) => <div key={k} className="detrow" title={desc}><span>{n}</span><div className="gauge"><i style={{ width: `${h.det[k as 'food']}%` }} /></div><b>{Math.round(h.det[k as 'food'])}</b></div>)}
      <p><button className="btn ghost" onClick={() => setStory(storyFor(city, hood, Math.floor(Math.random() * 5)))}>Meet a resident</button></p>
      {story && <ResidentCard story={story} onClose={() => setStory(null)} />}
    </div>
  );
}
export function ResidentCard({ story, onClose }: { story: ReturnType<typeof storyFor>; onClose: () => void }) {
  const spec = CAST.find((c) => c.id === story.id) ?? CAST[CAST.length - 1];
  return <Modal open onClose={onClose} title={story.name}><div className="convo" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}><Character spec={spec} expression="neutral" size={170} bob /><div><p className="note">{story.role}, {hoodDef(story.hood).name}</p><p style={{ fontSize: '1.1rem' }}>“{story.text}”</p></div></div></Modal>;
}

export function BuildingPanel() {
  const { city, building, remove, v } = useGame(); const [sl, setSl] = useState(false); void v; void sl;
  const p = city.placed.find((x) => x.uid === building); if (!p) return null; const def = INTERVENTIONS[p.type];
  const prev = p.at ? preview(city, p.type, p.at, p.hood) : null;
  return (
    <div className="panel"><h3>{def.name}</h3><p>{def.mechanism}</p>
      <p><span className="chip">{def.upstream}</span> <span className="chip">{def.prevention} prevention</span> <span className="chip">{p.status}</span></p>
      <p className="note">Cost ${p.capital}M to build, ${(def.opCost * (p.scale ?? 1)).toFixed(2)}M per year to run. {prev ? `Reaches about ${prev.peopleReached.toLocaleString()} people.` : ''}</p>
      {def.defaultOpts && 'sliding' in def.defaultOpts && <p className="note">Membership: {p.opts.sliding ? 'sliding scale (affordable)' : 'standard fees'}</p>}
      <button className="btn ghost" onClick={() => remove(p.uid)}><Trash2 size={14} /> Demolish</button></div>
  );
}

const ARROW = <span aria-hidden className="arr">→</span>;
export function WhyModal() {
  const { why, openWhy, city } = useGame(); const [span, setSpan] = useState<'all' | 'recent'>('all');
  const ex = useMemo(() => { if (!why || city.month < 1) return null; const m0 = span === 'all' ? 0 : Math.max(0, city.month - 24); try { return explainChange(city, why.hood, why.out as Out, m0, city.month); } catch { return null; } }, [why, city, span, city.month]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!why) return null;
  const o = why.out; const name = (k: string, kind: string) => (kind === 'det' ? DET[k]?.[0] : kind === 'beh' ? BEH[k]?.[0] : OUTL[k]) ?? k;
  return (
    <Modal open onClose={() => openWhy(null)} title={`Why did ${OUTL[o]} change in ${hoodDef(why.hood).name}?`}>
      <div className="chipset"><button className={`tog ${span === 'all' ? 'on' : ''}`} onClick={() => setSpan('all')}>Since the start</button><button className={`tog ${span === 'recent' ? 'on' : ''}`} onClick={() => setSpan('recent')}>Last 2 years</button></div>
      {!ex ? <p>Let some time pass, then ask again.</p> : Math.abs(ex.delta) < 0.005 ? <p>Nothing has changed yet in this neighborhood. Interventions take months to open and years to show up in health outcomes.</p> : (
        <>
          <p>{OUTL[o]} moved from <b>{fmt(ex.from)}</b> to <b>{fmt(ex.to)}</b> {unitOf(o)} ({ex.delta > 0 ? '+' : ''}{fmt(ex.delta)}). Here is the chain of cause and effect, biggest causes first.</p>
          {ex.chains.slice(0, 4).map((c, i) => (
            <motion.div key={i} className="chain" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }}>
              <span className="node src">{c.label}</span>
              {c.steps.filter((s) => s.kind !== 'out').map((s) => <span key={s.kind + s.key}>{ARROW}<span className={`node ${s.kind}`}>{name(s.key, s.kind)} <small>{s.delta >= 0 ? '+' : ''}{s.delta.toFixed(1)}</small></span></span>)}
              {ARROW}<span className="node out">{OUTL[o]} <small>{c.share >= 0 ? '+' : ''}{c.share.toFixed(2)} {unitOf(o)}</small></span>
            </motion.div>))}
          <p className="note">Interventions change <b>conditions</b> (like food access). Conditions change <b>behaviors and exposures</b> (like diet). Those change <b>outcomes</b> (like diabetes), usually slowly.</p>
        </>)}
    </Modal>
  );
}

export function ChartsPanel() {
  const { city, hood, v } = useGame(); const [out, setOut] = useState<Out>('lifeExpectancy'); void v;
  const focus = hood ?? 'eastside'; const ids = [...new Set(['hillcrest', 'eastside', focus])];
  const data = city.history.filter((_, i) => i % 3 === 0 || i === city.history.length - 1).map((s) => { const row: Record<string, number> = { year: +(s.m / 12).toFixed(2) }; ids.forEach((id) => (row[id] = +s.hoods[id].out[out].toFixed(2))); return row; });
  const bars = world.neighborhoods.map((h) => ({ name: h.name, value: +city.hoods[h.id].out[out].toFixed(1) }));
  const colors: Record<string, string> = { hillcrest: '#0072b2', eastside: '#d55e00', millworks: '#7a6a58', pinewood: '#009e73', oldtown: '#cc79a7', riverside: '#56b4e9', westbrook: '#e6b800', southfield: '#6f4fb8' };
  return (
    <div className="panel"><h3>Trends</h3>
      <label className="field">Outcome<select value={out} onChange={(e) => setOut(e.target.value as Out)}>{OUTS.map((o) => <option key={o} value={o}>{OUTL[o]}</option>)}</select></label>
      <div style={{ height: 190 }}><ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#8884" /><XAxis dataKey="year" /><YAxis domain={['auto', 'auto']} /><Tooltip /><Legend />{ids.map((id) => <Line key={id} dataKey={id} name={hoodDef(id).name} stroke={colors[id]} dot={false} strokeWidth={2} isAnimationActive={false} />)}</LineChart></ResponsiveContainer></div>
      <h4>Neighborhoods side by side ({unitOf(out)})</h4>
      <div style={{ height: 190 }}><ResponsiveContainer><BarChart data={bars}><CartesianGrid strokeDasharray="3 3" stroke="#8884" /><XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} /><YAxis domain={['auto', 'auto']} /><Tooltip /><Bar dataKey="value" fill="#2f8fd8" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
    </div>
  );
}

export function Gauge({ gap, start }: { gap: number; start: number }) {
  const frac = Math.max(0, Math.min(1, gap / Math.max(start, 12.4))); const a = Math.PI * (1 - frac); const x = 50 + 40 * Math.cos(a), y = 50 - 40 * Math.sin(a);
  return <svg viewBox="0 0 100 58" className="gauge-svg" role="img" aria-label={`Health equity gap ${gap.toFixed(1)} years`}><path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="var(--surface-2)" strokeWidth="9" /><path d={`M10 50 A40 40 0 0 1 ${x} ${y}`} fill="none" stroke="var(--worse)" strokeWidth="9" strokeLinecap="round" /><text x="50" y="48" textAnchor="middle" fontFamily="var(--font-display)" fontSize="16" fill="currentColor">{gap.toFixed(1)}</text><text x="50" y="57" textAnchor="middle" fontSize="6" fill="currentColor">years gap</text></svg>;
}
export { POLICIES, SHORT };
