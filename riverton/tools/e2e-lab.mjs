import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

mkdirSync('shots', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM });
const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const lessons = ['lab-chain-surveillance', 'lab-casedef-epicurve', 'lab-attack-rr-confounding'];
await p.addInitScript(([l, sc]) => {
  if (localStorage.getItem('riverton.profiles')) return;
  const prof = { id: 'p1', name: 'Ava', period: '3', created: 1, lastSeen: 1, progress: {}, mastery: {}, responses: [], written: [], notebook: { summaryCards: [], terms: [] }, lessonsDone: l };
  localStorage.setItem('riverton.profiles', JSON.stringify({ profiles: { p1: prof }, activeId: 'p1' }));
  localStorage.setItem('riverton.teacher', JSON.stringify({ lab: sc }));
}, [lessons, { scenario: 'water', classSeed: 2, budget: 100, days: 10, scaffolds: true }]);
await p.goto(pathToFileURL(resolve('dist-single/index.html')).href + '#/lab');

const click = (name, o = {}) => p.getByRole('button', { name, ...o }).first().click();
const choose = async (name) => { await p.getByRole('radio', { name }).first().click(); await click('Check answer'); await click('Continue'); };
const shot = (n) => p.screenshot({ path: `shots/lab-${n}.png` });

await p.screenshot({ path: 'shots/lab-intro.png' });
await click(/Begin investigation/);
await p.getByText('Foundations').first().waitFor(); await click(/Go to the alert/);
await p.getByText(/ER visits for stomach illness/).first().waitFor(); await p.waitForTimeout(1200); await shot('alert');
await choose(/Compare against the baseline/); await click(/Start the investigation/);
await p.getByText('Build a case definition').waitFor();
await click('Diarrhea'); await click('Vomiting'); await p.waitForTimeout(400); await shot('casedef');
await p.getByText(/Balanced|Too broad|Too narrow/).first().waitFor();
await choose(/too broad: it counts many/); await click(/Use this definition/);
await p.getByText('Form a hypothesis').waitFor();
await p.getByLabel('Suspected source').selectOption('diner'); await p.getByLabel('Reason').selectOption({ index: 5 }); await click('Save hypothesis');
await p.getByText('Investigate').first().waitFor();
// investigate: interview, survey, test water, active case finding
const act = async (title) => { const card = p.locator('.acard', { has: p.getByRole('heading', { name: title }) }); await card.getByRole('button', { name: /Do it/ }).click(); await p.waitForTimeout(250); };
await act(/Interview cases/); await p.getByText(/Interviewed \d+ case/).waitFor({ timeout: 5000 });
await act(/Survey residents/); await p.getByText(/Surveyed 15 residents/).waitFor();
await act(/Active case finding/);
await act(/Test water/);
await shot('investigate');
await click(/Analyze the data/);
await p.getByText('Analyze', { exact: true }).first().waitFor();
await click('What shape is this?');
for (let i = 0; i < 3; i++) { // try options until the shape is identified (no parallel question exists for generated data)
  if (await p.getByText('Shape identified.').count()) break;
  const radios = p.getByRole('radio'); if (!(await radios.count())) break;
  await radios.nth(i).click(); await click('Check answer');
  if (await p.getByText(/Nice work/).count()) { await click('Continue'); break; }
  if (await p.getByRole('button', { name: 'Try again' }).count()) await click('Try again');
  else if (await p.getByRole('button', { name: 'Try a new example' }).count()) { await click('Try a new example'); break; }
}
await p.getByText('Shape identified.').waitFor({ timeout: 8000 }); await shot('curve');
await click('Line list'); await p.getByText('Active case finding').first().waitFor({ timeout: 5000 }).catch(() => {});
await click('Spot map'); await p.getByText('Cases by neighborhood').waitFor(); await shot('map');
await click(/2×2 table/);
await p.getByLabel('Exposure').selectOption('tapWater'); await p.getByText(/Relative risk =/).waitFor(); await shot('table');
await click('Check my understanding');
const radios = p.getByRole('radio'); await radios.first().waitFor();
await p.getByRole('radio', { name: /(times as likely|similar exposure)/ }).first().click(); await click('Check answer'); await click('Continue');
await click('Resample'); await click('Draw 5 new samples'); await p.getByText(/The relative risk ranged from/).waitFor(); await shot('resample');
await p.getByLabel('Suspected source').selectOption('water'); await p.getByLabel('Reason').selectOption({ index: 1 }); await click('Save hypothesis');
await click(/Choose an intervention/);
await p.getByText('Intervene').first().waitFor();
const ivc = p.locator('.acard', { has: p.getByRole('heading', { name: 'Repair the water main' }) }); await ivc.getByRole('button', { name: /Order on day/ }).click();
await p.getByText(/The curve bends/).waitFor(); await p.waitForTimeout(1500); await shot('intervene');
await choose(/Compare with what would have happened/);
await click(/Write your conclusion/);
await p.getByLabel('Your written response').fill('Claim: the water supply after the main break. Evidence: cases cluster in one neighborhood with a long plateau on the curve. Reasoning: festival and diner were red herrings.');
await click('Submit'); await click('Continue');
await p.getByText('Does the evidence support causation?').waitFor(); await shot('conclusion'); await click(/Evaluate limitations/);
await choose(/Many sick people were never tested/); await choose(/Recall bias: memory/);
await choose(/pathogen is fictional/);
await shot('limits'); await click(/Ethics and privacy/);
await click('Date illness started'); await click(/Suspected source and what/); await p.getByText(/Cases are linked to a specific source/).click();
await click(/See the privacy review/); await choose(/Share counts by broad area/);
await shot('ethics'); await click(/See the results/);
await p.getByText('The truth').waitFor(); await p.waitForTimeout(500); await shot('debrief');

const st = await p.evaluate(() => ({ prof: JSON.parse(localStorage.getItem('riverton.profiles')), shared: JSON.parse(localStorage.getItem('riverton.shared') ?? 'null'), lab: JSON.parse(localStorage.getItem('riverton.lab')) }));
const me = st.prof.profiles.p1;
assert.ok(me.progress.lab.completed.includes('outbreak'), 'progress saved');
assert.ok(me.written.some((w) => w.kind === 'cer'), 'CER saved');
assert.ok(me.responses.some((r) => r.concept === 'relative-risk' && r.module === 'lab'), 'RR response saved');
assert.ok(Array.isArray(st.shared.outbreakCases) && st.shared.outbreakCases.length > 0, 'shared outbreak cases for Rumor Mill');
assert.equal(st.lab.p1.step, 'done');
assert.deepEqual(errs, []);
console.log('LAB E2E OK');
await b.close();
