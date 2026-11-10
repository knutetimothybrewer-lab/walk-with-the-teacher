/* Short form (about 45 minutes) alongside the original full form (about 56 minutes).
 *
 * WHY TWO ROSTERS: a student's saved work is stored in their browser under the assessment version, and every saved attempt is
 * re-checked against the item list on load. Changing the list for everybody would orphan or re-score work that is already
 * saved. So the full roster stays exactly as authored, and the short form is a second roster applied by W.applyRoster():
 *
 *   'long'  = the original test, original points. Used automatically on any device that already holds a Wildcats Quest
 *             record (active, submitted, history or unsent outbox), so those students resume and see exactly what they had.
 *   'short' = the trimmed test (below). Used for every fresh start. It stores its work under its own version key
 *             (<assessmentVersion>-short), so it can never overwrite or be confused with a full-form record.
 *
 * Nothing is deleted from the data files. The short form only hides items, stages and activities and re-weights points
 * so that the total stays exactly 100. Config: CONFIG.roster = 'auto' (default) | 'long' | 'short'.
 */
(function (root) {
  'use strict';
  var W = root.WWQ, P = W.Policy;

  var SF = W.SHORT = {
    suffix: '-short',
    // Hidden in the short form. Every scored item below is replaced by nothing; scored questions never depend on them.
    retiredItems: ['m1.c05', 'm1.c06', 'm1.c07', 'm1.c09', 'm2.life.2', 'm2.intake.2', 'm4.c4', 'm4.c5', 'm6.pm1'],
    // Unscored required checkpoints (worth 0 points): compare the two played weeks, the ripple chain, and STOP situation C.
    retiredChecks: ['ck.m6.cmp', 'ck.m1.chain', 'ck.m5.c'],
    // Maya's week (unscored second pass).
    retiredActivities: ['playWeek2'],
    // Stages that contained only retired work.
    retiredStages: ['1.4', '4.4', '4.5', '5.4', '6.5', '6.7', '6.8'],
    // New points for every kept item whose weight changes (all other kept items keep their original points). Total = 100.
    pts: {
      'm1.ripple': 4,
      'm2.intake.1': 2,
      'm4.c1': 4, 'm4.c2': 4, 'm4.c3': 4, 'm4.check': 4,
      'm5.j': 3,
      'm6.calc': 4, 'm6.over': 4,
      'm7.d1': 2, 'm7.d2': 2, 'm7.d3': 2, 'm7.cer': 4
    },
    // Display text and pacing for the missions whose content changed.
    missions: {
      1: { est: 4 }, 2: { est: 6 }, 5: { est: 6 }, 4: { est: 5, intro: 'Open every tab on three fictional posts, rate each, and pick the strongest evidence. Some are credible.' },
      6: { est: 8, intro: 'Play Jordan’s week (not scored), then answer questions about fixed case weeks.' }, 7: { est: 8 }
    },
    timeGuidance: { targetMinutes: 45, rangeMinutes: [40, 50] }
  };

  var snap = null;
  function snapshot() {
    if (snap) return;
    snap = { items: W.ITEMS.slice(), checks: W.CHECKS.slice(), acts: W.ACTIVITIES.slice(), pts: {}, missions: {}, baseVersion: W.CONFIG.assessmentVersion,
      guidance: W.CONFIG.timeGuidance, mmax: {} };
    snap.items.forEach(function (i) { snap.pts[i.id] = i.pts; });
    W.MISSIONS.forEach(function (m) { snap.missions[m.id] = { stages: m.stages.slice(), est: m.est, max: m.max, intro: m.intro }; });
    Object.keys(P.MISSION_MAX).forEach(function (k) { snap.mmax[k] = P.MISSION_MAX[k]; });
  }
  function setArr(arr, vals) { arr.length = 0; vals.forEach(function (v) { arr.push(v); }); }
  function setMap(map, list) { Object.keys(map).forEach(function (k) { delete map[k]; }); list.forEach(function (d) { map[d.id] = d; }); }
  function has(list, id) { return list.indexOf(id) >= 0; }

  /* Switch the live roster. Safe to call more than once; always rebuilds from the untouched originals. */
  W.applyRoster = function (mode) {
    snapshot();
    var short = mode === 'short';
    var items = snap.items.filter(function (i) { return !short || !has(SF.retiredItems, i.id); });
    var checks = snap.checks.filter(function (c) { return !short || !has(SF.retiredChecks, c.id); });
    var acts = snap.acts.filter(function (a) { return !short || !has(SF.retiredActivities, a.id); });
    items.forEach(function (i) { i.pts = short && SF.pts[i.id] != null ? SF.pts[i.id] : snap.pts[i.id]; });
    setArr(W.ITEMS, items); setArr(W.CHECKS, checks); setArr(W.ACTIVITIES, acts);
    setMap(W.ITEM_BY_ID, items); setMap(W.CHECK_BY_ID, checks);
    var by = {}; items.forEach(function (i) { by[i.m] = (by[i.m] || 0) + i.pts; });
    W.MISSIONS.forEach(function (m) {
      var o = snap.missions[m.id], ov = (short && SF.missions[m.id]) || {};
      m.stages = o.stages.filter(function (s) { return !short || !has(SF.retiredStages, s.id); });
      m.est = ov.est != null ? ov.est : o.est; m.intro = ov.intro || o.intro;
      if (m.id >= 1) { m.max = short ? by[m.id] : o.max; P.MISSION_MAX[m.id] = short ? by[m.id] : snap.mmax[m.id]; }
    });
    W.CONFIG.timeGuidance = short ? Object.assign({}, snap.guidance, SF.timeGuidance) : snap.guidance;
    W.CONFIG.assessmentVersion = short ? snap.baseVersion + SF.suffix : snap.baseVersion;
    W.roster = short ? 'short' : 'long';
    return W.roster;
  };

  /* Does this storage already hold a record written by the full form? (Any key under the original version.) */
  W.hasLegacyRecord = function (storage) {
    snapshot();
    var prefix = 'wwq:' + snap.baseVersion + ':';
    if (!storage) return false;
    try {
      if (typeof storage.length === 'number' && typeof storage.key === 'function') {
        for (var i = 0; i < storage.length; i++) { var k = storage.key(i); if (k && k.indexOf(prefix) === 0) return true; }
        return false;
      }
    } catch (e) { /* fall through to the known keys */ }
    return ['active', 'submitted', 'history', 'outbox', 'cool'].some(function (n) { try { return !!storage.getItem(prefix + n); } catch (e) { return false; } });
  };

  /* Pick the roster for this device (call once at boot, after storage is chosen and before the saved record is read). */
  W.chooseRoster = function (storage) {
    snapshot();
    var pref = W.CONFIG.roster || 'auto';
    if (pref === 'long' || pref === 'short') return W.applyRoster(pref);
    return W.applyRoster(W.hasLegacyRecord(storage) ? 'long' : 'short');
  };
})(typeof window !== 'undefined' ? window : globalThis);
