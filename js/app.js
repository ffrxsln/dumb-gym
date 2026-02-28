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

  // ==================== EVENT LISTENERS ====================

  // Click / Tap to lift
  document.getElementById('clickArea').addEventListener('click', UI.doClick);
  document.getElementById('clickArea').addEventListener('touchstart', function (e) {
    e.preventDefault();
    UI.doClick(e);
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
  setInterval(function () { Game.save(); }, 15000);

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
