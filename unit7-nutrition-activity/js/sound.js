// Optional, muted-by-default feedback tones (Web Audio). Never required to complete anything.
let ctx = null, on = false;
export const setSound = (v) => { on = !!v; };
export const soundOn = () => on;
function tone(freq, dur = .12, delay = 0, type = 'sine', gain = .05) {
  if (!on) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, ctx.currentTime + delay); g.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + .01); g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + delay + dur);
    o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + delay); o.stop(ctx.currentTime + delay + dur + .02);
  } catch { /* ignore */ }
}
export const sfx = {
  ok: () => { tone(660, .1); tone(880, .14, .09); },
  bad: () => { tone(220, .16, 0, 'triangle'); },
  lock: () => { tone(330, .12, 0, 'triangle'); tone(220, .2, .12, 'triangle'); },
  tick: () => tone(520, .05)
};
