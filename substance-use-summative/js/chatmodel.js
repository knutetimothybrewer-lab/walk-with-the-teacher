// Branching-conversation model (Simulation D). Pure functions, shared by the browser, the build
// tool (to enumerate which paths earn credit) and tests.
export const METERS = ['safety', 'pressure', 'options', 'support'];
export const METER_LABEL = { safety: 'SAFETY', pressure: 'PRESSURE', options: 'AVAILABLE OPTIONS', support: 'SUPPORT' };
export const TAG_LABEL = {
  passive: 'Passive', aggressive: 'Aggressive', assertive: 'Assertive', exit: 'Exit', alternative: 'Alternative',
  delay: 'Delay', support: 'Support-seeking', unsafe: 'Unsafe choice', avoid: 'Avoidance', deflect: 'Deflect with humor'
};
const clamp = (x) => Math.max(0, Math.min(100, x));

// Replays a path (array of choice ids). Returns the state after the last valid choice.
export function runChat(chat, path) {
  const m = { ...chat.meters };
  const log = [];
  const flags = new Set();
  let node = chat.start, ended = false;
  for (const cid of path) {
    if (ended) break;
    const n = chat.nodes[node];
    const c = n && n.choices.find((x) => x.id === cid);
    if (!c) break;
    const before = { ...m };
    for (const k of METERS) m[k] = clamp(m[k] + ((c.fx && c.fx[k]) || 0));
    if (c.flag) flags.add(c.flag);
    log.push({ node, choice: cid, tag: c.tag, before, after: { ...m } });
    if (c.end) { ended = true; } else node = c.next;
  }
  const p = chat.pass;
  const pass = ended && !flags.size && m.safety >= p.minSafety && m.support >= p.minSupport && m.pressure <= p.maxPressure;
  return { meters: m, flags: [...flags], node, ended, log, pass };
}

// All complete paths through the graph (small tree).
export function allPaths(chat) {
  const out = [];
  (function walk(node, path) {
    for (const c of chat.nodes[node].choices) {
      const p = [...path, c.id];
      if (c.end) out.push(p); else walk(c.next, p);
    }
  })(chat.start, []);
  return out;
}
export const passingPaths = (chat) => allPaths(chat).filter((p) => runChat(chat, p).pass);
