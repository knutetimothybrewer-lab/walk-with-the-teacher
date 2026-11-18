// Loads the game's browser scripts into Node (no DOM) for headless sim / bots.
const fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function load(files) {
  files = files || ['config.js', 'content.js', 'core.js', 'city.js', 'sim.js'];
  for (const f of files) {
    const p = path.join(__dirname, '..', 'js', f);
    if (fs.existsSync(p)) vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: p });
  }
  return globalThis.OutbreakCity;
};
