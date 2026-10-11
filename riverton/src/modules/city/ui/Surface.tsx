import { useEffect, useRef, useState } from 'react';
import { CityScene, type Overlay, type SceneHandlers } from '../render/CityScene';
import { RivertonMap } from '../../../platform/map/RivertonMap';
import { useSettings } from '../../../platform/settings';
import type { CityState } from '../sim';

export interface SurfaceProps { city: CityState; v: number; overlay: Overlay; selected: string | null; ghost: { x: number; y: number; r: number } | null; placing: boolean; handlers: SceneHandlers; onScene: (s: CityScene | null) => void }

/** The animated Pixi map. If WebGL is unavailable it falls back to the plain SVG map so the module still works. */
export default function Surface({ city, v, overlay, selected, ghost, placing, handlers, onScene }: SurfaceProps) {
  const host = useRef<HTMLDivElement>(null); const scene = useRef<CityScene | null>(null); const [failed, setFailed] = useState(false);
  const reduce = useSettings((s) => s.reduceMotion); const hs = useRef(handlers); hs.current = handlers;
  useEffect(() => {
    let dead = false; const el = host.current!;
    CityScene.create(el, { onHood: (h) => hs.current.onHood?.(h), onMap: (x, y, h) => hs.current.onMap?.(x, y, h), onMove: (x, y) => hs.current.onMove?.(x, y), onBuilding: (u) => hs.current.onBuilding?.(u), onAgent: (h, n) => hs.current.onAgent?.(h, n) })
      .then((s) => { if (dead) { s.destroy(); return; } scene.current = s; onScene(s); s.setState(city); }).catch(() => setFailed(true));
    return () => { dead = true; scene.current?.destroy(); scene.current = null; onScene(null); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { scene.current?.setState(city); }, [city, v]);
  useEffect(() => { scene.current?.setOverlay(overlay); }, [overlay]);
  useEffect(() => { scene.current?.setSelected(selected); }, [selected]);
  useEffect(() => { scene.current?.setGhost(ghost); }, [ghost]);
  useEffect(() => { scene.current?.setReduceMotion(reduce); }, [reduce]);
  useEffect(() => { scene.current?.setPlacing(placing); }, [placing]);
  if (failed) return <div className="surface"><RivertonMap selected={selected} onSelect={(id) => handlers.onHood?.(id)} /><p className="note">Your device could not start the animated map, so this simple map is shown. Everything else works the same; buildings are placed at the neighborhood center.</p></div>;
  return <div className="surface" ref={host} data-testid="city-surface" />;
}
