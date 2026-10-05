/* Entry point. */
(function () {
  const ok = SBScene.init($('#gl'), $('#stage'), $('#labels'));
  if (!ok) { $('#nogl').classList.add('on'); }
  initUI();
  if (ok) SBScene.start();
  if (location.hash === '#demo') { /* hook for automated screenshots */ window.SB_DEMO = { SIM, SBScene, GRADE, U }; }
  window.SB_DEBUG = { SIM, SBScene, GRADE, U };
})();
