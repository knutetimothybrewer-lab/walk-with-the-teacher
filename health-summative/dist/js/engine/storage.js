/* localStorage that never throws (private windows, blocked storage, school
   policies). Falls back to memory so the app still works for the session. */
const mem = new Map();
let ok = null;

function works() {
  if (ok !== null) return ok;
  try {
    const k = '__wwt_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    ok = true;
  } catch { ok = false; }
  return ok;
}

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = works() ? window.localStorage.getItem(key) : mem.get(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    const raw = JSON.stringify(value);
    try { if (works()) window.localStorage.setItem(key, raw); else mem.set(key, raw); }
    catch { mem.set(key, raw); }
  },
  remove(key) {
    try { if (works()) window.localStorage.removeItem(key); } catch { /* ignore */ }
    mem.delete(key);
  },
  persistent: () => works(),
};
