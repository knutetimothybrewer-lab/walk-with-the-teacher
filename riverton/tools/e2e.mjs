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
await p.goto(pathToFileURL(resolve('dist-single/index.html')).href);
await p.getByLabel('Your name').fill('Ava'); await p.getByLabel('Class period (optional)').fill('3');
await p.screenshot({ path: 'shots/welcome.png' });
await p.getByRole('button', { name: /Join the commission/ }).click();
await p.getByText('Hello, Ava').waitFor(); await p.waitForTimeout(900);
await p.screenshot({ path: 'shots/home.png' });
await p.getByRole('link', { name: /Start: What is community health/ }).click();
const next = () => p.getByRole('button', { name: /^Next/ }).last().click();
await p.getByText('Hook').waitFor(); await p.screenshot({ path: 'shots/lesson-hook.png' }); await next();
await p.getByText(/Public health/).first().waitFor(); await p.getByRole('button', { name: 'public health' }).click(); await next();
await p.getByText('From conditions to health').waitFor();
for (let i = 0; i < 3; i++) await p.getByRole('button', { name: /^Next/ }).first().click();
await p.screenshot({ path: 'shots/lesson-visual.png' }); await next(); // visual -> worked
await next(); // worked -> guided
await p.getByText('We do').waitFor();
await p.getByRole('radio', { name: /Because a nurse/ }).click(); await p.getByRole('button', { name: 'Check answer' }).click();
await p.getByText(/individual care/).first().waitFor();
await p.getByRole('radio', { name: /Because it aims/ }).click(); await p.getByRole('button', { name: 'Check answer' }).click();
await p.getByText(/Yes: the goal/).waitFor(); await next();
// check q1: miss twice -> reteach -> parallel
await p.getByText(/question 1 of 3/).waitFor();
for (let i = 0; i < 2; i++) {
  await p.getByRole('radio', { name: /doctor prescribes|teenager gets|store sells|city tests/ }).first().click().catch(() => {});
}
await p.getByRole('radio', { name: /A doctor prescribes/ }).click(); await p.getByRole('button', { name: 'Check answer' }).click();
await p.getByRole('button', { name: 'Try again' }).click();
await p.getByRole('radio', { name: /A doctor prescribes/ }).click(); await p.getByRole('button', { name: 'Check answer' }).click();
await p.getByText('Individual care vs. community health').waitFor(); await p.screenshot({ path: 'shots/reteach.png' });
await p.getByRole('button', { name: 'Try a new example' }).click();
await p.getByRole('radio', { name: /Because it aims/ }).click(); await p.getByRole('button', { name: 'Check answer' }).click();
await p.getByRole('button', { name: 'Continue' }).click();
// q2, q3 right
await p.getByRole('radio', { name: /Differences in conditions/ }).click(); await p.getByRole('button', { name: 'Check answer' }).click(); await p.getByRole('button', { name: 'Continue' }).click();
await p.getByRole('radio', { name: /Why is high blood pressure more common/ }).click(); await p.getByRole('button', { name: 'Check answer' }).click(); await p.getByRole('button', { name: 'Continue' }).click();
await next(); await p.getByText('What to remember').waitFor();
await p.getByRole('button', { name: 'Finish lesson' }).click();
await p.getByText('Hello, Ava').waitFor();
const prof = await p.evaluate(() => JSON.parse(localStorage.getItem('riverton.profiles')));
const me = Object.values(prof.profiles)[0];
assert.equal(me.lessonsDone[0], 'orientation-community-health');
assert.ok(me.responses.some((r) => r.correct === false && r.misconception === 'ch-individual-care' && r.hintUsed));
assert.equal(me.mastery['community-health'].level, 'practiced');
await p.goto(pathToFileURL(resolve('dist-single/index.html')).href + '#/notebook'); await p.getByText('Public health protects whole populations').waitFor();
await p.screenshot({ path: 'shots/notebook.png' });
assert.deepEqual(errs, []);
console.log('E2E OK');
await b.close();
