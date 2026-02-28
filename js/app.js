/* ============================================
   DUMB GYM TYCOON - App Initialization
   Event listeners, game loop, startup
   ============================================ */

(function () {

  // ==================== LOAD SAVED GAME ====================
  Game.load();
  Game.calcStats();
  UI.updateStats();
  UI.renderShop();

  // ==================== AUTO RECONNECT WALLET ====================
  Wallet.autoReconnect();

  // ==================== AUTH INIT ====================
  Auth.init();

  // ==================== REGISTER ON LEADERBOARD ====================
  Leaderboard.submit();

  // ==================== INIT AUDIO ON FIRST INTERACTION ====================
  function initAudio() {
    SFX.init();
    document.removeEventListener('click', initAudio);
    document.removeEventListener('touchstart', initAudio);
  }
  document.addEventListener('click', initAudio);
  document.addEventListener('touchstart', initAudio);

  // ==================== EVENT LISTENERS ====================

  // Click / Tap to lift (prevent double-fire on mobile)
  let lastClickTime = 0;
  function safeClick(e) {
    const now = Date.now();
    if (now - lastClickTime < 50) return; // debounce 50ms
    lastClickTime = now;
    UI.doClick(e);
  }
  document.getElementById('clickArea').addEventListener('click', safeClick);
  document.getElementById('clickArea').addEventListener('touchstart', function (e) {
    e.preventDefault();
    safeClick(e);
  }, { passive: false });

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
      UI.switchTab(this.dataset.tab);
    });
  });

  // Keyboard: Space to click
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space') {
      e.preventDefault();
      UI.doClick(e);
    }
  });

  // ==================== GAME LOOP (250ms tick) ====================
  let lastTick = Date.now();

  function gameTick() {
    const now = Date.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;

    // Idle income
    if (Game.state.perSecond > 0) {
      const earned = Math.floor(Game.state.perSecond * dt);
      if (earned > 0) {
        Game.state.coins += earned;
        Game.state.totalCoins += earned;
        Game.state.sessionCoins += earned;
        Game.state.totalLifts += earned;
        UI.idleAccumulator += earned;
      }
    }

    // Idle income visual
    if (UI.idleAccumulator > 0 && Math.random() < 0.3) {
      UI.showIdlePop();
      UI.idleAccumulator = 0;
    }

    Game.checkLevel();
    Game.checkMilestones();
    UI.updateStats();
  }

  setInterval(gameTick, 250);

  // ==================== AUTO-SAVE (15s) ====================
  setInterval(function () {
    Game.save();
    Leaderboard.submit(); // Auto-submit score
  }, 15000);

  // ==================== SHOP AUTO-REFRESH (2s) ====================
  setInterval(function () {
    if (UI.currentTab === 'shop') UI.renderShop();
  }, 2000);

  // ==================== BEAR ATTACK TIMER (12s) ====================
  setInterval(function () {
    if (!UI.bear.active && UI.currentTab === 'gym' && Game.state.totalClicks > 15) {
      if (Math.random() < 0.25) UI.startBearAttack();
    }
  }, 12000);

  // ==================== TELEGRAM MINI APP ====================
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
  }

  console.log('%c🏋️ DUMB GYM TYCOON loaded!', 'color: #FFD700; font-size: 16px; font-weight: bold;');
  console.log('%c$DUMB on Solana | CA: ' + CA, 'color: #888; font-size: 11px;');

})();
