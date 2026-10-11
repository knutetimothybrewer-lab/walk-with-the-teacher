import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useProfiles } from './profile/profileStore';

const moduleOf = (path: string) => (path.startsWith('/city') ? 'city' : path.startsWith('/crossroads') ? 'crossroads' : path.startsWith('/lab') ? 'lab' : path.startsWith('/orientation') || path.startsWith('/lesson/orientation') ? 'orientation' : path.startsWith('/report') ? 'wrapup' : path.startsWith('/lesson/city') ? 'city' : path.startsWith('/lesson/xr') ? 'crossroads' : path.startsWith('/lesson/lab') ? 'lab' : null);

/** Counts active minutes per module (only while the tab is visible and the student has moved in the last minute). */
export function useTimeTracker() {
  const loc = useLocation(); const update = useProfiles((s) => s.update);
  useEffect(() => {
    let last = Date.now();
    const bump = () => { last = Date.now(); };
    window.addEventListener('pointerdown', bump); window.addEventListener('keydown', bump); window.addEventListener('pointermove', bump);
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible' || Date.now() - last > 60_000) return;
      const m = moduleOf(loc.pathname); if (!m) return;
      update((p) => ({ ...p, progress: { ...p.progress, [m]: { ...(p.progress[m] ?? { completed: [], minutes: 0 }), minutes: (p.progress[m]?.minutes ?? 0) + 10 / 60 } } }));
    }, 10_000);
    return () => { clearInterval(id); window.removeEventListener('pointerdown', bump); window.removeEventListener('keydown', bump); window.removeEventListener('pointermove', bump); };
  }, [loc.pathname, update]);
}
