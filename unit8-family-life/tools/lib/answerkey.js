'use strict';
// Renders a teacher-readable answer key (Markdown) straight from the authoring source.
// The output contains answers, so it is only ever written under private/ (gitignored).

function correctText(it) {
  if (it.type === 'single') return (it.options.find((o) => o.ok) || {}).t || '(none)';
  if (it.type === 'multi') return it.options.filter((o) => o.ok).map((o) => '- ' + o.t).join('\n');
  if (it.type === 'order') return it.steps.map((s, i) => (i + 1) + '. ' + s).join('\n');
  if (it.type === 'numeric') return it.answer + (it.numeric && it.numeric.unit ? ' ' + it.numeric.unit : '') + (it.tolerance ? ' (+/- ' + it.tolerance + ')' : ' (exact)');
  if (it.type === 'assign') {
    const cards = it.layout === 'thread' ? (it.thread || []).filter((m) => m.to).map((m) => ({ t: m.t, to: m.to })) : it.cards;
    if ((it.mode || 'classify') === 'classify') {
      return it.targets.map((t) => '**' + t.label + '**\n' + cards.filter((c) => c.to === t.k).map((c) => '- ' + c.t).join('\n')).join('\n\n');
    }
    const lines = it.targets.map((t) => '- ' + t.label + '  =>  **' + ((cards.find((c) => c.to === t.k) || {}).t || '?') + '**');
    const decoys = cards.filter((c) => !c.to).map((c) => c.t);
    return lines.join('\n') + (decoys.length ? '\n- Not used (decoys): ' + decoys.join('; ') : '');
  }
  return '';
}

function render(src) {
  const out = [];
  out.push('# PRIVATE ANSWER KEY: Unit 8 Family Life & Sexuality summative');
  out.push('');
  out.push('**Do not commit, post, or share with students.** Generated from the authoring source by `tools/build-content.js`.');
  out.push('');
  out.push('Status: PROVISIONAL. The Unit 8 slides were not available when this was built (see `docs/TEACHER_REVIEW.md`). Read each item against your own slides before using it.');
  out.push('');
  src.chapters.forEach((ch) => {
    out.push('## Chapter ' + ch.n + ': ' + ch.title);
    out.push('');
    ch.units.forEach((u) => {
      u.items.forEach((it) => {
        out.push('### ' + it.id + ': ' + it.topic);
        out.push('*' + it.type + (it.mode ? '/' + it.mode : '') + ' | ' + it.points + ' pts | ' + it.cog + ' | objectives ' + it.obj.join(', ') + ' | ~' + it.secs + ' s*');
        out.push('');
        if (it.scene) out.push('> ' + [].concat(it.scene).join(' ') + '\n');
        out.push('**Prompt:** ' + it.prompt);
        out.push('');
        out.push('**Correct answer:**');
        out.push('');
        out.push(correctText(it));
        out.push('');
        out.push('**Hint 1:** ' + it.hints[0]);
        out.push('');
        out.push('**Hint 2:** ' + it.hints[1]);
        out.push('');
        out.push('**Explanation shown to the student:** ' + it.explanation);
        out.push('');
      });
    });
  });
  return out.join('\n');
}

module.exports = { render, correctText };
