import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

mkdirSync('shots', { recursive: true }); mkdirSync('/tmp/claude-0/rollup', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM });
const base = pathToFileURL(resolve('dist-single/index.html')).href;
const mastery = (l, n = 2) => ({ level: l, contexts: ['a', 'b'].slice(0, n), correct: 3, attempts: 4, lastSeen: 1 });
const mkProfile = (id, name, extra = {}) => ({ id, name, period: '3', created: 1, lastSeen: 1,
  progress: { orientation: { completed: ['orientation'], minutes: 5 }, city: { completed: ['close-the-gap'], minutes: 44 }, crossroads: { completed: ['town-hall', 'rumor-mill'], minutes: 30 }, lab: { completed: ['outbreak'], minutes: 38 } },
  mastery: { sdoh: mastery('mastered'), confounding: mastery('practiced', 1), 'relative-risk': mastery('introduced', 0) },
  responses: [{ id: 'r1', t: 1, qid: 'q-ch-1', module: 'shared', concept: 'community-health', type: 'mc', correct: false, attempts: 2, hintUsed: true, chosen: 'a', misconception: 'ch-individual-care' }],
  written: [{ id: 'w1', t: 1, kind: 'cer', qid: 'q-city-cer', module: 'city', text: 'The clinic and health workers narrowed the gap by 3 years in my city.' }, { id: 'w2', t: 2, kind: 'cer', qid: 'q-lab-cer', module: 'lab', text: 'The water supply after the main break was the source.' }],
  notebook: { summaryCards: [], terms: [] }, lessonsDone: ['orientation-community-health'],
  city: { missions: { 'close-the-gap': { gapStart: 12.4, gapEnd: 8.4, reduced: 4, target: 2.5, won: true, stars: 2, displacedPct: 9.8, built: ['clinic', 'supermarket', 'park'], at: 1 } } },
  crossroads: {
    'town-hall': { ending: 'shared', reasoning: [], rubric: [{ id: 'data', score: 2, max: 2 }, { id: 'voice', score: 1, max: 2 }, { id: 'equity', score: 2, max: 2 }], at: 1, summary: { trust: 72, session: 'saturday', heard: ['elder', 'parent', 'pastor', 'teen'], proposal: { clinic: 1, coop: 0, park: 1, housing: 0, developer: false, protections: true }, passed: true, proj: { before: { preventableER: 142 }, after: { preventableER: 129 }, gapBefore: 12.4, gapAfter: 12.1, originalShare: 100 } } },
    'rumor-mill': { ending: 'contained', reasoning: [], rubric: [{ id: 'data', score: 1, max: 2 }], at: 1, summary: { messenger: 'pastor', rumor: { c0: 0.65, c1: 0.9, casesBefore: 179, casesAfter: 120 } } } },
  lab: { scenario: 'water', seed: 2, source: 'Contaminated water after a main break', curve: 'continuous', hypothesis1: 'diner', hypothesis2: 'water', hypothesisRight: true, caseDefVerdict: 'balanced', surveys: 2, interviews: 8, waterTests: 1, inspections: 0, activeFinding: true, interventions: [{ kind: 'fix_main', day: 5 }], targeted: true, casesPrevented: 140, daysUsed: 8, budgetUsed: 62, at: 1 }, ...extra });

// ------------------------------------------------------------------ student finishes the year
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const sent = [];
await p.route('**/script-backend/exec', async (route) => { const body = JSON.parse(route.request().postData()); sent.push({ ct: route.request().headers()['content-type'], body }); await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: !body.test ? true : true, test: !!body.test, accepted: (body.items ?? []).map((i) => i.id) }) }); });
await p.addInitScript(([prof]) => { if (localStorage.getItem('riverton.profiles')) return; localStorage.setItem('riverton.profiles', JSON.stringify({ profiles: { p1: prof }, activeId: 'p1' })); localStorage.setItem('riverton.shared', JSON.stringify({ trust: 72, interventions: [], outbreakCases: [20, 70, 50, 25, 10, 4], townHallChoice: 'shared', rumorOutcome: 'contained' })); localStorage.setItem('riverton.sync', JSON.stringify({ config: { url: 'https://example.test/script-backend/exec', code: 'river-7' }, queue: [], counters: {} })); }, [mkProfile('p1', 'Ava')]);
await p.goto(base);
await p.getByText('Your year on the commission').waitFor(); await p.waitForTimeout(500);
assert.equal(await p.locator('.storyline li.done').count(), 5, 'five chapters done'); assert.match(await p.locator('.storyline li.now').innerText(), /Wrap-up/);
await p.screenshot({ path: 'shots/wrap-home.png' });
await p.getByRole('link', { name: /Continue: Wrap-up/ }).click();
await p.getByRole('heading', { name: 'Executive summary' }).waitFor({ timeout: 25000 }); await p.waitForTimeout(500);
const report = await p.locator('.report').innerText();
for (const s of ['12.4 years', 'Contaminated water after a main break'.toLowerCase(), 'A shared table', 'The rumor is contained', 'expected outbreak cases moved from', 'Uses data as evidence', 'The clinic and health workers narrowed']) assert.ok(report.toLowerCase().includes(s.toLowerCase()), 'report has: ' + s);
assert.match(report, /reduction of\s+4\.0|reduction of 4\.0/); assert.match(report, /mastered\s*1/i);
await p.screenshot({ path: 'shots/wrap-report.png', fullPage: true });
await p.getByRole('button', { name: 'Write the executive summary' }).click();
await p.getByLabel('Your written response').fill('Claim: the gap is Riverton’s biggest challenge and I recommend upstream investment with residents. Evidence: my City plan narrowed it by 4 years but displaced about 10%, and the Town Hall protections kept residents. Reasoning: determinants, equity, and trust connect all four chapters, though the models are simplified.');
await p.getByRole('button', { name: 'Submit' }).click(); await p.getByRole('button', { name: 'Continue' }).click();
await p.getByText('Report saved to your portfolio').waitFor();
let prof = (await p.evaluate(() => JSON.parse(localStorage.getItem('riverton.profiles')))).profiles.p1;
assert.ok(prof.report.summary.includes('upstream'), 'report saved'); assert.ok(prof.progress.wrapup.completed.includes('report'));
await p.goto(base + '#/'); await p.getByText(/You have finished the year/).waitFor();
// sync: badge and queued data reached the (intercepted) backend as text/plain, with grading fields only
await p.waitForTimeout(500); await p.evaluate(() => window.dispatchEvent(new Event('online'))); await p.waitForTimeout(1500);
assert.ok(sent.length > 0, 'sync sent data'); assert.ok(sent.every((s) => s.ct.startsWith('text/plain')), 'text/plain'); const items = sent.flatMap((s) => s.body.items ?? []);
assert.ok(items.some((i) => i.kind === 'event') && items.some((i) => i.kind === 'written' && i.text) && items.some((i) => i.kind === 'progress'), 'event, written, progress items');
assert.ok(sent.every((s) => s.body.code === 'river-7' && (s.body.test || s.body.student.name === 'Ava')));
await p.getByText(/Saved/).first().waitFor();

// ------------------------------------------------------------------ teacher builds and shares a preset
await p.goto(base + '#/teacher'); await p.getByLabel('PIN').fill('1234'); await p.getByRole('button', { name: 'Set PIN' }).click();
await p.getByRole('heading', { name: 'Assignment preset' }).waitFor();
await p.locator('.toggle', { hasText: 'City: Close the Gap' }).locator('input').check();
await p.locator('.toggle', { hasText: '2. City: Plan' }).locator('input').uncheck();
await p.getByRole('button', { name: 'Apply here' }).click(); await p.getByText('Applied on this device.').waitFor();
const preset = await p.evaluate(() => JSON.parse(localStorage.getItem('riverton.preset')));
assert.ok(preset.off.includes('city') && preset.lockedMissions.includes('close-the-gap'));
await p.goto(base + '#/'); await p.getByText(/Not assigned/).first().waitFor();
assert.equal(await p.locator('.mod button:disabled', { hasText: 'Not assigned' }).count(), 1, 'City card disabled'); await p.screenshot({ path: 'shots/wrap-preset.png' });
// pacing + roll-up (teacher)
await p.goto(base + '#/teacher'); if (await p.getByLabel('PIN').count()) { await p.getByLabel('PIN').fill('1234'); await p.getByRole('button', { name: 'Unlock' }).click(); } await p.getByRole('heading', { name: 'Pacing (teachers only)' }).waitFor();
assert.match(await p.locator('section', { hasText: 'Pacing (teachers only)' }).innerText(), /Ava/);
writeFileSync('/tmp/claude-0/rollup/ava.json', JSON.stringify({ app: 'riverton', version: 1, exported: 1, profile: mkProfile('p1', 'Ava') }));
writeFileSync('/tmp/claude-0/rollup/ben.json', JSON.stringify({ app: 'riverton', version: 1, exported: 1, profile: mkProfile('p2', 'Ben', { mastery: { sdoh: mastery('practiced') }, lab: { ...mkProfile('x', 'x').lab, hypothesisRight: false, targeted: false } }) }));
await p.locator('section.wide', { hasText: 'Class roll-up' }).locator('input[type=file]').setInputFiles(['/tmp/claude-0/rollup/ava.json', '/tmp/claude-0/rollup/ben.json']);
await p.getByText(/2 students/).waitFor(); const ru = await p.locator('section.wide', { hasText: 'Class roll-up' }).innerText();
assert.match(ru, /Hypothesis correct: 50%/); assert.match(ru, /Targeted the true source: 50%/); assert.match(ru, /Most-missed questions/); assert.match(ru, /goal met by 100%/);
await p.screenshot({ path: 'shots/wrap-rollup.png', fullPage: true });
const url = await p.evaluate(() => { const pr = JSON.parse(localStorage.getItem('riverton.preset')); const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(pr)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); return location.href.split('#')[0] + '#/join/' + b64; });

// ------------------------------------------------------------------ a second student opens the join link
const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const q = await ctx2.newPage(); q.on('pageerror', (e) => errs.push(e.message));
await q.goto(url); await q.getByText('Join your class').waitFor(); await q.getByText(/not assigned/i).first().waitFor();
await q.getByRole('button', { name: 'Start this assignment' }).click(); await q.getByRole('link', { name: 'Go to Riverton' }).waitFor();
const pre2 = await q.evaluate(() => JSON.parse(localStorage.getItem('riverton.preset'))); assert.ok(pre2.off.includes('city') && pre2.lockedMissions.includes('close-the-gap'));
await q.goto(url.split('#')[0] + '#/join/garbage'); await q.getByText(/not a Riverton assignment/).waitFor();
assert.deepEqual(errs, []);
console.log('WRAP E2E OK');
await browser.close();
