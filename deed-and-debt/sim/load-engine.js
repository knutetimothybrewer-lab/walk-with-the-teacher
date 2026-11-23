// Loads GAME_CONTENT and Engine straight out of ../index.html, so tests run the exact shipped code.
const fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function loadEngine(file) {
  const html = fs.readFileSync(file || path.join(__dirname, '..', 'index.html'), 'utf8');
  const grab = (id) => { const m = html.match(new RegExp('<script id="' + id + '">([\\s\\S]*?)</script>')); if (!m) throw new Error('script #' + id + ' not found'); return m[1]; };
  const ctx = vm.createContext({ console, Math, JSON, Date });
  vm.runInContext(grab('game-content') + '\n' + grab('engine') + '\nthis.Engine = Engine; this.GAME_CONTENT = GAME_CONTENT;', ctx, { filename: 'index.html' });
  return { Engine: ctx.Engine, C: ctx.GAME_CONTENT };
};
