// Same full UI run as e2e-full.js, but on the 40-item short form. NODE_PATH=$(npm root -g) node tests/e2e-full-short.js [best|wrongfirst]
const { spawnSync } = require('child_process'); const path = require('path');
const r = spawnSync('node', [path.join(__dirname, 'e2e-full.js'), process.argv[2] || 'best', 'short'], { stdio: 'inherit', env: process.env });
process.exit(r.status || 0);
