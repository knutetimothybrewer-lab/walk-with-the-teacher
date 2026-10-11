import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, FastForward, ChevronsRight, ZoomIn, ZoomOut, Maximize2, Camera, Undo2, Wallet } from 'lucide-react';
import { INTERVENTIONS, POLICIES, equityGap, preview } from '../sim';
import { useGame } from '../game/store';
import { evaluate } from '../game/missions';
import { nameOf } from '../game/poe';
import Surface from './Surface';
import type { CityScene } from '../render/CityScene';
import { BuildingPanel, ChartsPanel, Gauge, NeighborhoodPanel, ResidentCard, WhyModal } from './Panels';
import { PoeModals } from './Poe';
import { EndPanel } from './EndPanel';
import { OVERLAYS, fmt, monthName, season } from './labels';
import { storyFor } from '../game/stories';
import world from '../../../content/shared/riverton-world.json';

const GROUPS: [string, string[]][] = [['Healthcare', ['clinic', 'mobile_van', 'school_clinic', 'mental_health', 'hospital']], ['Food', ['supermarket', 'farmers_market', 'corner_store']], ['Environment', ['water_upgrade', 'lead_replacement', 'factory_controls', 'tree_buffer']], ['Active living', ['park', 'ymca', 'sidewalks', 'bus_route']], ['Community programs', ['chw_outreach', 'nutrition_ed', 'insurance_drive']], ['Housing', ['affordable_housing', 'mixed_income_redevelopment']]];
const TUT = [{ k: 'hood', t: 'Click a neighborhood on the map to see its profile.' }, { k: 'overlay', t: 'Change the map overlay (try “Preventable ER visits”).' }, { k: 'clinic', t: 'Place a community clinic in Eastside, then answer the prediction.' }, { k: 'advance', t: 'Advance time by one year with the “+1 year” button.' }, { k: 'why', t: 'Click the “?” beside an outcome to see why it changed.' }];

export default function GameView() {
  const g = useGame(); const { city, mission, pending, palette, startGap } = g; const [scene, setScene] = useState<CityScene | null>(null);
  const [tab, setTab] = useState<'hood' | 'charts' | 'snaps'>('hood'); const [ghost, setGhost] = useState<{ x: number; y: number; r: number } | null>(null);
  const [story, setStory] = useState<ReturnType<typeof storyFor> | null>(null); const [info, setInfo] = useState<string | null>(null); const [snapName, setSnapName] = useState(''); const [cmp, setCmp] = useState<[string, string]>(['', '']);

  useEffect(() => { const ms = g.until != null ? 80 : g.speed === 1 ? 600 : g.speed === 2 ? 300 : g.speed === 5 ? 120 : 0; if (!ms) return; const id = setInterval(() => useGame.getState().tick(), ms); return () => clearInterval(id); }, [g.speed, g.until]);
  useEffect(() => { if (city.month >= 12) g.markCheck('advance'); }, [city.month]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!palette) setGhost(null); }, [palette]);
  const def = palette ? INTERVENTIONS[palette] : null;

  const handlers = useMemo(() => ({
    onHood: (h: string) => { const s = useGame.getState(); if (s.palette) { const d = INTERVENTIONS[s.palette]; if (d && d.scope === 'hood') s.stage({ type: s.palette, kind: 'program', hood: h, sliding: false }); return; } s.selectHood(h); setTab('hood'); },
    onMap: (x: number, y: number, h: string) => { const s = useGame.getState(); if (s.palette) { const d = INTERVENTIONS[s.palette]; if (d && d.scope === 'point') s.stage({ type: s.palette, kind: 'building', at: [x, y], hood: h, sliding: false }); } },
    onMove: (x: number, y: number) => { const s = useGame.getState(); const d = s.palette ? INTERVENTIONS[s.palette] : null; if (d && d.scope === 'point' && !s.pending) setGhost({ x, y, r: d.radiusMiles * 200 * 1.3 }); },
    onBuilding: (u: string) => { useGame.getState().selectBuilding(u); setTab('hood'); },
    onAgent: (h: string, n: number) => setStory(storyFor(useGame.getState().city, h, n)),
  }), []);

  const pv = pending && pending.kind !== 'policy' ? (() => { const d = INTERVENTIONS[pending.type]; const at = pending.at ?? (pending.hood ? (world.neighborhoods.find((h) => h.id === pending.hood)!.label as [number, number]) : [500, 300] as [number, number]); return { p: preview(city, pending.type, at, pending.hood), d }; })() : null;
  const gap = equityGap(city); const east = city.hoods.eastside.out.lifeExpectancy; const bestLE = Math.max(...Object.values(city.hoods).map((h) => h.out.lifeExpectancy));
  const status = mission ? evaluate(mission, city, startGap) : null;
  const next = (n: 'hood' | 'charts' | 'snaps') => setTab(n);
  const sel = OVERLAYS.find((o) => o.id === (g.overlay ? `${g.overlay.kind}:${g.overlay.key}` : '')) ?? null; void sel;
  if (!mission) return null;

  return (
    <div className="city-game">
      <div className="hud">
        <b className="title">{mission.title}</b>
        <span className="chip">Year {Math.min(mission.years, Math.floor(city.month / 12) + 1)} · {monthName(city.month)} · {season(city.month)}</span>
        <span className="chip" title="Budget"><Wallet size={14} /> ${fmt(city.cash)}M</span>
        <span className="grow" />
        <div className="chipset" role="group" aria-label="Time controls">
          <button className="btn ghost sm" aria-label="Pause" onClick={() => g.setSpeed(0)}><Pause size={16} /></button>
          <button className={`btn sm ${g.speed === 1 ? '' : 'ghost'}`} aria-label="Play" onClick={() => g.setSpeed(1)}><Play size={16} /></button>
          <button className={`btn sm ${g.speed === 2 ? '' : 'ghost'}`} aria-label="Play 2 times speed" onClick={() => g.setSpeed(2)}><FastForward size={16} /> 2×</button>
          <button className={`btn sm ${g.speed === 5 ? '' : 'ghost'}`} aria-label="Play 5 times speed" onClick={() => g.setSpeed(5)}><ChevronsRight size={16} /> 5×</button>
          <button className="btn ghost sm" onClick={() => g.advanceYears(1)}>+1 year</button>
          <button className="btn ghost sm" onClick={() => g.advanceYears(5)}>+5 years</button>
        </div>
        <select aria-label="Map overlay" value={g.overlay ? `${g.overlay.kind}:${g.overlay.key}` : ''} onChange={(e) => { const o = OVERLAYS.find((x) => x.id === e.target.value); g.setOverlay(o ? { kind: o.kind, key: o.key, better: o.better } : null); }}>
          <option value="">Map: neighborhood colors</option>{OVERLAYS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
        <div className="chipset"><button className="btn ghost sm" aria-label="Zoom in" onClick={() => scene?.zoomBy(1.3)}><ZoomIn size={16} /></button><button className="btn ghost sm" aria-label="Zoom out" onClick={() => scene?.zoomBy(1 / 1.3)}><ZoomOut size={16} /></button><button className="btn ghost sm" aria-label="Reset view" onClick={() => scene?.resetView()}><Maximize2 size={16} /></button></div>
      </div>

      <div className="layout">
        <aside className="palette panel">
          <h3>Build</h3>
          {GROUPS.map(([gname, ids]) => <details key={gname} open={gname === 'Healthcare' || gname === 'Food'}><summary>{gname}</summary>{ids.map((id) => { const d = INTERVENTIONS[id]; return <button key={id} className={`pal ${palette === id ? 'on' : ''}`} onClick={() => { g.setPalette(palette === id ? null : id); setInfo(palette === id ? null : id); if (d.scope === 'city') g.stage({ type: id, kind: 'city', sliding: false }); }} title={d.mechanism}><span>{d.name}</span><small>${d.cost}M · ${d.opCost}M/yr</small></button>; })}</details>)}
          <details><summary>Policies</summary>{Object.entries(POLICIES).map(([id, p]) => { const on = city.policies[id] != null; return <button key={id} className={`pal ${on ? 'done' : ''}`} disabled={on} onClick={() => { g.setPalette(id); setInfo(id); g.stage({ type: id, kind: 'policy', sliding: false }); }} title={p.mechanism}><span>{p.name}</span><small>{on ? 'In effect' : `$${p.opCost}M/yr`}</small></button>; })}</details>
          {info && <div className="datacard"><b>{nameOf(info)}</b><br />{INTERVENTIONS[info]?.mechanism ?? POLICIES[info]?.mechanism}{def?.scope === 'point' && <p className="note">Click the map to choose a spot.</p>}{def?.scope === 'hood' && <p className="note">Click a neighborhood.</p>}</div>}
        </aside>

        <section className="center">
          <div className="map-wrap">
            <Surface city={city} v={g.v} overlay={g.overlay} selected={g.hood} ghost={ghost} placing={!!palette} handlers={handlers} onScene={setScene} />
            {pending && (
              <div className="confirm panel" role="dialog" aria-label="Confirm purchase">
                <b>{nameOf(pending.type)}{pending.hood ? ` in ${world.neighborhoods.find((h) => h.id === pending.hood)!.name}` : ''}</b>
                {pv && <span>Reaches about <b>{pv.p.peopleReached.toLocaleString()}</b> people · costs <b>${pv.p.cost}M</b> + ${pv.d.opCost}M/yr</span>}
                {pending.kind === 'policy' && <span>Costs ${POLICIES[pending.type].opCost}M/yr. Takes effect over about a year.</span>}
                {pv && pv.d.defaultOpts && 'sliding' in pv.d.defaultOpts && <label className="toggle"><span>Sliding-scale membership</span><input type="checkbox" checked={pending.sliding} onChange={(e) => g.stage({ ...pending, sliding: e.target.checked })} /></label>}
                <span><button className="btn" onClick={() => g.confirm()}>Build it</button> <button className="btn ghost" onClick={() => { g.stage(null); g.setPalette(null); }}>Cancel</button></span>
              </div>)}
            {g.message && <div className="toast" role="status" onClick={() => useGame.setState({ message: '' })}>{g.message}</div>}
          </div>
          <div className="legend note">{g.overlay ? 'Blue = better than the city average, orange = worse. Arrows and numbers show the same thing.' : 'Zoom in (scroll or the + button) to see residents. Click one to hear their story.'} <span className="chip">Map speed: {scene ? Math.round(scene.fps) : '—'} fps</span></div>
        </section>

        <aside className="side">
          {mission.id === 'tutorial' && <div className="panel"><h3>Your first steps</h3><ol className="check">{TUT.map((s) => <li key={s.k} className={g.checklist.includes(s.k) ? 'done' : ''}>{s.t}</li>)}</ol>{TUT.every((s) => g.checklist.includes(s.k)) && <p className="good">Great: you have done everything. Let time run to year 3 to finish.</p>}</div>}
          {mission.id === 'close-the-gap' && status && <div className="panel"><h3>Goal</h3><p>Narrow the gap between the best neighborhood and Eastside by <b>{mission.target} years</b> within {mission.years} years.</p><div className="gauge"><i style={{ width: `${Math.max(0, Math.min(100, (status.reduced / (mission.target ?? 1)) * 100))}%` }} /></div><p className="note">Gap now {status.gapNow.toFixed(2)} years (started at {startGap.toFixed(2)}). Eastside {fmt(east)} vs. best {fmt(bestLE)}. Year {Math.min(mission.years, Math.floor(city.month / 12) + 1)} of {mission.years}.</p></div>}
          <div className="panel eq"><Gauge gap={gap.gap} start={startGap || 12.4} /><p className="note">Health Equity Gap: life expectancy in the best-off neighborhood minus the worst-off.</p></div>
          <div className="chipset tabs"><button className={`tog ${tab === 'hood' ? 'on' : ''}`} onClick={() => next('hood')}>Neighborhood</button><button className={`tog ${tab === 'charts' ? 'on' : ''}`} onClick={() => next('charts')}>Trends</button><button className={`tog ${tab === 'snaps' ? 'on' : ''}`} onClick={() => next('snaps')}>Snapshots</button></div>
          {tab === 'hood' && <><BuildingPanel /><NeighborhoodPanel /></>}
          {tab === 'charts' && <ChartsPanel />}
          {tab === 'snaps' && (
            <div className="panel"><h3>Snapshots</h3><p className="note">Save your city at any moment, then compare two snapshots or revise your plan and run it again.</p>
              <div style={{ display: 'flex', gap: '.4rem' }}><input type="text" placeholder="Name (e.g. Plan A)" value={snapName} onChange={(e) => setSnapName(e.target.value)} /><button className="btn" onClick={() => { g.takeSnap(snapName || `Snapshot ${g.snaps.length + 1}`); setSnapName(''); }}><Camera size={14} /> Save</button></div>
              {g.snaps.map((s) => <div key={s.id} className="snap"><b>{s.name}</b> <small>year {(s.month / 12).toFixed(1)}, gap {s.gap.toFixed(2)}</small> <button className="btn ghost xs" onClick={() => g.restore(s.id)}>Restore</button></div>)}
              <p><button className="btn ghost" onClick={() => g.revise()}><Undo2 size={14} /> Revise my plan (back to year 1)</button></p>
              {g.snaps.length >= 2 && <><h4>Compare</h4><div className="chipset"><select aria-label="First snapshot" value={cmp[0]} onChange={(e) => setCmp([e.target.value, cmp[1]])}><option value="">First…</option>{g.snaps.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><select aria-label="Second snapshot" value={cmp[1]} onChange={(e) => setCmp([cmp[0], e.target.value])}><option value="">Second…</option>{g.snaps.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                {(() => { const a = g.snaps.find((s) => s.id === cmp[0]), b = g.snaps.find((s) => s.id === cmp[1]); if (!a || !b) return null; const rows = ['lifeExpectancy', 'preventableER', 'asthma', 'obesity', 'diabetes', 'uninsured', 'leadElevated'].map((o) => ({ o, a: a.hoods.eastside.out[o], b: b.hoods.eastside.out[o] })); return (<table className="tbl small"><thead><tr><th>Eastside</th><th>{a.name}</th><th>{b.name}</th><th>Diff</th></tr></thead><tbody><tr><td>Health equity gap</td><td>{a.gap.toFixed(2)}</td><td>{b.gap.toFixed(2)}</td><td>{(b.gap - a.gap).toFixed(2)}</td></tr>{rows.map((r) => <tr key={r.o}><td>{r.o}</td><td>{fmt(r.a)}</td><td>{fmt(r.b)}</td><td>{fmt(r.b - r.a)}</td></tr>)}<tr><td>Residents displaced %</td><td>{a.hoods.eastside.displacedPct.toFixed(1)}</td><td>{b.hoods.eastside.displacedPct.toFixed(1)}</td><td>{(b.hoods.eastside.displacedPct - a.hoods.eastside.displacedPct).toFixed(1)}</td></tr></tbody></table>); })()}</>}
            </div>)}
          <p><button className="btn ghost" onClick={() => g.exit()}>Leave mission (progress is saved)</button></p>
        </aside>
      </div>
      <WhyModal /><PoeModals /><EndPanel />{story && <ResidentCard story={story} onClose={() => setStory(null)} />}
    </div>
  );
}
