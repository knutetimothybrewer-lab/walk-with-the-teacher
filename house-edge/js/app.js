/* THE HOUSE EDGE — app shell: HUD, zone map, mission bar, routing, level-ups. */
(function (root) {
  'use strict';
  var HE = root.HE = root.HE || {}, C = HE.CONFIG, P = HE.Progress, UI = HE.UI, E = HE.Engine;
  var App = HE.App = { current: null, levelListeners: [] };
  HE.Zones = HE.Zones || {};
  var $ = UI.$, esc = UI.esc;

  App.zoneIndex = function (id) { for (var i = 0; i < C.zones.length; i++) if (C.zones[i].id === id) return i; return 0; };

  /* ---------- HUD ---------- */
  App.updateHud = function () {
    var pct = P.percent(), lv = P.level(), L = C.levels[lv];
    $('#progFill').style.width = pct + '%'; $('#progPct').textContent = pct + '%';
    $('.hud-prog').setAttribute('aria-valuenow', pct);
    var chip = $('#levelChip'); chip.textContent = 'LEVEL ' + lv + ' · ' + L.name; chip.setAttribute('aria-label', 'Analyst level ' + lv + ', ' + L.name + '. Open level list.');
    var snd = P.pref('sound'); $('#btnSound').textContent = snd ? '🔊 Sound ON' : '🔇 Sound OFF'; $('#btnSound').setAttribute('aria-pressed', snd ? 'true' : 'false'); $('#btnSound').setAttribute('aria-label', 'Sound ' + (snd ? 'on' : 'off'));
    $('#btnReport').hidden = !P.complete100();
    UI.setLevelAttr && UI.setLevelAttr(lv);
  };
  function renderZoneBar() {
    var bar = $('#zonebar'); bar.innerHTML = '';
    C.zones.forEach(function (z) {
      var un = P.zoneUnlocked(z.id), done = P.zoneDone(z.id), cur = App.current === z.id, pr = P.zoneProgress(z.id);
      var b = UI.el('<button type="button" class="zchip ' + (done ? 'done' : '') + (cur ? ' cur' : '') + (un ? '' : ' lock') + '" ' + (cur ? 'aria-current="step"' : '') + ' aria-label="Zone ' + z.num + ': ' + esc(z.title) + (done ? ', complete' : un ? ', ' + pr.done + ' of ' + pr.total + ' steps' : ', locked') + '"><span class="zn">' + (z.num === 0 ? '★' : z.num) + '</span><span class="zt">' + esc(z.title) + '</span><span class="zs">' + (done ? '✓' : un ? pr.done + '/' + pr.total : '🔒') + '</span></button>');
      b.addEventListener('click', function () {
        if (!un) { UI.toast('Zone ' + z.num + ' is locked. Finish the zone before it first.'); return; }
        App.show(z.id);
      });
      bar.appendChild(b);
    });
    var cur = $('.zchip.cur', bar); if (cur && cur.scrollIntoView) { try { bar.scrollLeft = cur.offsetLeft - 60; } catch (e) {} }
  }

  /* ---------- Mission bar: where am I / what to do / why can't I continue ---------- */
  App.updateMission = function () {
    var id = App.current; if (!C.zoneById(id)) { $('#mission').hidden = true; return; }
    $('#mission').hidden = false;
    var z = C.zoneById(id), steps = P.zoneSteps(id), todo = steps.filter(function (s) { return !P.isDone(s[0]); }), nz = P.nextZone(id), btn = $('#mNext');
    $('#mWhere').textContent = (z.num === 0 ? 'START' : 'ZONE ' + z.num + ' OF ' + (C.zones.length - 1)) + ' · ' + z.title.toUpperCase() + ' · ' + P.percent() + '% COMPLETE';
    if (!todo.length) {
      $('#mTodo').innerHTML = '<b>✓ Zone complete.</b> ' + (nz ? 'Next up: ' + esc(nz.title) + '.' : 'You have finished every zone!');
      btn.disabled = false; btn.textContent = nz ? 'Continue to Zone ' + nz.num + ' ▸' : (P.complete100() ? 'Open completion screen ▸' : 'Continue ▸');
      btn.onclick = function () { if (nz) App.show(nz.id); else App.show('complete'); };
    } else {
      var shown = todo.slice(0, 3).map(function (s) { return esc(s[1]); }).join(' · ') + (todo.length > 3 ? ' · +' + (todo.length - 3) + ' more' : '');
      $('#mTodo').innerHTML = '<b>TO DO:</b> ' + shown;
      btn.disabled = true; btn.textContent = nz ? 'Locked until zone is complete' : 'Locked until all steps are complete';
      btn.onclick = null; btn.title = 'Why can\'t I continue? Finish the TO DO items first.';
    }
  };

  App.refresh = function () {
    App.updateHud(); renderZoneBar(); App.updateMission(); UI.refreshLocks($('#main'));
    var cl = $('#checklist'); if (cl) renderChecklist(cl);
  };
  function renderChecklist(el) {
    var id = App.current, steps = P.zoneSteps(id); if (!steps.length) { el.innerHTML = ''; return; }
    var pr = P.zoneProgress(id);
    el.innerHTML = '<summary>Zone checklist <b>' + pr.done + '/' + pr.total + '</b></summary><ul>' + steps.map(function (s) { var d = P.isDone(s[0]); return '<li class="' + (d ? 'on' : '') + '"><span aria-hidden="true">' + (d ? '✓' : '○') + '</span> ' + esc(s[1]) + '<span class="sr-only">' + (d ? ' (done)' : ' (to do)') + '</span></li>'; }).join('') + '</ul>';
  }

  /* ---------- Steps & level-ups ---------- */
  App.api = {
    complete: function (step) {
      var first = P.complete(step);
      if (first) { UI.sound('right'); }
      App.afterStep(); return first;
    },
    refresh: function () { App.refresh(); },
    onLevel: function (fn) { App.levelListeners.push(fn); }
  };
  App.afterStep = function () {
    App.refresh();
    var lv = P.checkLevelUp();
    if (lv) App.levelUp(lv);
    if (P.complete100() && !P.get('completionShown')) { P.set('completionShown', true); setTimeout(function () { App.show('complete'); }, 600); }
  };
  App.levelUp = function (lv) {
    var L = C.levels[lv]; UI.sound('level'); UI.confetti(lv === 8 ? 260 : 90); UI.setLevel(lv); App.updateHud();
    UI.modal({ cls: 'levelup', titleHtml: 'LEVEL ' + lv + ' · ' + esc(L.name), body: '<div class="lv-badge" aria-hidden="true">' + lv + '</div><p class="lv-big">You\'ve unlocked <b>' + esc(L.vision) + '</b>.</p><p>' + esc(L.msg) + '</p>', actions: [{ label: 'Keep investigating ▸', primary: true }],
      onClose: function () { App.levelListeners.forEach(function (f) { try { f(lv); } catch (e) { console.error(e); } }); } });
  };
  App.levelListModal = function () {
    var lv = P.level(), b = '<ol class="lvlist">' + C.levels.map(function (L) { return '<li class="' + (L.n <= lv ? 'on' : '') + (L.n === lv ? ' cur' : '') + '"><b>Level ' + L.n + ' · ' + esc(L.name) + '</b><span>' + (L.vision ? esc(L.vision) + ': ' : '') + esc(L.msg) + '</span></li>'; }).join('') + '</ol><p class="dim">Your reward here is not tokens. It is the ability to see how the games really work.</p>';
    UI.modal({ title: 'YOUR ANALYST LEVEL', body: b, wide: true });
  };

  /* ---------- Routing ---------- */
  App.show = function (screen, opts) {
    var main = $('#main'); if (HE.XRay) HE.XRay.close();
    document.body.classList.remove('present');
    if (screen === 'debrief') { App.current = 'debrief'; $('#mission').hidden = true; main.innerHTML = ''; HE.Debrief.start(main); return; }
    if (screen === 'report') { App.current = 'report'; $('#mission').hidden = true; main.innerHTML = ''; HE.Report.render(main); App.finishNav(); return; }
    if (screen === 'exit') { App.current = 'exit'; $('#mission').hidden = true; main.innerHTML = ''; HE.Report.renderExit(main); App.finishNav(); return; }
    if (screen === 'complete') { App.current = 'complete'; $('#mission').hidden = true; main.innerHTML = ''; HE.Report.renderComplete(main); App.finishNav(); return; }
    if (!P.zoneUnlocked(screen)) screen = P.firstIncompleteZone();
    App.current = screen; P.state.zone = screen; P.save(); App.levelListeners = [];
    var z = C.zoneById(screen);
    main.innerHTML = '';
    var head = UI.el('<div class="zone-head"><div><span class="zkick">' + (z.num === 0 ? 'START' : 'ZONE ' + z.num) + '</span><h1>' + esc(z.title) + '</h1><p>' + esc(z.sub) + '</p></div><details id="checklist" class="checklist" open></details></div>');
    if (screen !== 'z0' && screen !== 'z10') main.appendChild(head); else if (screen === 'z10') main.appendChild(head);
    var content = UI.el('<div class="zone-content"></div>'); main.appendChild(content);
    App.refresh();
    HE.Zones[screen].render(content, App.api);
    App.refresh();
    var hash = '#' + screen; if (root.location.hash !== hash) { try { history.replaceState(null, '', hash); } catch (e) {} }
    main.scrollTo ? main.scrollTo(0, 0) : 0; root.scrollTo(0, 0); main.focus({ preventScroll: true });
  };
  App.finishNav = function () { App.updateHud(); renderZoneBar(); var cur = $$('.zchip.cur'); cur.forEach(function (c) { c.classList.remove('cur'); }); root.scrollTo(0, 0); };
  function $$(s) { return UI.$$(s); }

  /* ---------- Boot ---------- */
  App.init = function () {
    var bad = E.validate(); if (bad.length) console.error('CONFIG ERROR', bad);
    if (P.pref('reduceMotion')) document.documentElement.classList.add('reduce-motion');
    UI.setLevel(P.level()); UI.startBg(); UI.setLevelAttr = function (n) { document.body.setAttribute('data-level', n); };
    $('#btnSound').addEventListener('click', function () { P.pref('sound', !P.pref('sound')); App.updateHud(); UI.sound('click'); UI.live('Sound ' + (P.pref('sound') ? 'on' : 'off')); });
    $('#levelChip').addEventListener('click', App.levelListModal);
    $('#btnHelp').addEventListener('click', function () { HE.Report.helpModal(); });
    $('#btnTeacher').addEventListener('click', function () { HE.Debrief.teacherPanel(); });
    $('#btnReport').addEventListener('click', function () { App.show('report'); });
    $('#btnReset').addEventListener('click', function () {
      UI.confirm('Reset the whole experience?', 'This erases all progress, answers, predictions and reflections stored in this browser. It cannot be undone.', 'Yes, reset everything', function () { P.reset(); root.location.hash = ''; root.location.reload(); });
    });
    root.addEventListener('hashchange', function () { var h = root.location.hash.slice(1); if (h === 'debrief') App.show('debrief'); else if (h && h !== App.current && C.zoneById(h)) App.show(h); });
    P.on(function () { App.updateHud(); });
    var h = root.location.hash.slice(1), start;
    if (h === 'debrief') start = 'debrief';
    else if (P.complete100()) start = P.get('completionShown') ? (h === 'report' ? 'report' : 'complete') : 'complete';
    else { start = (h && C.zoneById(h) && P.zoneUnlocked(h)) ? h : (C.zoneById(P.state.zone) && P.zoneUnlocked(P.state.zone) ? P.state.zone : P.firstIncompleteZone()); }
    if (start === 'complete' && !P.complete100()) start = P.firstIncompleteZone();
    App.show(start);
    if (!P.storageWorks) UI.toast('Your browser is blocking storage, so progress will not survive a refresh.', 6000);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.init); else App.init();
})(window);
