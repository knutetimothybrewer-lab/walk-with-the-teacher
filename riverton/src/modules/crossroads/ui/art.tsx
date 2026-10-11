import { motion } from 'framer-motion';
import { Character } from '../../../platform/art/Character';
import { CAST, type Expression } from '../../../platform/art/characters';
import { Building } from '../../../platform/art/Buildings';

export const castOf = (id: string) => CAST.find((c) => c.id === id);

function Crowd({ count, tone }: { count: number; tone: string }) {
  const rows = [0, 1, 2]; const per = 10;
  return (
    <g>
      {rows.map((r) => Array.from({ length: per }, (_, i) => {
        const idx = r * per + i; const on = idx < count; const x = 60 + i * 84 + (r % 2) * 20; const y = 292 + r * 34;
        return <g key={`${r}-${i}`} opacity={on ? 1 : 0.18}><rect x={x - 20} y={y + 10} width="40" height="16" rx="5" fill="#6b4a2f" /><circle cx={x} cy={y} r="11" fill={on ? ['#c68863', '#8d5a3b', '#f0c9a4', '#6e4530'][idx % 4] : '#8a7f72'} /><rect x={x - 11} y={y + 10} width="22" height="14" rx="6" fill={on ? ['#e1604a', '#2f8fd8', '#4cb86a', tone][idx % 4] : '#8a7f72'} /></g>;
      }))}
    </g>
  );
}

export function Backdrop({ scene, crowd = 12 }: { scene: string; crowd?: number }) {
  const sky = scene === 'neighborhood' || scene === 'outbreakCurve' ? ['#2b2b5e', '#6a4c93'] : scene === 'communityCenter' ? ['#ffd9a0', '#ffb36b'] : scene === 'timeskip' ? ['#9bd1f5', '#e9f6ff'] : ['#d8e4f2', '#aac4de'];
  return (
    <svg viewBox="0 0 900 420" className="backdrop" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs><linearGradient id={`g-${scene}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} /></linearGradient></defs>
      <rect width="900" height="420" fill={`url(#g-${scene})`} />
      {scene === 'cityHall' && (<g>
        <motion.g animate={{ x: [0, 6, 0] }} transition={{ duration: 9, repeat: Infinity }}><rect x="0" y="40" width="900" height="6" fill="#00000010" /></motion.g>
        <rect x="0" y="0" width="900" height="250" fill="#c9d6e5" /><rect x="320" y="30" width="260" height="150" rx="10" fill="#8aa3c0" /><circle cx="450" cy="105" r="36" fill="#f2f6fb" /><path d="M450 78v54M423 105h54" stroke="#2f8fd8" strokeWidth="8" />
        {[80, 200, 700, 820].map((x) => <rect key={x} x={x} y="50" width="50" height="110" rx="8" fill="#e8eef6" />)}
        <rect x="0" y="250" width="900" height="170" fill="#8b6b4a" /><rect x="360" y="230" width="180" height="46" rx="8" fill="#5b3f2a" />
        <Crowd count={crowd} tone="#f2a93b" /></g>)}
      {scene === 'communityCenter' && (<g>
        <rect x="0" y="260" width="900" height="160" fill="#c98b5a" /><rect x="0" y="0" width="900" height="260" fill="#ffe3b3" />
        <path d="M0 40 Q150 90 300 40 T600 40 T900 40" stroke="#e1604a" strokeWidth="6" fill="none" />
        {[['#e1604a', 90], ['#2f8fd8', 190], ['#f2a93b', 290], ['#4cb86a', 640], ['#8a5cd6', 750]].map(([c, x]) => <motion.circle key={x as number} cx={x as number} cy={80} r={22} fill={c as string} animate={{ cy: [80, 70, 80] }} transition={{ duration: 3 + (x as number) / 400, repeat: Infinity }} />)}
        <rect x="260" y="40" width="380" height="60" rx="12" fill="#fff8e8" /><text x="450" y="80" textAnchor="middle" fontFamily="var(--font-display)" fontSize="28" fill="#7a4a1c">Eastside Community Center</text>
        <Crowd count={crowd} tone="#e1604a" /></g>)}
      {(scene === 'neighborhood' || scene === 'outbreakCurve') && (<g>
        {[0, 1, 2, 3, 4, 5].map((i) => <g key={i} transform={`translate(${30 + i * 150} 210)`}><rect width="110" height="150" rx="8" fill={['#3b3b78', '#4b3f8a', '#35356b'][i % 3]} />{[0, 1, 2].map((r) => [0, 1].map((c) => <rect key={`${r}${c}`} x={18 + c * 46} y={20 + r * 38} width="28" height="24" rx="4" fill={(i + r + c) % 3 === 0 ? '#ffe08a' : '#1c1c44'} />))}</g>)}
        {Array.from({ length: 16 }, (_, i) => <circle key={i} cx={(i * 61) % 900} cy={(i * 37) % 160} r={1.6} fill="#fff" opacity=".7" />)}
        <rect x="0" y="360" width="900" height="60" fill="#23233f" /></g>)}
      {scene === 'timeskip' && (<g>
        <rect x="0" y="300" width="900" height="120" fill="#a9d68f" />
        <g transform="translate(90 140)"><rect width="230" height="170" rx="16" fill="#e8e0cf" /><text x="115" y="30" textAnchor="middle" fontFamily="var(--font-display)" fontSize="20" fill="#6b4a2f">Year 0: Elm Street lot</text><path d="M20 140 Q60 120 100 140 T200 140" stroke="#8a7f72" strokeWidth="6" fill="none" /><circle cx="70" cy="110" r="10" fill="#8a9a5b" /><circle cx="150" cy="118" r="8" fill="#8a9a5b" /></g>
        <g transform="translate(520 120)"><rect width="300" height="190" rx="16" fill="#f6fbff" /><text x="150" y="28" textAnchor="middle" fontFamily="var(--font-display)" fontSize="20" fill="#2f6aa0">Year 5: Elm Street</text><g transform="translate(20 40) scale(.9)"><Building kind="clinic" size={110} /></g><g transform="translate(120 44) scale(.9)"><Building kind="grocery" size={110} /></g><g transform="translate(205 50) scale(.8)"><Building kind="tree" size={100} /></g></g>
        <motion.text x="450" y="92" textAnchor="middle" fontFamily="var(--font-display)" fontSize="34" fill="#23303d" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.4, repeat: Infinity }}>Five years later…</motion.text></g>)}
      
    </svg>
  );
}

export function Stage({ scene, cast, crowd, children }: { scene: string; cast?: { who: string; expr?: string; side?: string }[]; crowd?: number; children?: React.ReactNode }) {
  return (
    <div className={`stage ${children ? 'talk' : ''}`}>
      <Backdrop scene={scene} crowd={crowd} />
      <div className="cast">
        {cast?.map((c, i) => { const spec = castOf(c.who); if (!spec) return null; return (
          <motion.div key={c.who} className={`cast-${c.side ?? (i % 2 ? 'right' : 'left')}`} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 * i, type: 'spring', stiffness: 160, damping: 16 }}>
            <Character spec={spec} expression={(c.expr as Expression) ?? 'neutral'} size={230} bob />
          </motion.div>); })}
      </div>
      {children}
    </div>
  );
}
