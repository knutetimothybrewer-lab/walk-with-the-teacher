// Builds dist/: ONLY the files students need (no answer sources, tests, docs or teacher-private files).
// Publish dist/ (for example as the root of a public GitHub Pages repo) and keep this full folder private.
//   node tools/release.js            -> local-grading build
//   node tools/release.js --strip    -> server-grading build (no hashed keys or explanations in the public bundle)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strip = process.argv.includes('--strip');
execFileSync('node', [path.join(root, 'tools/build.js'), ...(strip ? ['--strip'] : [])], { stdio: 'inherit' });
const out = path.join(root, 'dist'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const copy = (rel) => { const s = path.join(root, rel), d = path.join(out, rel); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.cpSync(s, d, { recursive: true }); };
['index.html', 'css', 'js', 'content/public.js', 'assets', 'teacher'].forEach(copy);
fs.writeFileSync(path.join(out, '.nojekyll'), '');
let cfg = fs.readFileSync(path.join(out, 'js/config.js'), 'utf8');
if (strip) { cfg = cfg.replace("gradingMode: 'local'", "gradingMode: 'server'"); fs.writeFileSync(path.join(out, 'js/config.js'), cfg); }
console.log(`dist/ ready (${strip ? 'server' : 'local'} grading). Publish the CONTENTS of dist/.`);
