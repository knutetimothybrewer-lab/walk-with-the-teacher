'use strict';
// Helpers for the end-to-end tests. They drive the REAL UI; they only use the server's answer bank to know what a correct answer is.
const http = require('http');
const assert = require('node:assert/strict');

function getJson(url) {
  return new Promise((resolve, reject) => { http.get(url, (r) => { let b = ''; r.on('data', (c) => { b += c; }); r.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }).on('error', reject); });
}

class Ctl {
  constructor(srv) { this.srv = srv; this.base = srv.url + '__test/'; }
  advance(ms) { return getJson(this.base + 'advance?ms=' + ms); }
  sweep() { return getJson(this.base + 'sweep'); }
  fail(n, mode) { return getJson(this.base + 'fail?n=' + n + '&mode=' + (mode || 'drop')); }
  delay(ms) { return getJson(this.base + 'delay?ms=' + ms); }
  store() { return getJson(this.base + 'store'); }
  reset() { return getJson(this.base + 'reset'); }
}

const CODES = { 'Block 1/2': 'CODE12', 'Block 3/4': 'CODE34', 'Block 8/9': 'CODE89' };

async function signIn(page, o) {
  o = Object.assign({ first: 'Ada', last: 'Lovelace', sid: 'ADA.LOVELACE', block: 'Block 1/2', code: null }, o || {});
  await page.fill('#first', o.first); await page.fill('#last', o.last);
  await page.selectOption('#block', o.block); await page.fill('#code', o.code == null ? CODES[o.block] : o.code);
  await page.click('form button[type=submit]');
}
async function open(page, srv) { await page.goto(srv.url); await page.waitForSelector('#first'); }
async function beginAssessment(page, o) {
  await signIn(page, o);
  await page.waitForSelector('#begin-btn');
  await page.click('#begin-btn');
  await page.waitForSelector('.hero');
}
async function startChapter(page) { await page.click('.hero .btn'); await page.waitForSelector('.unit'); }
async function goToUnit(page, title) {
  await page.click('button.menu-btn');
  await page.click('text=Question map');
  await page.click('.map-units button:has-text("' + title + '")');
  await page.waitForSelector('.unit h2:has-text("' + title + '")');
}

function itemsOf(pubContent) { const out = {}; pubContent.chapters.forEach((c) => c.units.forEach((u) => u.items.forEach((i) => { out[i.id] = i; }))); return out; }

/** Answer one item through the UI. correct=false produces a valid but WRONG answer. */
async function answer(page, pub, keyEntry, correct, opts) {
  const root = '#item-' + pub.id;
  const key = keyEntry.key;
  switch (pub.type) {
    case 'single': {
      const id = correct ? key.correct : pub.options.map((o) => o.id).find((x) => x !== key.correct);
      await page.locator(root + ' input[value="' + id + '"]').check({ force: true }); break;
    }
    case 'multi': {
      const ids = correct ? key.correct : [key.correct[0]];
      for (const id of ids) await page.locator(root + ' input[value="' + id + '"]').check({ force: true });
      break;
    }
    case 'numeric': {
      await page.fill('#num-' + pub.id, String(correct ? key.value : key.value + 1)); break;
    }
    case 'slider': {
      await page.locator('#sl-' + pub.id).evaluate((el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }, correct ? key.value : (key.value > 50 ? key.value - 40 : key.value + 40));
      break;
    }
    case 'order': {
      const want = correct ? key.order : null;
      if (want) {
        for (let i = 0; i < want.length; i++) {
          for (let guard = 0; guard < 20; guard++) {
            const cur = await page.$$eval(root + ' .order-row', (rows) => rows.map((r) => r.dataset.id));
            if (cur.indexOf(want[i]) <= i) break;
            await page.locator(root + ' .order-row[data-id="' + want[i] + '"] [data-dir="up"]').click();
          }
        }
      } // wrong: the shipped order is scrambled and never equals the key
      break;
    }
    case 'assign': {
      const A = pub.assign;
      if (A.layout === 'thread') {
        let flipped = false;
        for (const c of A.cards) {
          let t = key.map[c.id];
          if (!correct && !flipped) { t = A.targets.map((x) => x.id).find((x) => x !== t); flipped = true; }
          await page.locator(root + ' input[name="tag-' + pub.id + '-' + c.id + '"][value="' + t + '"]').check({ force: true });
        }
      } else if (A.mode === 'classify') {
        let flipped = false;
        for (const c of A.cards) {
          let t = key.map[c.id];
          if (!correct && !flipped) { t = A.targets.map((x) => x.id).find((x) => x !== t); flipped = true; }
          const idx = A.targets.findIndex((x) => x.id === t);
          await page.locator(root + ' .cardchip[data-card="' + c.id + '"]').click();
          await page.locator(root + ' section.bucket').nth(idx).locator('.place-btn').click();
        }
      } else {
        const entries = Object.entries(key.map); // targetId -> cardId
        let swapped = false;
        for (let i = 0; i < entries.length; i++) {
          let [t, c] = entries[i];
          if (!correct && !swapped && entries.length > 1) { c = entries[(i + 1) % entries.length][1]; swapped = true; }
          await page.locator(root + ' .cardchip[data-card="' + c + '"]').first().click();
          await page.locator(root + ' .slot[data-target="' + t + '"] .place-btn').click();
        }
      }
      break;
    }
    default: throw new Error('no UI driver for ' + pub.type);
  }
  if (!(opts && opts.noCheck)) await check(page, pub.id);
}
/** Explore every part of the crash lab through the real controls so the mission's questions unlock. */
async function completeCrashLab(page) {
  await page.waitForSelector('#sim-car-go');
  const run = async (btn) => { await page.click(btn); await page.waitForTimeout(60); };
  await page.locator('#sim-belt').check({ force: true }); await run('#sim-car-go');
  await page.locator('#sim-belt').uncheck({ force: true }); await run('#sim-car-go');
  await page.click('#tab-bike');
  await page.locator('#sim-helmet').check({ force: true }); await run('#sim-bike-go');
  await page.locator('#sim-helmet').uncheck({ force: true }); await run('#sim-bike-go');
  await page.click('#tab-egg');
  await page.locator('#sim-sheet').uncheck({ force: true }); await run('#sim-egg-go');
  await page.locator('#sim-sheet').check({ force: true }); await run('#sim-egg-go');
  await page.click('#tab-data'); await page.click('text=Compare both');
  await page.waitForFunction(() => /Simulation complete/.test((document.querySelector('.sim-summary') || {}).textContent || ''), null, { timeout: 5000 });
}
/** Practice every part of the rescue lab through its real controls (hands-free compressions run fast via a test hook). */
async function completeRescueLab(page) {
  await page.waitForSelector('#chest-pad');
  const place = async () => {
    const svgEl = page.locator('.rescue-lab .torso').first(); const bb = await svgEl.boundingBox();
    await page.mouse.click(bb.x + bb.width * 0.5, bb.y + bb.height * ((60 + 0.55 * 220) / 300));
  };
  const scene = async (mode, extra) => {
    await page.click('#mode-' + mode);
    await page.click('#act-response'); await page.click('#act-breathing'); await page.click('#act-call');
    if (extra) { await page.click('#act-airway'); }
    await place();
    await page.locator('#auto-comp').check({ force: true });
    if (extra) {
      await page.waitForFunction(() => document.querySelector('#chest-pad').dataset.wait === 'true', null, { timeout: 15000 });
      await page.click('#act-breaths');
    }
    await page.waitForFunction(() => /Scene complete/.test((document.getElementById('scene-prog') || {}).textContent || ''), null, { timeout: 20000 });
    await page.locator('#auto-comp').uncheck({ force: true });
  };
  await scene('adult', false); await scene('drowning', true); await scene('infant', true);
  await page.click('#rtab-aed');
  await page.click('#aed-on'); await page.click('#aed-bare');
  await page.click('.pad-chip[data-pad=right]'); await page.click('[data-target=right]');
  await page.click('.pad-chip[data-pad=left]'); await page.click('[data-target=left]');
  await page.waitForFunction(() => !document.querySelector('#aed-shock').disabled, null, { timeout: 8000 });
  await page.click('#aed-shock');
  for (let i = 0; i < 10; i++) await page.click('#aed-pad');
  await page.waitForFunction(() => /Simulation complete/.test((document.querySelector('.sim-summary') || {}).textContent || ''), null, { timeout: 10000 });
}
/** Tag six posts in the feed and walk through the practice registry. */
async function completeFeedLab(page) {
  await page.waitForSelector('.feed-lab');
  const tags = { p1: 'myth', p2: 'fact', p3: 'myth', p4: 'myth', p5: 'opinion', p6: 'fact' };
  for (const [id, t] of Object.entries(tags)) await page.click('.tag-btn[data-post=' + id + '][data-tag=' + t + ']');
  await page.click('#ftab-reg');
  for (let i = 0; i < 3; i++) await page.click('#reg-next');
  await page.waitForFunction(() => /Simulation complete/.test((document.querySelector('.sim-summary') || {}).textContent || ''), null, { timeout: 5000 });
}
/** Build the escape plan, get out of both fires with it, and treat three cases. */
async function completeHomeLab(page) {
  await page.waitForSelector('.home-lab');
  for (const id of ['alarm-br1', 'alarm-br2', 'alarm-hall', 'route-br1-door', 'route-br1-window', 'route-br2-door', 'route-br2-window', 'spot-mailbox']) await page.locator('#' + id).check({ force: true });
  await page.waitForFunction(() => /Plan complete/.test((document.getElementById('plan-summary') || {}).textContent || ''), null, { timeout: 5000 });
  await page.click('#htab-fire');
  for (const c of ['s0-low', 's1-window', 's2-close', 's3-meet']) await page.click('#choice-night-' + c);
  await page.waitForSelector('#run-again');
  await page.click('#scn-kitchen');
  for (const c of ['k0-fight', 'k1-A', 'k1-B', 'k2-sdr', 'k3-report']) await page.click('#choice-kitchen-' + c);
  await page.waitForSelector('.run-result[data-outcome=safe]');
  await page.click('#htab-bench');
  for (const id of ['wash', 'press', 'rinse', 'cover']) await page.click('#bi-scrape-' + id);
  await page.click('#case-burn');
  for (const id of ['ice', 'cool', 'cover', 'blister']) await page.click('#bi-burn-' + id);
  await page.click('#case-infected'); await page.click('#dec-self'); await page.click('#dec-help');
  await page.waitForFunction(() => /Simulation complete/.test((document.querySelector('.sim-summary') || {}).textContent || ''), null, { timeout: 5000 });
}
/** Three trips in each mode (different phone choices) and three ruler drops, through the real controls. */
async function completeRoadLab(page) {
  await page.waitForSelector('#trip-go');
  const trip = async (choice) => {
    if (choice === 'dnd') await page.click('#rphone-dnd'); else await page.click('#rphone-on');
    await page.click('#trip-go');
    if (choice !== 'dnd') { await page.waitForSelector('#rc-' + choice, { timeout: 8000 }); await page.click('#rc-' + choice); }
    await page.waitForFunction(() => !document.getElementById('trip-go').disabled, null, { timeout: 30000 });
  };
  for (const mode of ['drive', 'bike', 'walk']) { await page.click('#rmode-' + mode); await trip('ignore'); await trip('type'); await trip('dnd'); }
  await page.click('#rdtab-ruler');
  for (const cond of ['focus', 'dist', 'focus']) {
    await page.click('#cond-' + cond); await page.click('#ruler-ready');
    // catch the ruler from inside the page the moment it starts to fall (a polling wait from outside can miss a 0.8 s window)
    await page.waitForFunction(() => { const s = document.getElementById('ruler-state'); if (s.dataset.state === 'falling') { document.getElementById('ruler-catch').click(); return true; } return false; }, null, { polling: 'raf', timeout: 10000 });
    await page.waitForSelector('#ruler-state[data-state=done]');
  }
  await page.waitForFunction(() => /Simulation complete/.test((document.querySelector('.sim-summary') || {}).textContent || ''), null, { timeout: 5000 });
}
async function completeSim(page) {
  if (await page.locator('.road-lab').count()) return completeRoadLab(page);
  if (await page.locator('.home-lab').count()) return completeHomeLab(page);
  if (await page.locator('.feed-lab').count()) return completeFeedLab(page);
  if (await page.locator('.crash-lab').count()) return completeCrashLab(page);
  if (await page.locator('.rescue-lab').count()) return completeRescueLab(page);
  throw new Error('unknown simulation');
}
async function check(page, id) {
  const item = '#item-' + id;
  await page.waitForFunction((sel) => { const b = document.querySelector(sel + ' .actions .btn'); return b && !b.disabled; }, item, { timeout: 8000 });
  await page.locator(item + ' .actions .btn').click();
  // the click handler runs synchronously, so data-busy is already true; wait until the server has answered
  await page.waitForFunction((sel) => document.querySelector(sel).dataset.busy === 'false', item, { timeout: 25000 });
}
const feedback = (page, id) => page.locator('#item-' + id + ' .feedback').innerText();

module.exports = { getJson, Ctl, CODES, signIn, open, beginAssessment, startChapter, goToUnit, itemsOf, answer, check, completeCrashLab, completeRescueLab, completeFeedLab, completeHomeLab, completeRoadLab, completeSim, feedback, assert };
