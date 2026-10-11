import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const world = JSON.parse(readFileSync('src/content/shared/riverton-world.json', 'utf8'));
const label = (id) => world.neighborhoods.find((h) => h.id === id).label;
mkdirSync('shots', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.addInitScript(() => {
  if (localStorage.getItem('riverton.profiles')) return;
  const prof = { id: 'p1', name: 'Ava', period: '3', created: 1, lastSeen: 1, progress: {}, mastery: {}, responses: [], written: [], notebook: { summaryCards: [], terms: [] }, lessonsDone: ['city-sdoh', 'city-upstream', 'city-equity'] };
  localStorage.setItem('riverton.profiles', JSON.stringify({ profiles: { p1: prof }, activeId: 'p1' }));
});
const base = pathToFileURL(resolve('dist-single/index.html')).href;
const click = (name, o = {}) => p.getByRole('button', { name, ...o }).first().click();
const shot = (n) => p.screenshot({ path: `shots/city-${n}.png` });
const mapPt = async (id) => { const r = await p.locator('.surface canvas').boundingBox(); const sc = Math.min(r.width / 1000, r.height / 640); const [x, y] = label(id); return { x: r.x + (r.width - 1000 * sc) / 2 + x * sc, y: r.y + (r.height - 640 * sc) / 2 + y * sc }; };
const clickMap = async (id, dy = 0) => { const q = await mapPt(id); await p.mouse.move(q.x, q.y + dy); await p.mouse.click(q.x, q.y + dy); };
const answerPredict = async () => { await p.getByLabel(/Which outcome do you expect/).selectOption({ index: 2 }); await click('Goes down'); await click('Small'); await p.getByLabel(/Which neighborhood will benefit/).selectOption({ label: 'Eastside' }); await click('Lock in my prediction'); };
const observe = async () => { await p.getByLabel(/In one or two sentences/).fill('The action improved conditions, which changed behavior, and the outcome moved slowly over a few years.'); await click('Save my explanation'); };
const settle = async (n = 60) => { // answer any modal that is open until none remain
  for (let i = 0; i < n; i++) {
    if (await p.getByRole('button', { name: 'Lock in my prediction' }).count()) { await answerPredict(); continue; }
    if (await p.getByRole('button', { name: 'Save my explanation' }).count()) { await observe(); continue; }
    return;
  }
};
const build = async (group, name, id, isPoint) => {
  if (group) await p.locator('summary', { hasText: group }).first().click().catch(() => {});
  await p.locator('.pal', { hasText: name }).first().click();
  if (isPoint) await clickMap(id); else await clickMap(id, 6);
  try { await p.getByRole('button', { name: 'Build it' }).click({ timeout: 8000 }); } catch (e) { await shot('fail-' + name.replace(/\W+/g, '_')); throw new Error('no confirm for ' + name); }
  await p.waitForTimeout(150); await settle();
};

// ------------------------------------------------------------------ tutorial
await p.goto(base + '#/city'); await p.getByText('City: Plan').first().waitFor(); await shot('hub');
await p.locator('.city-mod', { hasText: 'Welcome to the City' }).getByRole('button', { name: 'Start' }).click();
await p.locator('.surface canvas').waitFor({ timeout: 20000 }); await p.waitForTimeout(1200); await shot('map');
await clickMap('eastside'); await p.getByRole('heading', { name: 'Eastside' }).first().waitFor();
await p.getByLabel('Map overlay').selectOption('out:preventableER'); await p.waitForTimeout(500); await shot('overlay');
await p.locator('summary', { hasText: 'Healthcare' }).first().waitFor();
await p.locator('.pal', { hasText: 'Community health clinic' }).click(); await p.mouse.move(...Object.values(await mapPt('eastside'))); await p.waitForTimeout(250); await shot('ghost');
await clickMap('eastside'); await p.getByText(/Reaches about/).waitFor(); await shot('confirm');
await click('Build it'); await p.getByText(/Predict: Community health clinic/).waitFor(); await shot('predict'); await answerPredict();
await click('+1 year'); await p.getByText(/Year 2/).first().waitFor({ timeout: 20000 });
await p.getByRole('button', { name: 'Why did Preventable ER visits change?' }).click(); await p.getByText(/Here is the chain of cause and effect|Nothing has changed yet/).waitFor(); await shot('why');
const whyText = await p.locator('[role=dialog]').innerText(); await p.getByRole('button', { name: 'Close' }).click();
await click('+1 year'); await p.getByText(/Observe and explain/).waitFor({ timeout: 20000 }); await shot('observe'); await observe();
await click('+1 year'); await p.waitForTimeout(1800); if (!(await p.getByText('Tutorial complete').count())) await click('+1 year'); await p.getByText('Tutorial complete').waitFor({ timeout: 30000 }); await shot('tutorial-done');
await click('Back to missions');
let st = await p.evaluate(() => JSON.parse(localStorage.getItem('riverton.profiles'))).then((x) => x.profiles.p1);
assert.ok(st.progress.city.completed.includes('tutorial'), 'tutorial recorded');
assert.ok(st.responses.some((r) => r.type === 'poe' && r.module === 'city' && r.concept === 'prevention-levels' && r.prediction), 'POE response with prediction saved');
assert.ok(st.written.some((w) => w.qid === 'poe-clinic' && w.text.length > 15), 'POE explanation saved');

// ------------------------------------------------------------------ Close the Gap
await p.locator('.city-mod', { hasText: 'Close the Gap' }).getByRole('button', { name: /Start/ }).click(); await p.locator('.surface canvas').waitFor(); await p.waitForTimeout(800);
await build(null, 'Community health clinic', 'eastside', true);
await build(null, 'Full-service grocery', 'eastside', true);
await build('Active living', 'Park / green space', 'eastside', true);
await build(null, 'Sidewalks', 'eastside', true);
await build(null, 'New bus route', 'eastside', true);
await build('Community programs', 'Community health workers', 'eastside', false);
await build(null, 'Nutrition education', 'eastside', false);
await build(null, 'Insurance enrollment', 'eastside', false);
await build('Environment', 'Lead service line', 'eastside', false);
await shot('built'); await click('Snapshots'); await p.getByPlaceholder(/Name/).fill('Plan A start'); await click('Save');
await p.getByLabel('Map overlay').selectOption('out:lifeExpectancy');
// play 10 years, answering prompts as they appear
let fpsText = '';
for (let i = 0; i < 120; i++) {
  if (await p.getByText(/Mission complete|The ten years are up/).count()) break;
  await settle(); if (await p.getByText(/Mission complete|The ten years are up/).count()) break;
  const yr = await p.locator('.hud .chip').first().innerText(); const y = Number(/Year (\d+)/.exec(yr)?.[1] ?? 1);
  if (y >= 11) { await p.waitForTimeout(300); continue; }
  await p.getByRole('button', { name: '+5 years' }).click().catch(() => {}); await p.waitForTimeout(700);
  if (i === 3) { fpsText = await p.locator('.legend .chip').innerText(); await shot('midgame'); }
}
await p.getByText(/Mission complete|The ten years are up/).waitFor({ timeout: 30000 }); await shot('result');
const body = await p.locator('[role=dialog]').innerText(); assert.match(body, /reduction of/);
// questions at the end: answer whatever appears until Finish
for (let i = 0; i < 40; i++) {
  if (await p.getByRole('button', { name: 'Finish mission' }).count()) break;
  const ta = p.getByLabel('Your written response');
  if (await ta.count()) { await ta.fill('Claim: the gap narrowed by about two years. Evidence: Eastside life expectancy rose and preventable ER visits fell in the Trends chart. Reasoning: the clinic and health workers raised healthcare access and preventive care, upstream conditions took years to change outcomes, and the model is a simplified teaching tool.'); await click('Submit'); await click('Continue'); continue; }
  if (await p.getByRole('button', { name: 'Check order' }).count()) { await click('Check order'); }
  else if (await p.locator('[role=dialog] .opt select').count() > 0) { const sels = p.locator('[role=dialog] select'); const n = await sels.count(); for (let k = 0; k < n; k++) await sels.nth(k).selectOption(['primary', 'secondary'][k % 2]); await p.getByRole('button', { name: 'Check', exact: true }).click(); }
  else if (await p.getByRole('radio').count()) { await p.getByRole('radio').first().click(); await click('Check answer'); }
  await p.waitForTimeout(150);
  if (await p.getByRole('button', { name: 'Continue' }).count()) await click('Continue');
  else if (await p.getByRole('button', { name: 'Try again' }).count()) await click('Try again');
  else if (await p.getByRole('button', { name: 'Try a new example' }).count()) await click('Try a new example');
}
await click('Finish mission');
st = await p.evaluate(() => ({ prof: JSON.parse(localStorage.getItem('riverton.profiles')), sh: JSON.parse(localStorage.getItem('riverton.shared')) }));
const me = st.prof.profiles.p1;
assert.ok(me.progress.city.completed.includes('close-the-gap'));
assert.ok(me.responses.filter((r) => r.type === 'poe').length >= 5, 'POE for each first-time type');
assert.ok(me.written.some((w) => w.kind === 'cer' && w.qid === 'q-city-cer'), 'CER saved');
assert.ok(me.responses.some((r) => r.module === 'city' && r.concept === 'reading-graphs' || r.concept === 'upstream-downstream'), 'dynamic data/chain questions recorded');
assert.ok(st.sh.interventions.includes('clinic'), 'built interventions shared with other modules');
console.log('fps', fpsText);
if (errs.length) console.log('ERRS', errs.slice(0, 3));
assert.deepEqual(errs, []);
console.log('CITY E2E OK');
await b.close();
