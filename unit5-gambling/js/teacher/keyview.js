// Answer key, explanations, learning-objective coverage and the cognitive-level distribution.  Teacher token required (server-checked).
import { h, clear, fmt } from '../util.js';
import { tcall } from './tapi.js';
import { saveCsv, fileStamp } from './export.js';

const LEVELS = [['R', 'Remember'], ['U', 'Understand'], ['P', 'Apply'], ['N', 'Analyze'], ['E', 'Evaluate']];
const TARGET = [['Remember + Understand', 15, ['R', 'U']], ['Apply', 30, ['P']], ['Analyze', 35, ['N']], ['Evaluate', 20, ['E']]];

export async function build(host) {
  const r = await tcall('answerKey', {});
  if (!r.ok) { host.append(h('div', { class: 'notice bad', role: 'alert' }, r.message || 'Could not load the answer key.')); return; }
  const LO = window.U5_LO || {};
  const items = []; r.chapters.forEach((c) => c.steps.forEach((s) => { if (s.kind === 'item') items.push(Object.assign({ chapter: c.id }, s)); }));
  // points by cognitive level (a part's share of an item's points follows its weight)
  const byLvl = {}; let parts = 0;
  items.forEach((it) => { const ws = it.parts.map((p) => p.w || 1), sw = ws.reduce((a, b) => a + b, 0); it.parts.forEach((p, i) => { parts++; byLvl[p.lvl] = (byLvl[p.lvl] || 0) + (it.pts * ws[i]) / sw; }); });
  const total = r.totalPts;
  const dist = TARGET.map((t) => { const pts = t[2].reduce((a, l) => a + (byLvl[l] || 0), 0); return { label: t[0], target: t[1], pts, pct: (100 * pts) / total }; });
  // LO coverage
  const cover = {}; items.forEach((it) => (it.lo || []).forEach((id) => { (cover[id] = cover[id] || []).push(it.id); }));
  const loIds = Object.keys(LO).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const itemCard = (it) => h('details', { class: 'keyitem' }, h('summary', null, h('strong', null, it.item.title), h('span', { class: 'tag' }, `${it.id} · ${it.pts} pts`)),
    h('div', { class: 'kp-body' }, it.item.prompt ? h('p', { class: 'muted' }, it.item.prompt) : null,
      h('h4', null, 'Correct answer'), it.key.map((p) => h('p', { class: 'kp-key' }, p.text)),
      it.variant ? h('p', { class: 'small muted' }, 'Numbers differ for each student; the example shown uses a generic seed. In a preview, the key panel shows the exact numbers your preview sees.') : null,
      it.hints.length ? [h('h4', null, 'Hints'), h('ol', null, it.hints.map((x) => h('li', null, x)))] : null,
      h('h4', null, 'Explanation shown after the question locks'), h('p', null, it.explain),
      h('p', { class: 'small muted' }, 'Learning objectives: ' + (it.lo || []).join(', ') + ' · levels: ' + it.levels.map((l) => (LEVELS.find((x) => x[0] === l) || [l, l])[1]).join(', '))));

  host.append(h('h2', null, 'Answer key and coverage'),
    h('div', { class: 'notice warn' }, h('strong', null, 'Private. '), 'This page is delivered only after the server verifies your teacher sign-in. The answer key is never in the public website files.'),
    h('div', { class: 'stat-grid', style: 'margin-top:1rem' }, st('Scored questions', items.length), st('Checked responses', parts, 'parts within questions'), st('Total points', total), st('Learning objectives', loIds.length, `${loIds.filter((id) => cover[id]).length} covered`)),
    h('div', { class: 'panel', style: 'margin-top:1rem' }, h('h3', null, 'Cognitive-level distribution (by points)'),
      h('table', { class: 't-table small' }, h('thead', null, h('tr', null, ['Level', 'Target', 'This assessment', 'Points'].map((x) => h('th', { scope: 'col' }, x)))), h('tbody', null, dist.map((d) => h('tr', null, h('th', { scope: 'row' }, d.label), h('td', { class: 'num' }, d.target + '%'), h('td', { class: 'num' }, fmt(d.pct, 1) + '%'), h('td', { class: 'num' }, fmt(d.pts, 1)))))),
      h('p', { class: 'muted small' }, 'Each part of a question carries a level tag. A part’s share of the question’s points follows its weight. Tags are the author’s judgment; they are not a validated psychometric measure.')),
    h('div', { class: 'controls', style: 'margin:1rem 0' }, h('button', { class: 'btn btn-sm', type: 'button', onclick: () => saveCsv(`answer-key-${fileStamp()}.csv`, ['Chapter', 'Question', 'Title', 'Points', 'Correct answer', 'Explanation', 'Learning objectives'], items.map((it) => [it.chapter, it.id, it.item.title, it.pts, it.key.map((p) => p.text).join(' || '), it.explain, (it.lo || []).join(' ')])) }, 'Download answer key (CSV)'),
      h('button', { class: 'btn btn-sm', type: 'button', onclick: () => host.querySelectorAll('details.keyitem').forEach((d) => { d.open = true; }) }, 'Expand all'), h('button', { class: 'btn btn-sm', type: 'button', onclick: () => host.querySelectorAll('details.keyitem').forEach((d) => { d.open = false; }) }, 'Collapse all')),
    r.chapters.map((c) => h('section', { class: 'panel', style: 'margin-bottom:1rem' }, h('h3', null, `Chapter ${c.id}: ${c.title}`, h('span', { class: 'small muted' }, `  ${c.points} pts · about ${c.minutes} min planned`)), items.filter((i) => i.chapter === c.id).map(itemCard))),
    h('div', { class: 'panel' }, h('h3', null, 'Learning-objective coverage'),
      h('div', { class: 't-scroll' }, h('table', { class: 't-table small' }, h('thead', null, h('tr', null, ['Objective', 'Statement', 'Questions', 'Curriculum source'].map((x) => h('th', { scope: 'col' }, x)))),
        h('tbody', null, loIds.map((id) => h('tr', { class: cover[id] ? '' : 'near' }, h('th', { scope: 'row' }, id), h('td', null, LO[id].t), h('td', null, cover[id] ? cover[id].join(', ') : 'Taught, not separately scored'), h('td', { class: 'muted' }, (LO[id].src || []).join('; '))))))),
      h('p', { class: 'muted small' }, 'A shaded row is an objective from the unit that is taught in the simulations or discussion but is not separately scored. See docs/CURRICULUM_ALIGNMENT.md.')));
  function st(k, v, s) { return h('div', { class: 'stat' }, h('div', { class: 'k' }, k), h('div', { class: 'v' }, String(v)), s ? h('div', { class: 's' }, s) : null); }
}
