// Applies authoring/short.js to the mission objects (drops stages, adds points, sets time estimates). Shared by tools/build.js and the
// tests so they always see the same questions. Pass { full: true } for the original, longer test. Returns a list of problems.
import S from './short.js';

function* stagesIn(stages) { for (const s of stages) { yield s; if (s.kind === 'pool') for (const g of s.groups) yield* stagesIn(g.items); } }
function* qsOf(stage) { if (stage.kind === 'q') yield stage.q; else if (stage.kind === 'scene') yield* stage.qs; }

export function applyShort(missions, { full = false } = {}) {
  if (full) return [];
  const problems = [], usedS = new Set(), usedP = new Set();
  const keyOf = (s) => (s.kind === 'q' ? s.q.id : s.id);
  for (const mi of missions) {
    mi.stages = mi.stages.filter((s) => { if ((S.dropStages || []).includes(keyOf(s))) { usedS.add(keyOf(s)); return false; } return true; });
    if (S.est && S.est[mi.id] != null) mi.est = S.est[mi.id];
    for (const st of stagesIn(mi.stages)) for (const q of qsOf(st)) if ((S.ptsAdd || {})[q.id] != null) { q.pts += S.ptsAdd[q.id]; usedP.add(q.id); }
  }
  for (const id of S.dropStages || []) if (!usedS.has(id)) problems.push(`short.js: dropStages ${id} not found`);
  for (const id of Object.keys(S.ptsAdd || {})) if (!usedP.has(id)) problems.push(`short.js: ptsAdd ${id} not found`);
  return problems;
}
