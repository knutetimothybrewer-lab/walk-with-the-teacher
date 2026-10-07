// Usage: node tools/hash.js CODE [CODE...]     -> prints the hashes to paste into js/config.js (classCodeHashes)
//        node tools/hash.js --preview "my passcode"  -> prints the Preview Mode passcode hash
import { sha256 } from '../js/sha256.js';
import { CONFIG } from '../js/config.js';
const args = process.argv.slice(2);
if (!args.length) { console.log('Usage: node tools/hash.js HEALTH2 HEALTH3 ...   or   node tools/hash.js --preview "passcode"'); process.exit(0); }
if (args[0] === '--preview') console.log(sha256(CONFIG.previewSalt + '|' + args[1]));
else for (const c of args) console.log(`'${sha256(CONFIG.codeSalt + '|' + c.trim().toUpperCase())}', // ${c.trim().toUpperCase()}`);
