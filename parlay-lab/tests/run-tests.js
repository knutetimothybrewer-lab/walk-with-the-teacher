// Run with:  node tests/run-tests.js
const { load } = require('./load');
const ctx = load();
const t0 = Date.now();
const out = ctx.PL.SelfTest.run({ samples: 200 });
out.results.forEach(r => console.log((r.ok ? '  PASS  ' : '  FAIL  ') + r.name + (r.detail ? '\n        ' + r.detail : '')));
console.log('\n' + out.passed + '/' + out.total + ' passed in ' + (Date.now() - t0) + ' ms. Game fingerprint (HEALTH101): ' + out.fingerprint);
process.exit(out.failed ? 1 : 0);
