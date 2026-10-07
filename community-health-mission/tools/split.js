'use strict';
// Splits the mixed authoring content into a PUBLIC bundle (no answers) and a PRIVATE key set.
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..');
const C = path.join(ROOT, 'content', 'src');            // public-safe sources (no answers)
const PSRC = path.join(ROOT, 'private', 'content-src'); // PRIVATE authoring sources with answer keys (git-ignored)
const common = require(path.join(C, 'common'));
const HAVE_SRC = fs.existsSync(path.join(PSRC, 'm1.js'));
const m = HAVE_SRC ? [1, 2, 3, 4, 5, 6].map(n => require(path.join(PSRC, 'm' + n))) : [];
const refs = require(path.join(C, 'references'));

const clone = x => JSON.parse(JSON.stringify(x));

function build(opts) {
  opts = opts || {};
  const mods = opts.mods || m;
  const version = opts.version || common.VERSION;
  const simplansAll = {};
  if (!opts.mods) {
    for (const [id, s] of Object.entries(m[2].explorer.data.scenarios)) simplansAll[id] = { controls: s.controls, key: s.key, meta: { title: s.title, badge: s.badge, setup: s.setup, hazard: s.hazard, exposure: s.exposure } };
    for (const [id, s] of Object.entries(m[5].simplans)) simplansAll[id] = { controls: s.controls, key: s.key, meta: {} };
  }
  for (const [id, s] of Object.entries(opts.simplans || {})) simplansAll[id] = s;

  const priv = { version, units: {}, simplanKeys: {} };
  const pub = { version, title: opts.title || 'Community Health Mission', demo: !!opts.demo, modules: [], simplans: {}, references: [], tutorial: null };

  for (const [id, s] of Object.entries(simplansAll)) {
    priv.simplanKeys[id] = clone(s.key);
    pub.simplans[id] = { controls: clone(s.controls), meta: clone(s.meta) };
  }

  for (const mod of mods) {
    const pm = { id: mod.id, key: mod.key, title: mod.title, place: mod.place, mission: mod.mission, colors: mod.colors,
      minutes: mod.minutes || (common.MODULES_META[mod.id - 1] || {}).minutes, points: 0, explorer: clone(mod.explorer), units: [] };
    if (pm.explorer.data && pm.explorer.data.scenarios) for (const s of Object.values(pm.explorer.data.scenarios)) delete s.key;
    for (const u of mod.units) {
      const pf = []; const keys = {};
      for (const f of u.fields) {
        const g = clone(f);
        if (f.type === 'simplan') keys[f.id] = clone(simplansAll[f.scenario].key);
        else keys[f.id] = clone(f.key);
        delete g.key;
        pf.push(g);
      }
      priv.units[u.id] = { module: mod.id, points: u.points, keys, hints: u.hints, explain: u.explain, rubric: u.rubric,
        target: u.target, dok: u.dok, cog: u.cog, src: u.src, needsGraph: !!u.needsGraph, minutes: u.minutes, fieldTypes: Object.fromEntries(u.fields.map(f => [f.id, f.type])) };
      pm.units.push({ id: u.id, points: u.points, minutes: u.minutes, title: u.title, prompt: u.prompt, needsGraph: !!u.needsGraph, fields: pf });
      pm.points += u.points;
    }
    pub.modules.push(pm);
  }
  pub.references = opts.demo ? [] : refs.REFERENCES.filter(r => !r.id.startsWith('gas')).map(r => ({ org: r.org, title: r.title, url: r.url, claim: r.claim, tasks: r.tasks }));
  pub.tutorial = require(path.join(C, 'tutorial'));
  pub.totalPoints = pub.modules.reduce((a, x) => a + x.points, 0);
  priv.totalPoints = pub.totalPoints;
  return { pub, priv };
}

// Minimal assessment for DEMO mode (separate content; never the graded items).
function buildDemo() {
  const d = require(path.join(C, 'demo'));
  return build({ mods: d.mods, simplans: d.simplans, version: 'demo-1', title: 'Community Health Mission (DEMO)', demo: true });
}

// load(): returns {pub, priv}. priv is null when the private answer key is not on this machine.
function load() {
  const pubFile = path.join(ROOT, 'content', 'generated', 'public.json'), keyFile = path.join(ROOT, 'private', 'keys.json');
  if (HAVE_SRC) { const r = build(); return r; }
  if (!fs.existsSync(pubFile)) throw new Error('content/generated/public.json is missing. Rebuild from the private sources.');
  return { pub: JSON.parse(fs.readFileSync(pubFile, 'utf8')), priv: fs.existsSync(keyFile) ? JSON.parse(fs.readFileSync(keyFile, 'utf8')) : null };
}
module.exports = { build, buildDemo, load, HAVE_SRC, common, refs, mods: m };
