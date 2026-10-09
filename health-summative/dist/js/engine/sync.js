/* sync.js — talks to the optional Google Apps Script backend.
   All requests are plain-text POSTs (no CORS preflight). A failed final
   submission is queued in localStorage and retried (on a timer, when the
   browser comes back online, and via a "Send again" button).               */
import { storage } from './storage.js';

const qKey = (cfg) => `wwt:${cfg.assessmentVersion}:queue`;
const hasBackend = (cfg) => !!(cfg.backend && cfg.backend.url);

async function post(cfg, body, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(cfg.backend.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally { clearTimeout(timer); }
}

/** Check the class code. Returns {ok, via:'server'|'local'|'offline-local', message?} */
export async function checkClassCode(cfg, student) {
  const local = cfg.classCodes.some(c => c.toLowerCase() === String(student.code).trim().toLowerCase());
  if (!hasBackend(cfg)) return { ok: local, via: 'local', reason: local ? '' : 'code' };
  if (!cfg.backend.serverValidatesCode) return { ok: local, via: 'local', reason: local ? '' : 'code' };
  try {
    const r = await post(cfg, { action: 'start', student });
    if (r && r.ok) return { ok: true, via: 'server', status: r.status || 'new' };
    return { ok: false, via: 'server', reason: r && r.reason ? r.reason : 'code' };
  } catch (e) {
    if (cfg.backend.allowOfflineStart && local) return { ok: true, via: 'offline-local' };
    return { ok: false, via: 'offline', reason: 'network', detail: String((e && e.message) || e).slice(0, 120) };
  }
}

/** Best-effort: ask the Sheet to archive this student's finished record so a retake is allowed. Succeeds only if the
    Sheet's TEACHER_PASSCODE equals the typed code; any failure is ignored (the device is wiped regardless). */
export async function serverReset(cfg, student, passcode) {
  if (!hasBackend(cfg)) return false;
  try { const r = await post(cfg, { action: 'teacher', op: 'reset', passcode, student }, 8000); return !!(r && r.ok); } catch { return false; }
}

export function queueFinal(cfg, payload) {
  const q = storage.get(qKey(cfg), []);
  if (!q.find(p => p.completion === payload.completion)) q.push(payload);
  storage.set(qKey(cfg), q);
}
export const queueLength = (cfg) => storage.get(qKey(cfg), []).length;

/** Try to send everything queued. Resolves {sent, pending, duplicate}. */
export async function flushQueue(cfg) {
  if (!hasBackend(cfg)) return { sent: 0, pending: queueLength(cfg), noBackend: true };
  let q = storage.get(qKey(cfg), []);
  let sent = 0, duplicate = false;
  for (const p of q.slice()) {
    try {
      const r = await post(cfg, { action: 'submit', payload: p });
      if (r && (r.ok || r.reason === 'duplicate')) {
        if (r.reason === 'duplicate') duplicate = true;
        q = q.filter(x => x.completion !== p.completion);
        storage.set(qKey(cfg), q);
        sent++;
      }
    } catch { break; }
  }
  return { sent, pending: q.length, duplicate };
}

/** Fire-and-forget progress ping is intentionally NOT implemented:
    only the final record is sent (privacy: README "What is collected"). */

let timer = null;
export function startRetryLoop(cfg, onStatus) {
  const attempt = async () => {
    const r = await flushQueue(cfg);
    onStatus && onStatus(r);
    if (r.pending > 0 && !r.noBackend) timer = setTimeout(attempt, Math.min(60000, 5000 * 2 ** (retryCount++)));
  };
  let retryCount = 0;
  clearTimeout(timer);
  window.addEventListener('online', () => { retryCount = 0; clearTimeout(timer); attempt(); });
  attempt();
  return { retryNow: () => { retryCount = 0; clearTimeout(timer); return attempt(); } };
}
