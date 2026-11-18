// Headless balance bots: node tools/bots.js [seeds] [difficulty] [full|quick] [strategies]
// Strategies: nothing, shooter, shooterNeutral, balanced, expert, rich, random
require('./load.js')();
require('./strategies.js');
const { run } = globalThis.OCBots;
module.exports = globalThis.OCBots;

if (require.main === module) {
  const seeds = (process.argv[2] || 'TEST01,ABC,K7Q2MX').split(',');
  const diff = process.argv[3] || 'normal', quick = process.argv[4] === 'quick';
  const strats = (process.argv[5] || 'nothing,shooter,shooterNeutral,balanced').split(',');
  const rows = [];
  for (const s of strats) for (const seed of seeds) { const r = run(s, seed, diff, quick); delete r.log; delete r.g; rows.push(r); }
  console.table(rows);
}
