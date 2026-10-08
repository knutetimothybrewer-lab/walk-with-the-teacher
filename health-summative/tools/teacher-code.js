/* Usage: node tools/teacher-code.js "YOUR NEW CODE"
   Prints the line to paste into config.js (teacherCodeHash). Codes are not case-sensitive. */
import crypto from 'node:crypto';
const code = process.argv[2];
if (!code) { console.error('Usage: node tools/teacher-code.js "YOUR NEW CODE"'); process.exit(1); }
const hash = crypto.createHash('sha256').update('wwt-teacher:' + code.trim().toUpperCase()).digest('hex');
console.log(`teacherCodeHash: '${hash}',`);
