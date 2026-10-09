// DEMO MODE transport: the real server core, running inside the page, with its state saved in this browser only.
// Used when js/config.js has no API_URL. It serves the PUBLIC practice set (content/demo/), never the real assessment.
import { sleep } from './util.js';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[data-w8="' + src + '"]')) return resolve();
    const s = document.createElement('script');
    s.src = src; s.dataset.w8 = src; s.onload = resolve; s.onerror = () => reject(new Error('could not load ' + src));
    document.head.appendChild(s);
  });
}

export const DEMO = {
  codes: { 'Block 1/2': 'DEMO12', 'Block 3/4': 'DEMO34', 'Block 6/7': 'DEMO67', 'Block 8/9': 'DEMO89' },
  teacherPassword: 'demo-teacher'
};

export async function create() {
  await loadScript('server/core.js');
  await loadScript('server/memory-store.js');
  const W8 = window.W8Core, Mem = window.W8MemoryStore;
  const bank = await (await fetch('content/demo/bank.json', { cache: 'no-cache' })).json();
  const persist = {
    load() { try { return JSON.parse(localStorage.getItem('w8demo')); } catch (e) { return null; } },
    save(s) { try { localStorage.setItem('w8demo', JSON.stringify(s)); } catch (e) { /* storage blocked: demo still works for this page view */ } }
  };
  const salt = 'demo-salt';
  const store = Mem.create({
    now: Date.now, bank, persist,
    config: { classCodes: DEMO.codes, defaultMinutes: 90, showScore: true, open: true, disabledItems: [] },
    teacherHash: { salt, hash: W8.hashPassword(DEMO.teacherPassword, salt) }
  });
  const server = W8.createServer({ now: Date.now, uuid: () => crypto.randomUUID(), store });
  setInterval(() => { try { server.sweep(); } catch (e) { /* ignore */ } }, 30000);
  return async function demoTransport(req) {
    await sleep(40); // a little latency so "Saving..." is visible like the real thing
    return JSON.parse(JSON.stringify(server.handle(JSON.parse(JSON.stringify(req)))));
  };
}
export function resetDemo() { try { localStorage.removeItem('w8demo'); } catch (e) { /* ignore */ } location.reload(); }
