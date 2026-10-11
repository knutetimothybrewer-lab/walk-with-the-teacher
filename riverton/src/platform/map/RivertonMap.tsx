import world from '../../content/shared/riverton-world.json';
import { Building, type BuildingKind } from '../art/Buildings';

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
  height?: number;
}

const patternId = (i: number) => `rv-pat-${i}`;

/** The one Riverton map: same names, colors and outlines in every module. SVG only (no Pixi). */
export function RivertonMap({ highlight, selected, onSelect, deltas, pins = [], showLandmarks = true, height }: RivertonMapProps) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height }} role="group" aria-label="Map of Riverton and its eight neighborhoods">
      <defs>
        {HOODS.map((h, i) => (
          <pattern key={h.id} id={patternId(i)} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform={`rotate(${i * 22})`}>
            <line x1="0" y1="0" x2="0" y2="14" stroke="#fff" strokeOpacity=".28" strokeWidth="3" />
          </pattern>
        ))}
      </defs>
      <rect width={W} height={H} rx="24" fill="color-mix(in srgb, var(--better-soft) 40%, var(--bg-2))" />
      {HOODS.map((h, i) => {
        const dim = highlight && !highlight.includes(h.id);
        const d = deltas?.[h.id];
        const fill = d == null ? `var(${h.color})` : d < 0 ? 'var(--better)' : d > 0 ? 'var(--worse)' : 'var(--neutral)';
        const pts = h.polygon.map((p) => p.join(',')).join(' ');
        const sel = selected === h.id;
        return (
          <g key={h.id} opacity={dim ? 0.35 : 1} tabIndex={onSelect ? 0 : undefined} role={onSelect ? "button" : "img"} aria-label={h.name} aria-pressed={onSelect ? sel : undefined}
             onClick={() => onSelect?.(h.id)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect?.(h.id)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
            <polygon points={pts} fill={fill} stroke="var(--bg-2)" strokeWidth={sel ? 9 : 5} strokeLinejoin="round" />
            <polygon points={pts} fill={`url(#${patternId(i)})`} pointerEvents="none" />

          </g>
        );
      })}
      <path d={world.map.river} fill="none" stroke="#56b4e9" strokeWidth="14" strokeLinecap="round" opacity=".9" />
      {showLandmarks && world.map.landmarks.map((l) => (
        <g key={l.label} transform={`translate(${l.at[0] - 30} ${l.at[1] - 30})`} pointerEvents="none">
          <Building kind={l.kind as BuildingKind} size={60} title={l.label} />
        </g>
      ))}
      {HOODS.map((h) => (
        <g key={'l' + h.id} pointerEvents="none" opacity={highlight && !highlight.includes(h.id) ? 0.5 : 1}>
          <text x={h.label[0]} y={h.label[1]} textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="26" fill="#fff" stroke="rgba(0,0,0,.55)" strokeWidth="5" paintOrder="stroke">{h.name}</text>
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
