#!/usr/bin/env node
'use strict';
/*
 * Encrypted backup of the authoring source (which contains the answer keys).
 *
 * Why: the keys must not be readable in the public GitHub repo, but they also must not exist only inside a
 * throwaway container. The vault stores authoring/ as AES-256-GCM ciphertext, with a key derived from a passphrase
 * by scrypt. Anyone can see vault/authoring.vault.json; nobody can read it without the passphrase.
 *
 *   W8_VAULT_PASS='...' node tools/vault.js lock     authoring/  ->  vault/authoring.vault.json
 *   W8_VAULT_PASS='...' node tools/vault.js unlock   vault/authoring.vault.json  ->  authoring/   (refuses to overwrite unless --force)
 *   node tools/vault.js verify                       (with W8_VAULT_PASS) decrypts to memory and checks it matches authoring/
 *
 * The passphrase is NOT stored anywhere in the repo. Keep it in a password manager.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'authoring');
const file = path.join(root, 'vault', 'authoring.vault.json');
const N = 1 << 15, r = 8, p = 1;

function pass() {
  const v = process.env.W8_VAULT_PASS;
  if (!v || v.length < 16) { console.error('Set W8_VAULT_PASS to a passphrase of at least 16 characters.'); process.exit(2); }
  return v;
}
function walk(dir, base) {
  let out = {};
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const abs = path.join(dir, e.name), rel = path.posix.join(base, e.name);
    if (e.isDirectory()) Object.assign(out, walk(abs, rel)); else out[rel] = fs.readFileSync(abs, 'utf8');
  });
  return out;
}
function seal(files, passphrase) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(passphrase, salt, 32, { N, r, p, maxmem: 256 * 1024 * 1024 });
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(JSON.stringify({ files }), 'utf8'), c.final()]);
  return { v: 1, note: 'Encrypted authoring source for the Unit 8 assessment. Needs the vault passphrase. See tools/vault.js.', kdf: 'scrypt', N, r, p, cipher: 'aes-256-gcm', salt: salt.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64') };
}
function open(blob, passphrase) {
  const key = crypto.scryptSync(passphrase, Buffer.from(blob.salt, 'base64'), 32, { N: blob.N, r: blob.r, p: blob.p, maxmem: 256 * 1024 * 1024 });
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(blob.iv, 'base64'));
  d.setAuthTag(Buffer.from(blob.tag, 'base64'));
  try {
    return JSON.parse(Buffer.concat([d.update(Buffer.from(blob.ct, 'base64')), d.final()]).toString('utf8')).files;
  } catch (e) { console.error('Could not decrypt: wrong passphrase, or the vault file was changed.'); process.exit(3); }
}

const cmd = process.argv[2];
if (cmd === 'lock') {
  if (!fs.existsSync(srcDir)) { console.error('No authoring/ folder to lock.'); process.exit(1); }
  const files = walk(srcDir, '');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(seal(files, pass()), null, 2) + '\n');
  console.log('Locked ' + Object.keys(files).length + ' files into vault/authoring.vault.json');
} else if (cmd === 'unlock') {
  if (fs.existsSync(srcDir) && !process.argv.includes('--force')) { console.error('authoring/ already exists. Use --force to overwrite it.'); process.exit(1); }
  const files = open(JSON.parse(fs.readFileSync(file, 'utf8')), pass());
  Object.keys(files).forEach((rel) => { const t = path.join(srcDir, rel); fs.mkdirSync(path.dirname(t), { recursive: true }); fs.writeFileSync(t, files[rel]); });
  console.log('Restored ' + Object.keys(files).length + ' files into authoring/. Now run: node tools/build-content.js');
} else if (cmd === 'verify') {
  const files = open(JSON.parse(fs.readFileSync(file, 'utf8')), pass());
  const cur = fs.existsSync(srcDir) ? walk(srcDir, '') : {};
  const same = JSON.stringify(Object.keys(files).sort()) === JSON.stringify(Object.keys(cur).sort()) && Object.keys(files).every((k) => files[k] === cur[k]);
  console.log(same ? 'Vault matches authoring/ (' + Object.keys(files).length + ' files).' : 'Vault is OUT OF DATE or authoring/ differs. Run: node tools/vault.js lock');
  process.exit(same ? 0 : 1);
} else {
  console.log('usage: W8_VAULT_PASS=... node tools/vault.js lock | unlock [--force] | verify');
}
