// Local persistence. Wraps localStorage defensively (private windows, blocked storage, quota) and
// falls back to memory so the app never crashes. A light checksum notices hand-edited state.
import { sha256 } from './sha256.js';

const mem = new Map();
let usable = null;
function ok() {
  if (usable !== null) return usable;
  try { const k = '__sig_t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); usable = true; } catch { usable = false; }
  return usable;
}
export const storageWorks = () => ok();
export function getRaw(k) { try { return ok() ? localStorage.getItem(k) : (mem.get(k) ?? null); } catch { return mem.get(k) ?? null; } }
export function setRaw(k, v) { try { if (ok()) localStorage.setItem(k, v); else mem.set(k, v); } catch { mem.set(k, v); } }
export function delRaw(k) { try { if (ok()) localStorage.removeItem(k); } catch { /* ignore */ } mem.delete(k); }

const ck = (obj) => sha256('sig-ck|' + JSON.stringify(obj)).slice(0, 12);

export function makeStore(prefix) {
  const key = (n) => prefix + '.' + n;
  return {
    prefix,
    saveSession(state) {
      const { ck: _drop, ...rest } = state;
      setRaw(key('cur'), JSON.stringify({ ...rest, ck: ck(rest) }));
    },
    loadSession() {
      const raw = getRaw(key('cur'));
      if (!raw) return null;
      try {
        const s = JSON.parse(raw);
        const { ck: have, ...rest } = s;
        if (have !== ck(rest)) rest.tamper = true;
        return rest;
      } catch { return null; }
    },
    clearSession() { delRaw(key('cur')); },
    lockKey(name, code) { return key('done.' + sha256((name || '').trim().toLowerCase() + '|' + (code || '').trim().toUpperCase()).slice(0, 16)); },
    isLocked(name, code) { return !!getRaw(this.lockKey(name, code)); },
    setLock(name, code, info) { setRaw(this.lockKey(name, code), JSON.stringify(info || { t: Date.now() })); },
    clearLock(name, code) { delRaw(this.lockKey(name, code)); },
    getSettings() { try { return JSON.parse(getRaw(key('settings')) || '{}'); } catch { return {}; } },
    setSettings(o) { setRaw(key('settings'), JSON.stringify(o)); },
    dump() { const out = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(prefix + '.')) out[k] = localStorage.getItem(k); } } catch { /* ignore */ } return out; }
  };
}
