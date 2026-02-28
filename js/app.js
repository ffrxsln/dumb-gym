/* ============================================
   DUMB GYM TYCOON - App Initialization (v4)
   Event listeners, game loop, startup
   ============================================ */

(function () {

  // ==================== OYUNU YÜKLE ====================
  Game.load();
  Game.calcStats();
  UI.updateStats();
  UI.renderShop();

  // ==================== WALLET AUTO RECONNECT ====================
  Wallet.autoReconnect();

  // ==================== AUTH BAŞLAT ====================
  Auth.init();

  // ==================== LEADERBOARD KAYIT ====================
  Leaderboard.submit();

  // ==================== SES - İLK ETKİLEŞİMDE BAŞLAT ====================
  function initAudio() {
    SFX.init();
    document.removeEventListener('click', initAudio);
    document.removeEventListener('touchstart', initAudio);
  }
  document.addEventListener('click', initAudio);
  document.addEventListener('touchstart', initAudio);

  // ==================== EVENT LİSTENER'LAR ====================

  // BUG FIX: Mobilde çift tıklama engelleme - yalnızca touch OR click
  let usingTouch = false;
  let lastClickTime = 0;

  function safeClick(e) {
    const now = Date.now();
    if (now - lastClickTime < 50) return; // 50ms debounce
    lastClickTime = now;
    UI.doClick(e);
  }

  document.getElementById('clickArea').addEventListener('touchstart', function (e) {
    e.preventDefault();
    usingTouch = true;
    safeClick(e);
  }, { passive: false });

  document.getElementById('clickArea').addEventListener('click', function (e) {
    // BUG FIX: Touch cihazlarda click event'ini yoksay
    if (usingTouch) return;
    safeClick(e);
  });

  // Tab geçişi
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
      UI.switchTab(this.dataset.tab);
    });
  });

  // Klavye: Space tıklama
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && !e.repeat) { // BUG FIX: e.repeat kontrolü - basılı tutmayı engelle
      e.preventDefault();
      UI.doClick(e);
    }
  });

  // ==================== ANA OYUN DÖNGÜSÜ (250ms) ====================
  let lastTick = Date.now();

  function gameTick() {
    const now = Date.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;

    // dt güvenlik kontrolü (tab değiştirme vb. uzun bekleme)
    const safeDt = Math.min(dt, 2); // Maksimum 2 saniyelik tick

    // Idle gelir
    if (Game.state.perSecond > 0) {
      // BUG FIX: addCoins() kullan, dailyCoins takibi için
      const earned = Math.floor(Game.state.perSecond * safeDt);
      if (earned > 0) {
        Game.addCoins(earned);
        Game.state.totalLifts += earned;
        UI.idleAccumulator += earned;
      }
    }

    // Idle gelir görseli - performans: çok sık oluşturma
    if (UI.idleAccumulator > 0 && Math.random() < 0.2) {
      UI.showIdlePop();
      UI.idleAccumulator = 0;
    }

    Game.checkLevel();
    Game.checkMilestones();
    UI.updateStats();
  }

  setInterval(gameTick, GAME_TICK_INTERVAL);

  // ==================== OTOMATİK KAYIT (15sn) ====================
  setInterval(function () {
    Game.save();
    Leaderboard.submit();
  }, AUTO_SAVE_INTERVAL);

  // ==================== SHOP OTOMATİK YENİLEME (3sn) ====================
  // BUG FIX: 2sn'den 3sn'ye çıkarıldı - gereksiz DOM thrashing önlendi
  setInterval(function () {
    if (UI.currentTab === 'shop') UI.renderShop();
  }, 3000);

  // ==================== BEAR ATTACK ZAMANLAYICISI ====================
  setInterval(function () {
    if (!UI.bear.active && UI.currentTab === 'gym' && Game.state.totalClicks > 15) {
      if (Math.random() < BEAR_BASE_CHANCE) UI.startBearAttack();
    }
  }, BEAR_CHECK_INTERVAL);

  // ==================== DAILY CHALLENGE REFRESH ====================
  // Her dakika günlük challenge'ı kontrol et
  setInterval(function () {
    Game.initDailyChallenge();
    Game.checkDailyChallenge();
  }, 60000);

  // ==================== TELEGRAM MINI APP ====================
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
    // Telegram tema renkleri
    try {
      const tg = window.Telegram.WebApp;
      if (tg.themeParams) {
        document.documentElement.style.setProperty('--tg-bg', tg.themeParams.bg_color || '');
      }
    } catch (e) {}
  }

  // ==================== VİSİBİLİTY API - Tab gizlendiğinde kaydet ====================
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      Game.save();
    }
  });

  // ==================== SAYFA KAPANIRKEN KAYDET ====================
  window.addEventListener('beforeunload', function () {
    Game.save();
  });

  console.log('%c🏋️ DUMB GYM TYCOON v4 loaded!', 'color: #FFD700; font-size: 16px; font-weight: bold;');
  console.log('%c$DUMB on Solana | CA: ' + CA, 'color: #888; font-size: 11px;');

})();
