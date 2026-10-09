// Transport + retry queue + save indicator.
//   LIVE mode: POST text/plain JSON to the Apps Script web app (text/plain avoids a CORS preflight).
//   DEMO mode: the same API served by an in-browser copy of the server core (js/mock-api.js).
import { ServerClock } from './timer.js';
import { sleep, uid } from './util.js';

const cfg = window.W8_CONFIG || {};
export const isDemo = !cfg.API_URL;
export const clock = new ServerClock();
let transport = null;
let saveState = 'saved';
const saveListeners = new Set();
export function onSaveState(fn) { saveListeners.add(fn); fn(saveState, {}); return () => saveListeners.delete(fn); }
function setSave(s, info) { saveState = s; saveListeners.forEach((f) => f(s, info || {})); }

export async function init() {
  if (isDemo) { const m = await import('./mock-api.js'); transport = await m.create(); }
  else transport = httpTransport;
}

async function httpTransport(body) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), 25000) : null;
  try {
    const res = await fetch(cfg.API_URL, {
      method: 'POST', redirect: 'follow', credentials: 'omit', cache: 'no-store',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch (e) { throw new Error('bad-json'); }
  } finally { if (timer) clearTimeout(timer); }
}

/** Resolves with the server's JSON (ok:true OR ok:false). Rejects with {network:true} only when the server could not be reached. */
export async function call(action, payload) {
  const t0 = Date.now();
  let resp;
  try { resp = await transport(Object.assign({ action }, payload || {})); }
  catch (e) { setSave('offline'); const err = new Error('network'); err.network = true; throw err; }
  const t1 = Date.now();
  if (resp && typeof resp.serverNow === 'number') clock.sample(resp.serverNow, t0, t1);
  setSave('saved', { at: Date.now() });
  return resp;
}

function waitOnlineOrDelay(ms) {
  return new Promise((resolve) => {
    let done = false;
    const fin = () => { if (!done) { done = true; window.removeEventListener('online', fin); resolve(); } };
    window.addEventListener('online', fin);
    setTimeout(fin, ms);
  });
}

/**
 * Sends one graded answer and never gives up on a network failure: it retries with backoff, always with the SAME reqId,
 * so the server counts the attempt exactly once. If the request reaches the server after the deadline, the server
 * rejects it (EXPIRED) and the answer is not recorded.
 */
export async function submitAnswer(payload, onStatus) {
  const body = Object.assign({ reqId: uid() }, payload);
  let delay = 1000, n = 0;
  for (;;) {
    setSave(n ? 'offline' : 'saving');
    try {
      const r = await call('submit', body);
      return r;
    } catch (e) {
      if (!e.network) throw e;
      n++;
      setSave('offline', { retry: n });
      if (onStatus) onStatus({ offline: true, retry: n });
      await waitOnlineOrDelay(delay);
      delay = Math.min(delay * 2, 20000);
    }
  }
}

/** Fire-and-forget saves (position, UI) that tolerate failure; the next save carries the latest value anyway. */
export async function bestEffort(action, payload) {
  try { return await call(action, payload); } catch (e) { return null; }
}
export { sleep };
