#!/usr/bin/env node
// Generates the salted passcode verifier for js/teacher-config.js.
//   node tools/make-passcode.js            (prompts; input is hidden)
//   WWQ_PASSCODE='...' node tools/make-passcode.js [--write]
// --write replaces the placeholder in js/teacher-config.js. The passcode itself is never written anywhere.
const fs = require('fs'), path = require('path'), vm = require('vm'), readline = require('readline');
const ctx = vm.createContext({ console, TextEncoder, DataView, Uint8Array, Uint32Array, Math, Date }); ctx.globalThis = ctx;
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8'), ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/util.js'), 'utf8'), ctx);
const U = ctx.WWQ.U, EASY = ['12345678', 'password', 'wildcats', 'wildcat123', 'teacher123', 'qwertyui', '11111111', 'abcd1234'];
function ask(q) { return new Promise(res => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true }); rl._writeToOutput = s => { if (s.indexOf(q) >= 0) process.stdout.write(s); }; rl.question(q, a => { rl.close(); process.stdout.write('\n'); res(a); }); }); }
(async () => {
  let a = process.env.WWQ_PASSCODE; if (!a) { a = await ask('Choose a passcode (8+ characters): '); const b = await ask('Type it again: '); if (a !== b) { console.error('The entries do not match.'); process.exit(1); } }
  if (a.length < 8 || EASY.includes(a.toLowerCase()) || /^(\d)\1+$/.test(a)) { console.error('Please choose a passcode with at least 8 characters that is not easy to guess.'); process.exit(1); }
  const iterations = 30000, salt = U.randomHex(16), verifier = U.deriveVerifier(a, salt, iterations);
  const block = `teacher: { configured: true, salt: '${salt}', iterations: ${iterations}, verifier: '${verifier}', freeTries: 3, cooldownSeconds: 30 }`;
  if (process.argv.includes('--write')) { const f = path.join(__dirname, '../js/teacher-config.js'); let t = fs.readFileSync(f, 'utf8'); if (!/teacher: \{[^}]*\}/.test(t)) { console.error('Could not find the teacher: { ... } line in js/teacher-config.js. Paste this manually:\n' + block); process.exit(1); } t = t.replace(/teacher: \{[^}]*\}/, block); fs.writeFileSync(f, t); console.log('Updated js/teacher-config.js. Commit and publish it.'); }
  else console.log('\nPaste this into js/teacher-config.js (replace the teacher: { configured: false } line):\n\n' + block + '\n');
  console.log('Reminder: this is an interface deterrent, not security. See README "Honest technical limits."');
})();
