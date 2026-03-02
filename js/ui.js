/* ============================================
   DUMB GYM TYCOON - UI Layer (v4)
   Rendering, input, bears, tabs
   ============================================ */

const UI = {

  currentTab: 'gym',
  dumbFrame: 0,
  dumbResetTimer: null,
  idleAccumulator: 0,
  _activePopCount: 0,    // BUG FIX: Pop element sayacı
  _activeParticles: 0,   // BUG FIX: Parçacık sayacı
  _activeToasts: 0,      // BUG FIX: Toast sayacı
  _buyMode: '1x',        // YENİ: Satın alma modu

  // ==================== BEAR STATE ====================
  bear: {
    active: false,
    hp: 0,
    maxHp: 0,
    timer: 0,
    type: '',
    interval: null,
    _paused: false,
  },

  // ==================== STATS UPDATE ====================
  updateStats() {
    const s = Game.state;
    document.getElementById('coinCount').textContent = formatNum(s.coins);
    document.getElementById('statPC').textContent = '+' + formatNum(s.clickPower);
    document.getElementById('statPS').textContent = '+' + formatNum(s.perSecond) + '/s';
    document.getElementById('statLvl').textContent = s.level;
    document.getElementById('statPre').textContent = '⭐' + s.prestige;
    document.getElementById('totalLifts').textContent = formatNum(s.totalLifts);

    // Combo göstergesi - BUG FIX: Combo window ile tutarlı zamanlama
    const comboEl = document.getElementById('comboIndicator');
    if (s.comboCount >= 10 && Date.now() - s.comboTime < COMBO_DISPLAY_MS) {
      const mult = s.comboCount >= 30 ? 5 : s.comboCount >= 20 ? 3 : 2;
      comboEl.textContent = '🔥 COMBO x' + mult + ' (' + s.comboCount + ' hits)';
      comboEl.classList.add('show');
    } else {
      comboEl.classList.remove('show');
    }

    // Level ilerleme çubuğu - BUG FIX: Doğru hesaplama
    const nxt = Game.getLevelThreshold(s.level);
    const prev = s.level > 1 ? Game.getLevelThreshold(s.level - 1) : 0;
    const range = nxt - prev;
    const pct = range > 0 ? Math.min(100, Math.max(0, ((s.sessionCoins - prev) / range) * 100)) : 0;
    document.getElementById('lvlBar').style.width = pct + '%';

    // Streak banner - YENİ: Daha fazla streak seviyesi
    const banner = document.getElementById('streakBanner');
    if (s.streak >= 3) {
      const mult = s.streak >= 30 ? '2.0' : s.streak >= 14 ? '1.75' : s.streak >= 7 ? '1.5' : '1.2';
      banner.textContent = '🔥 Day ' + s.streak + ' Streak! ' + mult + 'x bonus!';
      banner.classList.add('show');
    } else {
      banner.classList.remove('show');
    }

    // Boost timer göstergesi (YENİ)
    const boostEl = document.getElementById('boostTimer');
    if (boostEl) {
      if (s.boostUntil && Date.now() < s.boostUntil) {
        const remaining = Math.ceil((s.boostUntil - Date.now()) / 1000);
        boostEl.textContent = '⚡ 2x Boost: ' + remaining + 's';
        boostEl.classList.add('show');
      } else {
        boostEl.classList.remove('show');
      }
    }
  },

  // ==================== CLICK HANDLER ====================
  doClick(e) {
    const s = Game.state;
    
    // Combo sistemi - BUG FIX: Tutarlı window
    const now = Date.now();
    if (now - s.comboTime < COMBO_WINDOW_MS) {
      s.comboCount = Math.min(s.comboCount + 1, MAX_COMBO);
    } else {
      s.comboCount = 1;
    }
    s.comboTime = now;
    
    // Maks combo takibi (YENİ)
    if (s.comboCount > (s.maxCombo || 0)) {
      s.maxCombo = s.comboCount;
    }
    
    const comboMult = s.comboCount >= 30 ? 5 : s.comboCount >= 20 ? 3 : s.comboCount >= 10 ? 2 : 1;
    let earned = s.clickPower * comboMult;
    // Skin combo bonus
    if (typeof SkinSystem !== 'undefined') {
      const bonus = SkinSystem.getBonus();
      if (bonus.comboMult && comboMult > 1) earned = Math.floor(earned * bonus.comboMult);
    }
    
    s.totalClicks++;
    s.totalLifts++;
    s.dailyClicks++;
    Game.addCoins(earned);

    // Mr. DUMB animasyonu — skin-aware
    UI.dumbFrame = (UI.dumbFrame + 1) % 2;
    const img = document.getElementById('dumbImg');
    const skin = typeof SkinSystem !== 'undefined' ? SkinSystem.getActive() : { lift: 'assets/dumb_lift.png', lift2: 'assets/dumb_lift2.png', idle: 'assets/dumb_idle.png' };
    img.src = UI.dumbFrame === 0 ? skin.lift : (skin.lift2 || skin.lift);
    clearTimeout(UI.dumbResetTimer);
    UI.dumbResetTimer = setTimeout(() => { img.src = skin.idle; }, 180);

    // Tıklama pozisyonu
    const rect = document.getElementById('clickArea').getBoundingClientRect();
    let cx, cy;
    if (e.touches) {
      cx = e.touches[0].clientX - rect.left;
      cy = e.touches[0].clientY - rect.top;
    } else if (e.clientX) {
      cx = e.clientX - rect.left;
      cy = e.clientY - rect.top;
    } else {
      cx = rect.width / 2;
      cy = rect.height / 3;
    }

    const label = comboMult > 1 ? '+' + formatNum(earned) + ' x' + comboMult : '+' + formatNum(earned);
    UI.spawnClickPop(cx, cy, label);
    UI.spawnParticles(cx, cy, Math.min(4 + Math.floor(s.comboCount / 5), 10));
    
    // Ses
    if (s.comboCount >= 10) SFX.clickCombo(s.comboCount);
    else SFX.click();
    
    // Titreşim geri bildirimi
    if (navigator.vibrate) navigator.vibrate(15);
    
    Game.checkLevel();
    Game.checkDailyChallenge();
    UI.updateStats();
  },

  // BUG FIX: Performans - element sayısı sınırlaması
  spawnClickPop(x, y, text) {
    if (this._activePopCount >= MAX_CLICK_POPS) return;
    this._activePopCount++;
    const el = document.createElement('div');
    el.className = 'click-pop';
    el.textContent = text;
    el.style.left = (x - 20) + 'px';
    el.style.top = (y - 25) + 'px';
    document.getElementById('gymView').appendChild(el);
    setTimeout(() => {
      el.remove();
      this._activePopCount--;
    }, 700);
  },

  spawnParticles(x, y, count) {
    const available = MAX_PARTICLES - this._activeParticles;
    const actualCount = Math.min(count, available);
    if (actualCount <= 0) return;

    const colors = ['#FFD700', '#FF4444', '#FF8800', '#00FF66'];
    for (let i = 0; i < actualCount; i++) {
      this._activeParticles++;
      const p = document.createElement('div');
      p.className = 'click-particle';
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.background = colors[i % 4];
      p.style.setProperty('--px', (Math.random() - 0.5) * 70 + 'px');
      p.style.setProperty('--py', (Math.random() * -50 - 15) + 'px');
      document.getElementById('gymView').appendChild(p);
      setTimeout(() => {
        p.remove();
        this._activeParticles--;
      }, 500);
    }
  },

  showIdlePop() {
    if (Game.state.perSecond <= 0) return;
    const el = document.createElement('div');
    el.className = 'idle-pop';
    el.textContent = '+' + formatNum(Game.state.perSecond) + '/s';
    el.style.top = (120 + Math.random() * 80) + 'px';
    document.getElementById('gymView').appendChild(el);
    setTimeout(() => el.remove(), 2000);
  },

  // ==================== BEAR ATTACKS ====================
  startBearAttack() {
    if (this.bear.active) return;
    this.bear.active = true;

    const lvl = Game.state.level;
    const roll = Math.random();

    if (lvl >= 20 && roll < 0.1) {
      this.bear.type = 'boss';
      this.bear.maxHp = 30 + lvl * 3;
    } else if (lvl >= 8 && roll < 0.3) {
      this.bear.type = 'big';
      this.bear.maxHp = 10 + lvl * 2;
    } else {
      this.bear.type = 'small';
      this.bear.maxHp = 5 + Math.floor(lvl * 1.5);
    }

    this.bear.hp = this.bear.maxHp;
    this.bear.timer = 12 + Math.floor(lvl / 10);

    const def = BEARS[this.bear.type];
    const el = document.getElementById('bearAttack');
    el.classList.add('active');

    document.getElementById('bearLabel').textContent = def.label;
    document.getElementById('bearImg').src = 'assets/' + def.img + '.png';
    document.getElementById('bearImg').style.width = def.size;
    document.getElementById('bearHpFill').style.width = '100%';

    const reward = Game.state.clickPower * def.rewardMult;
    document.getElementById('bearReward').textContent = 'Reward: ' + formatNum(reward) + ' coins';

    document.getElementById('bearImg').onclick = () => UI.hitBear();
    SFX.bearAttack();

    clearInterval(this.bear.interval);
    this.bear.interval = setInterval(() => {
      this.bear.timer--;
      document.getElementById('bearTimer').textContent = this.bear.timer + 's left';
      if (this.bear.timer <= 0) this.bearEscape();
    }, 1000);
  },

  hitBear() {
    if (!this.bear.active) return;
    SFX.bearHit();

    // BUG FIX: Hasar formülü dengelendi - artık daha adil
    // Eski: Math.ceil(Math.sqrt(clickPower)) - çok düşük hasar, boss öldüremezdin
    // Yeni: Logaritmik + sabit baz hasar, yüksek seviyede bear yenilebilir
    const cp = Game.state.clickPower;
    let dmg = Math.max(1, Math.floor(Math.pow(cp, 0.4) + cp * 0.01 + 1));
    // Skin bear damage bonus
    if (typeof SkinSystem !== 'undefined') {
      const bonus = SkinSystem.getBonus();
      if (bonus.bearDmgMult) dmg = Math.floor(dmg * bonus.bearDmgMult);
    }
    this.bear.hp -= dmg;
    document.getElementById('bearHpFill').style.width = Math.max(0, (this.bear.hp / this.bear.maxHp) * 100) + '%';

    // Vuruş animasyonu
    const img = document.getElementById('bearImg');
    img.style.transform = 'scale(.82)';
    setTimeout(() => { img.style.transform = ''; }, 80);

    if (this.bear.hp <= 0) {
      this.bear.active = false;
      clearInterval(this.bear.interval);

      const def = BEARS[this.bear.type];
      img.src = 'assets/' + def.ko + '.png';

      const reward = Game.state.clickPower * def.rewardMult;
      Game.addCoins(reward);
      Game.state.bearKills++;
      Game.state.dailyBears++;
      if (this.bear.type === 'boss') Game.state.totalBearBossKills++;

      this.toast('🐻 Defeated! +' + formatNum(reward));
      SFX.bearKill();
      setTimeout(() => { document.getElementById('bearAttack').classList.remove('active'); }, 800);
      
      Game.checkDailyChallenge();
      Game.checkMilestones();
      this.updateStats();
    }
  },

  bearEscape() {
    this.bear.active = false;
    clearInterval(this.bear.interval);
    document.getElementById('bearAttack').classList.remove('active');
    this.toast('🐻 Bear escaped!');
    SFX.bearEscape();
  },

  // ==================== SHOP ====================
  renderShop() {
    const panel = document.getElementById('shopPanel');
    let html = '';
    let lastCat = '';

    // Satın alma modu: 1x / 10x / Max
    html += '<div class="buy-mode-bar">';
    html += '<span style="font-size:11px;color:#888">Buy:</span>';
    ['1x', '10x', 'Max'].forEach(m => {
      html += '<button class="buy-mode-btn' + (this._buyMode === m ? ' active' : '') + '" onclick="UI._buyMode=\'' + m + '\';UI.renderShop()">' + m + '</button>';
    });
    // Toplam gelir özeti
    html += '<span class="shop-income-summary">⚡ ' + formatNum(Game.state.clickPower) + '/tap · ' + formatNum(Game.state.perSecond) + '/s</span>';
    html += '</div>';

    UPGRADES.forEach(u => {
      if (u.cat !== lastCat) {
        html += '<div class="shop-category">' + escapeHtml(u.cat) + '</div>';
        lastCat = u.cat;
      }

      const owned = Game.getOwned(u.id);
      const maxed = owned >= u.max;

      // Mod'a göre maliyet ve miktar hesapla
      let buyCount = 1;
      let totalCost = Game.getUpgradeCost(u);
      let canBuy = false;

      if (maxed) {
        canBuy = false;
      } else if (this._buyMode === '1x') {
        buyCount = 1;
        totalCost = Game.getUpgradeCost(u);
        canBuy = Game.state.coins >= totalCost;
      } else if (this._buyMode === '10x') {
        const bulk = Game.getBulkCost(u, 10);
        buyCount = bulk.count;
        totalCost = bulk.total;
        canBuy = buyCount > 0 && Game.state.coins >= Game.getUpgradeCost(u);
        // Gerçekten alınabilecek miktar
        const affordable = Game.getAffordableCount(u);
        buyCount = Math.min(10, affordable);
        if (buyCount > 0) {
          const affordBulk = Game.getBulkCost(u, buyCount);
          totalCost = affordBulk.total;
          canBuy = true;
        } else {
          totalCost = Game.getBulkCost(u, 10).total;
          canBuy = false;
        }
      } else { // Max
        const affordable = Game.getAffordableCount(u);
        buyCount = affordable;
        if (affordable > 0) {
          totalCost = Game.getBulkCost(u, affordable).total;
          canBuy = true;
        } else {
          totalCost = Game.getUpgradeCost(u);
          canBuy = false;
        }
      }

      // İkon
      let iconHtml;
      if (u.icon === 'mini')      iconHtml = '<img src="assets/dumb_idle.png" alt="">';
      else if (u.icon === 'bro')  iconHtml = '<img src="assets/dumb_lift.png" alt="">';
      else if (u.icon === 'eq')   iconHtml = '<img src="assets/bag.png" alt="">';
      else if (u.icon === 'eq2')  iconHtml = '<img src="assets/coin.png" alt="">';
      else                        iconHtml = '<span>' + u.icon + '</span>';

      // Toplam katkı
      let effectText = '';
      if (u.effect.cp)   effectText = 'Total: +' + formatNum(u.effect.cp * owned) + '/tap';
      if (u.effect.ps)   effectText = 'Total: +' + formatNum(u.effect.ps * owned) + '/s';
      if (u.effect.mult) effectText = owned > 0 ? '✅ Active' : '';

      // ROI (sadece per-second upgrade'ler)
      let roiText = '';
      if (!maxed && u.effect.ps) {
        const nextCost = Game.getUpgradeCost(u);
        const paybackSec = nextCost / u.effect.ps;
        roiText = ' · ROI: ' + formatTime(paybackSec);
      }

      // Progress bar
      const progressPct = Math.min(100, (owned / u.max) * 100);

      html += '<div class="shop-item' + (canBuy ? ' affordable' : '') + (maxed ? ' maxed' : '') + '" data-id="' + u.id + '">';
      html += '<div class="shop-icon">' + iconHtml + '</div>';
      html += '<div class="shop-info">';
      html += '<div class="shop-name">' + escapeHtml(u.name) + '</div>';
      html += '<div class="shop-desc">' + escapeHtml(u.desc) + '</div>';
      html += '<div class="shop-meta">';
      html += '<span class="shop-owned">' + owned + '/' + u.max + '</span>';
      if (effectText) html += '<span class="shop-effect">' + effectText + '</span>';
      if (roiText && this._buyMode === '1x') html += '<span class="shop-roi-tag">' + roiText + '</span>';
      html += '</div>';
      // Progress bar
      html += '<div class="shop-progress"><div class="shop-progress-fill" style="width:' + progressPct + '%"></div></div>';
      html += '</div>';

      // Fiyat alanı
      html += '<div class="shop-cost-area">';
      if (maxed) {
        html += '<div class="shop-cost-maxed">MAX</div>';
      } else {
        // Miktar göster (10x/Max modunda)
        if (this._buyMode !== '1x' && buyCount > 0) {
          html += '<div class="shop-cost-count">×' + buyCount + '</div>';
        }
        html += '<div class="shop-cost' + (canBuy ? '' : ' expensive') + '">' + formatNum(totalCost) + '</div>';
      }
      html += '</div>';
      html += '</div>';
    });

    panel.innerHTML = html;

    // Click handler'lar
    panel.querySelectorAll('.shop-item:not(.maxed)').forEach(el => {
      el.onclick = () => {
        const mode = UI._buyMode;
        if (mode === '10x') {
          Game.buyUpgradeN(el.dataset.id, 10);
        } else if (mode === 'Max') {
          Game.buyUpgradeN(el.dataset.id, -1);
        } else {
          Game.buyUpgrade(el.dataset.id);
        }
      };
    });

    // Shop bildirim noktası
    const any = UPGRADES.some(u => Game.state.coins >= Game.getUpgradeCost(u) && Game.getOwned(u.id) < u.max);
    document.getElementById('shopNotif').style.display = any ? 'block' : 'none';
  },

  // ==================== MILESTONES ====================
  renderMilestones() {
    const panel = document.getElementById('msPanel');
    const s = Game.state;
    let html = '';

    // Daily Challenge (YENİ)
    const dc = Game.getDailyChallenge();
    if (dc) {
      const dcPct = Math.min(100, (dc.current / dc.target) * 100);
      html += '<div class="daily-challenge-box">';
      html += '<h3>🎯 Daily Challenge</h3>';
      html += '<div class="dc-name">' + escapeHtml(dc.name) + '</div>';
      html += '<div class="dc-desc">' + escapeHtml(dc.desc.replace('{t}', formatNum(dc.target))) + '</div>';
      if (dc.complete) {
        html += '<div class="dc-complete">✅ COMPLETE!</div>';
      } else {
        html += '<div class="dc-progress-text">' + formatNum(dc.current) + ' / ' + formatNum(dc.target) + '</div>';
        html += '<div class="ms-progress"><div class="ms-progress-fill dc-fill" style="width:' + dcPct + '%"></div></div>';
        html += '<div class="dc-reward">Reward: ' + formatNum(dc.reward) + ' coins</div>';
      }
      html += '</div>';
    }

    // Lucky Spin
    const canSpin = Date.now() - s.luckySpinTime > LUCKY_SPIN_COOLDOWN;
    const spinCooldown = Math.max(0, Math.ceil((LUCKY_SPIN_COOLDOWN - (Date.now() - s.luckySpinTime)) / 1000));
    html += '<div class="lucky-box"><h3>🎰 Lucky Spin</h3>';
    html += '<div style="font-size:12px;color:#888;margin-bottom:8px">Spin every 5 minutes for bonus rewards!</div>';
    html += '<button class="lucky-btn" ' + (canSpin ? 'onclick="Game.luckySpin()"' : 'disabled') + '>';
    html += canSpin ? 'SPIN! 🎰' : 'Wait ' + formatTime(spinCooldown) + '...';
    html += '</button>';
    html += '<div class="lucky-result" id="luckyResult"></div></div>';

    // Milestones
    // Tamamlanmayanlar önce, tamamlananlar sona
    const sorted = [...MILESTONES].sort((a, b) => {
      const aDone = s.milestones[a.id] ? 1 : 0;
      const bDone = s.milestones[b.id] ? 1 : 0;
      return aDone - bDone;
    });

    sorted.forEach(m => {
      const done = s.milestones[m.id] || false;
      const cur = m.current();
      const pct = Math.min(100, (cur / m.target) * 100);

      html += '<div class="milestone-item' + (done ? ' done' : '') + '">';
      html += '<div class="ms-check">' + (done ? '✅' : '⬜') + '</div>';
      html += '<div style="flex:1"><div class="ms-title">' + escapeHtml(m.name) + '</div>';
      html += '<div class="ms-desc">' + escapeHtml(m.desc) + '</div>';
      if (!done && m.reward > 0) html += '<div class="ms-reward">Reward: ' + formatNum(m.reward) + '</div>';
      if (!done) html += '<div class="ms-progress"><div class="ms-progress-fill" style="width:' + pct + '%"></div></div>';
      html += '</div></div>';
    });

    // Twitter paylaşımı
    const completedCount = MILESTONES.filter(m => s.milestones[m.id]).length;
    const tweetText = '🏋️ DUMB GYM TYCOON\n\n💰 ' + formatNum(s.totalCoins) + ' coins\n🏋️ ' + formatNum(s.totalLifts) +
      ' bags lifted\n⭐ Level ' + s.level + '\n🐻 ' + s.bearKills + ' bears killed\n🏆 ' + completedCount + '/' + MILESTONES.length + ' goals\n\nCan you lift more?\n\nCA: ' + CA + '\n#DUMB #Solana';
    html += '<div style="text-align:center;margin-top:12px">';
    html += '<a class="share-btn" href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweetText) + '" target="_blank" rel="noopener">Share on Twitter 🐦</a></div>';

    panel.innerHTML = html;
  },

  // ==================== PRESTIGE PANEL ====================
  renderPrestige() {
    const panel = document.getElementById('prePanel');
    const s = Game.state;
    const nextMult = (1 + s.prestige * 0.25 + 0.25).toFixed(2);
    const canPrestige = s.level >= 30;

    let html = '<div class="prestige-box"><h3>⭐ PRESTIGE</h3>';
    html += '<div style="color:#aaa;font-size:13px;margin-bottom:12px">Reset progress for permanent multiplier. Requires Level 30+</div>';
    html += '<div style="color:#666;font-size:12px">Current</div>';
    html += '<div class="prestige-mult">x' + s.prestigeMult.toFixed(1) + '</div>';
    html += '<div style="color:#666;font-size:12px">After prestige</div>';
    html += '<div class="prestige-mult" style="color:var(--purple)">x' + nextMult + '</div>';
    html += '<div style="color:#ff8888;font-size:11px;margin:8px 0">⚠️ Coins, upgrades, and level reset. Stats kept!</div>';
    html += '<button class="btn-prestige" ' + (canPrestige ? 'onclick="Game.confirmPrestige()"' : 'disabled') + '>';
    html += canPrestige ? 'PRESTIGE ⭐' : 'Need Lvl 30 (Now: ' + s.level + ')';
    html += '</button></div>';

    // Token ödülleri
    html += '<div class="token-box"><h4>🪙 $DUMB Token Rewards</h4>';
    html += '<div style="font-size:12px;color:#888;margin-bottom:8px">Connect wallet to earn $DUMB tokens!</div>';
    html += '<div style="font-size:14px;color:var(--gold);margin-bottom:4px">Pending: ' + formatNum(Game.calcTokenReward()) + ' $DUMB</div>';
    html += '<div style="font-size:10px;color:#666">Claim at prestige milestones</div></div>';

    // Yaşam istatistikleri
    html += '<div class="lifetime-stats"><h4>📊 Lifetime Stats</h4><div class="stats-grid">';
    html += '<div>Total Coins: <b style="color:var(--gold)">' + formatNum(s.totalCoins) + '</b></div>';
    html += '<div>Total Clicks: <b style="color:var(--gold)">' + formatNum(s.totalClicks) + '</b></div>';
    html += '<div>Bears Killed: <b style="color:var(--red)">' + s.bearKills + '</b></div>';
    html += '<div>Boss Bears: <b style="color:var(--red)">' + (s.totalBearBossKills || 0) + '</b></div>';
    html += '<div>Prestiges: <b style="color:var(--purple)">' + s.prestige + '</b></div>';
    html += '<div>Highest Level: <b style="color:var(--blue)">' + (s.highestLevel || s.level) + '</b></div>';
    html += '<div>Play Time: <b style="color:var(--blue)">' + Game.getPlayTime() + '</b></div>';
    html += '<div>Max Combo: <b style="color:var(--orange)">' + (s.maxCombo || 0) + 'x</b></div>';
    html += '<div>Total Upgrades: <b style="color:var(--green)">' + (s.totalUpgradesBought || 0) + '</b></div>';
    html += '<div>Lucky Spins: <b style="color:var(--orange)">' + (s.totalSpins || 0) + '</b></div>';
    html += '<div>Day Streak: <b style="color:var(--orange)">' + s.streak + '</b></div>';
    html += '<div>Current Level: <b style="color:var(--blue)">' + s.level + '</b></div>';
    html += '</div></div>';

    // Sıfırlama butonu
    html += '<div style="text-align:center;margin-top:16px">';
    html += '<button onclick="UI.confirmReset()" style="font-size:11px;padding:6px 14px;border:1px solid #333;background:transparent;color:#555;cursor:pointer;border-radius:6px">🗑️ Reset All Data</button>';
    html += '</div>';

    panel.innerHTML = html;
  },

  // ==================== TABS ====================
  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('gymView').style.display = tab === 'gym' ? 'flex' : 'none';
    document.getElementById('shopPanel').classList.toggle('active', tab === 'shop');
    document.getElementById('msPanel').classList.toggle('active', tab === 'ms');
    document.getElementById('lbPanel').classList.toggle('active', tab === 'lb');
    document.getElementById('prePanel').classList.toggle('active', tab === 'pre');

    // Bear timer'ı tab geçişinde duraklat/devam ettir
    if (tab !== 'gym' && this.bear.active && !this.bear._paused) {
      clearInterval(this.bear.interval);
      this.bear._paused = true;
    } else if (tab === 'gym' && this.bear._paused && this.bear.active) {
      this.bear._paused = false;
      this.bear.interval = setInterval(() => {
        this.bear.timer--;
        document.getElementById('bearTimer').textContent = this.bear.timer + 's left';
        if (this.bear.timer <= 0) this.bearEscape();
      }, 1000);
    }

    if (tab === 'shop') this.renderShop();
    if (tab === 'ms')   this.renderMilestones();
    if (tab === 'lb')   Leaderboard.render();
    if (tab === 'pre')  this.renderPrestige();
  },

  // ==================== TOAST ====================
  // BUG FIX: Toast sayısı sınırlaması
  toast(msg) {
    if (this._activeToasts >= MAX_TOASTS) {
      // En eski toast'u sil
      const oldest = document.querySelector('.toast');
      if (oldest) {
        oldest.remove();
        this._activeToasts--;
      }
    }
    this._activeToasts++;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    // YENİ: Çoklu toast pozisyon ayarı
    el.style.top = (15 + (this._activeToasts - 1) * 42) + 'px';
    document.body.appendChild(el);
    setTimeout(() => {
      el.remove();
      this._activeToasts = Math.max(0, this._activeToasts - 1);
    }, 2200);
  },

  // ==================== MODAL HELPERS ====================
  closeOffline()  { document.getElementById('offlineModal').classList.remove('show'); UI.updateStats(); },
  closePrestige() { document.getElementById('prestigeConfirm').classList.remove('show'); },
  closeWallet()   { document.getElementById('walletModal').classList.remove('show'); },

  // ==================== RESET ====================
  confirmReset() {
    document.getElementById('resetConfirm').classList.add('show');
  },
  closeReset() {
    document.getElementById('resetConfirm').classList.remove('show');
  },
  doReset() {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem('dumbgym_lb');
      localStorage.removeItem('dumbgym_v3');
      localStorage.removeItem(AUTH_ID_KEY);
    } catch (e) {}
    location.reload();
  },
};