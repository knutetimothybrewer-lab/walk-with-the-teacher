// Loads the non-UI scripts into a Node vm context so scoring, content and simulation can be tested without a browser.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ORDER = ['config', 'util', 'policy', 'sim', 'data/sim-data', 'data/m1', 'data/m2', 'data/m3', 'data/m4', 'data/m5', 'data/m6', 'data/m7', 'data/practice', 'data/missions', 'report-core', 'store-core'];
function load(extra) {
  const ctx = vm.createContext({ console, TextEncoder, DataView, Uint8Array, Uint32Array, Math, Date, JSON, setTimeout, clearTimeout, URL });
  ctx.globalThis = ctx;
  ctx.window = undefined;
  (ORDER.concat(extra || [])).forEach(f => {
    const p = path.join(__dirname, '..', 'js', f + '.js');
    if (!fs.existsSync(p)) return;
    vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p });
  });
  return ctx.WWQ;
}
module.exports = { load };
