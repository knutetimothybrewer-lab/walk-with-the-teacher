/* `npm run build` -> dist/  : a clean, upload-ready copy of only the files students need.
   There is nothing to compile; the app is plain HTML/CSS/JS. Also writes dist.zip when `zip` is installed. */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const include = ['index.html', 'teacher.html', 'config.js', 'css', 'js', 'content', 'assets'];
const skip = new Set(['.DS_Store']);
function copy(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const f of fs.readdirSync(src)) if (!skip.has(f)) copy(path.join(src, f), path.join(dst, f));
  } else fs.copyFileSync(src, dst);
}
include.forEach(p => copy(path.join(root, p), path.join(out, p)));
// Flatten the module waterfall in the production copy: preload every JS module.
{
  const mods = [];
  (function w(d, rel) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? w(p, rel + f + '/') : (f.endsWith('.js') && mods.push(rel + f)); } })(path.join(out, 'js'), 'js/');
  (function w(d, rel) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? w(p, rel + f + '/') : (f.endsWith('.js') && mods.push(rel + f)); } })(path.join(out, 'content'), 'content/');
  mods.push('config.js');
  const idx = path.join(out, 'index.html');
  const tags = mods.map(m => `  <link rel="modulepreload" href="${m}">`).join('\n');
  fs.writeFileSync(idx, fs.readFileSync(idx, 'utf8').replace('</head>', tags + '\n</head>'));
}
fs.writeFileSync(path.join(out, 'README.txt'), 'Upload this whole folder to any static web host (GitHub Pages, Netlify Drop, Cloudflare Pages). Edit config.js (class codes, backend URL) and content/*.js before uploading.\n');

let total = 0;
(function size(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const s = fs.statSync(p); s.isDirectory() ? size(p) : (total += s.size); } })(out);
const jsBytes = (() => { let t = 0; (function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const s = fs.statSync(p); s.isDirectory() ? w(p) : (p.endsWith('.js') && (t += s.size)); } })(out); return t; })();
console.log(`dist/ ready: ${(total / 1024).toFixed(0)} KB total (fonts included), ${(jsBytes / 1024).toFixed(0)} KB of JavaScript (limit in the brief: 1.5 MB).`);
try { execSync('cd dist && zip -qr ../dist.zip .', { cwd: root }); console.log('dist.zip written'); } catch { console.log('(zip not installed; skipping dist.zip)'); }
