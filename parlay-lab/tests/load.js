// Loads the browser scripts into a Node vm context so they can be tested without a browser.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ORDER = ['seededRandom','../data/teams','../data/players','gameEngine','league','probability','props','model','parlay','simulation','analytics','classroom','storage','selftest'];
function load(files) {
  const ctx = vm.createContext({ console, setTimeout, clearTimeout, Date, Math });
  ctx.globalThis = ctx;
  (files || ORDER).forEach(f => {
    const p = path.join(__dirname, '..', 'js', f + '.js');
    if (!fs.existsSync(p)) return;
    vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p });
  });
  return ctx;
}
module.exports = { load };
