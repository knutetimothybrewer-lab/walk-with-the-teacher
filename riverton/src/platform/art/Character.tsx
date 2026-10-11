import { useId } from 'react';
import type { CharacterSpec, Expression, Pose } from './characters';

const SCALE = { child: 0.74, teen: 0.93, adult: 1, elder: 0.96 } as const;
const BODYW = { slim: 16, regular: 19.5, broad: 24 } as const;

/** Lighten (amt>0) or darken (amt<0) a #rrggbb color. */
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16); const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map((v) => v.toString(16).padStart(2, '0')).join('');
}
const INK = '#2a2230';

function Eyes({ e, cx, cy, iris }: { e: Expression; cx: number; cy: number; iris: string }) {
  const L = cx - 5.6, R = cx + 5.6; const open = e === 'surprised' ? 3.3 : e === 'happy' ? 2.2 : e === 'sad' || e === 'worried' ? 2.6 : 2.9;
  const eye = (x: number) => (
    <g key={x}>
      <g className="ch-blink" style={{ transformOrigin: `${x}px ${cy}px` }}>
        <ellipse cx={x} cy={cy} rx="3.1" ry={open} fill="#fff" />
        <circle cx={x + (e === 'thinking' ? 0.9 : 0)} cy={cy + (e === 'thinking' ? -0.5 : 0.2)} r={Math.min(2.1, open - 0.3)} fill={iris} />
        <circle cx={x + (e === 'thinking' ? 0.9 : 0)} cy={cy + 0.2} r="0.9" fill="#111" />
        <circle cx={x + 0.8} cy={cy - 0.9} r="0.7" fill="#fff" />
      </g>
      <path d={`M${x - 3.3} ${cy - 0.3} Q${x} ${cy - open - 1.3} ${x + 3.3} ${cy - 0.3}`} stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      {e === 'happy' && <path d={`M${x - 3.2} ${cy + 0.6} Q${x} ${cy + 3} ${x + 3.2} ${cy + 0.6}`} stroke="#fff" strokeOpacity=".0" fill="none" />}
    </g>
  );
  return <g>{eye(L)}{eye(R)}</g>;
}

function Brows({ e, cx, cy, color }: { e: Expression; cx: number; cy: number; color: string }) {
  const y = cy - 6.4; const L = cx - 5.6, R = cx + 5.6;
  const b = (x: number, inner: number, outer: number, arch = 0.8) => <path key={x} d={`M${x - 3.6} ${y + outer} Q${x} ${y - arch} ${x + 3.6} ${y + inner}`} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />;
  const flip = (x: number, inner: number, outer: number, arch?: number) => <path key={x} d={`M${x - 3.6} ${y + inner} Q${x} ${y - (arch ?? 0.8)} ${x + 3.6} ${y + outer}`} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />;
  switch (e) {
    case 'angry': return <g>{b(L, 1.6, -0.6, 0.2)}{flip(R, 1.6, -0.6, 0.2)}</g>;
    case 'worried': case 'sad': return <g>{b(L, -1.6, 0.8)}{flip(R, -1.6, 0.8)}</g>;
    case 'surprised': return <g>{b(L, -1.4, -1.4, 2)}{flip(R, -1.4, -1.4, 2)}</g>;
    case 'thinking': return <g>{b(L, 0, 0.6)}{flip(R, -1.8, -0.6, 1.8)}</g>;
    default: return <g>{b(L, 0, 0.4)}{flip(R, 0.4, 0)}</g>;
  }
}

function Mouth({ e, cx, cy }: { e: Expression; cx: number; cy: number }) {
  const y = cy + 8; const lip = '#c4605a';
  switch (e) {
    case 'happy': return <g><path d={`M${cx - 5} ${y - 1} Q${cx} ${y + 6.5} ${cx + 5} ${y - 1} Q${cx} ${y + 1.2} ${cx - 5} ${y - 1} Z`} fill="#fff" stroke={INK} strokeWidth="1" strokeLinejoin="round" /><path d={`M${cx - 3.2} ${y + 2.4} Q${cx} ${y + 5.2} ${cx + 3.2} ${y + 2.4}`} stroke="#d9707a" strokeWidth="1.4" fill="none" opacity=".7" /></g>;
    case 'surprised': return <ellipse cx={cx} cy={y + 1.5} rx="2.6" ry="3.4" fill="#6b2a33" stroke={INK} strokeWidth=".8" />;
    case 'worried': return <path d={`M${cx - 3.6} ${y + 2.4} Q${cx} ${y - 0.6} ${cx + 3.6} ${y + 2.4}`} stroke={lip} strokeWidth="1.8" fill="none" strokeLinecap="round" />;
    case 'sad': return <path d={`M${cx - 3.8} ${y + 3} Q${cx} ${y - 1.4} ${cx + 3.8} ${y + 3}`} stroke={lip} strokeWidth="1.8" fill="none" strokeLinecap="round" />;
    case 'angry': return <path d={`M${cx - 3.8} ${y + 2.6} Q${cx} ${y - 0.4} ${cx + 3.8} ${y + 2.6}`} stroke={lip} strokeWidth="2" fill="none" strokeLinecap="round" />;
    case 'thinking': return <path d={`M${cx - 3} ${y + 1.4} Q${cx + 1} ${y + 0.4} ${cx + 4.2} ${y + 2.4}`} stroke={lip} strokeWidth="1.8" fill="none" strokeLinecap="round" />;
    default: return <path d={`M${cx - 3.6} ${y + 1} Q${cx} ${y + 2.8} ${cx + 3.6} ${y + 1}`} stroke={lip} strokeWidth="1.8" fill="none" strokeLinecap="round" />;
  }
}

function HairBack({ style, color, cx, cy, r, hl }: { style: string; color: string; cx: number; cy: number; r: number; hl: string }) {
  if (style === 'long') return <g><path d={`M${cx - r - 2} ${cy - 2} C${cx - r - 6} ${cy + 14} ${cx - r - 4} ${cy + 30} ${cx - r + 2} ${cy + 34} L${cx + r - 2} ${cy + 34} C${cx + r + 4} ${cy + 30} ${cx + r + 6} ${cy + 14} ${cx + r + 2} ${cy - 2} Z`} fill={color} /><path d={`M${cx - r - 2} ${cy + 6} C${cx - r - 3} ${cy + 18} ${cx - r - 2} ${cy + 26} ${cx - r + 1} ${cy + 31}`} stroke={hl} strokeWidth="1.2" fill="none" opacity=".35" /></g>;
  if (style === 'bun') return <g><circle cx={cx} cy={cy - r - 4} r="6.4" fill={color} /><path d={`M${cx - 3} ${cy - r - 7} Q${cx} ${cy - r - 9} ${cx + 3} ${cy - r - 6.5}`} stroke={hl} strokeWidth="1.2" fill="none" opacity=".5" /></g>;
  if (style === 'curly') return <g fill={color}>{Array.from({ length: 9 }, (_, k) => { const a = Math.PI * (1.05 + (k / 8) * 0.9); return <circle key={k} cx={cx + Math.cos(a) * (r + 1.5)} cy={cy + 1 + Math.sin(a) * (r + 2)} r={5.4 + (k % 2)} />; })}</g>;
  return null;
}

function HairFront({ style, color, cx, cy, r, hl }: { style: string; color: string; cx: number; cy: number; r: number; hl: string }) {
  const crown = `M${cx - r - 0.6} ${cy - 0.5} C${cx - r - 1.5} ${cy - r - 4} ${cx + r + 1.5} ${cy - r - 4} ${cx + r + 0.6} ${cy - 0.5}`;
  switch (style) {
    case 'bald': return <path d={`M${cx - 6} ${cy - r + 1.5} Q${cx - 2} ${cy - r - 0.6} ${cx + 3} ${cy - r + 0.8}`} stroke="#fff" strokeOpacity=".35" strokeWidth="1.6" fill="none" strokeLinecap="round" />;
    case 'cap': return <g><path d={`${crown} Q${cx} ${cy - 3} ${cx - r - 0.6} ${cy - 0.5} Z`} fill="#e1604a" /><path d={`M${cx - r + 1} ${cy - 3} Q${cx + 2} ${cy - 1} ${cx + r + 9} ${cy - 2.6} Q${cx + r + 8} ${cy + 0.8} ${cx + 2} ${cy - 0.4} Z`} fill="#c24a36" /><path d={`M${cx - 6} ${cy - r + 1.8} Q${cx} ${cy - r - 0.2} ${cx + 6} ${cy - r + 1.8}`} stroke="#fff" strokeOpacity=".35" strokeWidth="1.4" fill="none" strokeLinecap="round" /></g>;
    case 'curly': return <g fill={color}>{Array.from({ length: 6 }, (_, k) => <circle key={k} cx={cx - r + 1 + k * ((2 * r - 2) / 5)} cy={cy - r + 3 - Math.sin((k / 5) * Math.PI) * 3} r={5.6} />)}<path d={`M${cx - 8} ${cy - r + 1.4} Q${cx} ${cy - r - 1.4} ${cx + 8} ${cy - r + 1.4}`} stroke={hl} strokeWidth="1.4" fill="none" opacity=".4" strokeLinecap="round" /></g>;
    default: return <g><path d={`${crown} C${cx + r - 1} ${cy - r + 2} ${cx + 2} ${cy - r + 4} ${cx - 3} ${cy - r + 6} C${cx - r + 2} ${cy - r + 8} ${cx - r - 0.5} ${cy - 3} ${cx - r - 0.6} ${cy - 0.5} Z`} fill={color} /><path d={`M${cx - 7} ${cy - r + 2.6} Q${cx - 1} ${cy - r + 0.2} ${cx + 6} ${cy - r + 2.4}`} stroke={hl} strokeWidth="1.5" fill="none" opacity=".45" strokeLinecap="round" /></g>;
  }
}

export interface CharacterProps { spec: CharacterSpec; expression?: Expression; pose?: Pose; size?: number; title?: string; bob?: boolean; crop?: 'head' }

export function Character({ spec, expression = 'neutral', pose = 'stand', size = 120, title, bob, crop }: CharacterProps) {
  const uid = useId().replace(/:/g, ''); const id = (n: string) => `${n}${uid}`;
  const s = SCALE[spec.age]; const bw = BODYW[spec.body];
  const cx = 50, headR = spec.age === "child" ? 15.5 : 14, headY = spec.age === "child" ? 42 : 40;
  const seated = spec.aid === 'wheelchair'; const baseY = 156, torsoTop = 64, hipY = torsoTop + 50;
  const skinD = shade(spec.skin, -0.18), skinL = shade(spec.skin, 0.22), topD = shade(spec.top, -0.22), topL = shade(spec.top, 0.18), botD = shade(spec.bottom, -0.3), botL = shade(spec.bottom, 0.12);
  const hairL = shade(spec.hair, 0.45); const iris = shade(spec.skin, -0.55);
  const sh = bw + 3; // shoulder half-width
  const think = pose === 'think'; const wave = pose === 'wave';
  const cap = spec.hairStyle === 'cap';
  const armPath = (side: -1 | 1, kind: 'rest' | 'wave' | 'think') => {
    const sx = cx + side * (sh - 2), sy = torsoTop + 5;
    if (kind === 'wave') return { d: `M${sx} ${sy} C${sx + side * 10} ${sy - 4} ${sx + side * 14} ${sy - 14} ${sx + side * 11} ${sy - 28}`, hand: [sx + side * 11, sy - 31] as const };
    if (kind === 'think') return { d: `M${sx} ${sy} C${sx + side * 8} ${sy + 14} ${sx + side * 2} ${sy + 20} ${cx + side * 3} ${headY + 12}`, hand: [cx + side * 3, headY + 12] as const };
    return { d: `M${sx} ${sy} C${sx + side * 4} ${sy + 14} ${sx + side * 5} ${sy + 28} ${sx + side * 3} ${sy + 40}`, hand: [sx + side * 3, sy + 43] as const };
  };
  const left = armPath(-1, 'rest'); const right = armPath(1, think ? 'think' : wave ? 'wave' : 'rest');
  const arm = (a: { d: string; hand: readonly [number, number] }, waving: boolean, ox: number, oy: number) => (
    <g className={waving ? 'ch-wave' : undefined} style={waving ? { transformOrigin: `${ox}px ${oy}px` } : undefined}>
      <path d={a.d} stroke={topD} strokeWidth="9.6" strokeLinecap="round" fill="none" />
      <path d={a.d} stroke={`url(#${id('top')})`} strokeWidth="8.2" strokeLinecap="round" fill="none" />
      <circle cx={a.hand[0]} cy={a.hand[1]} r="4.3" fill={spec.skin} /><path d={`M${a.hand[0] - 2.2} ${a.hand[1] + 2.4} q2.2 2 4.4 0`} stroke={skinD} strokeWidth=".8" fill="none" />
    </g>
  );
  return (
    <svg viewBox={crop === 'head' ? '20 6 60 60' : '0 0 100 160'} width={crop === 'head' ? size : size * 0.625} height={crop === 'head' ? size : size} role="img" aria-label={title ?? `${spec.name}, ${expression}`}
      style={{ overflow: crop ? 'hidden' : 'visible', animation: bob ? 'bob 3.2s ease-in-out infinite' : undefined }}>
      <title>{title ?? spec.name}</title>
      <defs>
        <radialGradient id={id('sk')} cx="38%" cy="32%" r="80%"><stop offset="0" stopColor={skinL} /><stop offset=".55" stopColor={spec.skin} /><stop offset="1" stopColor={skinD} /></radialGradient>
        <linearGradient id={id('top')} x1="0" x2="1"><stop offset="0" stopColor={topL} /><stop offset=".5" stopColor={spec.top} /><stop offset="1" stopColor={topD} /></linearGradient>
        <linearGradient id={id('bot')} x1="0" x2="1"><stop offset="0" stopColor={botL} /><stop offset=".6" stopColor={spec.bottom} /><stop offset="1" stopColor={botD} /></linearGradient>
        <radialGradient id={id('gr')}><stop offset="0" stopColor="#1d2b3a" stopOpacity=".28" /><stop offset="1" stopColor="#1d2b3a" stopOpacity="0" /></radialGradient>
        <linearGradient id={id('hr')} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor={shade(spec.hair, 0.18)} /><stop offset="1" stopColor={shade(spec.hair, -0.25)} /></linearGradient>
      </defs>
      <g transform={`translate(50 ${baseY}) scale(${s}) translate(-50 ${-baseY})`}>
        <ellipse cx={cx} cy={baseY + 1} rx="30" ry="5.5" fill={`url(#${id('gr')})`} />
        {seated ? (
          <g>
            <path d={`M${cx - bw + 2} ${hipY - 6} H${cx + bw + 16} Q${cx + bw + 22} ${hipY - 6} ${cx + bw + 22} ${hipY + 2} V${hipY + 9} H${cx - bw + 2} Z`} fill={`url(#${id('bot')})`} />
            <path d={`M${cx + bw + 16} ${hipY + 4} Q${cx + bw + 24} ${hipY + 8} ${cx + bw + 21} ${hipY + 34} L${cx + bw + 13} ${hipY + 34} Q${cx + bw + 14} ${hipY + 14} ${cx + bw + 8} ${hipY + 8} Z`} fill={`url(#${id('bot')})`} />
            <path d={`M${cx + bw + 10} ${hipY + 32} h18 q3 0 3 3 v2 h-21 z`} fill="#2a2a33" />
            <circle cx={cx - 2} cy={baseY - 15} r="15" fill="none" stroke="#5a6e84" strokeWidth="3" /><circle cx={cx - 2} cy={baseY - 15} r="12.4" fill="none" stroke="#8aa0b8" strokeWidth="1" strokeDasharray="1.6 3.2" />
            <circle cx={cx - 2} cy={baseY - 15} r="3" fill="#5a6e84" /><path d={`M${cx - 2} ${baseY - 15} L${cx - 2} ${baseY - 30} M${cx - 2} ${baseY - 15} L${cx + 10} ${baseY - 8} M${cx - 2} ${baseY - 15} L${cx - 14} ${baseY - 8}`} stroke="#8aa0b8" strokeWidth=".9" />
            <path d={`M${cx - bw - 4} ${hipY - 12} V${hipY + 12} H${cx - bw + 3}`} stroke="#5a6e84" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        ) : (
          <g>
            {[-1, 1].map((sd) => { const x0 = cx + (sd < 0 ? -bw + 0.6 : -0.4); const w = bw - 0.2; return (
              <g key={sd}>
                <path d={`M${x0} ${hipY - 4} L${x0 + w} ${hipY - 4} L${x0 + w - 1.4} ${baseY - 10} L${x0 + 1.4} ${baseY - 10} Z`} fill={`url(#${id('bot')})`} />
                <path d={`M${x0 - 1.5} ${baseY - 11} Q${x0 + w / 2} ${baseY - 14} ${x0 + w + 1.5} ${baseY - 11} L${x0 + w + 4 * sd * -0 + 3} ${baseY - 3} Q${x0 + w / 2} ${baseY + 2} ${x0 - 3} ${baseY - 3} Z`} fill="#2c2833" />
                <path d={`M${x0 - 3} ${baseY - 2.5} Q${x0 + w / 2} ${baseY + 2.4} ${x0 + w + 3} ${baseY - 2.5}`} stroke="#fff" strokeOpacity=".5" strokeWidth="1.2" fill="none" />
              </g>); })}
            <path d={`M${cx} ${hipY - 2} V${baseY - 12}`} stroke="#000" strokeOpacity=".15" strokeWidth="1" />
          </g>
        )}
        {spec.aid === 'cane' && <g strokeLinecap="round" fill="none"><path d={`M${cx + bw + 7} ${torsoTop + 46} V${baseY - 1}`} stroke="#5a3d26" strokeWidth="3.2" /><path d={`M${cx + bw + 7} ${torsoTop + 46} q0 -5 -5 -5`} stroke="#5a3d26" strokeWidth="3.2" /><path d={`M${cx + bw + 6.2} ${torsoTop + 52} V${baseY - 2}`} stroke="#a8754c" strokeWidth=".8" opacity=".7" /></g>}
        <g className="ch-breathe">
          {arm(left, false, 0, 0)}
          <path d={`M${cx - sh} ${torsoTop + 7} Q${cx - sh} ${torsoTop - 1} ${cx - sh + 8} ${torsoTop - 1} L${cx + sh - 8} ${torsoTop - 1} Q${cx + sh} ${torsoTop - 1} ${cx + sh} ${torsoTop + 7} L${cx + bw + 1} ${hipY + 2} Q${cx} ${hipY + 5} ${cx - bw - 1} ${hipY + 2} Z`} fill={`url(#${id('top')})`} />
          <path d={`M${cx - bw - 1} ${hipY - 4} Q${cx} ${hipY - 1} ${cx + bw + 1} ${hipY - 4}`} stroke="#000" strokeOpacity=".12" strokeWidth="1.4" fill="none" />
          <path d={`M${cx - bw + 4} ${torsoTop + 14} Q${cx - bw + 7} ${torsoTop + 26} ${cx - bw + 4} ${torsoTop + 38}`} stroke="#fff" strokeOpacity=".16" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d={`M${cx - 6.5} ${torsoTop - 1} Q${cx} ${torsoTop + 9} ${cx + 6.5} ${torsoTop - 1} Z`} fill={skinD} />
          <path d={`M${cx - 7.5} ${torsoTop - 1.5} Q${cx} ${torsoTop + 10.5} ${cx + 7.5} ${torsoTop - 1.5}`} stroke={shade(spec.top, -0.35)} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d={`M${cx - 4.6} ${torsoTop - 12} h9.2 v11 q-4.6 5 -9.2 0 z`} fill={spec.skin} /><path d={`M${cx - 4.6} ${torsoTop - 7} q4.6 5 9.2 0 v-3 h-9.2 z`} fill={skinD} opacity=".45" />
          {arm(right, wave, cx + sh - 2, torsoTop + 5)}
          <g className="ch-head" style={{ transformOrigin: `${cx}px ${headY + 14}px` }}>
            <HairBack style={spec.hairStyle} color={`url(#${id('hr')})`} cx={cx} cy={headY} r={headR} hl={hairL} />
            <ellipse cx={cx - headR + 0.4} cy={headY + 3} rx="2.5" ry="3.4" fill={spec.skin} /><ellipse cx={cx + headR - 0.4} cy={headY + 3} rx="2.5" ry="3.4" fill={spec.skin} />
            <path d={`M${cx - headR} ${headY} C${cx - headR} ${headY - headR * 1.25} ${cx + headR} ${headY - headR * 1.25} ${cx + headR} ${headY} C${cx + headR} ${headY + headR * 0.85} ${cx + headR * 0.55} ${headY + headR * 1.28} ${cx} ${headY + headR * 1.3} C${cx - headR * 0.55} ${headY + headR * 1.28} ${cx - headR} ${headY + headR * 0.85} ${cx - headR} ${headY} Z`} fill={`url(#${id('sk')})`} />
            <ellipse cx={cx - 8.4} cy={headY + 5.6} rx="2.8" ry="1.8" fill="#ff7a7a" opacity=".22" /><ellipse cx={cx + 8.4} cy={headY + 5.6} rx="2.8" ry="1.8" fill="#ff7a7a" opacity=".22" />
            <HairFront style={spec.hairStyle} color={`url(#${id('hr')})`} cx={cx} cy={headY} r={headR} hl={hairL} />
            {spec.age === 'elder' && <g stroke={skinD} strokeWidth=".7" fill="none" opacity=".55" strokeLinecap="round"><path d={`M${cx - 8} ${headY - 6} q4 -1.4 8 0`} /><path d={`M${cx - 10} ${headY + 6} q-1 2 0 4`} /><path d={`M${cx + 10} ${headY + 6} q1 2 0 4`} /></g>}
            <Eyes e={expression} cx={cx} cy={headY + 0.5} iris={iris} />
            <Brows e={expression} cx={cx} cy={headY + 0.5} color={cap || spec.hairStyle === 'bald' ? shade(spec.hair, -0.1) : shade(spec.hair, -0.1)} />
            <path d={`M${cx - 0.8} ${headY + 3} Q${cx - 2.6} ${headY + 6.4} ${cx - 0.6} ${headY + 7.4} Q${cx + 1} ${headY + 7.6} ${cx + 2} ${headY + 6.6}`} stroke={skinD} strokeWidth="1.1" fill="none" strokeLinecap="round" />
            <Mouth e={expression} cx={cx} cy={headY + 0.5} />
            {spec.glasses && <g fill="#cfe9ff" fillOpacity=".18" stroke="#2a2230" strokeWidth="1.1"><rect x={cx - 10.4} y={headY - 3.4} width="9.2" height="7.4" rx="3" /><rect x={cx + 1.2} y={headY - 3.4} width="9.2" height="7.4" rx="3" /><path d={`M${cx - 1.2} ${headY - 0.6} q1.2 -1 2.4 0`} fill="none" /></g>}
            {expression === 'thinking' && <g fill="#fff" stroke={INK} strokeWidth="1"><circle cx={cx + 22} cy={headY - 14} r="2" /><circle cx={cx + 28} cy={headY - 22} r="3" /><ellipse cx={cx + 38} cy={headY - 32} rx="9" ry="6" /></g>}
          </g>
        </g>
      </g>
    </svg>
  );
}
