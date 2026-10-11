import world from '../../content/shared/riverton-world.json';
import { Building, type BuildingKind } from '../art/Buildings';
import { useSettings } from '../settings';
import { TerrainDefs, TerrainBase, HoodGround, Waterways, Roads, Sky } from './MapTerrain';

export type Hood = (typeof world.neighborhoods)[number];
export const HOODS = world.neighborhoods;
export const hoodById = (id: string) => HOODS.find((h) => h.id === id);
const [, , W, H] = [0, 0, ...world.map.viewBox.slice(2)];

export interface RivertonMapProps {
  highlight?: string[];            // neighborhood ids to emphasize
  selected?: string | null;
  onSelect?: (id: string) => void;
  /** optional per-neighborhood value for a blue/orange diverging fill (negative = better) */
  deltas?: Record<string, number>;
  pins?: { x: number; y: number; label?: string }[];
  showLandmarks?: boolean;
  height?: number | string;
}


/** The one Riverton map: same names, colors and outlines in every module. SVG only (no Pixi). */
export function RivertonMap({ highlight, selected, onSelect, deltas, pins = [], showLandmarks = true, height }: RivertonMapProps) {
  const reduce = useSettings((s) => s.reduceMotion); const animate = !reduce;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height }} role="group" aria-label="Map of Riverton and its eight neighborhoods">
      <TerrainDefs />
      <rect width={W} height={H} rx="24" fill="#dde6c8" />
      <TerrainBase />
      {HOODS.map((h) => <HoodGround key={'g' + h.id} id={h.id} />)}
      <Waterways animate={animate} />
      <Roads animate={animate} />
      {HOODS.map((h) => {
        const dim = highlight && !highlight.includes(h.id);
        const d = deltas?.[h.id];
        const hasData = d != null;
        const fill = !hasData ? `var(${h.color})` : d < 0 ? 'var(--better)' : d > 0 ? 'var(--worse)' : 'var(--neutral)';
        const pts = h.polygon.map((p) => p.join(',')).join(' ');
        const sel = selected === h.id; const hi = !!highlight?.includes(h.id);
        return (
          <g key={h.id} tabIndex={onSelect ? 0 : undefined} role={onSelect ? 'button' : 'img'} aria-label={h.name} aria-pressed={onSelect ? sel : undefined}
             onClick={() => onSelect?.(h.id)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect?.(h.id)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
            <polygon points={pts} fill={fill} fillOpacity={hasData ? 0.5 : hi ? 0.22 : 0.2} />
            {dim && <polygon points={pts} fill="#f4efe6" fillOpacity=".5" pointerEvents="none" />}
            <polygon points={pts} fill="none" stroke={sel || hi ? fill : '#fffaf0'} strokeWidth={sel ? 7 : hi ? 5 : 3} strokeDasharray={sel || hi ? undefined : '10 7'} strokeLinejoin="round" opacity={sel || hi ? 0.95 : 0.9} />
            <polygon points={pts} fill="transparent" />
          </g>
        );
      })}
      <Sky animate={animate} />
      {showLandmarks && world.map.landmarks.map((l) => (
        <g key={l.label} transform={`translate(${l.at[0] - 30} ${l.at[1] - 30})`} pointerEvents="none">
          <ellipse cx="30" cy="54" rx="26" ry="8" fill="#1d2b3a" opacity=".25" />
          <Building kind={l.kind as BuildingKind} size={60} title={l.label} />
        </g>
      ))}
      {HOODS.map((h) => (
        <g key={'l' + h.id} pointerEvents="none" opacity={highlight && !highlight.includes(h.id) ? 0.6 : 1}>
          <text x={h.label[0]} y={h.label[1]} textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="21" letterSpacing="1.2" fill="#23303d" stroke="#fffaf0" strokeWidth="6" strokeLinejoin="round" paintOrder="stroke" style={{ textTransform: 'uppercase' }}>{h.name}</text>
        </g>
      ))}
      {pins.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y})`}>
          <circle r="9" fill="var(--lab-b)" stroke="#0f1230" strokeWidth="3" />
          {p.label && <text y="-14" textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--ink)">{p.label}</text>}
        </g>
      ))}
    </svg>
  );
}
