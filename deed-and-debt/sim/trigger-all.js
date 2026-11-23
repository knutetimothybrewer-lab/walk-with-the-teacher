#!/usr/bin/env node
/* Forces every Opportunity, Civic Duty, Decision Point (every option), Tenant Notice (every option),
   Life/Economy Event and Ballot Measure through the engine, for two kinds of player
   (a landlord with loans, investments and a home, and a renter with nothing), on Advanced difficulty.
   After each one, the game is played to the end by CPUs to prove there is no softlock.
   Usage: node sim/trigger-all.js                                                              */
const { Engine: E, C } = require('./load-engine')();
const T = E._test;
let runs = 0, failures = [];
const clone = (s) => JSON.parse(JSON.stringify(s));

function baseState(kind) {
  const s = E.newGame({ seed: kind === 'rich' ? 4242 : 777, groupName: 'trigger', players: [0, 1, 2, 3].map(i => ({ name: 'P' + i, cpu: true, strategy: E.STRATEGIES[i] })), settings: { difficulty: 'advanced', quickChecks: false } });
  // play into Year 3 until it is P0's turn to roll
  let k = 0;
  while (!(s.flow.year >= 3 && s.pending && s.pending.kind === 'roll' && s.pending.player === 0)) { const r = E.stepMut(s, { type: 'cpu' }); if (r.error) throw new Error(r.error); if (++k > 20000) throw new Error('no base'); }
  const p = s.players[0];
  if (kind === 'rich') {
    // give P0 a full residential group with houses, a commercial lot, a rail, loans, investments and a home
    [1, 3, 21, 5].forEach(i => { const d = s.spaces[i]; d.owner = 0; d.level = 0; d.mortgage = 0; d.lien = false; d.paid = 60; });
    s.spaces[1].level = 2; s.spaces[3].level = 2;
    p.cash = 1500; p.fund = 400; p.savings = 200; p.emergency = 50;
    if (!p.loans.some(l => l.kind === 'bank')) p.loans.push({ id: 'Lx', kind: 'bank', label: 'Bank loan', principal: 300, balance: 300, rate: 0.09, rateType: 'variable', premium: 0.02, years: 4, yearsLeft: 4, payment: 93, missed: 0, onTime: 0, collateral: null, year: 2 });
    if (!p.loans.some(l => l.kind === 'student')) p.loans.push({ id: 'Ls', kind: 'student', label: 'Student loan', principal: 500, balance: 400, rate: 0.05, rateType: 'fixed', premium: 0, years: 5, yearsLeft: 3, payment: 115, missed: 0, onTime: 1, collateral: null, year: 0 });
    p.home = { mode: 'own', units: 900, switched: false, solar: false, boughtFor: 900 };
    p.ins = { health: true, property: true, renters: false };
  } else {
    E.lotsOf(s, 0).forEach(i => { const d = s.spaces[i]; d.owner = null; d.level = 0; d.mortgage = 0; d.lien = false; });
    p.loans = []; p.fund = 0; p.savings = 0; p.emergency = 0; p.cash = 250; p.home = { mode: 'rent', units: 0, switched: false, solar: false }; p.ins = { health: false, property: false, renters: false };
  }
  return s;
}

function finish(s, label) {
  let k = 0;
  while (s.flow.stage !== 'results') {
    const r = E.stepMut(s, { type: 'cpu' });
    if (r.error) throw new Error(label + ': ' + r.error + ' pending=' + JSON.stringify(s.pending));
    if (++k > 50000) throw new Error(label + ': softlock pending=' + JSON.stringify(s.pending));
  }
  const R = E.results(s); if (!R.players.length || R.players.some(x => !isFinite(x.nw))) throw new Error(label + ': bad results');
  E.csv(s);
}
function attempt(label, fn) {
  runs++;
  try { fn(); } catch (e) { failures.push(label + ' -> ' + e.message); }
}
const seen = { opportunity: new Set(), civic: new Set(), decision: new Set(), tenant: new Set(), event: new Set(), ballot: new Set() };

for (const kind of ['rich', 'poor']) {
  const base = baseState(kind);
  for (const deck of ['opportunity', 'civic', 'decision', 'tenant']) {
    const list = { opportunity: C.OPPORTUNITY, civic: C.CIVIC, decision: C.DECISIONS, tenant: C.TENANT }[deck];
    for (const card of list) {
      const opts = card.options ? card.options.map(o => o.id) : [null];
      for (const opt of opts) {
        const label = kind + ' ' + deck + ' ' + card.id + (opt ? ':' + opt : '');
        attempt(label, () => {
          const s = clone(base); s.pending = null; T.setFX();
          T.drawCard(s, deck, s.players[0], card.id);
          if (opt) { if (!s.pending || s.pending.kind !== 'choice') throw new Error('expected choice'); const r = E.stepMut(s, { type: 'choose', option: opt }); if (r.error) throw new Error(r.error); }
          else T.advance(s);
          seen[deck].add(card.id + (opt ? ':' + opt : ''));
          finish(s, label);
        });
      }
    }
  }
  for (const ev of C.EVENTS) {
    const label = kind + ' event ' + ev.id;
    attempt(label, () => {
      const s = clone(base); s.pending = null; T.setFX();
      if (ev.requires === 'bubble') s.economy.bubble = true;
      T.drawEvent(s, ev.id, 0); seen.event.add(ev.id); // personal events hit P0 when they qualify
      T.advance(s);
      finish(s, label);
    });
  }
  for (const b of C.BALLOTS) for (const pass of [true, false]) {
    const label = kind + ' ballot ' + b.id + (pass ? ' yes' : ' no');
    attempt(label, () => {
      const s = clone(base); T.setFX();
      s.pending = { kind: 'ballot', id: b.id, voters: s.players.map(p => p.id), votes: {} };
      s.players.forEach(p => { const r = E.stepMut(s, { type: 'vote', player: p.id, yes: pass }); if (r.error) throw new Error(r.error); });
      const res = s.ballots.results[s.ballots.results.length - 1];
      if (!res || res.id !== b.id || res.passed !== pass) throw new Error('ballot result wrong');
      seen.ballot.add(b.id);
      finish(s, label);
    });
  }
}
// tie vote fails
attempt('tie ballot fails', () => {
  const s = baseState('rich'); s.pending = { kind: 'ballot', id: 'b_levy', voters: [0, 1, 2, 3], votes: {} };
  [true, true, false, false].forEach((v, i) => E.stepMut(s, { type: 'vote', player: i, yes: v }));
  if (s.ballots.results.slice(-1)[0].passed) throw new Error('tie passed');
});

const nOpt = (list) => list.reduce((a, d) => a + (d.options ? d.options.length : 1), 0);
const counts = { opportunity: nOpt(C.OPPORTUNITY), civic: nOpt(C.CIVIC), decision: C.DECISIONS.reduce((a, d) => a + d.options.length, 0), tenant: C.TENANT.reduce((a, d) => a + (d.options ? d.options.length : 1), 0), event: C.EVENTS.length, ballot: C.BALLOTS.length };
console.log('Runs:', runs);
Object.keys(seen).forEach(k => console.log((k + ':').padEnd(13), seen[k].size + '/' + counts[k] + ' triggered (cards x options)'));
if (failures.length) { console.log('FAILURES:\n' + failures.join('\n')); process.exit(1); }
const missing = Object.keys(seen).filter(k => seen[k].size < counts[k]);
if (missing.length) { console.log('MISSING: ' + missing.join(', ')); process.exit(1); }
console.log('ALL CONTENT TRIGGERED WITH NO ERRORS AND NO SOFTLOCKS');
