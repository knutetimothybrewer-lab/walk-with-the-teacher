// Accessibility audit: accessible names, labels, duplicate ids, heading order, focus order basics, computed text contrast (WCAG AA), reduced motion.
// NODE_PATH=$(npm root -g) node tests/a11y.js
const { chromium } = require('playwright'); const path = require('path'); const { BROWSER } = require('./helpers');
let fails = 0, passes = 0; const ok = (c, m) => { if (c) { passes++; console.log('  ok  :', m); } else { fails++; console.log('  FAIL:', m); } };
const AUDIT = () => {
  const out = { noName: [], noLabel: [], dupIds: [], contrast: [], headings: [], imgs: [] };
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const name = e => (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') && [...e.getAttribute('aria-labelledby').split(' ')].map(i => (document.getElementById(i) || {}).textContent).join(' ') || e.textContent || e.getAttribute('title') || '').trim();
  document.querySelectorAll('button, a[href], [role=button], [role=tab]').forEach(e => { if (vis(e) && !name(e)) out.noName.push(e.outerHTML.slice(0, 90)); });
  document.querySelectorAll('input, select, textarea').forEach(e => { if (e.type === 'hidden' || !vis(e) && e.type !== 'radio' && e.type !== 'checkbox') return; const lab = e.labels && e.labels.length || e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.closest('label') || e.closest('fieldset'); if (!lab) out.noLabel.push(e.outerHTML.slice(0, 90)); });
  const ids = {}; document.querySelectorAll('[id]').forEach(e => { ids[e.id] = (ids[e.id] || 0) + 1; }); Object.keys(ids).forEach(k => { if (ids[k] > 1) out.dupIds.push(k); });
  let last = 0; document.querySelectorAll('h1,h2,h3,h4').forEach(h => { const l = +h.tagName[1]; if (last && l > last + 1) out.headings.push(h.tagName + ' after H' + last + ': ' + h.textContent.slice(0, 30)); last = l; });
  document.querySelectorAll('svg').forEach(s => { if (!s.closest('[aria-hidden=true]') && !s.getAttribute('aria-hidden') && !s.getAttribute('role') && !s.querySelector('title') && !s.classList.contains('ico') && s.getBoundingClientRect().width > 0) out.imgs.push(s.outerHTML.slice(0, 80)); });
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const bgOf = e => { let layers = [], n = e; while (n && n.nodeType === 1) { const cs = getComputedStyle(n); if (cs.backgroundImage !== 'none' && !/^url/.test(cs.backgroundImage) && cs.backgroundImage.indexOf('gradient') >= 0 && n !== e) return null; const c = parse(cs.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a === 1) break; } n = n.parentElement; } let base = { r: 255, g: 255, b: 255, a: 1 }; for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base); return base; };
  const seen = new Set();
  document.querySelectorAll('body *').forEach(e => {
    if (e.closest('svg') || !vis(e)) return; const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!own) return;
    if (e.disabled || e.closest('[disabled]') || e.closest('.lock') || e.getAttribute('aria-disabled') === 'true' || e.closest('.opt.disabled')) return; // disabled controls are exempt under WCAG 1.4.3
    let op = 1, n = e; while (n && n.nodeType === 1) { op *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; }
    const cs = getComputedStyle(e), fg = parse(cs.color), bg = bgOf(e); if (!fg || !bg) return; const f2 = over({ ...fg, a: fg.a * op }, bg);
    const L1 = lum(f2), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05), size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700, large = size >= 24 || (bold && size >= 18.66), need = large ? 3 : 4.5;
    if (ratio < need) { const k = e.className + '|' + cs.color + '|' + ratio.toFixed(2); if (!seen.has(k)) { seen.add(k); out.contrast.push(`${e.tagName}.${e.className} "${e.textContent.trim().slice(0, 28)}" ${ratio.toFixed(2)} < ${need}`); } }
  });
  return out;
};
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' })).newPage(); await page.addInitScript(BROWSER);
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForSelector('#stage-title');
  await page.evaluate(() => __T.start('a11y'));
  const targets = [[0, '0.1'], [0, '0.2'], [0, '0.3'], [1, '1.1'], [1, '1.2'], [1, '1.3'], [2, '2.1'], [2, '2.2'], [2, '2.4'], [3, '3.1'], [3, '3.2'], [3, '3.5'], [4, '4.1'], [4, '4.6'], [5, '5.1'], [5, '5.3'], [6, '6.1'], [6, '6.3'], [6, '6.4'], [6, '6.6'], [7, '7.1'], [7, '7.2']];
  const agg = { noName: new Set(), noLabel: new Set(), dupIds: new Set(), contrast: new Set(), headings: new Set(), imgs: new Set() };
  const run = async (label) => { const r = await page.evaluate(AUDIT); Object.keys(agg).forEach(k => r[k].forEach(x => agg[k].add(label + ': ' + x))); };
  for (const [m, s] of targets) { await page.evaluate(([m]) => { for (let k = 1; k < m; k++) __T.completeMission(k, 'best'); }, [m]); await page.evaluate(([m, s]) => __T.go(m, s), [m, s]); await page.waitForTimeout(80); await run(s); }
  // after submission states (feedback colors)
  await page.evaluate(() => { __T.go(2, '2.2'); }); await page.evaluate(() => { const it = WWQ.ITEM_BY_ID['m2.read.1'], rec = WWQ.Store.ensureItem(WWQ.App.state, 'm2.read.1'); if (!rec.attempts.length) { WWQ.Policy.submit(it, rec, __T.extreme(it.variants[0], -1)); } WWQ.App.go({ m: 2, s: '2.2' }); }); await run('2.2 review');
  for (const v of ['map', 'review']) { await page.evaluate(v => __T.go(v), v); await run(v); }
  await page.evaluate(() => { for (let m = 1; m <= 7; m++) __T.completeMission(m, 'best'); WWQ.Store.submitFinal(WWQ.App.state); WWQ.App.go({ view: 'results' }); }); await run('results');
  await page.evaluate(() => WWQ.Shell.myWork()); await run('myWork'); await page.keyboard.press('Escape');
  await page.evaluate(() => WWQ.Shell.settings()); await run('settings'); await page.keyboard.press('Escape');
  ok(agg.noName.size === 0, 'every visible button/link/tab has an accessible name ' + [...agg.noName].slice(0, 3).join(' | '));
  ok(agg.noLabel.size === 0, 'every form control is labelled ' + [...agg.noLabel].slice(0, 3).join(' | '));
  ok(agg.dupIds.size === 0, 'no duplicate ids ' + [...agg.dupIds].slice(0, 5).join(','));
  ok(agg.headings.size === 0, 'no skipped heading levels ' + [...agg.headings].slice(0, 5).join(' | '));
  ok(agg.imgs.size === 0, 'meaningful SVGs have names or are hidden ' + [...agg.imgs].slice(0, 2).join(' | '));
  ok(agg.contrast.size === 0, 'text contrast meets WCAG AA (4.5:1, 3:1 large) on audited screens' + (agg.contrast.size ? '\n      ' + [...agg.contrast].slice(0, 25).join('\n      ') : ''));
  // lang, title, landmarks, skip link
  ok(await page.evaluate(() => document.documentElement.lang === 'en' && !!document.querySelector('main') && !!document.querySelector('header[role=banner], header') && !!document.querySelector('.skip')), 'lang, main/header landmarks and skip link present');
  // focus visible on tab
  await page.evaluate(() => WWQ.App.go({ view: 'map' })); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  const ring = await page.evaluate(() => { const e = document.activeElement; return getComputedStyle(e).boxShadow !== 'none' || getComputedStyle(e).outlineStyle !== 'none'; }); ok(ring, 'keyboard focus ring visible on focused control');
  // targets at least 24px (44px for primary)
  const small = await page.evaluate(() => [...document.querySelectorAll('button, .opt, select, input.txt')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 32 && !e.classList.contains('sm') && getComputedStyle(e).opacity !== '0'); }).map(e => e.outerHTML.slice(0, 60))); ok(small.length === 0, 'interactive targets are at least 32px tall ' + small.slice(0, 3).join(' | '));
  await browser.close(); console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
