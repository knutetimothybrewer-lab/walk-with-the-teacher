// EDUCATIONAL APPROXIMATION of blood alcohol concentration (BAC) over time. Not a measurement.
// Widmark-style: each standard drink = 14 g alcohol, spread across the drinking window, absorbed
// first-order (slower with food) and eliminated at a roughly constant rate (about 0.015 g/dL per hour).
// Real BAC varies substantially between people and situations. This must never be used to decide
// whether it is safe or legal to drive.
export const BODY = { small: { label: 'Smaller body size', kg: 54 }, medium: { label: 'Medium body size', kg: 73 }, large: { label: 'Larger body size', kg: 91 } };
export const WINDOWS = { burst: { label: 'Within 15 minutes', h: 0.25 }, h1: { label: 'Over 1 hour', h: 1 }, h2: { label: 'Over 2 hours', h: 2 }, h4: { label: 'Over 4 hours', h: 4 } };
const R = 0.68;               // body-water distribution factor (blend; real values vary by person)
const GRAMS = 14;             // one U.S. standard drink
const KA = { fasted: 4.0, fed: 1.5 }; // absorption rate constants per hour (food slows absorption)

// opts: { drinks, body, window, food:'fasted'|'fed', elim (g/dL/h), rScale }
export function simulate(opts, { stepMin = 2, horizonH = 16 } = {}) {
  const kg = BODY[opts.body].kg, win = WINDOWS[opts.window].h;
  const elim = opts.elim ?? 0.015, ka = KA[opts.food] ?? KA.fasted, r = R * (opts.rScale ?? 1);
  const perDrink = (GRAMS / (kg * 1000 * r)) * 100;     // g/dL contributed by one drink if fully absorbed
  const n = Math.max(1, Math.round(opts.drinks));
  const dt = stepMin / 60;
  const times = [], bac = [];
  let stomach = 0, blood = 0, nextDrink = 0;
  const gap = n > 1 ? win / (n - 1) : 0;
  let t = 0;
  for (let i = 0; t <= horizonH; i++, t = i * dt) {
    while (nextDrink < n && nextDrink * gap <= t + 1e-9) { stomach += perDrink; nextDrink++; }
    const absorbed = stomach * (1 - Math.exp(-ka * dt));
    stomach -= absorbed; blood += absorbed;
    blood = Math.max(0, blood - Math.min(blood, elim * dt));
    times.push(t); bac.push(blood);
  }
  let peak = 0, peakT = 0;
  bac.forEach((b, i) => { if (b > peak) { peak = b; peakT = times[i]; } });
  let zeroT = null;
  for (let i = bac.length - 1; i >= 0; i--) { if (bac[i] > 0.0005) { zeroT = times[Math.min(i + 1, times.length - 1)]; break; } }
  return { times, bac, peak, peakT, zeroT };
}
export function band(opts) { // plausible individual variation
  const lo = simulate({ ...opts, elim: 0.02, rScale: 1.1 });
  const hi = simulate({ ...opts, elim: 0.01, rScale: 0.9 });
  return { lo, hi };
}
