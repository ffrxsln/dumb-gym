/* ============================================
   DUMB GYM TYCOON - UI Layer
   Rendering, input, bears, tabs
   ============================================ */

const UI = {

  currentTab: 'gym',
  dumbFrame: 0,
  dumbResetTimer: null,
  idleAccumulator: 0,

  // ==================== BEAR STATE ====================
  bear: {
    active: false,
    hp: 0,
    maxHp: 0,
    timer: 0,
    type: '',
    interval: null,
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

    // Combo indicator
    const comboEl = document.getElementById('comboIndicator');
    if (s.comboCount >= 10 && Date.now() - s.comboTime < 600) {
      const mult = s.comboCount >= 30 ? 5 : s.comboCount >= 20 ? 3 : 2;
      comboEl.textContent = '🔥 COMBO x' + mult + ' (' + s.comboCount + ' hits)';
      comboEl.classList.add('show');
    } else {
      comboEl.classList.remove('show');
    }

    // Level progress bar
    const nxt = Math.floor(80 * Math.pow(1.35, s.level - 1) * s.level);
    const prev = s.level > 1 ? Math.floor(80 * Math.pow(1.35, s.level - 2) * (s.level - 1)) : 0;
    const pct = Math.min(100, Math.max(0, ((s.sessionCoins - prev) / (nxt - prev)) * 100));
    document.getElementById('lvlBar').style.width = pct + '%';

    // Streak banner
    const banner = document.getElementById('streakBanner');
    if (s.streak >= 3) {
      const mult = s.streak >= 7 ? '1.5' : '1.2';
      banner.textContent = '🔥 Day ' + s.streak + ' Streak! ' + mult + 'x bonus!';
      banner.classList.add('show');
    } else {
      banner.classList.remove('show');
    }
  },

  // ==================== CLICK HANDLER ====================
  doClick(e) {
    const s = Game.state;
    
    // Combo system
    const now = Date.now();
    if (now - s.comboTime < 400) {
      s.comboCount = Math.min(s.comboCount + 1, 50);
    } else {
      s.comboCount = 1;
    }
    s.comboTime = now;
    
    const comboMult = s.comboCount >= 30 ? 5 : s.comboCount >= 20 ? 3 : s.comboCount >= 10 ? 2 : 1;
    const earned = s.clickPower * comboMult;
    
    s.totalClicks++;
    s.totalLifts++;
    Game.addCoins(earned);

    // Mr. DUMB animation
    UI.dumbFrame = (UI.dumbFrame + 1) % 2;
    const img = document.getElementById('dumbImg');
    img.src = UI.dumbFrame === 0 ? 'assets/dumb_lift.png' : 'assets/dumb_lift2.png';
    clearTimeout(UI.dumbResetTimer);
    UI.dumbResetTimer = setTimeout(() => { img.src = 'assets/dumb_idle.png'; }, 180);

    // Click position
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
    
    // Sound
    if (s.comboCount >= 10) SFX.clickCombo(s.comboCount);
    else SFX.click();
    
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(15);
    
    Game.checkLevel();
    UI.updateStats();
  },

  spawnClickPop(x, y, text) {
    const el = document.createElement('div');
    el.className = 'click-pop';
    el.textContent = text;
    el.style.left = (x - 20) + 'px';
    el.style.top = (y - 25) + 'px';
    document.getElementById('gymView').appendChild(el);
    setTimeout(() => el.remove(), 700);
  },

  spawnParticles(x, y, count) {
    const colors = ['#FFD700', '#FF4444', '#FF8800', '#00FF66'];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'click-particle';
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.background = colors[i % 4];
      p.style.setProperty('--px', (Math.random() - 0.5) * 70 + 'px');
      p.style.setProperty('--py', (Math.random() * -50 - 15) + 'px');
      document.getElementById('gymView').appendChild(p);
      setTimeout(() => p.remove(), 500);
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

    const rewards = { small: Game.state.clickPower * 8, big: Game.state.clickPower * 25, boss: Game.state.clickPower * 80 };
    document.getElementById('bearReward').textContent = 'Reward: ' + formatNum(rewards[this.bear.type]) + ' coins';

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

    const dmg = Math.max(1, Math.ceil(Math.sqrt(Game.state.clickPower)));
    this.bear.hp -= dmg;
    document.getElementById('bearHpFill').style.width = Math.max(0, (this.bear.hp / this.bear.maxHp) * 100) + '%';

    // Hit animation
    const img = document.getElementById('bearImg');
    img.style.transform = 'scale(.82)';
    setTimeout(() => { img.style.transform = ''; }, 80);

    if (this.bear.hp <= 0) {
      this.bear.active = false;
      clearInterval(this.bear.interval);

      const def = BEARS[this.bear.type];
      img.src = 'assets/' + def.ko + '.png';

      const rewards = { small: Game.state.clickPower * 8, big: Game.state.clickPower * 25, boss: Game.state.clickPower * 80 };
      const reward = rewards[this.bear.type];
      Game.addCoins(reward);
      Game.state.bearKills++;

      this.toast('🐻 Defeated! +' + formatNum(reward));
      SFX.bearKill();
      setTimeout(() => { document.getElementById('bearAttack').classList.remove('active'); }, 800);
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

    UPGRADES.forEach(u => {
      if (u.cat !== lastCat) {
        html += '<div class="shop-category">' + u.cat + '</div>';
        lastCat = u.cat;
      }

      const owned = Game.getOwned(u.id);
      const cost = Game.getUpgradeCost(u);
      const canBuy = Game.state.coins >= cost && owned < u.max;
      const maxed = owned >= u.max;

      // Icon
      let iconHtml;
      if (u.icon === 'mini')      iconHtml = '<img src="assets/dumb_idle.png">';
      else if (u.icon === 'bro')  iconHtml = '<img src="assets/dumb_lift.png">';
      else if (u.icon === 'eq')   iconHtml = '<img src="assets/bag.png">';
      else if (u.icon === 'eq2')  iconHtml = '<img src="assets/coin.png">';
      else                        iconHtml = '<span>' + u.icon + '</span>';

      html += '<div class="shop-item' + (canBuy ? ' affordable' : '') + (maxed ? ' maxed' : '') + '" data-id="' + u.id + '">';
      html += '<div class="shop-icon">' + iconHtml + '</div>';
      html += '<div style="flex:1"><div class="shop-name">' + u.name + '</div>';
      html += '<div class="shop-desc">' + u.desc + '</div>';
      html += '<div class="shop-owned">Owned: ' + owned + (u.max < 200 ? ' / ' + u.max : '') + '</div></div>';
      html += '<div class="shop-cost' + (canBuy ? '' : ' expensive') + '">' + (maxed ? 'MAX' : formatNum(cost)) + '</div>';
      html += '</div>';
    });

    panel.innerHTML = html;

    // Click handlers
    panel.querySelectorAll('.shop-item:not(.maxed)').forEach(el => {
      el.onclick = () => Game.buyUpgrade(el.dataset.id);
    });

    // Shop notification dot
    const any = UPGRADES.some(u => Game.state.coins >= Game.getUpgradeCost(u) && Game.getOwned(u.id) < u.max);
    document.getElementById('shopNotif').style.display = any ? 'block' : 'none';
  },

  // ==================== MILESTONES ====================
  renderMilestones() {
    const panel = document.getElementById('msPanel');
    const s = Game.state;
    let html = '';

    // Lucky Spin
    const canSpin = Date.now() - s.luckySpinTime > 300000;
    html += '<div class="lucky-box"><h3>🎰 Lucky Spin</h3>';
    html += '<div style="font-size:12px;color:#888;margin-bottom:8px">Spin every 5 minutes for bonus rewards!</div>';
    html += '<button class="lucky-btn" ' + (canSpin ? 'onclick="Game.luckySpin()"' : 'disabled') + '>' + (canSpin ? 'SPIN! 🎰' : 'Cooldown...') + '</button>';
    html += '<div class="lucky-result" id="luckyResult"></div></div>';

    // Milestones
    MILESTONES.forEach(m => {
      const done = s.milestones[m.id] || false;
      const cur = m.current();
      const pct = Math.min(100, (cur / m.target) * 100);

      html += '<div class="milestone-item' + (done ? ' done' : '') + '">';
      html += '<div class="ms-check">' + (done ? '✅' : '⬜') + '</div>';
      html += '<div style="flex:1"><div class="ms-title">' + m.name + '</div>';
      html += '<div class="ms-desc">' + m.desc + '</div>';
      if (!done && m.reward > 0) html += '<div class="ms-reward">Reward: ' + formatNum(m.reward) + '</div>';
      if (!done) html += '<div class="ms-progress"><div class="ms-progress-fill" style="width:' + pct + '%"></div></div>';
      html += '</div></div>';
    });

    // Twitter share
    const tweetText = '🏋️ DUMB GYM TYCOON\n\n💰 ' + formatNum(s.totalCoins) + ' coins\n🏋️ ' + formatNum(s.totalLifts) +
      ' bags lifted\n⭐ Level ' + s.level + '\n🐻 ' + s.bearKills + ' bears killed\n\nCan you lift more?\n\nCA: ' + CA + '\n#DUMB #Solana';
    html += '<div style="text-align:center;margin-top:12px">';
    html += '<a class="share-btn" href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweetText) + '" target="_blank">Share on Twitter 🐦</a></div>';

    panel.innerHTML = html;
  },

  // ==================== PRESTIGE PANEL ====================
  renderPrestige() {
    const panel = document.getElementById('prePanel');
    const s = Game.state;
    const nextMult = (1 + s.prestige * 0.5 + 0.5).toFixed(1);
    const canPrestige = s.level >= 20;

    let html = '<div class="prestige-box"><h3>⭐ PRESTIGE</h3>';
    html += '<div style="color:#aaa;font-size:13px;margin-bottom:12px">Reset progress for permanent multiplier. Requires Level 20+</div>';
    html += '<div style="color:#666;font-size:12px">Current</div>';
    html += '<div class="prestige-mult">x' + s.prestigeMult.toFixed(1) + '</div>';
    html += '<div style="color:#666;font-size:12px">After prestige</div>';
    html += '<div class="prestige-mult" style="color:var(--purple)">x' + nextMult + '</div>';
    html += '<div style="color:#ff8888;font-size:11px;margin:8px 0">⚠️ Coins, upgrades, and level reset. Stats kept!</div>';
    html += '<button class="btn-prestige" ' + (canPrestige ? 'onclick="Game.confirmPrestige()"' : 'disabled') + '>';
    html += canPrestige ? 'PRESTIGE ⭐' : 'Need Lvl 20 (Now: ' + s.level + ')';
    html += '</button></div>';

    // Token rewards
    html += '<div class="token-box"><h4>🪙 $DUMB Token Rewards</h4>';
    html += '<div style="font-size:12px;color:#888;margin-bottom:8px">Connect wallet to earn $DUMB tokens!</div>';
    html += '<div style="font-size:14px;color:var(--gold);margin-bottom:4px">Pending: ' + formatNum(Game.calcTokenReward()) + ' $DUMB</div>';
    html += '<div style="font-size:10px;color:#666">Claim at prestige milestones</div></div>';

    // Lifetime stats
    html += '<div class="lifetime-stats"><h4>📊 Lifetime Stats</h4><div class="stats-grid">';
    html += '<div>Total Coins: <b style="color:var(--gold)">' + formatNum(s.totalCoins) + '</b></div>';
    html += '<div>Total Clicks: <b style="color:var(--gold)">' + formatNum(s.totalClicks) + '</b></div>';
    html += '<div>Bears Killed: <b style="color:var(--red)">' + s.bearKills + '</b></div>';
    html += '<div>Prestiges: <b style="color:var(--purple)">' + s.prestige + '</b></div>';
    html += '<div>Play Time: <b style="color:var(--blue)">' + Game.getPlayTime() + '</b></div>';
    html += '<div>Level: <b style="color:var(--blue)">' + s.level + '</b></div>';
    html += '</div></div>';

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

    // Pause/resume bear timer on tab switch
    if (tab !== 'gym' && this.bear.active) {
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
  toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  },

  // ==================== MODAL HELPERS ====================
  closeOffline()  { document.getElementById('offlineModal').classList.remove('show'); UI.updateStats(); },
  closePrestige() { document.getElementById('prestigeConfirm').classList.remove('show'); },
  closeWallet()   { document.getElementById('walletModal').classList.remove('show'); },
};
