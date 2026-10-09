// Transport to the backend (Google Apps Script web app in production, the dev server locally).
// Every mutating call carries a requestId, so a retry after a dropped connection can never use an extra attempt.
import { endpoint } from './config.js';

let offsetMs = 0;                       // serverNow - clientNow
const listeners = new Set();
let inflight = 0, online = true;
export const serverNow = () => Date.now() + offsetMs;
export const clockOffset = () => offsetMs;
export function onStatus(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { const s = !online ? 'offline' : inflight > 0 ? 'saving' : 'saved'; listeners.forEach((f) => f(s)); }
export const isConnected = () => !!endpoint();

async function once(action, payload, timeoutMs) {
  const url = endpoint();
  if (!url) return { ok: false, code: 'NO_BACKEND', message: 'This site is not connected to a backend yet.' };
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    const r = await fetch(url, { method: 'POST', body: JSON.stringify({ action, payload }), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow', signal: ctl.signal, cache: 'no-store' });
    const text = await r.text();
    let j; try { j = JSON.parse(text); } catch { return { ok: false, code: 'BAD_RESPONSE', retryable: true, message: 'The server sent an unreadable response.' }; }
    const t1 = Date.now(); const st = j && (j.serverTime || (j.state && j.state.serverTime));
    if (st) { const sv = Date.parse(st); if (isFinite(sv)) offsetMs = sv - (t0 + (t1 - t0) / 2); }
    return j;
  } catch (e) {
    return { ok: false, code: 'NETWORK', retryable: true, message: 'Could not reach the server.' };
  } finally { clearTimeout(to); }
}

/** call('submit', {...}) -> response object. Retries network failures and BUSY/SERVER_ERROR with backoff. */
export async function call(action, payload = {}, opts = {}) {
  const tries = opts.tries == null ? 4 : opts.tries, delays = [700, 1800, 3500, 6000];
  inflight++; emit();
  try {
    let res;
    for (let i = 0; i < tries; i++) {
      res = await once(action, payload, opts.timeout || 25000);
      if (res && res.code === 'NETWORK') { online = false; emit(); } else if (res && res.code !== 'BAD_RESPONSE') { online = true; }
      if (!res || !(res.retryable || res.code === 'BUSY')) break;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, delays[i]));
    }
    return res;
  } finally { inflight--; emit(); }
}
