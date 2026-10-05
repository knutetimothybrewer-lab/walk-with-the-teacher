// Builds the single-file classroom app:  node stress-brain-src/build.js
// Inlines CSS, three.js and all scripts so the result runs offline from one file.
const fs = require('fs'), path = require('path');
const d = __dirname, rd = f => fs.readFileSync(path.join(d, f), 'utf8');
const js = ['data.js', 'sim.js', 'grade.js', 'scene.js', 'ui.js', 'main.js'].map(rd).join('\n;\n');
const out = rd('shell.html')
  .replace('/*CSS*/', () => rd('style.css'))
  .replace('/*THREE*/', () => rd('vendor/three.min.js').replace(/<\/script/gi, '<\\/script'))
  .replace('/*JS*/', () => js.replace(/<\/script/gi, '<\\/script'));
fs.writeFileSync(path.join(d, '..', 'stress-brain-lab.html'), out);
console.log('stress-brain-lab.html', (out.length / 1024).toFixed(0) + ' KB');
