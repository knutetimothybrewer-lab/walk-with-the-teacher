import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { useProfiles } from '../src/platform/profile/profileStore';
import { flush, itemsFor, scan, testConnection, useSync } from '../src/platform/sync/sync';

// ---- an in-memory Google Sheets, just enough for Code.gs
class Sheet { rows: unknown[][] = []; constructor(public name: string) {}
  getLastRow() { return this.rows.length; } appendRow(r: unknown[]) { this.rows.push([...r]); } setFrozenRows() {}
  getRange(row: number, col: number, nr = 1, nc = 1) { const s = this; return {
    getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (s.rows[row - 1 + i] ?? [])[col - 1 + j] ?? '')),
    setValues: (v: unknown[][]) => { v.forEach((r, i) => { s.rows[row - 1 + i] ??= []; r.forEach((x, j) => (s.rows[row - 1 + i][col - 1 + j] = x)); }); },
    setValue: (x: unknown) => { s.rows[row - 1] ??= []; s.rows[row - 1][col - 1] = x; },
    setFormulas: (v: string[][]) => { v.forEach((r, i) => { s.rows[row - 1 + i] ??= []; r.forEach((x, j) => (s.rows[row - 1 + i][col - 1 + j] = x)); }); } }; } }
function makeScript(code: string | null) {
  const sheets = new Map<string, Sheet>();
  const ss = { getSheetByName: (n: string) => sheets.get(n) ?? null, insertSheet: (n: string) => { const s = new Sheet(n); sheets.set(n, s); return s; } };
  const ctx: Record<string, unknown> = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss }, LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => (k === 'CLASS_CODE' ? code : null) }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t: string) => ({ text: t, setMimeType() { return this; } }) },
  };
  vm.createContext(ctx); vm.runInContext(readFileSync('google-apps-script/Code.gs', 'utf8'), ctx);
  const post = (body: unknown) => JSON.parse(((ctx.doPost as (e: unknown) => { text: string })({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } })).text);
  const get = (parameter: Record<string, string>) => JSON.parse(((ctx.doGet as (e: unknown) => { text: string })({ parameter })).text);
  return { sheets, post, get };
}
const student = { name: 'Ava', period: '3' };
const ev = (id: string, extra: object = {}) => ({ kind: 'event', id, t: 1700000000000, module: 'lab', item: 'q-1', concept: 'epi-curves', type: 'mc', correct: true, attempts: 1, hint: false, ...extra });

describe('Apps Script backend (Code.gs)', () => {
  it('rejects requests without the class code, and answers the teacher test button', () => {
    const s = makeScript('river-7');
    expect(s.post({ student, items: [] })).toMatchObject({ ok: false, error: 'bad class code' });
    expect(s.post({ code: 'nope', student, items: [] }).ok).toBe(false);
    expect(makeScript(null).post({ code: undefined, student, items: [] }).ok).toBe(false);
    expect(s.post({ code: 'river-7', test: true })).toEqual({ ok: true, test: true });
    expect(s.sheets.size).toBe(0); // the test touches nothing
  });
  it('validates the payload shape', () => {
    const s = makeScript('c');
    expect(s.post('{not json').error).toBe('bad json');
    expect(s.post({ code: 'c', items: [] }).error).toBe('missing student');
    expect(s.post({ code: 'c', student, items: 'x' }).error).toBe('bad items');
    expect(s.post({ code: 'c', student, items: Array.from({ length: 201 }, (_, i) => ev('e' + i)) }).error).toBe('bad items');
    expect(s.post({ code: 'c', student, items: [{ kind: 'weird' }, { nothing: 1 }, null] })).toMatchObject({ ok: true, accepted: [] });
  });
  it('creates the tabs on first run and appends events, written work, and the roster', () => {
    const s = makeScript('c');
    const r = s.post({ code: 'c', student, items: [ev('a'), ev('b', { correct: false, prediction: '{"outcome":"asthma"}' }), { kind: 'written', id: 'w1', t: 1, module: 'lab', wkind: 'cer', item: 'q-lab-cer', text: 'Claim: water.' }] });
    expect(r).toEqual({ ok: true, accepted: ['a', 'b', 'w1'] });
    expect([...s.sheets.keys()].sort()).toEqual(['Events', 'Gradebook', 'Progress', 'Roster', 'Written', '_ids']);
    expect(s.sheets.get('Events')!.rows[0]).toEqual(['id', 'timestamp', 'student', 'period', 'module', 'item', 'concept', 'type', 'correct', 'attempts', 'hint_used', 'prediction', 'chosen']);
    expect(s.sheets.get('Events')!.rows).toHaveLength(3); expect(s.sheets.get('Events')!.rows[2][8]).toBe(false); expect(s.sheets.get('Events')!.rows[2][11]).toContain('asthma');
    const w = s.sheets.get('Written')!.rows; expect(w[1][7]).toBe('Claim: water.'); expect(w[1][8]).toBe(''); // empty teacher score column
    expect(s.sheets.get('Roster')!.rows[1].slice(0, 2)).toEqual(['Ava', '3']);
  });
  it('skips duplicates from retries (and still acknowledges them)', () => {
    const s = makeScript('c'); const body = { code: 'c', student, items: [ev('dup')] };
    s.post(body); const again = s.post(body);
    expect(again).toEqual({ ok: true, accepted: ['dup'] }); expect(s.sheets.get('Events')!.rows).toHaveLength(2);
  });
  it('upserts one progress row per student per module and one roster row per student', () => {
    const s = makeScript('c'); const p = (n: number) => ({ code: 'c', student, items: [{ kind: 'progress', id: 'p', module: 'city', completed: ['tutorial'], minutes: n, mastery: { sdoh: 66 } }, ev('x' + n)] });
    s.post(p(5)); s.post(p(12));
    const prog = s.sheets.get('Progress')!.rows; expect(prog).toHaveLength(2); expect(prog[1][5]).toBe(12); expect(prog[1][4]).toBe('tutorial'); expect(prog[1][6]).toContain('sdoh');
    expect(s.sheets.get('Roster')!.rows).toHaveLength(2);
    s.post({ code: 'c', student: { name: 'Ben', period: '3' }, items: [ev('y')] }); expect(s.sheets.get('Roster')!.rows).toHaveLength(3);
  });
  it('builds a formulas-only gradebook that reads the other tabs', () => {
    const s = makeScript('c'); s.post({ code: 'c', student, items: [ev('a')] });
    const g = s.sheets.get('Gradebook')!.rows; expect(g[0][0]).toBe('student');
    for (const cell of g[1]) expect(String(cell).startsWith('=')).toBe(true);
    expect(g[1].join('|')).toMatch(/Roster!.*Events!.*Progress!.*Written!/s);
  });
  it('serves a code-protected roll-up', () => {
    const s = makeScript('c'); s.post({ code: 'c', student, items: [ev('a')] });
    expect(s.get({ code: 'x', action: 'rollup' }).ok).toBe(false);
    const r = s.get({ code: 'c', action: 'rollup' }); expect(r.ok).toBe(true); expect(r.events[0]).toMatchObject({ student: 'Ava', module: 'lab', item: 'q-1' }); expect(r.roster[0].student).toBe('Ava');
  });
});

describe('client sync queue', () => {
  const script = () => makeScript('c');
  const mkFetch = (s: ReturnType<typeof makeScript>, opts: { fail?: () => boolean } = {}) => { const calls: { headers: Record<string, string> }[] = []; const f = (async (_u: string, init: { headers: Record<string, string>; body: string }) => { calls.push({ headers: init.headers }); if (opts.fail?.()) throw new Error('offline'); const out = s.post(init.body); return { json: async () => out }; }) as unknown as typeof fetch; return { f, calls }; };
  beforeEach(() => { useProfiles.setState({ profiles: {}, activeId: null }); useSync.setState({ config: { url: 'https://script.example/exec', code: 'c' }, queue: [], counters: {}, status: 'pending', nextTry: 0, lastError: '' }); });
  const student1 = () => { const id = useProfiles.getState().create('Ava', '3'); useProfiles.getState().switchTo(id); return id; };

  it('turns new answers, written work, and progress into items, and only sends what is new', () => {
    const id = student1(); const st = useProfiles.getState();
    st.recordResponse({ qid: 'q-1', module: 'lab', concept: 'epi-curves', type: 'mc', correct: false, attempts: 2, hintUsed: true, chosen: 'a' }, 'sim:lab'); st.recordWritten({ kind: 'cer', qid: 'q-lab-cer', module: 'lab', text: 'My claim' });
    const first = itemsFor(useProfiles.getState().profiles[id], { r: 0, w: 0, p: '' });
    expect(new Set(first.items.map((i) => i.kind))).toEqual(new Set(['event', 'written', 'progress']));
    const second = itemsFor(useProfiles.getState().profiles[id], first.seen); expect(second.items).toEqual([]);
    // privacy: events carry only grading fields
    expect(Object.keys(first.items.find((i) => i.kind === 'event')!).sort()).toEqual(['attempts', 'chosen', 'concept', 'correct', 'hint', 'id', 'item', 'kind', 'module', 'prediction', 't', 'type']);
  });
  it('sends to the backend as text/plain, then the queue is empty and status is synced', async () => {
    const s = script(); const { f, calls } = mkFetch(s); const id = student1();
    useProfiles.getState().recordResponse({ qid: 'q-1', module: 'city', concept: 'sdoh', type: 'mc', correct: true, attempts: 1, hintUsed: false }, 'lesson:x'); scan();
    expect(useSync.getState().queue.length).toBeGreaterThan(0);
    expect(await flush(f)).toBe(true); expect(useSync.getState().queue).toEqual([]); expect(useSync.getState().status).toBe('synced');
    expect(calls.every((c) => c.headers['Content-Type'] === 'text/plain')).toBe(true);
    expect(s.sheets.get('Events')!.rows).toHaveLength(2); expect(useProfiles.getState().profiles[id].name).toBe('Ava');
  });
  it('keeps everything when offline, retries later, and never duplicates rows', async () => {
    const s = script(); let down = true; const { f } = mkFetch(s, { fail: () => down }); student1();
    for (let i = 0; i < 3; i++) useProfiles.getState().recordResponse({ qid: 'q-' + i, module: 'lab', concept: 'epi-curves', type: 'mc', correct: true, attempts: 1, hintUsed: false }, 'sim:lab');
    scan(); const n = useSync.getState().queue.length;
    expect(await flush(f)).toBe(false); expect(useSync.getState().status).toBe('offline'); expect(useSync.getState().queue).toHaveLength(n); expect(useSync.getState().nextTry).toBeGreaterThan(Date.now());
    down = false; useSync.setState({ nextTry: 0 }); expect(await flush(f)).toBe(true); expect(await flush(f)).toBe(true);
    expect(s.sheets.get('Events')!.rows).toHaveLength(4); expect(useSync.getState().queue).toEqual([]);
  });
  it('the teacher test button explains bad codes and unreachable URLs', async () => {
    const s = script(); const { f } = mkFetch(s);
    expect((await testConnection({ url: 'u', code: 'c' }, f)).ok).toBe(true);
    expect((await testConnection({ url: 'u', code: 'wrong' }, f)).message).toMatch(/does not match/);
    expect((await testConnection({ url: 'u', code: 'c' }, (async () => { throw new Error('x'); }) as unknown as typeof fetch)).message).toMatch(/Could not reach/);
  });
  it('does nothing and sends nothing when sync is not configured', async () => {
    useSync.setState({ config: null }); student1(); useProfiles.getState().recordResponse({ qid: 'q', module: 'lab', concept: 'c', type: 'mc', correct: true, attempts: 1, hintUsed: false }, 'x'); scan();
    expect(useSync.getState().queue).toEqual([]); expect(await flush()).toBe(false);
  });
});
