// Builds the single-file classroom app:  node body-lab-src/build.js
// Inlines CSS, three.js and all scripts so the result runs offline from one file.
const fs = require('fs'), path = require('path');
const d = __dirname, rd = f => fs.readFileSync(path.join(d, f), 'utf8');
const js = ['data.js', 'model.js', 'body1.js', 'body2.js', 'micro.js', 'ui.js', 'main.js'].map(rd).join('\n;\n');
const out = rd('shell.html')
  .replace('/*CSS*/', () => rd('style.css'))
  .replace('/*THREE*/', () => rd('vendor/three.min.js').replace(/<\/script/gi, '<\\/script'))
  .replace('/*JS*/', () => js.replace(/<\/script/gi, '<\\/script'));
fs.writeFileSync(path.join(d, '..', 'body-lab.html'), out);
console.log('body-lab.html', (out.length / 1024).toFixed(0) + ' KB');
