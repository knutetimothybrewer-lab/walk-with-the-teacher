/**
 * Grading.gs - scores one answer against the key. Runs on the server only; answer keys never reach the browser.
 *
 * Answer formats (what the student page sends):
 *   multiple choice : [optionIndex]
 *   multiple select : [optionIndex, ...]
 *   matching        : [categoryIndex for row 0, categoryIndex for row 1, ...]   (null/-1 = left blank)
 *
 * Default scoring is all-or-nothing (1 point or 0). Set PARTIAL_CREDIT = TRUE in Config for:
 *   multiple select : (right picks - wrong picks) / number of right answers, never below 0
 *   matching        : share of rows placed correctly
 * "correct" (0/1) is always the all-or-nothing result, so item analysis stays clean either way.
 */
var Grading = (function () {
  function isIndex(v, n) { return typeof v === 'number' && v >= 0 && v < n && Math.floor(v) === v; }

  /**
   * item: {type, options:[...], rows:[...], correct:[...]}; answer: array or null.
   * Returns {points: 0..1, correct: 0|1}.
   */
  function gradeItem(item, answer, partial) {
    var pts = 0;
    var a = Array.isArray(answer) ? answer : [];
    var key = item.correct;

    if (item.type === 'mc') {
      pts = (a.length === 1 && isIndex(a[0], item.options.length) && a[0] === key[0]) ? 1 : 0;

    } else if (item.type === 'ms') {
      var picked = {};
      a.forEach(function (v) { if (isIndex(v, item.options.length)) picked[v] = true; });
      var right = 0, wrong = 0;
      Object.keys(picked).forEach(function (k) { if (key.indexOf(Number(k)) >= 0) right++; else wrong++; });
      var exact = right === key.length && wrong === 0;
      pts = exact ? 1 : (partial ? Math.max(0, (right - wrong) / key.length) : 0);

    } else if (item.type === 'match') {
      var ok = 0;
      for (var i = 0; i < key.length; i++) {
        if (isIndex(a[i], item.options.length) && a[i] === key[i]) ok++;
      }
      pts = ok === key.length ? 1 : (partial ? ok / key.length : 0);
    }
    return { points: pts, correct: pts === 1 ? 1 : 0 };
  }

  // Plain-English version of an answer, for the teacher's drill-down ("what did this student pick?").
  function describe(item, answer) {
    var a = Array.isArray(answer) ? answer : [];
    if (item.type === 'match') {
      return item.rows.map(function (r, i) {
        var c = isIndex(a[i], item.options.length) ? item.options[a[i]] : '(blank)';
        return r + ' → ' + c;
      }).join(' | ');
    }
    var picks = a.filter(function (v) { return isIndex(v, item.options.length); }).map(function (v) { return item.options[v]; });
    return picks.length ? picks.join(' | ') : '(no answer)';
  }

  function describeKey(item) {
    if (item.type === 'match') {
      return item.rows.map(function (r, i) { return r + ' → ' + item.options[item.correct[i]]; }).join(' | ');
    }
    return item.correct.map(function (i) { return item.options[i]; }).join(' | ');
  }

  return { gradeItem: gradeItem, describe: describe, describeKey: describeKey };
})();
