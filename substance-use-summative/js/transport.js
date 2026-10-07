// Backend adapters. The app only ever calls send(action, payload). To use a different endpoint later
// (e.g. Power Automate / Excel), add an adapter below and set CONFIG.backendKind.
import { CONFIG } from './config.js';

async function postJson(url, body, timeoutMs = 15000) {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    // text/plain avoids a CORS preflight, which Apps Script web apps cannot answer.
    const r = await fetch(url, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, signal: ctl.signal, redirect: 'follow' });
    const text = await r.text();
    try { return JSON.parse(text); } catch { return { ok: false, error: 'bad-response', detail: text.slice(0, 200) }; }
  } finally { clearTimeout(to); }
}

const adapters = {
  'apps-script': { send: (action, payload) => postJson(CONFIG.backendUrl, { ...payload, action }), supports: () => true },
  // Submit-only: posts the same JSON; class-code validation and server-side checks are not available.
  webhook: { send: (action, payload) => (action === 'submit' ? postJson(CONFIG.backendUrl, { ...payload, action }) : Promise.resolve({ ok: false, error: 'unsupported' })), supports: (a) => a === 'submit' }
};

export const hasBackend = () => !!CONFIG.backendUrl;
export async function send(action, payload = {}) {
  if (!hasBackend()) return { ok: false, error: 'no-backend' };
  const ad = adapters[CONFIG.backendKind] || adapters['apps-script'];
  try { return await ad.send(action, payload); } catch (e) { return { ok: false, error: 'network', detail: String(e && e.message || e) }; }
}
