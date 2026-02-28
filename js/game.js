/* ============================================
   DUMB GYM TYCOON - Core Game Logic
   State management, calculations, save/load
   ============================================ */

const SAVE_KEY = 'dumbgym_v3';
const SAVE_VERSION = 3;

const Game = {

  /* ---- Default State ---- */
  state: {
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
    boostUntil: 0,
    comboCount: 0,
    comboTime: 0,
    saveVersion: SAVE_VERSION,
  },

  /* ---- Upgrade Cost ---- */
  getUpgradeCost(upgrade) {
    const owned = this.state.upgrades[upgrade.id] || 0;
    return Math.floor(upgrade.base * Math.pow(upgrade.scale, owned));
  },

  /* ---- Owned Count ---- */
  getOwned(id) {
    return this.state.upgrades[id] || 0;
  },

  /* ---- Recalculate Stats ---- */
  calcStats() {
    let cp = 1, ps = 0, mult = 1;

    UPGRADES.forEach(u => {
      const n = this.getOwned(u.id);
      if (u.effect.cp)   cp += u.effect.cp * n;
      if (u.effect.ps)   ps += u.effect.ps * n;
      if (u.effect.mult && n > 0) mult *= u.effect.mult;
    });

    mult *= this.state.prestigeMult;

    // Streak bonus
    const streak = this.state.streak;
    const streakMult = streak >= 7 ? 1.5 : streak >= 3 ? 1.2 : 1;
    mult *= streakMult;

    // Lucky spin boost
    if (this.state.boostUntil && Date.now() < this.state.boostUntil) {
      mult *= 2;
    } else {
      this.state.boostUntil = 0;
    }

    this.state.clickPower = Math.floor(cp * mult);
    this.state.perSecond = Math.floor(ps * mult);
  },

  /* ---- Add Coins ---- */
  addCoins(n) {
    n = Math.floor(n);
    this.state.coins += n;
    this.state.totalCoins += n;
    this.state.sessionCoins += n;
  },

  /* ---- Level Check ---- */
  checkLevel() {
    const needed = () => Math.floor(80 * Math.pow(1.35, this.state.level - 1) * this.state.level);
    let safety = 0;
    const startLevel = this.state.level;
    while (this.state.sessionCoins >= needed() && safety < 100) {
      this.state.level++;
      safety++;
    }
    // Single toast for multi-level jumps
    if (this.state.level > startLevel) {
      if (this.state.level - startLevel > 1) {
        UI.toast('⬆️ Level ' + startLevel + ' → ' + this.state.level + '!');
      } else {
        UI.toast('⬆️ Level ' + this.state.level + '!');
      }
    }
  },

  /* ---- Buy Upgrade ---- */
  buyUpgrade(id) {
    const u = UPGRADES.find(x => x.id === id);
    if (!u) return;
    const cost = this.getUpgradeCost(u);
    const owned = this.getOwned(u.id);
    if (this.state.coins < cost || owned >= u.max) return;

    this.state.coins -= cost;
    this.state.upgrades[u.id] = owned + 1;
    this.calcStats();
    UI.renderShop();
    UI.updateStats();
    this.save();
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

    this.calcStats();
    UI.toast('⭐ PRESTIGE ' + this.state.prestige + '! x' + this.state.prestigeMult.toFixed(1));
    UI.switchTab('gym');
    UI.updateStats();
    this.save();
  },

  /* ---- Milestone Check ---- */
  checkMilestones() {
    MILESTONES.forEach(m => {
      if (!this.state.milestones[m.id] && m.current() >= m.target) {
        this.state.milestones[m.id] = true;
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
    if (Date.now() - this.state.luckySpinTime < 300000) return;
    this.state.luckySpinTime = Date.now();

    // Build weighted pool
    const pool = [];
    LUCKY_PRIZES.forEach(p => { for (let i = 0; i < p.weight; i++) pool.push(p); });
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const val = pick.calc();

    if (val === 'boost') {
      this.state.boostUntil = Date.now() + 30000;
      this.calcStats();
      UI.updateStats();
      UI.toast('⚡ 2x ALL Power for 30s!');
      setTimeout(() => { this.calcStats(); UI.updateStats(); }, 30000);
      document.getElementById('luckyResult').textContent = '⚡ 2x all power for 30s!';
    } else {
      this.addCoins(val);
      const text = pick.text.replace('{x}', formatNum(val));
      document.getElementById('luckyResult').textContent = text;
      UI.toast(text);
    }

    UI.updateStats();
    UI.renderMilestones();
    this.save();
  },

  /* ---- Token Reward Calc ---- */
  calcTokenReward() {
    const s = this.state;
    return Math.floor(s.totalCoins / 1000 + s.bearKills * 10 + s.prestige * 500 + s.totalClicks / 100);
  },

  /* ---- Play Time ---- */
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
        this.state.streak = 1;
      }
      this.state.lastLogin = Date.now();

      // Daily reward
      const reward = this.state.clickPower * 50 * this.state.streak;
      this.addCoins(reward);
      UI.toast('📅 Daily bonus! +' + formatNum(reward));
      this.save();
    }
  },

  /* ---- Save ---- */
  save() {
    try {
      this.state.saveVersion = SAVE_VERSION;
      this.state.lastSave = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch (e) { /* localStorage full or unavailable */ }
  },

  /* ---- Load ---- */
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw);

      // Reject old/corrupt saves
      if (!saved.saveVersion || saved.saveVersion < SAVE_VERSION) {
        localStorage.removeItem(SAVE_KEY);
        UI.toast('🔄 Save reset for update!');
        return;
      }

      Object.assign(this.state, saved);

      // Safety: sessionCoins sanity check
      if (this.state.level > 1) {
        const expectedMin = Math.floor(80 * Math.pow(1.35, this.state.level - 2) * (this.state.level - 1));
        if (this.state.sessionCoins < expectedMin * 0.5) {
          this.state.sessionCoins = expectedMin;
        }
      }

      this.calcStats();

      // Offline earnings
      const awaySec = (Date.now() - this.state.lastSave) / 1000;
      if (awaySec > 60 && this.state.perSecond > 0) {
        const maxAway = Math.min(awaySec, 14400); // 4 hour cap
        const earned = Math.floor(this.state.perSecond * maxAway * 0.5); // 50% offline
        if (earned > 0) {
          this.addCoins(earned);
          document.getElementById('offlineDur').textContent = 'You were away for ' + formatTime(awaySec);
          document.getElementById('offlineAmt').textContent = '+' + formatNum(earned);
          document.getElementById('offlineModal').classList.add('show');
        }
      }

      this.checkStreak();
      this.checkLevel(); // Fix: check level after offline earnings
      this.checkMilestones();

    } catch (e) { /* corrupt data */ }
  },
};
