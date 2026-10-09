/**
 * Community Health Mission: one tab per class block ("Block 1-2", "Block 3-4", "Block 6-7", "Block 8-9").
 *
 * Paste this whole file into the Apps Script project as a NEW script file named BlockTabs (it contains no answers and does not
 * touch Code.gs). Then run chmBlockTabsInstall once from the editor. It builds the four tabs from the Sessions tab (each
 * student's block is the Period they chose at sign-in) and refreshes them every 5 minutes. Needs the
 * https://www.googleapis.com/auth/script.scriptapp scope in appsscript.json (for the timer).
 *
 * Each tab lists that block's students sorted by name: status, percent, points, units completed, times and minutes, with a
 * class-average row. Students whose session was reset are left out. Sessions stays the master list.
 */
var CHM_BLOCKS = ['Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9'];
var CHM_BLOCK_COLUMNS = [['Name', 'Name'], ['Roster ID', 'RosterID'], ['Class code', 'Class'], ['Status', 'Status'], ['Percent', 'Percent'], ['Points earned', 'Earned'],
  ['Points possible', 'Possible'], ['Units completed', 'UnitsCompleted'], ['Started', 'Started'], ['Completed', 'Completed'], ['Minutes', 'ElapsedMin']];

function chmBlockTabName_(block) { return String(block).replace(/[\[\]*?:\/\\]/g, '-'); }

function chmBlockTabsSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

/** Rebuild the four block tabs from the Sessions tab. Safe to run any time. */
function chmBlockTabsRefresh() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return;
  try {
    var ss = chmBlockTabsSpreadsheet_(), src = ss.getSheetByName('Sessions');
    var values = src && src.getLastRow() > 1 ? src.getDataRange().getValues() : [], head = values.length ? values[0] : [];
    var col = function (name) { return head.indexOf(name); };
    var iPeriod = col('Period'), iStatus = col('Status'), iName = col('Name');
    var rows = values.slice(1).filter(function (r) { return String(r[iStatus]).toLowerCase() !== 'reset' && String(r[0]) !== ''; });
    CHM_BLOCKS.forEach(function (block) {
      var name = chmBlockTabName_(block), tab = ss.getSheetByName(name) || ss.insertSheet(name);
      tab.clear();
      tab.getRange(1, 1, 1, CHM_BLOCK_COLUMNS.length).setValues([CHM_BLOCK_COLUMNS.map(function (c) { return c[0]; })]).setFontWeight('bold').setBackground('#e8ebf7');
      tab.setFrozenRows(1);
      var mine = iPeriod < 0 ? [] : rows.filter(function (r) { return String(r[iPeriod]).trim() === block; })
        .sort(function (a, b) { return String(a[iName]).toLowerCase() < String(b[iName]).toLowerCase() ? -1 : 1; });
      if (!mine.length) return;
      var out = mine.map(function (r) { return CHM_BLOCK_COLUMNS.map(function (c) { var i = col(c[1]); return i < 0 ? '' : r[i]; }); });
      tab.getRange(2, 1, out.length, CHM_BLOCK_COLUMNS.length).setValues(out);
      var last = out.length + 1, pct = 5, avg = last + 2;
      tab.getRange(avg, 1).setValue('Class average').setFontWeight('bold');
      tab.getRange(avg, pct).setFormula('=IFERROR(AVERAGE(E2:E' + last + '),"")').setNumberFormat('0.0');
      tab.getRange(avg + 1, 1, 1, 2).setValues([['Students', out.length]]).setFontWeight('bold');
    });
  } finally { lock.releaseLock(); }
}

/** Run this ONCE from the Apps Script editor: builds the tabs now and refreshes them every 5 minutes from then on. */
function chmBlockTabsInstall() {
  chmBlockTabsRefresh();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'chmBlockTabsRefresh') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('chmBlockTabsRefresh').timeBased().everyMinutes(5).create();
  try { SpreadsheetApp.getUi().alert('Block tabs created. They refresh every 5 minutes.'); } catch (e) { /* run from the editor with no sheet open */ }
}
