/* grade.js — turns a student's response into {fraction, subs, wrong}.
   Responses:  mc    {pick: optionIndex}
               multi {picks: [optionIndex,...]}
               place {map: {tokenId: slotId}}                                  */
import { fractionMulti, fractionPlace } from './scoring.js';

const clip = (s, n = 140) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export function grade(item, resp) {
  if (item.type === 'mc') {
    const pick = resp.pick;
    const opt = item.options[pick];
    const ok = !!(opt && opt.ok);
    return { fraction: ok ? 1 : 0, subs: { [pick]: ok }, wrong: ok ? '' : clip(opt ? opt.t : '(none)') };
  }
  if (item.type === 'multi') {
    const correct = item.options.map((o, i) => (o.ok ? i : -1)).filter(i => i >= 0);
    const picks = resp.picks || [];
    const subs = {};
    picks.forEach(i => { subs[i] = !!item.options[i].ok; });
    const missed = correct.filter(i => !picks.includes(i));
    const wrongPicks = picks.filter(i => !item.options[i].ok);
    const wrong = [
      wrongPicks.length ? 'picked: ' + wrongPicks.map(i => item.options[i].t).join(' | ') : '',
      missed.length ? 'missed: ' + missed.map(i => item.options[i].t).join(' | ') : '',
    ].filter(Boolean).join(' ; ');
    return { fraction: fractionMulti(picks, correct), subs, wrong: clip(wrong) };
  }
  if (item.type === 'place') {
    const map = resp.map || {};
    const subs = {};
    const wrong = [];
    item.tokens.forEach(t => {
      const ok = map[t.id] !== undefined && map[t.id] === t.slot;
      subs[t.id] = ok;
      if (!ok) wrong.push(`${t.t} -> ${slotLabel(item, map[t.id])}`);
    });
    return { fraction: fractionPlace(map, item.tokens), subs, wrong: clip(wrong.join(' ; ')) };
  }
  throw new Error('Unknown item type ' + item.type);
}

export function slotLabel(item, slotId) {
  if (slotId === undefined) return '(unplaced)';
  const s = item.slots.find(x => x.id === slotId);
  return s ? s.t : String(slotId);
}

/** Does the response contain enough to submit? */
export function isComplete(item, resp) {
  if (item.type === 'mc') return resp.pick !== undefined && resp.pick !== null;
  if (item.type === 'multi') return (resp.picks || []).length > 0;
  if (item.type === 'place') return item.tokens.every(t => (resp.map || {})[t.id] !== undefined);
  return false;
}
