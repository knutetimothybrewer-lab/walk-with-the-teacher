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
await p.addInitScript(() => {
  Math.random = () => 0.123456;
  if (localStorage.getItem('riverton.profiles')) return;
  const prof = { id: 'p1', name: 'Ava', period: '3', created: 1, lastSeen: 1, progress: {}, mastery: {}, responses: [], written: [], notebook: { summaryCards: [], terms: [] }, lessonsDone: ['xr-decision-stakeholders', 'xr-misinfo'] };
  localStorage.setItem('riverton.profiles', JSON.stringify({ profiles: { p1: prof }, activeId: 'p1' }));
  localStorage.setItem('riverton.teacher', JSON.stringify({ timedChoices: false }));
  localStorage.setItem('riverton.shared', JSON.stringify({ trust: 60, interventions: [], outbreakCases: [20, 70, 50, 25, 10, 4], townHallChoice: null, rumorOutcome: null }));
});
const base = pathToFileURL(resolve('dist-single/index.html')).href;
const click = (name, o = {}) => p.getByRole('button', { name, ...o }).first().click();
const shot = (n) => p.screenshot({ path: `shots/xr-${n}.png` });
const scenes = async () => { // click through dialogue until a non-dialogue screen
  for (let i = 0; i < 40; i++) {
    const nxt = p.locator('.dnext button'); if (!(await nxt.count())) return;
    await nxt.first().click({ timeout: 15000 }); await p.waitForTimeout(80);
  }
};
const scenesUntil = async (re) => { for (let i = 0; i < 40; i++) { if (await p.getByText(re).count()) return; const nxt = p.locator('.dnext button'); if (!(await nxt.count())) return; await nxt.first().click({ timeout: 15000 }); await p.waitForTimeout(80); } };
const choose = async (name) => { await p.getByRole('radio', { name }).first().click(); await click('Check answer'); await click('Continue'); };

// ------------------------------------------------------------------ Town Hall
await p.goto(base + '#/crossroads/town-hall');
await p.getByText('The Lot on Elm Street').first().waitFor(); await shot('intro');
await click('Begin'); await scenes(); await shot('scene-cityhall');
await p.getByText('Eastside by the numbers').waitFor(); await shot('data');
await choose(/nearly three times/); await click('Continue');
await p.getByText(/How and when will you hold it/).waitFor(); await shot('engage');
await click(/Saturday at the Eastside community center/);
await p.getByText(/Think about who can actually show up/).waitFor();
for (let i = 0; i < 5; i++) await p.locator('.imp-row').nth(i).getByRole('button', { name: i === 1 ? 'Benefits' : 'Bears costs' }).click();
await click('Save my thinking and continue'); await scenes(); await shot('saturday');
await p.getByText(/Whom will you listen to/).waitFor();
for (const name of ['Mr. Walter Whitfield', 'Ms. Rosa Alvarez', 'Pastor Grace Bell', 'Jordan Reyes']) {
  await p.getByRole('button', { name: new RegExp(name) }).first().click();
  for (let i = 0; i < 6; i++) { if (await p.getByRole('button', { name: 'Back to the room' }).count()) break; await click(/^(Next|Skip)$/); }
  await click('Back to the room');
}
await shot('listen'); await click('Continue');
await p.getByText(/What people say, and what the data shows/).waitFor(); await shot('compare'); await click('Continue');
await p.getByText(/Which evidence is shaping your thinking/).waitFor();
await p.getByText(/Preventable ER visits: 142/).click(); await p.getByText(/Mr. Walter Whitfield \(Eastside elder/).click().catch(() => {});
await click('Save my thinking and continue'); await scenes();
await p.getByText(/Build your proposal/).waitFor();
await click('Small clinic ($1.0M)'); await click('Pocket park ($0.5M)'); await click('Add protections'); await shot('proposal');
await click('Submit proposal to the commission');
await p.getByText(/What are you giving up/).waitFor(); await p.getByText(/extra \$2M/).click(); await click('Save my thinking and continue');
await p.getByLabel('Your answer').fill('Hold a second weekend session and ask more residents about housing.'); await click('Save my thinking and continue');
await p.getByText(/narrow or widen the health gap/).waitFor(); await click('Narrows the gap'); await p.locator('select').selectOption('Eastside families overall'); await click('Save my thinking and continue');
await scenes();
await p.getByText(/The chair looks at you/).waitFor(); await click(/Amend: add housing protections/);
await p.getByLabel('Your answer').fill('Protections respond to what Pastor Bell and Mr. Whitfield told us about rising rents.'); await click('Save my thinking and continue');
await p.getByText(/Pause and think/).waitFor(); await click('Keep my choice');
await click('Call the vote'); await p.getByText(/yes ·/).waitFor(); await shot('vote'); await p.getByRole('button', { name: 'Continue' }).click({ timeout: 20000 });
await scenesUntil(/What the City model projects/); await p.getByText(/What the City model projects/).waitFor(); await shot('projection');
await p.locator('.dnext button', { hasText: 'Continue' }).click();
await p.getByText(/how good your decision was|judge how good your decision/).waitFor().catch(() => {});
if (await p.getByRole('radio').count()) await choose(/process were sound/);
if (await p.getByLabel('Your written response').count()) { await p.getByLabel('Your written response').fill('My reasoning used the ER and asthma data and the pastor’s concern about rents, so I judge the decision by process and not just the outcome. The elder and parent changed my thinking; the developer’s side was only partly heard. The projection suggests a small narrowing of the gap.'); await click('Submit'); await click('Continue'); }
await p.getByText('Ending').first().waitFor(); await shot('ending');
await click(/Branch map/); await p.getByText(/paths not taken/).waitFor();
await p.locator('.bopt.untaken').first().click();
await p.getByText('Compare two runs').waitFor(); await p.getByText('Community trust').first().waitFor(); await shot('whatif');
await click(/Reasoning rubric/); await p.getByText('Uses data as evidence').waitFor(); await shot('rubric');

let st = await p.evaluate(() => JSON.parse(localStorage.getItem('riverton.profiles')));
let me = st.profiles.p1;
assert.ok(me.crossroads['town-hall'].ending, 'ending recorded'); assert.ok(me.crossroads['town-hall'].rubric.length === 7);
assert.ok(me.written.some((w) => w.module === 'crossroads'), 'justification text saved'); assert.ok(me.written.some((w) => w.kind === 'cer' && w.qid === 'q-xr-th-cer'), 'CER saved');
const sh1 = await p.evaluate(() => JSON.parse(localStorage.getItem('riverton.shared')));
assert.ok(typeof sh1.trust === 'number' && sh1.townHallChoice, 'trust and ending shared');

// ------------------------------------------------------------------ Rumor Mill
await p.goto(base + '#/crossroads/rumor-mill'); await p.getByText('Rumor Mill').first().waitFor();
await p.getByText(/Using the outbreak from your Sim Lab/).waitFor(); await click('Begin'); await scenes();
await p.getByText('Eastside Neighbors').waitFor(); await p.waitForTimeout(4200); await shot('chat'); await click('Continue');
await click(/Do not share it yet/); const reason = async (txt, approach) => { await p.getByText('Reasoning check').waitFor(); if (approach) await click(approach); await p.locator('textarea').fill(txt); await click('Save my thinking and continue'); };
await reason('A rumor could make people skip boiling water, so I should check first.');
await click(/Leave the post, open new tabs/); await reason('The health department notice and lab results are independent of the post.', 'Verify before sharing');
await p.getByText(/What the post says, and what the sources show/).waitFor(); await click('Continue');
await click(/I get why it feels that way/); await reason('Acknowledging the history builds trust before the facts land.', 'Empathize, then redirect');
await click(/Ask Pastor Bell/); await reason('People here trust her more than a city announcement, though she might worry about alarming the congregation.', 'Use a trusted messenger');
await click(/Yes: post in multiple languages/);
await scenesUntil(/Compliance with the boil-water notice/); await p.getByText(/Compliance with the boil-water notice/).waitFor(); await shot('rumor-curve');
const txt = await p.locator('.xr-card').filter({ hasText: 'Compliance with the boil-water notice' }).innerText();
await p.locator('.dnext button', { hasText: 'Continue' }).click();
await p.getByLabel('Your written response').fill('Asking Pastor Bell did the most, since cases fell and more people followed the notice because she is trusted.'); await click('Submit'); await click('Continue');
await p.getByText('Ending').first().waitFor(); await shot('rumor-ending');
st = await p.evaluate(() => ({ prof: JSON.parse(localStorage.getItem('riverton.profiles')), sh: JSON.parse(localStorage.getItem('riverton.shared')) }));
assert.ok(st.prof.profiles.p1.crossroads['rumor-mill'].ending); assert.ok(/expected before your messages/.test(await p.locator('body').innerText()) && /179/.test(await p.locator('body').innerText()), 'used the Lab curve (179 cases)');
assert.ok(st.sh.rumorOutcome, 'rumor outcome shared'); assert.ok(txt.includes('%'));
assert.deepEqual(errs, []);
console.log('XR E2E OK');
await b.close();
