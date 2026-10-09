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

const CODES = { 'Block 1/2': 'CODE12', 'Block 3/4': 'CODE34', 'Block 6/7': 'CODE67', 'Block 8/9': 'CODE89' };

async function signIn(page, o) {
  o = Object.assign({ first: 'Ada', last: 'Lovelace', sid: 'S1001', block: 'Block 1/2', code: null }, o || {});
  await page.fill('#first', o.first); await page.fill('#last', o.last); await page.fill('#sid', o.sid);
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
async function check(page, id) {
  const item = '#item-' + id;
  await page.waitForFunction((sel) => { const b = document.querySelector(sel + ' .actions .btn'); return b && !b.disabled; }, item, { timeout: 8000 });
  await page.locator(item + ' .actions .btn').click();
  // the click handler runs synchronously, so data-busy is already true; wait until the server has answered
  await page.waitForFunction((sel) => document.querySelector(sel).dataset.busy === 'false', item, { timeout: 25000 });
}
const feedback = (page, id) => page.locator('#item-' + id + ' .feedback').innerText();

module.exports = { getJson, Ctl, CODES, signIn, open, beginAssessment, startChapter, goToUnit, itemsOf, answer, check, feedback, assert };
