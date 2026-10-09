'use strict';
// Transparent time model for a 10th-grade student.  It is an ESTIMATE computed from the content of each item, not a measurement.
// Two profiles: TYPICAL (a comfortable reader with a calculator) and SLOW (a struggling reader / slower with numbers).
// The 90-minute cap must hold even for SLOW.  Pilot with a real class and adjust.
const PROFILES = {
  typical: { wpm: 170, numField: 24, ratioField: 30, choice: 18, multiBase: 15, multiOpt: 6, mapRow: 12, order: 35, retry: 1.15 },
  slow:    { wpm: 135, numField: 32, ratioField: 40, choice: 24, multiBase: 20, multiOpt: 8, mapRow: 16, order: 48, retry: 1.3 }
};
const SKIP = ['k', 'tone', 'id', 'ui', 'type', 'kind', 'w', 'lvl', 'key', 'ans', 'tol', 'rel', 'dec', 'hint', 'unit', 'tag', 'cta', 'min', 'max', 'fixed'];
function words(v) {
  if (v == null) return 0;
  if (typeof v === 'string') return v.split(/\s+/).filter(Boolean).length;
  if (Array.isArray(v)) return v.reduce((a, x) => a + words(x), 0);
  if (typeof v === 'object') {
    if (v.compact) return words(v.brand) + words(v.head);          // collapsed ads: only brand + headline are read
    let n = 0; for (const k of Object.keys(v)) { if (SKIP.includes(k)) continue; n += words(v[k]); } return n;
  }
  return 0;
}
function itemMinutes(it, profile) {
  const P = PROFILES[profile || 'typical'];
  let read = words(it.stim) + words(it.prompt), work = 0;
  it.parts.forEach((p) => {
    read += words(p.prompt) + words(p.options) * 0.8 + words(p.rows);
    if (p.type === 'choice') work += P.choice;
    else if (p.type === 'multi') work += P.multiBase + P.multiOpt * p.options.length;
    else if (p.type === 'map') work += P.mapRow * p.rows.length;
    else if (p.type === 'order') work += P.order;
    else if (p.type === 'number') work += p.fields.reduce((a, f) => a + (f.kind === 'ratio' ? P.ratioField : P.numField), 0);
  });
  return Math.round(((read / P.wpm) * 60 + work * P.retry) / 6) / 10;
}
// Non-item steps: reading time for intro/brief text plus the stated exploration time for simulations.
function stepMinutes(st, profile) {
  const P = PROFILES[profile || 'typical'];
  if (st.kind === 'sim') return (st.min || 1) * (profile === 'slow' ? 1.4 : 1);
  return Math.round((words(st.blocks || []) + words(st.goal || '')) / P.wpm * 10) / 10;
}
module.exports = { PROFILES, itemMinutes, stepMinutes, words };
