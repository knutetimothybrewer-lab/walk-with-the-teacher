// Builds the single-file classroom app:  node thousand-choices-src/build.js
// Inlines CSS and all scripts so the result runs offline from one file (no fonts, CDNs, or installs).
const fs = require('fs'), path = require('path');
const d = __dirname, rd = f => fs.readFileSync(path.join(d, f), 'utf8');
const js = ['engine.js', 'data.js', 'figure.js', 'fx.js', 'ui.js'].map(rd).join('\n;\n');
const out = rd('shell.html')
  .replace('/*CSS*/', () => rd('style.css'))
  .replace('/*JS*/', () => js.replace(/<\/script/gi, '<\\/script'));
fs.writeFileSync(path.join(d, '..', 'health-by-a-thousand-choices.html'), out);
console.log('health-by-a-thousand-choices.html', (out.length / 1024).toFixed(0) + ' KB');
