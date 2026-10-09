// Renders stimulus blocks delivered by the server (briefings and item stems).  Text goes through md(): no innerHTML.
import { h, md, add } from './util.js';

const TONE = { fiction: 'FICTIONAL DATA', real: 'REAL RESEARCH / DATA', info: 'NOTE', warn: 'NOTE' };

export function renderBlocks(blocks) {
  const frag = document.createDocumentFragment();
  (blocks || []).forEach((b) => { const el = one(b); if (el) frag.append(el); });
  return frag;
}

function one(b) {
  switch (b.k) {
    case 'p': return h('p', { class: 'b-p' }, md(b.t));
    case 'h': return h('h3', null, md(b.t));
    case 'ul': return h('ul', { class: 'b-ul' }, b.items.map((x) => h('li', null, md(x))));
    case 'formula': return h('div', { class: 'b-formula', role: 'note' }, md(b.t));
    case 'table': return table(b);
    case 'note': return note(b);
    case 'quote': return h('figure', { class: 'b-quote' }, h('blockquote', null, md(b.t)), b.who ? h('figcaption', null, '— ' + b.who) : null);
    case 'ad': return ad(b);
    case 'post': return post(b);
    case 'chat': return chat(b);
    default: return null;
  }
}

function table(b) {
  const isNum = (s) => /^[\s$−+\-]*[\d,.]+%?\s*(×|tokens)?$/.test(String(s));
  const wrap = h('div', { class: 'b-tablewrap', tabindex: '0', role: 'group', 'aria-label': b.cap || 'Data table' });
  const t = h('table', { class: 'b-table' });
  if (b.cap) t.append(h('caption', null, b.cap));
  t.append(h('thead', null, h('tr', null, b.cols.map((c) => h('th', { scope: 'col' }, md(c))))));
  t.append(h('tbody', null, b.rows.map((r) => h('tr', null, r.map((c, i) => (i === 0 ? h('th', { scope: 'row' }, md(String(c))) : h('td', { class: isNum(c) ? 'num' : '' }, md(String(c)))))))));
  wrap.append(t);
  return wrap;
}

function note(b) {
  const tone = b.tone === 'fiction' || b.tone === 'real' ? b.tone : 'info';
  const label = b.tone === 'fiction' ? 'FICTIONAL DATA' : (b.title || TONE[tone]);
  return h('aside', { class: 'b-note tone-' + tone, role: 'note' }, h('span', { class: 'chip' }, label), h('div', null, md(b.t)));
}

function ad(b) {
  const body = h('div', { class: 'ad-body' }, md(b.body || ''));
  const card = h('div', { class: 'b-ad', role: 'group', 'aria-label': 'Fictional advertisement from ' + b.brand },
    h('div', { class: 'ad-top' }, h('strong', null, b.brand), h('span', { class: 'ad-flag' }, 'FICTIONAL AD')),
    h('div', { class: 'ad-head' }, md(b.head)));
  if (b.compact) card.append(h('details', null, h('summary', null, 'Read the full ad'), body, b.cta ? h('span', { class: 'ad-cta' }, b.cta) : null));
  else card.append(body, b.cta ? h('span', { class: 'ad-cta' }, b.cta) : null);
  return card;
}

function post(b) {
  return h('div', { class: 'b-post', role: 'group', 'aria-label': 'Fictional social media post by ' + b.who },
    h('div', { class: 'avatar', 'aria-hidden': 'true' }, (b.who || '?').replace('@', '')[0].toUpperCase()),
    h('div', null, h('strong', null, b.who), h('div', { class: 'post-t' }, md(b.t)), h('div', { class: 'post-meta muted small' }, 'Fictional post')));
}

function chat(b) {
  return h('div', { class: 'b-chat', role: 'group', 'aria-label': 'Fictional chat' }, b.msgs.map((m) => h('div', { class: 'bubble ' + (m.me ? 'me' : 'them') }, h('b', null, m.who + ': '), md(m.t))));
}
