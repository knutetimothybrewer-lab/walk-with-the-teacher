// How often is the infection stopped, and how long do games take?
//   node tools/winrates.js [games per strategy] [difficulty] [full|quick] [strategies]
// Plays many seeded games per bot strategy and groups the endings.
require('./load.js')();
require('./strategies.js');
const { run } = globalThis.OCBots;
const D = globalThis.OutbreakCity.data, CFG = D.CONFIG;

const N = +(process.argv[2] || 40), diff = process.argv[3] || 'normal', quick = process.argv[4] === 'quick';
const strats = (process.argv[5] || 'nothing,shooter,heavyShooter,rich,random,balanced,expert').split(',');
const GROUP = { eradication: 'stopped', modelCity: 'stopped', endemic: 'contained', hollow: 'damaged', twoTier: 'damaged', zombieMayor: 'damaged', collapse: 'lost', hallFallen: 'lost', nuked: 'lost' };
const pct = (a, b) => (b ? Math.round(100 * a / b) : 0) + '%';
const mins = s => (s / 60).toFixed(1);

console.log('Difficulty ' + diff + ', ' + (quick ? 'quick' : 'full') + ' game, ' + N + ' different seeds per strategy\n');
const rows = [];
const t0 = Date.now();
for (const st of strats) {
  const c = { stopped: 0, contained: 0, damaged: 0, lost: 0 }, endings = {}, lens = [], surv = [], waves = [];
  const s0 = Date.now();
  for (let i = 0; i < N; i++) {
    const r = run(st, 'WR' + i, diff, quick);
    c[GROUP[r.ending]]++; endings[r.ending] = (endings[r.ending] || 0) + 1;
    lens.push(r.g.t); surv.push(r.g.survival()); waves.push(r.g.wave);
  }
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  // classroom time = simulated time at 1x + time spent planning between waves and reading briefings (~25 s per wave)
  const classMin = (avg(lens) + avg(waves) * 25) / 60;
  rows.push({ strategy: st, 'infection stopped': pct(c.stopped, N), 'contained (endemic)': pct(c.contained, N), 'survived, damaged': pct(c.damaged, N), 'infection wins': pct(c.lost, N),
    'avg survival': Math.round(100 * avg(surv)) + '%', 'waves played': avg(waves).toFixed(1), 'game min at 1x': mins(avg(lens)), 'shortest-longest min': mins(Math.min(...lens)) + '-' + mins(Math.max(...lens)),
    'est. class min': classMin.toFixed(0), 'compute s': ((Date.now() - s0) / 1000).toFixed(1) });
  rows[rows.length - 1].endings = Object.entries(endings).map(([k, v]) => k + ' ' + v).join(', ');
}
console.table(rows.map(r => { const o = Object.assign({}, r); delete o.endings; return o; }));
rows.forEach(r => console.log(r.strategy.padEnd(13) + r.endings));
console.log('\nTotal compute time: ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s for ' + (N * strats.length) + ' games');
