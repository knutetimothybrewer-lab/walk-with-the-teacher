'use strict';
// Drives the REAL UI to answer a unit from a response object (shape = server response format).
async function fillUnit(page, unit, response, pub) {
  for (let i = 0; i < unit.fields.length; i++) {
    const f = unit.fields[i], v = response[f.id];
    await page.evaluate(({ i, f, v, pub }) => {
      const wrap = document.querySelector('.qfields').children[i];
      const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
      const opt = (list, id) => (list.find(o => o.id === id) || {}).t;
      const clickOpt = (root, t) => { const l = Array.from(root.querySelectorAll('label.opt')).find(x => text(x.querySelector('.opt-t')) === t); if (!l) throw new Error('option not found: ' + t); const inp = l.querySelector('input'); if (!inp.checked || inp.type === 'checkbox') inp.click(); };
      const setNum = (root, val) => { const inp = root.querySelector('input.num'); inp.value = String(val); inp.dispatchEvent(new Event('input', { bubbles: true })); };
      if (f.type === 'single') clickOpt(wrap, opt(f.options, v));
      else if (f.type === 'multi' || f.type === 'mapselect' || f.type === 'budget') {
        const cur = Array.from(wrap.querySelectorAll('label.opt input:checked'));
        cur.forEach(c => c.click());
        v.forEach(id => clickOpt(wrap, opt(f.options, id)));
      } else if (f.type === 'match') {
        f.rows.forEach(r => { const row = Array.from(wrap.querySelectorAll('.mrow')).find(x => text(x.querySelector('.mrow-t')) === r.t); const pill = Array.from(row.querySelectorAll('label.pill')).find(x => text(x) === opt(f.cats, v[r.id])); pill.querySelector('input').click(); });
      } else if (f.type === 'num') setNum(wrap, v);
      else if (f.type === 'order') {
        const want = v.map(id => opt(f.items, id));
        for (let target = 0; target < want.length; target++) {
          for (let guard = 0; guard < 20; guard++) {
            const items = Array.from(wrap.querySelectorAll('li.oi'));
            const idx = items.findIndex(li => text(li.querySelector('.oi-t')) === want[target]);
            if (idx <= target) break;
            items[idx].querySelector('button[data-dir=up]').click();
          }
        }
      } else if (f.type === 'simplan') {
        const sp = pub.simplans[f.scenario];
        sp.controls.forEach(c => { const fs = Array.from(wrap.querySelectorAll('fieldset.ctl')).find(x => text(x.querySelector('legend')) === c.label); clickOpt(fs, opt(c.options, v[c.id])); });
      }
    }, { i, f, v, pub });
  }
}
module.exports = { fillUnit };
