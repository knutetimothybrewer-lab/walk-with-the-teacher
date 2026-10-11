/** Every storage access is wrapped: the app must work when storage is unavailable. */
const mem = new Map<string, string>();

export function getItem(key: string): string | null {
  try {
    const v = window.localStorage.getItem(key);
    return v ?? mem.get(key) ?? null;
  } catch {
    return mem.get(key) ?? null;
  }
}

export function setItem(key: string, value: string): void {
  mem.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: memory fallback only */
  }
}

export function removeItem(key: string): void {
  mem.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function getJSON<T>(key: string, fallback: T): T {
  const raw = getItem(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJSON(key: string, value: unknown): void {
  setItem(key, JSON.stringify(value));
}
