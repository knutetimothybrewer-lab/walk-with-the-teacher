import { create } from 'zustand';
import { getJSON, setJSON } from './storage';

export type Theme = 'light' | 'dark';
export interface Settings {
  theme: Theme;
  sound: boolean;
  reduceMotion: boolean;
  textSize: 0 | 1 | 2;
  readAloud: boolean;
  colorblind: boolean;
  projector: boolean;
}

const KEY = 'riverton.settings';
const prefersDark = () => {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
};
const prefersReduced = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

const defaults = (): Settings => ({
  theme: prefersDark() ? 'dark' : 'light',
  sound: false,
  reduceMotion: prefersReduced(),
  textSize: 0,
  readAloud: false,
  colorblind: false,
  projector: false,
});

interface Store extends Settings {
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
}

export const useSettings = create<Store>((set, get) => ({
  ...defaults(),
  ...getJSON<Partial<Settings>>(KEY, {}),
  set: (k, v) => {
    set({ [k]: v } as Partial<Store>);
    const { set: _s, ...rest } = get();
    void _s;
    setJSON(KEY, rest);
  },
}));

export function applySettings(s: Settings): void {
  const r = document.documentElement;
  r.dataset.theme = s.theme;
  r.dataset.motion = s.reduceMotion ? 'reduce' : 'full';
  r.dataset.cb = s.colorblind ? '1' : '0';
  r.dataset.projector = s.projector ? '1' : '0';
  r.dataset.text = String(s.textSize);
}
