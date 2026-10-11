import type { ReactNode } from 'react';

export type BuildingKind = 'home' | 'clinic' | 'grocery' | 'ymca' | 'park' | 'water' | 'factory' | 'bus' | 'ambulance' | 'tree';
export const BUILDINGS: { kind: BuildingKind; label: string }[] = [
  { kind: 'home', label: 'Home' }, { kind: 'clinic', label: 'Clinic' }, { kind: 'grocery', label: 'Grocery' },
  { kind: 'ymca', label: 'YMCA' }, { kind: 'park', label: 'Park' }, { kind: 'water', label: 'Water plant' },
  { kind: 'factory', label: 'Factory' }, { kind: 'bus', label: 'Bus' }, { kind: 'ambulance', label: 'Ambulance' }, { kind: 'tree', label: 'Tree' },
];

/** 3/4 isometric-ish block: left face, right face, top face. */
function Block({ x, y, w, d, h, top, left, right }: { x: number; y: number; w: number; d: number; h: number; top: string; left: string; right: string }) {
  const p = (a: number, b: number) => `${x + (a - b) * 0.866 * 1},${y + (a + b) * 0.5 - 0}`;
  const A = p(0, 0), B = p(w, 0), C = p(w, d), D = p(0, d);
  const up = (pt: string) => { const [px, py] = pt.split(',').map(Number); return `${px},${py - h}`; };
  return (
    <g>
      <polygon points={`${D} ${C} ${up(C)} ${up(D)}`} fill={left} />
      <polygon points={`${C} ${B} ${up(B)} ${up(C)}`} fill={right} />
      <polygon points={`${up(A)} ${up(B)} ${up(C)} ${up(D)}`} fill={top} />
    </g>
  );
}

const Win = ({ x, y, c = '#bfe6ff' }: { x: number; y: number; c?: string }) => <rect x={x} y={y} width="7" height="9" rx="1.5" fill={c} stroke="#00000022" />;

const ART: Record<BuildingKind, ReactNode> = {
  home: (<g><Block x={60} y={72} w={44} d={36} h={26} top="#f2d8b0" left="#e8a77c" right="#f4c09b" /><polygon points="26,66 62,38 98,66 62,54" fill="#c9533a" /><polygon points="62,38 98,66 98,72 62,48" fill="#a8412c" /><Win x={38} y={86} /><Win x={52} y={92} /><rect x={78} y={90} width="9" height="16" rx="2" fill="#7a4a32" /></g>),
  clinic: (<g><Block x={60} y={76} w={50} d={40} h={40} top="#ffffff" left="#dbe8f2" right="#f1f7fb" /><rect x={50} y={42} width="22" height="22" rx="5" fill="#e1604a" /><path d="M61 46v14M54 53h14" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" /><Win x={34} y={78} /><Win x={34} y={92} /><Win x={86} y={80} /><Win x={86} y={94} /></g>),
  grocery: (<g><Block x={60} y={78} w={54} d={36} h={28} top="#cfeecf" left="#7fc28a" right="#a6dbaa" /><path d="M24 70 h72 l-6 -14 h-60 z" fill="#f2a93b" /><path d="M30 70v8M44 70v8M58 70v8M72 70v8M86 70v8" stroke="#fff" strokeWidth="5" /><circle cx={60} cy={50} r="7" fill="#4cb86a" stroke="#fff" strokeWidth="2" /><rect x={36} y={90} width="14" height="14" rx="2" fill="#bfe6ff" /><rect x={70} y={90} width="14" height="16" rx="2" fill="#7a4a32" /></g>),
  ymca: (<g><Block x={60} y={78} w={52} d={38} h={34} top="#d9e8ff" left="#4f86e0" right="#78a6f0" /><rect x={36} y={56} width="48" height="12" rx="6" fill="#fff" /><path d="M46 62h28M44 58v8M76 58v8" stroke="#2f8fd8" strokeWidth="3.5" strokeLinecap="round" /><Win x={34} y={84} c="#fff3c0" /><Win x={34} y={98} c="#fff3c0" /><Win x={88} y={86} c="#fff3c0" /></g>),
  park: (<g><polygon points="60,40 114,70 60,100 6,70" fill="#8fd18a" /><polygon points="60,48 100,70 60,92 20,70" fill="#a6e0a0" /><path d="M30 72 Q60 56 92 72" stroke="#f0e2b8" strokeWidth="6" fill="none" strokeLinecap="round" /><ellipse cx={74} cy={62} rx="12" ry="5" fill="#56b4e9" /><g transform="translate(36 56)"><rect x="-1.5" y="6" width="3" height="10" fill="#7a4a32" /><circle cx="0" cy="2" r="9" fill="#3fa05a" /></g></g>),
  water: (<g><Block x={60} y={80} w={56} d={40} h={24} top="#d8eef7" left="#6aa7c8" right="#92c5de" /><ellipse cx={46} cy={62} rx="15" ry="7" fill="#bfe6ff" /><rect x={31} y={44} width="30" height="18" fill="#6aa7c8" /><ellipse cx={46} cy={44} rx="15" ry="7" fill="#d8eef7" /><path d="M86 66 q6 -10 12 0 t12 0" stroke="#2f8fd8" strokeWidth="3" fill="none" strokeLinecap="round" /></g>),
  factory: (<g><Block x={60} y={80} w={58} d={40} h={30} top="#cfc6b8" left="#8a7f72" right="#a89d90" /><rect x={26} y={34} width="12" height="40" fill="#8a7f72" /><rect x={26} y={34} width="12" height="5" fill="#d55e00" /><rect x={44} y={46} width="10" height="30" fill="#8a7f72" /><circle cx={34} cy={24} r="8" fill="#9aa5b1" opacity=".7" /><circle cx={44} cy={14} r="10" fill="#9aa5b1" opacity=".5" /><Win x={72} y={88} c="#ffe08a" /><Win x={86} y={92} c="#ffe08a" /></g>),
  bus: (<g><rect x={14} y={50} width="92" height="38" rx="10" fill="#f2a93b" /><rect x={14} y={72} width="92" height="6" fill="#d9871a" />{[22, 42, 62, 82].map((x) => <rect key={x} x={x} y={56} width="15" height="12" rx="3" fill="#bfe6ff" />)}<circle cx={34} cy={90} r="9" fill="#23303d" /><circle cx={34} cy={90} r="4" fill="#9aa5b1" /><circle cx={86} cy={90} r="9" fill="#23303d" /><circle cx={86} cy={90} r="4" fill="#9aa5b1" /></g>),
  ambulance: (<g><rect x={14} y={54} width="70" height="36" rx="8" fill="#fff" stroke="#00000022" /><path d="M84 62h14q8 0 10 10v18H84z" fill="#fff" stroke="#00000022" /><rect x={90} y={66} width="12" height="10" rx="2" fill="#bfe6ff" /><path d="M42 62v20M32 72h20" stroke="#e1604a" strokeWidth="6" strokeLinecap="round" /><rect x={44} y={46} width="14" height="6" rx="3" fill="#e1604a" /><circle cx={34} cy={92} r="8" fill="#23303d" /><circle cx={92} cy={92} r="8" fill="#23303d" /></g>),
  tree: (<g><rect x={57} y={70} width="7" height="26" rx="3" fill="#7a4a32" /><circle cx={60} cy={52} r="26" fill="#3fa05a" /><circle cx={48} cy={60} r="17" fill="#4cb86a" /><circle cx={72} cy={58} r="16" fill="#35914f" /><circle cx={56} cy={44} r="9" fill="#6fcf86" opacity=".7" /></g>),
};

export function Building({ kind, size = 120, title, className }: { kind: BuildingKind; size?: number; title?: string; className?: string }) {
  return (
    <svg viewBox="0 0 120 110" width={size} height={size * 0.92} role="img" aria-label={title ?? kind} className={className} style={{ overflow: 'visible' }}>
      <ellipse cx={60} cy={100} rx="48" ry="9" fill="#000" opacity=".1" />
      {ART[kind]}
    </svg>
  );
}
