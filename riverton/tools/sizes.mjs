// Prints build sizes (raw and gzip) for dist/ and dist-single/.
import { readdirSync, statSync, readFileSync } from 'fs'; import { gzipSync } from 'zlib'; import { join } from 'path';
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const kb = (n) => (n / 1024).toFixed(0) + ' KB';
for (const dir of ['dist', 'dist-single']) {
  try { const files = walk(dir); const raw = files.reduce((a, f) => a + statSync(f).size, 0); const code = files.filter((f) => /\.(js|html|css)$/.test(f)); const gz = code.reduce((a, f) => a + gzipSync(readFileSync(f)).length, 0);
    console.log(`${dir}: ${files.length} files, ${kb(raw)} on disk, ${kb(gz)} gzipped code`); } catch { console.log(`${dir}: not built`); }
}
