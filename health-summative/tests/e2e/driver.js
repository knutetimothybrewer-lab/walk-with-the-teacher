/* driver.js — drives the real UI through every station using only visible
   controls (click-to-place, never drag), and independently computes the score
   it expects. The expected score does NOT call the app's grading code. */
import content from '../../content/index.js';
import cfg from '../../config.js';

/* ---------- independent expectations (do not import js/engine) ---------- */
export function subpartCount(it) {
  if (it.type === 'mc') return 1;
  if (it.type === 'multi') return it.options.filter(o => o.ok).length;
  return it.tokens.length;
}
export function itemPoints(it) {
  if (typeof it.points === 'number') return it.points;
  const n = subpartCount(it);
  return n >= 7 ? 3 : n >= 4 ? 2 : 1;       // mirrors config.pointsBySubparts
}
const CREDIT = cfg.attemptCredit;
export function allItems(stationIds) {
  const out = [];
  for (const st of content.stations) {
    if (stationIds && !stationIds.includes(st.id)) continue;
    for (const e of st.entries) for (const it of (e.block || [e])) if (it.type !== 'explore') out.push({ it, station: st.id });
  }
  return out;
}
export const totalPossible = () => allItems().reduce((s, x) => s + itemPoints(x.it), 0);

/* ---------- strategy: what to do on each item ---------- */
export const PERFECT = () => 'perfect';
/** Deterministic mix of perfect / second / third / fail / skip. */
export function mixed(skipIds = []) {
  return (it, idx) => {
    if (skipIds.includes(it.id)) return 'skip';
    const r = idx % 7;
    return ['perfect', 'perfect', 'second', 'perfect', 'third', 'fail', 'perfect'][r];
  };
}

/* ---------- helpers ---------- */
const article = (page, id) => page.locator(`article[data-item="${id}"]`);
async function clickCheck(page, id) {
  await article(page, id).locator('.item-foot button.btn-primary', { hasText: 'Check answer' }).click();
}

/** Returns the fraction the response earns, computed from the content key only. */
function fracMC(it, pick) { return it.options[pick].ok ? 1 : 0; }
function fracMulti(it, picks) {
  const correct = it.options.map((o, i) => (o.ok ? i : -1)).filter(i => i >= 0);
  const tp = picks.filter(i => it.options[i].ok).length, fp = picks.length - tp;
  return Math.max(0, (tp - fp) / correct.length);
}
function fracPlace(it, map) { return it.tokens.filter(t => map[t.id] === t.slot).length / it.tokens.length; }

async function placeTokens(page, it, map, only) {
  const art = article(page, it.id);
  for (const t of it.tokens) {
    if (only && !only.includes(t.id)) continue;
    if (it.mode === 'tag') {
      await art.locator(`.tag-row[data-tok="${t.id}"] button.tagbtn[data-slot="${map[t.id]}"]`).click();
    } else {
      await art.locator(`button.tok[data-tok="${t.id}"]`).click();
      await art.locator(`button.slot-btn[data-slot="${map[t.id]}"]`).click();
    }
  }
}

/**
 * Answer one item following `mode`. Returns {attempts:[fraction...], skipped}.
 * mode: perfect | second | third | fail | skip
 */
export async function answerItem(page, it, mode) {
  const art = article(page, it.id);
  await art.waitFor();
  if (mode === 'skip' && (it.sensitive || (it._scene && it._scene.sensitiveScene))) {
    await art.locator('.item-foot .btn-quiet').click();
    return { attempts: [], skipped: true };
  }
  if (mode === 'skip') mode = 'perfect';
  const wantWrong = { perfect: 0, second: 1, third: 2, fail: 3 }[mode];
  const attempts = [];
  const finalAttempt = () => attempts.length >= cfg.maxAttempts;

  if (it.type === 'mc') {
    const rightIdx = it.options.findIndex(o => o.ok);
    const wrongIdx = it.options.map((o, i) => (o.ok ? -1 : i)).filter(i => i >= 0);
    for (let k = 0; k < wantWrong && !finalAttempt(); k++) {
      await art.locator(`button.opt[data-opt="${wrongIdx[k]}"]`).click();
      await clickCheck(page, it.id);
      attempts.push(fracMC(it, wrongIdx[k]));
    }
    if (!finalAttempt() && !attempts.includes(1)) {
      await art.locator(`button.opt[data-opt="${rightIdx}"]`).click();
      await clickCheck(page, it.id);
      attempts.push(1);
    }
  } else if (it.type === 'multi') {
    const rights = it.options.map((o, i) => (o.ok ? i : -1)).filter(i => i >= 0);
    const wrongs = it.options.map((o, i) => (o.ok ? -1 : i)).filter(i => i >= 0);
    const picked = new Set();
    const click = async (i) => { await art.locator(`button.opt[data-opt="${i}"]`).click(); picked.add(i); };
    let wi = 0;
    for (let k = 0; k < wantWrong && !finalAttempt(); k++) {
      if (wi >= wrongs.length) {
        // out of wrong options to try: submit what is selected (never the full right set) for partial credit
        if (!picked.size) await click(rights[0]);
        await clickCheck(page, it.id);
        attempts.push(fracMulti(it, Array.from(picked)));
        continue;
      }
      // attempt k: all rights except (for k>=1 leave one out) plus one wrong
      if (k === 0 && mode === 'second') for (const r of rights) await click(r);
      if (k === 1 && !picked.size) for (const r of rights.slice(0, -1)) await click(r);
      await click(wrongs[wi++]);
      await clickCheck(page, it.id);
      // After a check, wrong picks are eliminated; right picks stay selected.
      const cur = Array.from(picked);
      attempts.push(fracMulti(it, cur));
      for (const w of wrongs.slice(0, wi)) picked.delete(w);
    }
    if (!finalAttempt() && !attempts.some(f => f >= 1)) {
      for (const r of rights) if (!picked.has(r)) await click(r);
      await clickCheck(page, it.id);
      attempts.push(fracMulti(it, Array.from(picked)));
    } else if (mode === 'fail' && finalAttempt()) { /* partial credit stands */ }
  } else {
    const correct = Object.fromEntries(it.tokens.map(t => [t.id, t.slot]));
    const slotIds = it.slots.map(s => s.id);
    // tokens that will be placed wrongly each wrong attempt: first two (tag: first one)
    const swapN = it.mode === 'tag' ? 1 : 2;
    let remaining = it.tokens.map(t => t.id);
    const placed = {};
    for (let k = 0; k < wantWrong && !finalAttempt(); k++) {
      const bad = remaining.slice(0, swapN);
      const map = {};
      if (it.mode === 'sort' || it.mode === 'tag') {
        remaining.forEach(id => { map[id] = correct[id]; });
        bad.forEach(id => {
          const other = slotIds.filter(s => s !== correct[id] && !(it.mode === 'tag' && (placed[id] || []).includes(s)));
          map[id] = other[0] ?? correct[id];
          (placed[id] ||= []).push(map[id]);
        });
      } else {
        // cap-1 slots: rotate the bad tokens' targets among themselves
        remaining.forEach(id => { map[id] = correct[id]; });
        const targets = bad.map(id => correct[id]);
        bad.forEach((id, i) => { map[id] = targets[(i + 1) % bad.length]; });
      }
      await placeTokens(page, it, map, remaining);
      await clickCheck(page, it.id);
      const full = { ...Object.fromEntries(it.tokens.filter(t => !remaining.includes(t.id)).map(t => [t.id, t.slot])), ...map };
      attempts.push(fracPlace(it, full));
      remaining = bad.filter(id => map[id] !== correct[id]);
      if (!remaining.length) break;
    }
    if (!finalAttempt() && !attempts.some(f => f >= 1)) {
      const map = Object.fromEntries(remaining.map(id => [id, correct[id]]));
      await placeTokens(page, it, map, remaining);
      await clickCheck(page, it.id);
      attempts.push(1);
    }
  }
  return { attempts, skipped: false };
}

export function expectedEarned(it, res) {
  const pts = itemPoints(it);
  if (res.skipped) return pts;
  let best = 0;
  res.attempts.forEach((f, i) => { best = Math.max(best, pts * f * (CREDIT[i] ?? 0)); });
  return best;
}
export const expectedPercent = (earned, possible) => Math.floor((earned / possible) * 100 + 0.5 + 1e-9);

/* ---------- full run ---------- */
export async function startStudent(page, url, { first = 'Alex', last = 'Rivera', period = '3', code = 'TRAIL1' } = {}) {
  await page.goto(url);
  await page.fill('#f-first', first); await page.fill('#f-last', last);
  await page.selectOption('#f-period', period); await page.fill('#f-code', code);
  await page.click('button[type=submit]');
}

/** Play from wherever the student is until the final screen. */
export async function playThrough(page, strategy, { onItem, stopAfterStation, shots } = {}) {
  const itemsById = {};
  const sceneOf = {};
  for (const st of content.stations) for (const e of st.entries) if (e.block) for (const it of e.block) sceneOf[it.id] = e;
  for (const { it } of allItems()) { itemsById[it.id] = it; if (sceneOf[it.id]) it._scene = sceneOf[it.id]; }
  const results = {};
  let idx = 0, guard = 0;
  while (guard++ < 400) {
    const kind = await Promise.race([
      page.waitForSelector('.station-intro', { timeout: 15000 }).then(() => 'intro'),
      page.waitForSelector('.station-end', { timeout: 15000 }).then(() => 'end'),
      page.waitForSelector('article.item', { timeout: 15000 }).then(() => 'item'),
      page.waitForSelector('.final h1', { timeout: 15000 }).then(() => 'final'),
    ]);
    if (kind === 'final') break;
    if (kind === 'intro') {
      const sid = await page.locator('.station-intro').getAttribute('data-station');
      if (shots) await shots(page, sid, 'intro');
      await page.click('#btn-begin'); continue;
    }
    if (kind === 'end') {
      if (shots) await shots(page, 'end', 'end');
      await page.click('#btn-cont'); continue;
    }
    const art = page.locator('article.item').first();
    if (await art.evaluate(el => el.classList.contains('explore'))) {
      if (shots) await shots(page, await art.getAttribute('data-item'), 'item');
      await page.click('article.explore .btn-primary'); continue;
    }
    const id = await art.getAttribute('data-item');
    const it = itemsById[id];
    if (shots) await shots(page, id, 'item');
    const mode = strategy(it, idx++);
    const res = await answerItem(page, it, mode);
    results[id] = res;
    if (onItem) await onItem(page, it, res);
    // proceed
    if (res.skipped) {
      if (it._scene) for (const sib of it._scene.block) if (!results[sib.id]) results[sib.id] = { attempts: [], skipped: true };
      await page.waitForTimeout(30); continue;
    }
    const next = page.locator('article.item .item-foot button.btn-primary', { hasText: /Next|Finish station/ });
    await next.waitFor({ state: 'visible' });
    if (shots) await shots(page, id, 'done');
    await next.click();
  }
  return results;
}
