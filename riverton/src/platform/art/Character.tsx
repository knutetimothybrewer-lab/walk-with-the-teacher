import type { CharacterSpec, Expression, Pose } from './characters';

const SCALE = { child: 0.72, teen: 0.92, adult: 1, elder: 0.96 } as const;
const BODYW = { slim: 17, regular: 21, broad: 26 } as const;

function Face({ e, cx, cy }: { e: Expression; cx: number; cy: number }) {
  const eyeY = cy - 2;
  const eye = (x: number, open = 2.2) => <ellipse cx={x} cy={eyeY} rx="1.9" ry={open} fill="#23303d" />;
  const brow = (x: number, tilt: number) => <path d={`M${x - 3.5} ${eyeY - 5 + tilt} L${x + 3.5} ${eyeY - 5 - tilt}`} stroke="#23303d" strokeWidth="1.4" strokeLinecap="round" />;
  const L = cx - 6.5, R = cx + 6.5;
  const mouth = {
    neutral: <path d={`M${cx - 3.5} ${cy + 8} H${cx + 3.5}`} stroke="#23303d" strokeWidth="1.6" strokeLinecap="round" />,
    happy: <path d={`M${cx - 5} ${cy + 6} Q${cx} ${cy + 12.5} ${cx + 5} ${cy + 6}`} stroke="#23303d" strokeWidth="1.7" fill="#fff" strokeLinecap="round" />,
    worried: <path d={`M${cx - 4} ${cy + 10} Q${cx} ${cy + 6} ${cx + 4} ${cy + 10}`} stroke="#23303d" strokeWidth="1.6" fill="none" strokeLinecap="round" />,
    angry: <path d={`M${cx - 4} ${cy + 9.5} Q${cx} ${cy + 6.5} ${cx + 4} ${cy + 9.5}`} stroke="#23303d" strokeWidth="1.8" fill="none" strokeLinecap="round" />,
    surprised: <ellipse cx={cx} cy={cy + 9} rx="2.6" ry="3.4" fill="#5a2a2a" />,
    sad: <path d={`M${cx - 4} ${cy + 10.5} Q${cx} ${cy + 6.5} ${cx + 4} ${cy + 10.5}`} stroke="#23303d" strokeWidth="1.6" fill="none" strokeLinecap="round" />,
    thinking: <path d={`M${cx - 3} ${cy + 8.5} Q${cx + 1} ${cy + 7} ${cx + 4.5} ${cy + 9.5}`} stroke="#23303d" strokeWidth="1.6" fill="none" strokeLinecap="round" />,
  }[e];
  const brows =
    e === 'angry' ? [brow(L, -1.6), brow(R, 1.6)] :
    e === 'worried' || e === 'sad' ? [brow(L, 1.6), brow(R, -1.6)] :
    e === 'surprised' ? [<path key="a" d={`M${L - 3} ${eyeY - 7} Q${L} ${eyeY - 9} ${L + 3} ${eyeY - 7}`} stroke="#23303d" strokeWidth="1.3" fill="none" />, <path key="b" d={`M${R - 3} ${eyeY - 7} Q${R} ${eyeY - 9} ${R + 3} ${eyeY - 7}`} stroke="#23303d" strokeWidth="1.3" fill="none" />] :
    e === 'thinking' ? [<path key="b" d={`M${R - 3.5} ${eyeY - 7} L${R + 3.5} ${eyeY - 5.5}`} stroke="#23303d" strokeWidth="1.4" strokeLinecap="round" />] : null;
  const open = e === 'surprised' ? 2.8 : e === 'happy' ? 1.7 : 2.2;
  return (
    <g>
      {eye(L, open)}{eye(R, open)}{brows}{mouth}
      <ellipse cx={L - 2} cy={cy + 4} rx="2.4" ry="1.5" fill="#ff8a7a" opacity=".35" />
      <ellipse cx={R + 2} cy={cy + 4} rx="2.4" ry="1.5" fill="#ff8a7a" opacity=".35" />
    </g>
  );
}

function Hair({ style, color, cx, cy, r }: { style: string; color: string; cx: number; cy: number; r: number }) {
  switch (style) {
    case 'bald': return null;
    case 'long': return <path d={`M${cx - r - 1} ${cy + 4} Q${cx - r - 3} ${cy - r - 2} ${cx} ${cy - r - 2} Q${cx + r + 3} ${cy - r - 2} ${cx + r + 1} ${cy + 4} L${cx + r + 1} ${cy + 24} L${cx + r - 3} ${cy + 24} L${cx + r - 3} ${cy - 2} Q${cx} ${cy - r + 4} ${cx - r + 3} ${cy - 2} L${cx - r + 3} ${cy + 24} L${cx - r - 1} ${cy + 24} Z`} fill={color} />;
    case 'bun': return <g><circle cx={cx} cy={cy - r - 3} r="6" fill={color} /><path d={`M${cx - r - 1} ${cy} Q${cx - r} ${cy - r - 1} ${cx} ${cy - r - 1} Q${cx + r} ${cy - r - 1} ${cx + r + 1} ${cy} Q${cx} ${cy - r + 5} ${cx - r - 1} ${cy} Z`} fill={color} /></g>;
    case 'curly': return <g fill={color}>{[-1, -0.5, 0, 0.5, 1].map((k) => <circle key={k} cx={cx + k * r} cy={cy - r * (1 - Math.abs(k) * 0.35) + 2} r="6.5" />)}<circle cx={cx - r - 1} cy={cy + 2} r="5" /><circle cx={cx + r + 1} cy={cy + 2} r="5" /></g>;
    case 'cap': return <g><path d={`M${cx - r - 1} ${cy - 1} Q${cx - r} ${cy - r - 4} ${cx} ${cy - r - 4} Q${cx + r} ${cy - r - 4} ${cx + r + 1} ${cy - 1} Z`} fill="#e1604a" /><path d={`M${cx - 2} ${cy - 1} H${cx + r + 9} Q${cx + r + 9} ${cy + 3} ${cx + r + 1} ${cy + 2} H${cx - 2} Z`} fill="#b94632" /></g>;
    default: return <path d={`M${cx - r - 1} ${cy + 1} Q${cx - r - 2} ${cy - r - 3} ${cx} ${cy - r - 3} Q${cx + r + 2} ${cy - r - 3} ${cx + r + 1} ${cy + 1} Q${cx + r - 2} ${cy - r + 5} ${cx} ${cy - r + 5} Q${cx - r + 2} ${cy - r + 5} ${cx - r - 1} ${cy + 1} Z`} fill={color} />;
  }
}

export interface CharacterProps { spec: CharacterSpec; expression?: Expression; pose?: Pose; size?: number; title?: string; bob?: boolean; crop?: 'head' }

export function Character({ spec, expression = 'neutral', pose = 'stand', size = 120, title, bob, crop }: CharacterProps) {
  const s = SCALE[spec.age];
  const bw = BODYW[spec.body];
  const cx = 50, headR = spec.age === 'child' ? 15 : 13.5;
  const seated = spec.aid === 'wheelchair';
  const baseY = 156, torsoTop = 62;
  const armL = pose === 'wave' ? `M${cx - bw} ${torsoTop + 6} Q${cx - bw - 14} ${torsoTop - 8} ${cx - bw - 10} ${torsoTop - 24}` : `M${cx - bw} ${torsoTop + 6} Q${cx - bw - 8} ${torsoTop + 24} ${cx - bw - 3} ${torsoTop + 40}`;
  const armR = pose === 'think' ? `M${cx + bw} ${torsoTop + 6} Q${cx + bw + 6} ${torsoTop + 22} ${cx + 4} ${torsoTop - 10}` : `M${cx + bw} ${torsoTop + 6} Q${cx + bw + 8} ${torsoTop + 24} ${cx + bw + 3} ${torsoTop + 40}`;
  const legTop = torsoTop + 46;
  return (
    <svg viewBox={crop === 'head' ? '18 4 64 64' : '0 0 100 160'} width={crop === 'head' ? size : size * 0.625} height={crop === 'head' ? size : size} role="img" aria-label={title ?? `${spec.name}, ${expression}`}
      style={{ overflow: crop ? 'hidden' : 'visible', animation: bob ? 'bob 3.2s ease-in-out infinite' : undefined }}>
      <title>{title ?? spec.name}</title>
      <g transform={`translate(50 ${baseY}) scale(${s}) translate(-50 ${-baseY})`}>
        <ellipse cx={cx} cy={baseY + 1} rx="26" ry="4" fill="#000" opacity=".12" />
        {seated ? (
          <g>
            <circle cx={cx} cy={baseY - 14} r="14" fill="none" stroke="#8aa0b8" strokeWidth="3.5" />
            <circle cx={cx} cy={baseY - 14} r="3" fill="#8aa0b8" />
            <path d={`M${cx - bw} ${legTop - 6} H${cx + bw + 18} V${legTop + 8} H${cx - bw}`} fill={spec.bottom} />
            <path d={`M${cx + bw + 14} ${legTop + 6} V${legTop + 30}`} stroke={spec.bottom} strokeWidth="8" strokeLinecap="round" />
            <rect x={cx + bw + 8} y={legTop + 28} width="14" height="5" rx="2.5" fill="#23303d" />
          </g>
        ) : (
          <g fill={spec.bottom}>
            <rect x={cx - bw + 1} y={legTop - 2} width={bw - 2} height={baseY - legTop - 2} rx="6" />
            <rect x={cx + 1} y={legTop - 2} width={bw - 2} height={baseY - legTop - 2} rx="6" />
            <ellipse cx={cx - bw / 2 - 1} cy={baseY - 3} rx="9" ry="4.5" fill="#23303d" />
            <ellipse cx={cx + bw / 2 + 1} cy={baseY - 3} rx="9" ry="4.5" fill="#23303d" />
          </g>
        )}
        <path d={armL} stroke={spec.top} strokeWidth="9" strokeLinecap="round" fill="none" />
        <path d={armR} stroke={spec.top} strokeWidth="9" strokeLinecap="round" fill="none" />
        <circle cx={pose === 'wave' ? cx - bw - 10 : cx - bw - 3} cy={pose === 'wave' ? torsoTop - 25 : torsoTop + 41} r="4.5" fill={spec.skin} />
        <circle cx={pose === 'think' ? cx + 4 : cx + bw + 3} cy={pose === 'think' ? torsoTop - 11 : torsoTop + 41} r="4.5" fill={spec.skin} />
        <rect x={cx - bw} y={torsoTop} width={bw * 2} height="52" rx="12" fill={spec.top} />
        <path d={`M${cx - 5} ${torsoTop} Q${cx} ${torsoTop + 7} ${cx + 5} ${torsoTop}`} stroke="#000" strokeOpacity=".15" strokeWidth="1.5" fill="none" />
        <rect x={cx - 4} y={torsoTop - 8} width="8" height="10" rx="3" fill={spec.skin} />
        {spec.aid === 'cane' && <g stroke="#6b4a2f" strokeWidth="3" strokeLinecap="round" fill="none"><path d={`M${cx + bw + 3} ${torsoTop + 44} V${baseY - 2}`} /><path d={`M${cx + bw - 2} ${torsoTop + 42} Q${cx + bw + 3} ${torsoTop + 36} ${cx + bw + 8} ${torsoTop + 42}`} /></g>}
        {spec.hairStyle === 'long' && <Hair style="long" color={spec.hair} cx={cx} cy={38} r={headR} />}
        <circle cx={cx} cy={38} r={headR} fill={spec.skin} />
        <circle cx={cx - headR + 0.5} cy={40} r="2.6" fill={spec.skin} /><circle cx={cx + headR - 0.5} cy={40} r="2.6" fill={spec.skin} />
        {spec.hairStyle === 'cap' ? <Hair style="cap" color={spec.hair} cx={cx} cy={38} r={headR} /> : spec.hairStyle !== 'bald' && <Hair style={spec.hairStyle === 'long' ? 'short' : spec.hairStyle} color={spec.hair} cx={cx} cy={38} r={headR} />}
        <Face e={expression} cx={cx} cy={40} />
        {spec.glasses && <g fill="none" stroke="#23303d" strokeWidth="1.2"><circle cx={cx - 6.5} cy={38} r="4.6" /><circle cx={cx + 6.5} cy={38} r="4.6" /><path d={`M${cx - 2} ${38} H${cx + 2}`} /></g>}
        {expression === 'thinking' && <g fill="#fff" stroke="#23303d" strokeWidth="1"><circle cx={cx + 22} cy={22} r="2" /><circle cx={cx + 28} cy={14} r="3" /><ellipse cx={cx + 38} cy={4} rx="9" ry="6" /></g>}
      </g>
    </svg>
  );
}
