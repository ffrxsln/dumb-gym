/* ============================================
   DUMB GYM TYCOON - Core Game Logic (v4)
   State management, calculations, save/load
   ============================================ */

const SAVE_KEY = 'dumbgym_v4';
const SAVE_VERSION = 4;

const Game = {

  /* ---- Default State ---- */
  _defaultState() {
    return {
      coins: 0,
      totalCoins: 0,
      sessionCoins: 0,
      totalClicks: 0,
      totalLifts: 0,
      clickPower: 1,
      perSecond: 0,
      level: 1,
      prestige: 0,
      prestigeMult: 1,
      upgrades: {},
      milestones: {},
      bearKills: 0,
      startTime: Date.now(),
      lastSave: Date.now(),
      streak: 0,
      lastLogin: 0,
      luckySpinTime: 0,
      walletAddr: '',
      userId: '',
      userName: '',
      boostUntil: 0,
      comboCount: 0,
      comboTime: 0,
      maxCombo: 0,          // YENİ: En yüksek combo
      saveVersion: SAVE_VERSION,
      // YENİ: Daily Challenge State
      dailyDate: '',        // Bugünün tarihi (YYYY-MM-DD)
      dailyClicks: 0,       // Bugünkü tıklama sayısı
      dailyCoins: 0,        // Bugünkü kazanç
      dailyBears: 0,        // Bugünkü öldürülen ayı
      dailyBuys: 0,         // Bugünkü satın alma
      dailyChallengeIdx: 0, // Aktif challenge index
      dailyChallengeLevel: 0, // 0-3 (easy-insane)
      dailyChallengeComplete: false,
      // YENİ: İstatistikler
      totalBearBossKills: 0,
      highestLevel: 1,
      totalSpins: 0,
      totalUpgradesBought: 0,
    };
  },

  state: null,

  init() {
    this.state = this._defaultState();
  },

  /* ---- Upgrade Maliyeti ---- */
  getUpgradeCost(upgrade) {
    const owned = this.state.upgrades[upgrade.id] || 0;
    return Math.floor(upgrade.base * Math.pow(upgrade.scale, owned));
  },

  /* ---- Sahip Olunan Miktar ---- */
  getOwned(id) {
    return this.state.upgrades[id] || 0;
  },

  /* ---- İstatistikleri Yeniden Hesapla ---- */
  calcStats() {
    let cp = 1, ps = 0, mult = 1;

    UPGRADES.forEach(u => {
      const n = this.getOwned(u.id);
      if (u.effect.cp)   cp += u.effect.cp * n;
      if (u.effect.ps)   ps += u.effect.ps * n;
      if (u.effect.mult && n > 0) mult *= u.effect.mult;
    });

    mult *= this.state.prestigeMult;

    // Streak bonusu
    const streak = this.state.streak;
    const streakMult = streak >= 30 ? 2.0 : streak >= 14 ? 1.75 : streak >= 7 ? 1.5 : streak >= 3 ? 1.2 : 1;
    mult *= streakMult;

    // Lucky spin boost
    if (this.state.boostUntil && Date.now() < this.state.boostUntil) {
      mult *= 2;
    } else if (this.state.boostUntil) {
      this.state.boostUntil = 0;
    }

    this.state.clickPower = Math.max(1, Math.floor(cp * mult));
    this.state.perSecond = Math.floor(ps * mult);
  },

  /* ---- Coin Ekle ---- */
  addCoins(n) {
    if (typeof n !== 'number' || isNaN(n) || n < 0) return;
    n = Math.floor(n);
    this.state.coins = Math.min(this.state.coins + n, LIMITS.maxCoins);
    this.state.totalCoins = Math.min(this.state.totalCoins + n, LIMITS.maxCoins);
    this.state.sessionCoins += n;
    this.state.dailyCoins += n;
  },

  /* ---- Level Kontrolü ---- */
  getLevelThreshold(lvl) {
    return Math.floor(80 * Math.pow(1.35, lvl - 1) * lvl);
  },

  checkLevel() {
    let safety = 0;
    const startLevel = this.state.level;
    while (this.state.sessionCoins >= this.getLevelThreshold(this.state.level) && safety < 100) {
      this.state.level++;
      safety++;
    }
    // Level sınırı
    this.state.level = Math.min(this.state.level, LIMITS.maxLevel);

    // En yüksek level takibi
    if (this.state.level > this.state.highestLevel) {
      this.state.highestLevel = this.state.level;
    }

    // Tek toast çoklu level atlama için
    if (this.state.level > startLevel) {
      SFX.levelUp();
      if (this.state.level - startLevel > 1) {
        UI.toast('⬆️ Level ' + startLevel + ' → ' + this.state.level + '!');
      } else {
        UI.toast('⬆️ Level ' + this.state.level + '!');
      }
    }
  },

  /* ---- Upgrade Satın Al ---- */
  buyUpgrade(id) {
    const u = UPGRADES.find(x => x.id === id);
    if (!u) return;
    const cost = this.getUpgradeCost(u);
    const owned = this.getOwned(u.id);
    if (this.state.coins < cost || owned >= u.max) return;

    this.state.coins -= cost;
    this.state.upgrades[u.id] = owned + 1;
    this.state.dailyBuys++;
    this.state.totalUpgradesBought++;
    this.calcStats();
    SFX.buy();
    UI.renderShop();
    UI.updateStats();
    this.checkDailyChallenge();
    this.save();
  },

  /* ---- 10x Satın Al (YENİ) ---- */
  buyUpgradeMax(id) {
    const u = UPGRADES.find(x => x.id === id);
    if (!u) return;
    let bought = 0;
    for (let i = 0; i < 10; i++) {
      const cost = this.getUpgradeCost(u);
      const owned = this.getOwned(u.id);
      if (this.state.coins < cost || owned >= u.max) break;
      this.state.coins -= cost;
      this.state.upgrades[u.id] = owned + 1;
      bought++;
    }
    if (bought > 0) {
      this.state.dailyBuys += bought;
      this.state.totalUpgradesBought += bought;
      this.calcStats();
      SFX.buy();
      UI.renderShop();
      UI.updateStats();
      this.checkDailyChallenge();
      this.save();
    }
  },

  /* ---- Prestige ---- */
  confirmPrestige() {
    if (this.state.level < 20) return;
    document.getElementById('prestigeConfirm').classList.add('show');
  },

  doPrestige() {
    if (this.state.level < 20) return;
    document.getElementById('prestigeConfirm').classList.remove('show');

    this.state.prestige++;
    this.state.prestigeMult = 1 + this.state.prestige * 0.5;
    this.state.coins = 0;
    this.state.level = 1;
    this.state.sessionCoins = 0;
    this.state.upgrades = {};
    // Daily sayaçlar korunuyor

    this.calcStats();
    SFX.prestige();
    UI.toast('⭐ PRESTIGE ' + this.state.prestige + '! x' + this.state.prestigeMult.toFixed(1));
    UI.switchTab('gym');
    UI.updateStats();
    this.save();
  },

  /* ---- Milestone Kontrolü ---- */
  checkMilestones() {
    MILESTONES.forEach(m => {
      if (!this.state.milestones[m.id] && m.current() >= m.target) {
        this.state.milestones[m.id] = true;
        SFX.milestone();
        if (m.reward > 0) {
          this.addCoins(m.reward);
          UI.toast('🏆 ' + m.name + '! +' + formatNum(m.reward));
        } else {
          UI.toast('🏆 ' + m.name + '!');
        }
      }
    });
  },

  /* ---- Lucky Spin ---- */
  luckySpin() {
    if (Date.now() - this.state.luckySpinTime < LUCKY_SPIN_COOLDOWN) return;
    this.state.luckySpinTime = Date.now();
    this.state.totalSpins++;
    SFX.spin();

    // Ağırlıklı havuz oluştur
    const pool = [];
    LUCKY_PRIZES.forEach(p => { for (let i = 0; i < p.weight; i++) pool.push(p); });
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const val = pick.calc();

    const resultEl = document.getElementById('luckyResult');

    if (val === 'boost') {
      this.state.boostUntil = Date.now() + 30000;
      this.calcStats();
      UI.updateStats();
      UI.toast('⚡ 2x ALL Power for 30s!');
      setTimeout(() => { SFX.spinWin(); }, 500);
      setTimeout(() => { this.calcStats(); UI.updateStats(); }, 30000);
      if (resultEl) resultEl.textContent = '⚡ 2x all power for 30s!';
    } else {
      this.addCoins(val);
      const text = pick.text.replace('{x}', formatNum(val));
      if (resultEl) resultEl.textContent = text;
      setTimeout(() => { SFX.spinWin(); }, 500);
      UI.toast(text);
    }

    UI.updateStats();
    // BUG FIX: Sadece milestones paneli açıksa renderla
    if (UI.currentTab === 'ms') UI.renderMilestones();
    this.save();
  },

  /* ---- Token Ödül Hesaplama ---- */
  calcTokenReward() {
    const s = this.state;
    return Math.floor(s.totalCoins / 1000 + s.bearKills * 10 + s.prestige * 500 + s.totalClicks / 100);
  },

  /* ---- Oynama Süresi ---- */
  getPlayTime() {
    return formatTime(Math.floor((Date.now() - this.state.startTime) / 1000));
  },

  /* ---- Daily Streak ---- */
  checkStreak() {
    const now = new Date();
    const today = now.toDateString();
    const last = this.state.lastLogin ? new Date(this.state.lastLogin).toDateString() : '';

    if (today !== last) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (last === yesterday) {
        this.state.streak++;
        UI.toast('🔥 Day ' + this.state.streak + ' streak!');
      } else if (last !== today) {
        // BUG FIX: Sadece gerçekten yeni gündeyse streak sıfırla
        if (last !== '') {
          this.state.streak = 1;
        } else {
          // İlk giriş
          this.state.streak = 1;
        }
      }
      this.state.lastLogin = Date.now();

      // Daily ödül
      const reward = Math.max(this.state.clickPower, 10) * 50 * this.state.streak;
      this.addCoins(reward);
      SFX.daily();
      UI.toast('📅 Daily bonus! +' + formatNum(reward));
      this.save();
    }
  },

  /* ---- Daily Challenge Sistemi (YENİ) ---- */
  initDailyChallenge() {
    const today = new Date().toISOString().split('T')[0];
    if (this.state.dailyDate !== today) {
      // Yeni gün, yeni challenge
      this.state.dailyDate = today;
      this.state.dailyClicks = 0;
      this.state.dailyCoins = 0;
      this.state.dailyBears = 0;
      this.state.dailyBuys = 0;
      // Deterministik challenge seçimi (günlük seed)
      const seed = today.replace(/-/g, '');
      this.state.dailyChallengeIdx = parseInt(seed) % DAILY_CHALLENGES.length;
      // Level prestige'e göre zorluk
      this.state.dailyChallengeLevel = Math.min(this.state.prestige, 3);
      this.state.dailyChallengeComplete = false;
    }
  },

  getDailyChallenge() {
    const ch = DAILY_CHALLENGES[this.state.dailyChallengeIdx];
    if (!ch) return null;
    const target = ch.targets[this.state.dailyChallengeLevel] || ch.targets[0];
    let current = 0;
    switch (ch.type) {
      case 'clicks': current = this.state.dailyClicks; break;
      case 'coins':  current = this.state.dailyCoins; break;
      case 'bears':  current = this.state.dailyBears; break;
      case 'combo':  current = this.state.maxCombo || 0; break;
      case 'buys':   current = this.state.dailyBuys; break;
    }
    return {
      ...ch,
      target,
      current: Math.min(current, target),
      complete: this.state.dailyChallengeComplete,
      reward: target * 10 * (this.state.dailyChallengeLevel + 1),
    };
  },

  checkDailyChallenge() {
    if (this.state.dailyChallengeComplete) return;
    const ch = this.getDailyChallenge();
    if (!ch) return;
    if (ch.current >= ch.target) {
      this.state.dailyChallengeComplete = true;
      this.addCoins(ch.reward);
      SFX.milestone();
      UI.toast('🎯 Daily Challenge Complete! +' + formatNum(ch.reward));
    }
  },

  /* ---- Kaydet ---- */
  save() {
    try {
      this.state.saveVersion = SAVE_VERSION;
      this.state.lastSave = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch (e) {
      // localStorage dolu veya erişilemez
      console.warn('Save failed:', e.message);
    }
  },

  /* ---- Yükle ---- */
  load() {
    this.init(); // BUG FIX: Önce default state'i oluştur

    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        // Eski versiyon save'i dene ve temizle
        const oldRaw = localStorage.getItem('dumbgym_v3');
        if (oldRaw) {
          localStorage.removeItem('dumbgym_v3');
          UI.toast('🔄 Save migrated to v4!');
          // Eski save'den temel verileri al
          try {
            const oldSaved = JSON.parse(oldRaw);
            // Güvenli merge - sadece bilinen key'leri al
            const safeKeys = ['coins', 'totalCoins', 'totalClicks', 'totalLifts', 'level',
              'prestige', 'prestigeMult', 'upgrades', 'milestones', 'bearKills', 'startTime',
              'streak', 'lastLogin', 'walletAddr', 'userId', 'userName'];
            safeKeys.forEach(k => {
              if (oldSaved[k] !== undefined) this.state[k] = oldSaved[k];
            });
            this.state.sessionCoins = oldSaved.sessionCoins || 0;
          } catch (e) {}
        }
        return;
      }

      const saved = JSON.parse(raw);

      // Bozuk/eski save'leri reddet
      if (!saved || !saved.saveVersion || saved.saveVersion < SAVE_VERSION) {
        // V3'ten migration dene
        if (saved && saved.saveVersion === 3) {
          const defaults = this._defaultState();
          Object.keys(defaults).forEach(key => {
            if (saved[key] !== undefined) {
              this.state[key] = saved[key];
            }
          });
          UI.toast('🔄 Save migrated to v4!');
        } else {
          localStorage.removeItem(SAVE_KEY);
          UI.toast('🔄 Save reset for update!');
          return;
        }
      } else {
        // BUG FIX: Sadece bilinen anahtarları merge et, bilinmeyen key'leri atla
        const defaults = this._defaultState();
        Object.keys(defaults).forEach(key => {
          if (saved[key] !== undefined) {
            this.state[key] = saved[key];
          }
        });
      }

      // Anti-cheat: Değer sınırlarını uygula
      this.state.coins = clampValue(this.state.coins, 0, LIMITS.maxCoins);
      this.state.totalCoins = clampValue(this.state.totalCoins, 0, LIMITS.maxCoins);
      this.state.totalClicks = clampValue(this.state.totalClicks, 0, LIMITS.maxClicks);
      this.state.level = clampValue(this.state.level, 1, LIMITS.maxLevel);
      this.state.prestige = clampValue(this.state.prestige, 0, LIMITS.maxPrestige);
      this.state.bearKills = clampValue(this.state.bearKills, 0, LIMITS.maxBearKills);

      // sessionCoins tutarlılık kontrolü
      if (this.state.level > 1) {
        const expectedMin = this.getLevelThreshold(this.state.level - 1);
        if (this.state.sessionCoins < expectedMin * 0.5) {
          this.state.sessionCoins = expectedMin;
        }
      }

      this.calcStats();

      // Offline kazanç
      const awaySec = (Date.now() - this.state.lastSave) / 1000;
      if (awaySec > 60 && this.state.perSecond > 0) {
        const maxAway = Math.min(awaySec, OFFLINE_CAP_SECONDS);
        const earned = Math.floor(this.state.perSecond * maxAway * OFFLINE_EFFICIENCY);
        if (earned > 0) {
          this.addCoins(earned);
          document.getElementById('offlineDur').textContent = 'You were away for ' + formatTime(awaySec);
          document.getElementById('offlineAmt').textContent = '+' + formatNum(earned);
          document.getElementById('offlineModal').classList.add('show');
        }
      }

      // Daily challenge başlat
      this.initDailyChallenge();
      this.checkStreak();
      this.checkLevel();
      this.checkMilestones();

    } catch (e) {
      console.error('Load failed:', e);
      this.init(); // Hatalı yükleme durumunda temiz başlat
    }
  },
};
