// Light obfuscation for explanation text (so it is not casually readable in the bundle). NOT encryption.
import { sha256 } from './sha256.js';
const enc = new TextEncoder(), dec = new TextDecoder();
const stream = (key, n) => { let out = [], i = 0; while (out.length < n) { const h = sha256(key + ':' + i++); for (let j = 0; j < 64; j += 2) out.push(parseInt(h.slice(j, j + 2), 16)); } return out; };
const b64 = (bytes) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
const unb64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
export function obf(text, key) { const b = enc.encode(text), k = stream(key, b.length); return b64(b.map((x, i) => x ^ k[i])); }
export function deobf(str, key) { const b = unb64(str), k = stream(key, b.length); return dec.decode(b.map((x, i) => x ^ k[i])); }
