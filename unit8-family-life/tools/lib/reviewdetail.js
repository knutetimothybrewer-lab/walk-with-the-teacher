'use strict';
// Renders private/REVIEW_DETAIL.md: the item-specific accuracy notes and the detailed claims. PRIVATE. These say which answers are
// correct, so they live only in authoring/ (gitignored, encrypted in the vault) and in the private/ output folder.

const WORDS = ['never', 'always', 'every', 'everyone', 'all', 'none', 'only', 'must', 'completely', 'entirely', 'guarantee', 'guarantees', 'guaranteed', 'impossible', 'definitely', 'no one', 'nobody', 'cannot', 'any'];

function cueStats(src) {
  const c = {}, w = {}; let nc = 0, nw = 0, hc = 0, hw = 0;
  const has = (t) => WORDS.filter((x) => new RegExp('\\b' + x + '\\b', 'i').test(t));
  src.chapters.forEach((ch) => ch.units.forEach((u) => u.items.forEach((it) => {
    if (it.type !== 'single' && it.type !== 'multi') return;
    it.options.forEach((o) => {
      const hit = has(o.t);
      if (o.ok) { nc++; if (hit.length) hc++; hit.forEach((x) => { c[x] = (c[x] || 0) + 1; }); }
      else { nw++; if (hit.length) hw++; hit.forEach((x) => { w[x] = (w[x] || 0) + 1; }); }
    });
  })));
  return { nc, nw, hc, hw, c, w };
}

function render(src, detail) {
  const out = [];
  out.push('# Review detail (PRIVATE)\n');
  out.push('**This file states which answers are correct. Do not put it in GitHub, a shared drive, or a student-visible place.** It accompanies `ANSWER_KEY.md`. It holds the notes that are too specific to publish in `docs/QA_REPORT.md` and `docs/TEACHER_REVIEW.md`.\n');
  out.push('## 1. Claims the assessment relies on (all NEED VERIFICATION)\n');
  out.push('I could not open any outside source, and I did not have your slides. Check each claim against a current public-health page and against your slides. The public file `content/sources.json` states these only at topic level.\n');
  (detail.claims || []).forEach((c) => {
    out.push('### ' + c.id + '\n');
    out.push('- **Claim as used:** ' + c.claim);
    out.push('- **Basis:** ' + c.basis);
    out.push('- **Status:** ' + c.status);
    out.push('- **Check against:** ' + c.check);
    out.push('- **Questions that rely on it:** ' + (c.items || []).join(', ') + '\n');
  });
  out.push('## 2. Item-by-item accuracy notes\n');
  const ids = [];
  src.chapters.forEach((ch) => ch.units.forEach((u) => u.items.forEach((it) => ids.push(it.id))));
  ids.forEach((id) => {
    const chk = (detail.itemChecks || {})[id], fl = (detail.itemFlags || {})[id];
    out.push('**' + id + '**' + (chk ? ' ' + chk : ' (no note)') + (fl ? '  \n  *Flag:* ' + fl : '') + '\n');
  });
  const st = cueStats(src);
  out.push('## 3. Residual limiting-word cue\n');
  out.push('Words from this list: ' + WORDS.join(', ') + '.\n');
  out.push('- Correct options containing at least one: ' + st.hc + ' of ' + st.nc + ' (' + Math.round(100 * st.hc / st.nc) + '%).');
  out.push('- Wrong options containing at least one: ' + st.hw + ' of ' + st.nw + ' (' + Math.round(100 * st.hw / st.nw) + '%).');
  out.push('- Counts in wrong options: ' + Object.keys(st.w).sort((a, b) => st.w[b] - st.w[a]).map((k) => k + ' ' + st.w[k]).join(', ') + '.');
  out.push('- Counts in correct options: ' + Object.keys(st.c).sort((a, b) => st.c[b] - st.c[a]).map((k) => k + ' ' + st.c[k]).join(', ') + '.\n');
  out.push('A test-wise student may learn that options built around the words with the biggest gap are usually wrong. If you want the gap closed, tell me and I will rewrite those options.\n');
  return out.join('\n');
}

module.exports = { render, cueStats };
