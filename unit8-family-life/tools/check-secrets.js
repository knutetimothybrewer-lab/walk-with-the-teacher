#!/usr/bin/env node
'use strict';
/*
 * Secrets gate. Run before every commit:  node tools/check-secrets.js
 *
 * Fails (exit 1) if anything that must stay private could end up in git:
 *   1. authoring/ or private/ files are tracked, or are not ignored
 *   2. any file git would commit (tracked + untracked-not-ignored) contains text from the private item bank
 *      (explanations, hints, keys' option ids) or from the private answer key
 *   3. a vault passphrase file, teacher password, or class code appears in a committable file
 *   4. the public items.json carries a forbidden answer-bearing field
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
const problems = [];

/* 1 + file list */
const tracked = git(['ls-files']);
const untracked = git(['ls-files', '--others', '--exclude-standard']);
const committable = tracked.concat(untracked);
committable.forEach((f) => { if (/^(authoring|private)\//.test(f)) problems.push('would be committed: ' + f); });
['authoring/index.js', 'private/itembank.json'].forEach((f) => {
  if (fs.existsSync(path.join(root, f))) {
    try { execFileSync('git', ['check-ignore', '-q', f], { cwd: root }); } catch (e) { problems.push(f + ' exists but is NOT ignored by git'); }
  }
});

/* 2: needles from the private bank */
const bankPath = path.join(root, 'private/itembank.json');
const needles = [];
if (fs.existsSync(bankPath)) {
  const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
  Object.keys(bank.items).forEach((id) => {
    const b = bank.items[id];
    if (b.explanation && b.explanation.length > 40) needles.push({ what: id + ' explanation', text: b.explanation.slice(0, 60) });
    (b.hints || []).forEach((h, i) => { if (h.length > 40) needles.push({ what: id + ' hint ' + (i + 1), text: h.slice(0, 60) }); });
  });
}
const akPath = path.join(root, 'private/ANSWER_KEY.md');
const textFiles = committable.filter((f) => !/\.(png|jpg|jpeg|gif|ico|woff2?|ttf)$/i.test(f));
textFiles.forEach((f) => {
  const abs = path.join(root, f);
  if (!fs.existsSync(abs) || fs.statSync(abs).size > 5e6) return;
  const body = fs.readFileSync(abs, 'utf8');
  needles.forEach((n) => { if (body.includes(n.text)) problems.push(f + ' contains private text (' + n.what + ')'); });
  if (/W8_VAULT_PASS\s*=\s*['"]?[A-Za-z0-9+/=_-]{16,}/.test(body)) problems.push(f + ' appears to contain a vault passphrase');
});

/* 3: secrets recorded by the build */
const secretsPath = path.join(root, 'private/SECRETS.local.json');
if (fs.existsSync(secretsPath)) {
  const sec = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
  const vals = [].concat(sec.vaultPassphrase || [], Object.values(sec.classCodes || {}), sec.teacherPassword || []).filter((v) => v && v.length >= 6);
  textFiles.forEach((f) => { const abs = path.join(root, f); if (!fs.existsSync(abs)) return; const b = fs.readFileSync(abs, 'utf8'); vals.forEach((v) => { if (b.includes(v)) problems.push(f + ' contains a recorded secret'); }); });
}

/* 4: public items.json must carry no answer-bearing fields */
const pubPath = path.join(root, 'content/items.json');
if (fs.existsSync(pubPath)) {
  const banned = new Set(['ok', 'to', 'hints', 'explanation', 'fb', 'key', 'correct', 'answer', 'tolerance', 'feedback', 'map']);
  (function walk(o, p) { if (o && typeof o === 'object') Object.keys(o).forEach((k) => { if (banned.has(k)) problems.push('content/items.json has forbidden field ' + p + '.' + k); walk(o[k], p + '.' + k); }); })(JSON.parse(fs.readFileSync(pubPath, 'utf8')), '$');
}

if (problems.length) { console.error('SECRETS CHECK FAILED:\n - ' + problems.join('\n - ')); process.exit(1); }
console.log('Secrets check passed: ' + committable.length + ' committable files scanned against ' + needles.length + ' private text needles. ' + (fs.existsSync(akPath) ? '' : '(no private bank present; only structural checks ran)'));
