'use strict';
// Encrypts the private question bank (authoring/) into vault/authoring.vault so it can live safely in a PUBLIC repository.
//   node tools/vault.js lock     encrypt authoring/ -> vault/authoring.vault
//   node tools/vault.js unlock   decrypt vault/authoring.vault -> authoring/   (then run: node tools/build.js)
// The passphrase comes from the U5_VAULT_PASS environment variable, or a git-ignored file named .vault-pass.
// Algorithm: scrypt (N=2^15) key derivation, AES-256-GCM, gzip. Keep the passphrase somewhere safe: without it the vault cannot be opened.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'authoring'), OUT = path.join(ROOT, 'vault', 'authoring.vault');

function pass() {
  const p = process.env.U5_VAULT_PASS || (fs.existsSync(path.join(ROOT, '.vault-pass')) ? fs.readFileSync(path.join(ROOT, '.vault-pass'), 'utf8').trim() : '');
  if (!p || p.length < 16) throw new Error('Set U5_VAULT_PASS (16+ characters) or create a .vault-pass file.');
  return p;
}
function walk(d, base = d, out = {}) {
  for (const f of fs.readdirSync(d)) { const full = path.join(d, f); if (fs.statSync(full).isDirectory()) walk(full, base, out); else out[path.relative(base, full)] = fs.readFileSync(full).toString('base64'); }
  return out;
}
function lock() {
  if (!fs.existsSync(DIR)) throw new Error('authoring/ not found');
  const plain = zlib.gzipSync(Buffer.from(JSON.stringify(walk(DIR))));
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(pass(), salt, 32, { N: 1 << 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
  const c = crypto.createCipheriv('aes-256-gcm', key, iv), data = Buffer.concat([c.update(plain), c.final()]);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ v: 1, kdf: 'scrypt-N32768-r8-p1', salt: salt.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') }));
  return Object.keys(walk(DIR)).length;
}
function unlock() {
  const j = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const key = crypto.scryptSync(pass(), Buffer.from(j.salt, 'base64'), 32, { N: 1 << 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(j.iv, 'base64')); d.setAuthTag(Buffer.from(j.tag, 'base64'));
  let plain; try { plain = Buffer.concat([d.update(Buffer.from(j.data, 'base64')), d.final()]); } catch { throw new Error('Wrong passphrase, or the vault file is damaged.'); }
  const files = JSON.parse(zlib.gunzipSync(plain).toString());
  for (const [rel, b64] of Object.entries(files)) { const f = path.join(DIR, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, Buffer.from(b64, 'base64')); }
  return Object.keys(files).length;
}
if (require.main === module) {
  const cmd = process.argv[2];
  try {
    if (cmd === 'lock') console.log('locked', lock(), 'files into vault/authoring.vault');
    else if (cmd === 'unlock') console.log('unlocked', unlock(), 'files into authoring/');
    else console.log('usage: node tools/vault.js lock|unlock');
  } catch (e) { console.error('vault error:', e.message); process.exit(1); }
}
module.exports = { lock, unlock };
