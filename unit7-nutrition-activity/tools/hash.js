// Usage: node tools/hash.js reset "my new reset code"      -> prints the line for js/config.js (resetCodeHash)
//        node tools/hash.js preview "my preview passcode"  -> previewPasscodeHash
//        node tools/hash.js dash "offline dashboard code"  -> teacherPasscodeHash
// (No Node? Open teacher/setup.html on your site instead.)
import { sha256 } from '../js/sha256.js';
import { CONFIG } from '../js/config.js';
const [kind, code] = process.argv.slice(2);
const names = { reset: 'resetCodeHash', preview: 'previewPasscodeHash', dash: 'teacherPasscodeHash' };
if (!names[kind] || !code) { console.log('Usage: node tools/hash.js <reset|preview|dash> "your code"'); process.exit(0); }
console.log(`${names[kind]}: '${sha256(CONFIG.hashSalt + '|' + kind + '|' + code.trim())}',`);
