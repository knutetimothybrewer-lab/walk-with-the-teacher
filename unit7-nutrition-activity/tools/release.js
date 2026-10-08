// Builds dist/: ONLY the files students and the teacher dashboard need (no answer sources, tests, docs or answer keys).
//   node tools/release.js            -> local-grading build (hashed keys in content/public.js)
//   node tools/release.js --server   -> server-grading build: no answer keys at all in the published files (needs the Google Sheet)
// Publish the CONTENTS of dist/ (for example as the root of a GitHub Pages repo) and keep the full project private.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = process.argv.includes('--server');
execFileSync('node', [path.join(root, 'tools/build.js')], { stdio: 'inherit' });
const out = path.join(root, 'dist'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const copy = (rel) => { const s = path.join(root, rel), d = path.join(out, rel); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.cpSync(s, d, { recursive: true }); };
['index.html', 'css', 'js', 'assets', 'teacher'].forEach(copy);
copy(server ? 'content/public.server.js' : 'content/public.js');
fs.writeFileSync(path.join(out, '.nojekyll'), '');
if (server) { const f = path.join(out, 'js/config.js'); fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace("gradingMode: 'local'", "gradingMode: 'server'")); }
console.log(`dist/ ready (${server ? 'server' : 'local'} grading). Publish the CONTENTS of dist/. Edit dist/js/config.js for your codes and URL.`);
