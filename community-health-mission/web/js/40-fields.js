'use strict';
// Question field renderers. Each returns {el, get, set, disable}. get() returns the (possibly incomplete) response value.
CHM.fields = (function () {
  var seq = 0;
  function uid(p) { return p + (++seq); }

  function optRow(type, name, id, text, checked, onch, extra) {
    var inp = h('input', { type: type, name: name, value: id, checked: checked, onchange: onch });
    return h('label.opt' + (extra ? '.' + extra : ''), inp, h('span.opt-t', text));
  }
  function legendWrap(label, kids, cls) {
    var fs = h('fieldset.fld' + (cls ? '.' + cls : ''));
    if (label) fs.appendChild(h('legend', label));
    CHM.append(fs, kids);
    return fs;
  }

  function single(f, c) {
    var name = uid('s'), val = c.initial || null, rows = [];
    f.options.forEach(function (o) { rows.push(optRow('radio', name, o.id, o.t, val === o.id, function () { val = o.id; c.onChange(); })); });
    var el = legendWrap(f.label, rows);
    return { el: el, get: function () { return val; }, set: function (v) { val = v; Array.prototype.forEach.call(el.querySelectorAll('input'), function (i) { i.checked = (i.value === v); }); } };
  }

  function multi(f, c) {
    var name = uid('m'), val = (c.initial || []).slice(), rows = [];
    f.options.forEach(function (o) {
      rows.push(optRow('checkbox', name, o.id, o.t, val.indexOf(o.id) >= 0, function (e) {
        var i = val.indexOf(o.id); if (e.target.checked && i < 0) val.push(o.id); else if (!e.target.checked && i >= 0) val.splice(i, 1);
        c.onChange();
      }));
    });
    var el = legendWrap(f.label, [h('p.hint-s', 'Select all that apply.')].concat(rows));
    return { el: el, get: function () { return val.slice(); }, set: function (v) { val = (v || []).slice(); Array.prototype.forEach.call(el.querySelectorAll('input'), function (i) { i.checked = val.indexOf(i.value) >= 0; }); } };
  }

  function match(f, c) {
    var val = Object.assign({}, c.initial || {}), rows = [], el;
    f.rows.forEach(function (r) {
      var name = uid('x'), pills = f.cats.map(function (k) {
        return h('label.pill', h('input', { type: 'radio', name: name, value: k.id, checked: val[r.id] === k.id, onchange: function () { val[r.id] = k.id; c.onChange(); } }), h('span', k.t));
      });
      rows.push(h('div.mrow', { role: 'group', 'aria-label': r.t }, h('div.mrow-t', r.t), h('div.pills', pills)));
    });
    el = legendWrap(f.label, [h('p.hint-s', 'Choose one category for every item.')].concat(rows), 'match');
    return { el: el, get: function () { return Object.assign({}, val); }, set: function (v) { val = Object.assign({}, v || {}); Array.prototype.forEach.call(el.querySelectorAll('input'), function (i) { var rid = null; i.closest('.mrow').getAttribute('aria-label'); f.rows.forEach(function (r) { if (r.t === i.closest('.mrow').getAttribute('aria-label')) rid = r.id; }); i.checked = val[rid] === i.value; }); } };
  }

  function order(f, c) {
    var list = (c.initial && c.initial.length === f.items.length) ? c.initial.slice() : f.items.map(function (i) { return i.id; });
    var ol = h('ol.order'), dragId = null, disabled = false;
    function draw(focusId, focusDir) {
      CHM.clear(ol);
      list.forEach(function (id, i) {
        var li = h('li.oi', { draggable: !disabled ? 'true' : null, 'data-id': id },
          h('span.grip', { 'aria-hidden': 'true' }, '⋮⋮'),
          h('span.oi-n', (i + 1) + '.'), h('span.oi-t', CHM.optText(f.items, id)),
          h('span.oi-b',
            h('button.mini', { type: 'button', disabled: disabled || i === 0, 'aria-label': 'Move up: ' + CHM.optText(f.items, id), 'data-dir': 'up', onclick: function () { move(i, -1, id, 'up'); } }, '↑'),
            h('button.mini', { type: 'button', disabled: disabled || i === list.length - 1, 'aria-label': 'Move down: ' + CHM.optText(f.items, id), 'data-dir': 'down', onclick: function () { move(i, 1, id, 'down'); } }, '↓')));
        li.addEventListener('dragstart', function (e) { dragId = id; try { e.dataTransfer.setData('text/plain', id); } catch (x) { /* ignore */ } li.classList.add('dragging'); });
        li.addEventListener('dragend', function () { li.classList.remove('dragging'); });
        li.addEventListener('dragover', function (e) { e.preventDefault(); });
        li.addEventListener('drop', function (e) { e.preventDefault(); if (!dragId || dragId === id) return; var a = list.indexOf(dragId), b = list.indexOf(id); list.splice(a, 1); list.splice(b, 0, dragId); dragId = null; draw(); c.onChange(); });
        ol.appendChild(li);
      });
      if (focusId) { var b = ol.querySelector('li[data-id="' + focusId + '"] button[data-dir="' + focusDir + '"]') || ol.querySelector('li[data-id="' + focusId + '"] button:not([disabled])'); if (b) b.focus(); }
    }
    function move(i, d, id, dir) { var j = i + d; var t = list[i]; list[i] = list[j]; list[j] = t; draw(id, dir); CHM.announce(CHM.optText(f.items, id) + ' moved to position ' + (j + 1)); c.onChange(); }
    draw();
    var el = legendWrap(f.label, [h('p.hint-s', 'Use the arrow buttons or drag items to put them in order.'), ol]);
    return { el: el, get: function () { return list.slice(); }, set: function (v) { if (v && v.length === f.items.length) { list = v.slice(); draw(); } }, disable: function (b) { disabled = b; draw(); } };
  }

  function num(f, c) {
    var inp = h('input.num', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': f.label, value: c.initial != null ? String(c.initial) : '', oninput: function () { c.onChange(); } });
    var el = h('div.fld.numfld', h('label', { class: 'numlab' }, f.label), h('div.numrow', inp, h('span.unit', f.unit || '')));
    el.querySelector('label').setAttribute('for', inp.id = uid('n'));
    return { el: el, get: function () { var t = inp.value.trim(); return t === '' ? null : t; }, set: function (v) { inp.value = v == null ? '' : v; }, disable: function (b) { inp.disabled = b; } };
  }

  function mapselect(f, c) {
    var val = (c.initial || []).slice(), spots = CHM.content.modules[0].explorer.data.spots;
    var svgHost = h('div.minimap'), name = uid('ms'), rows = [];
    function redraw() { CHM.clear(svgHost); svgHost.appendChild(CHM.riverbendMap({ spots: spots, selected: val, onToggle: toggle, compact: true, labelFor: function (s) { return s.t; } })); Array.prototype.forEach.call(el.querySelectorAll('input[type=checkbox]'), function (i) { i.checked = val.indexOf(i.value) >= 0; }); }
    function toggle(id) { if (disabledNow) return; var i = val.indexOf(id); if (i >= 0) val.splice(i, 1); else val.push(id); redraw(); c.onChange(); }
    var disabledNow = false;
    f.options.forEach(function (o) { rows.push(optRow('checkbox', name, o.id, o.t, val.indexOf(o.id) >= 0, function (e) { var i = val.indexOf(o.id); if (e.target.checked && i < 0) val.push(o.id); else if (!e.target.checked && i >= 0) val.splice(i, 1); redraw(); c.onChange(); })); });
    var el = legendWrap(f.label, [h('p.hint-s', 'Click pins on the map or use the checklist below. Both do the same thing.'), svgHost, h('div.optgrid', rows)]);
    redraw();
    return { el: el, get: function () { return val.slice(); }, set: function (v) { val = (v || []).slice(); redraw(); }, disable: function (b) { disabledNow = b; } };
  }

  function budget(f, c) {
    var val = (c.initial || []).slice(), name = uid('b'), rows = [], total = h('div.budget-total', { 'aria-live': 'polite' }), bar = h('div.bbar', h('div.bfill'));
    function sum() { return val.reduce(function (a, id) { return a + f.options.filter(function (o) { return o.id === id; })[0].cost; }, 0); }
    function upd() {
      var t = sum(), over = t > f.budget;
      total.className = 'budget-total' + (over ? ' over' : '');
      total.textContent = 'Selected: ' + val.length + ' of ' + f.need + ' · Total $' + t + 'k of $' + f.budget + 'k · Remaining $' + (f.budget - t) + 'k' + (over ? ' · OVER BUDGET' : '');
      bar.firstChild.style.width = Math.min(100, t / f.budget * 100) + '%'; bar.classList.toggle('over', over);
      CHM.bus.budget = { selected: val.slice(), total: t };
      if (CHM.onBudget) CHM.onBudget();
    }
    f.options.forEach(function (o) {
      rows.push(optRow('checkbox', name, o.id, o.t, val.indexOf(o.id) >= 0, function (e) {
        var i = val.indexOf(o.id);
        if (e.target.checked) { if (val.length >= f.need) { e.target.checked = false; CHM.announce('You can fund exactly ' + f.need + '. Uncheck one first.'); return; } if (i < 0) val.push(o.id); }
        else if (i >= 0) val.splice(i, 1);
        upd(); c.onChange();
      }, null));
      rows[rows.length - 1].appendChild(h('span.cost', '$' + o.cost + 'k'));
    });
    var el = legendWrap(f.label, [h('p.hint-s', 'Budget: $1 million = $1,000k. Pick exactly two.'), bar, total, h('div.optgrid.budgetgrid', rows)]);
    upd();
    return { el: el, get: function () { return val.slice(); }, set: function (v) { val = (v || []).slice(); Array.prototype.forEach.call(el.querySelectorAll('input'), function (i) { i.checked = val.indexOf(i.value) >= 0; }); upd(); } };
  }

  function simplan(f, c) {
    var sp = CHM.content.simplans[f.scenario], shared = CHM.shared[f.scenario] || (CHM.shared[f.scenario] = {});
    var val = Object.assign({}, shared, c.initial || {});
    Object.assign(shared, val);
    var groups = sp.controls.map(function (ct) {
      var name = uid('p'), g = h('fieldset.ctl', h('legend', ct.label));
      ct.options.forEach(function (o) { g.appendChild(optRow('radio', name, o.id, o.t, val[ct.id] === o.id, function () { val[ct.id] = o.id; shared[ct.id] = o.id; CHM.emit('plan', f.scenario); c.onChange(); }, 'tight')); });
      return g;
    });
    var el = h('div.fld.plan', h('div.hint-s', 'Every choice below is part of the plan. Changes also update the lab on the left; exploring is unlimited and does not use an attempt.'), h('div.ctlgrid', groups));
    return { el: el, get: function () { return Object.assign({}, val); }, set: function (v) { val = Object.assign({}, v || {}); Object.assign(shared, val); Array.prototype.forEach.call(el.querySelectorAll('input'), function (i) { var ct = null; sp.controls.forEach(function (x) { if (x.options.some(function (o) { return o.id === i.value; }) && i.closest('fieldset').firstChild.textContent === x.label) ct = x; }); i.checked = !!ct && val[ct.id] === i.value; }); CHM.emit('plan', f.scenario); } };
  }

  var R = { single: single, multi: multi, match: match, order: order, num: num, mapselect: mapselect, budget: budget, simplan: simplan };
  return { render: function (f, ctx) { return R[f.type](f, ctx); } };
})();

CHM.emit = function (name, arg) { (CHM.listeners && CHM.listeners[name] || []).forEach(function (fn) { try { fn(arg); } catch (e) { /* listener error */ } }); };
CHM.on = function (name, fn) { CHM.listeners = CHM.listeners || {}; (CHM.listeners[name] = CHM.listeners[name] || []).push(fn); return function () { CHM.listeners[name] = CHM.listeners[name].filter(function (x) { return x !== fn; }); }; };
