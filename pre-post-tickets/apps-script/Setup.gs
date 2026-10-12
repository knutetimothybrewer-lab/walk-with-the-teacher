/**
 * Setup.gs - builds the tabs, seeds them, and gives the sheet a menu. Safe to run again: it never deletes your
 * roster, class codes, config values, scores, or responses. (It does refresh the Lessons and Criteria tabs.)
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Pre/Post Tickets')
    .addItem('1. Set up sheet', 'setupSheet')
    .addItem('2. Check setup', 'checkSetup')
    .addSeparator()
    .addItem('Refresh summary tabs now', 'recomputeSummaries')
    .addItem('Refresh summary tabs every night', 'installNightlyTrigger')
    .addToUi();
}

function setupSheet() {
  ctx_ = {};
  var ss = ss_();
  Object.keys(SCHEMA).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]);
    }
    sh.getRange(1, 1, 1, SCHEMA[name].length).setFontWeight('bold');
    sh.setFrozenRows(1);
    if (TEXT_ID_COLUMNS[name]) sh.getRange(2, TEXT_ID_COLUMNS[name], Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
  });

  // Config: add any missing settings, keep the ones you changed.
  var have = {};
  table_('Config').forEach(function (r) { have[str_(r.key)] = true; });
  var add = CONFIG_DEFAULTS.filter(function (d) { return !have[d[0]]; });
  if (add.length) append_('Config', add);

  // Periods: three placeholder rows if empty. The placeholder codes are refused until you change them.
  if (!table_('Periods').length) {
    append_('Periods', [['1', 'CHANGEME-1', 'Period 1'], ['2', 'CHANGEME-2', 'Period 2'], ['3', 'CHANGEME-3', 'Period 3']]);
  }

  replaceBody_('Lessons', LESSONS_SEED);
  replaceBody_('Criteria', CRITERIA_SEED);

  // One Control row per period.
  var haveCtl = {};
  table_('Control').forEach(function (r) { haveCtl[str_(r.period)] = true; });
  var ctlRows = periods_().filter(function (p) { return !haveCtl[p.period]; }).map(function (p) { return [p.period, '', '', 'N', '']; });
  append_('Control', ctlRows);

  var msg = 'Sheet is set up.\n\nNext:\n1. Periods tab: change each CHANGEME class code.\n2. Roster tab: paste your students.\n' +
            '3. ItemBank tab: import data/items_import.csv (File > Import > Replace current sheet).\n' +
            '4. Project Settings > Script properties: add TEACHER_PASSCODE.\n5. Pre/Post Tickets > Check setup.';
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { /* running from the editor or tests */ }
  return msg;
}

/** Tells you what is still missing before a live class. */
function checkSetup() {
  ctx_ = {};
  var lines = [], ok = '✓ ', bad = '✗ ';
  lines.push((PropertiesService.getScriptProperties().getProperty('TEACHER_PASSCODE') ? ok : bad) + 'Teacher passcode ' +
             (PropertiesService.getScriptProperties().getProperty('TEACHER_PASSCODE') ? 'is set' : 'is NOT set (Project Settings > Script properties > TEACHER_PASSCODE)'));
  var ros = roster_().filter(function (r) { return r.active; });
  periods_().forEach(function (p) {
    var n = ros.filter(function (r) { return r.period === p.period; }).length;
    lines.push((codeIsUsable_(p.class_code) && n ? ok : bad) + p.label + ': ' + (codeIsUsable_(p.class_code) ? 'class code set' : 'class code still CHANGEME') + ', ' + n + ' students');
  });
  var bank = bank_(), A = bank.filter(function (i) { return i.form === 'A' && i.ticket_type === 'daily'; }).length;
  var B = bank.filter(function (i) { return i.form === 'B'; }).length, R = bank.filter(function (i) { return i.ticket_type === 'unit_review' && i.form === 'A'; }).length;
  lines.push((A ? ok : bad) + 'ItemBank: ' + A + ' daily items (form A), ' + B + ' form B, ' + R + ' unit-review' + (A ? '' : '  <- import items_import.csv'));
  var noItems = lessons_().filter(function (l) { return !bank.some(function (i) { return i.lesson_id === l.lesson_id; }); }).map(function (l) { return l.lesson_id; });
  if (noItems.length) lines.push('• Lessons with no questions yet (cannot be opened): ' + noItems.join(', '));
  if (config_().PARALLEL_FORMS && !B) lines.push(bad + 'PARALLEL_FORMS is TRUE but there are no form B items.');
  var text = lines.join('\n');
  try { SpreadsheetApp.getUi().alert(text); } catch (e) { /* running from the editor or tests */ }
  return text;
}

function installNightlyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'recomputeSummaries') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('recomputeSummaries').timeBased().everyDays(1).atHour(2).create();
  try { SpreadsheetApp.getUi().alert('The summary tabs will refresh every night around 2 a.m.'); } catch (e) { /* editor or tests */ }
}
