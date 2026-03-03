/* ============================================
   DUMB GYM TYCOON - PK Arena System (v4.3)
   Offline PvP - stat bazli dovus + bot destegi
   ============================================ */

const Arena = {

  COOLDOWN: 60000,        // 1 dakika bekleme
  FIGHT_DURATION: 15,     // 15 saniye dovus suresi
  BOT_NAMES: [
    'CryptoChad', 'DiamondHands', 'PaperHands', 'MoonBoy', 'DipBuyer',
    'HODLer', 'WhaleAlert', 'PumpKing', 'DumpQueen', 'SatoshiJr',
    'RugPuller', 'YieldFarmer', 'GasGuzzler', 'NFTBro', 'DeFiDegen',
    'BearSlayer', 'BullRunner', 'TokenKing', 'ChainBreaker', 'BlockHead',
  ],

  _lastFight: 0,
  _active: false,
  _opponent: null,
  _playerHp: 0,
  _playerMaxHp: 0,
  _oppHp: 0,
  _oppMaxHp: 0,
  _oppDps: 0,
  _timer: 0,
  _interval: null,
  _oppAttackInterval: null,
  _result: null,
  _cachedOpponents: [],

  /* ==================== BOT URETIMI ==================== */
  _generateBot(level) {
    const variance = 0.6 + Math.random() * 0.8; // 0.6x - 1.4x oyuncu stat'leri
    const botLevel = Math.max(1, Math.floor(level * variance));
    const botPrestige = Math.max(0, Math.floor((Game.state.prestige || 0) * variance));
    const botClickPower = Math.max(1, Math.floor(Game.state.clickPower * variance));

    return {
      display_name: this.BOT_NAMES[Math.floor(Math.random() * this.BOT_NAMES.length)],
      level: botLevel,
      prestige: botPrestige,
      click_power: botClickPower,
      bear_kills: Math.floor((Game.state.bearKills || 0) * variance),
      is_bot: true,
      user_id: 'bot_' + Math.random().toString(36).slice(2, 8),
    };
  },

  /* ==================== RAKIP LISTESI ==================== */
  async getOpponents() {
    const opponents = [];
    const myId = Auth.getId();

    // Leaderboard'dan gercek oyuncular
    if (Leaderboard.data && Leaderboard.data.length > 0) {
      const others = Leaderboard.data.filter(e => e.user_id !== myId);
      const shuffled = [...others].sort(() => Math.random() - 0.5);
      shuffled.slice(0, 3).forEach(p => {
        opponents.push({
          display_name: p.display_name || 'Anonymous',
          level: p.level || 1,
          prestige: p.prestige || 0,
          click_power: Math.max(1, Math.floor(
            (p.total_clicks || 1) > 0
              ? (p.total_coins || 0) / Math.max(1, p.total_clicks)
              : Game.state.clickPower * 0.8
          )),
          bear_kills: p.bear_kills || 0,
          is_bot: false,
          user_id: p.user_id,
        });
      });
    }

    // Kalan slotlari botla doldur
    while (opponents.length < 4) {
      opponents.push(this._generateBot(Game.state.level));
    }

    return opponents;
  },

  /* ==================== STAT HESAPLAMA ==================== */
  _calcOpponentStats(opp) {
    const hp = 10 + (opp.level || 1) * 5 + (opp.prestige || 0) * 20;
    const dps = Math.max(1, Math.floor((opp.click_power || 1) * 0.15));
    return { hp, dps };
  },

  _calcPlayerStats() {
    const s = Game.state;
    const hp = 10 + s.level * 5 + s.prestige * 20;
    return { hp };
  },

  /* ==================== DOVUS BASLAT ==================== */
  startFight(opponent) {
    if (this._active) return;
    if (Date.now() - this._lastFight < this.COOLDOWN) {
      const wait = Math.ceil((this.COOLDOWN - (Date.now() - this._lastFight)) / 1000);
      UI.toast('⏳ Arena cooldown: ' + wait + 's');
      return;
    }

    this._active = true;
    this._opponent = opponent;
    this._result = null;

    const oppStats = this._calcOpponentStats(opponent);
    const playerStats = this._calcPlayerStats();

    this._oppHp = oppStats.hp;
    this._oppMaxHp = oppStats.hp;
    this._oppDps = oppStats.dps;
    this._playerHp = playerStats.hp;
    this._playerMaxHp = playerStats.hp;
    this._timer = this.FIGHT_DURATION;

    this._renderFight();
    SFX.bearAttack();

    // Rakip otomatik saldiri
    this._oppAttackInterval = setInterval(() => {
      if (!this._active) return;
      this._playerHp -= this._oppDps;
      this._updateFightUI();
      // Oyuncu HP bar sarsintisi
      const bar = document.getElementById('arenaPlayerHpBar');
      if (bar) {
        bar.classList.remove('arena-hit');
        void bar.offsetWidth;
        bar.classList.add('arena-hit');
      }
      if (this._playerHp <= 0) this._endFight(false);
    }, 1000);

    // Geri sayim
    this._interval = setInterval(() => {
      this._timer--;
      this._updateFightUI();
      if (this._timer <= 0) {
        const playerPct = this._playerHp / this._playerMaxHp;
        const oppPct = this._oppHp / this._oppMaxHp;
        this._endFight(playerPct > oppPct);
      }
    }, 1000);
  },

  /* ==================== OYUNCU SALDIRISI ==================== */
  hitOpponent() {
    if (!this._active) return;
    SFX.bearHit();

    const cp = Game.state.clickPower;
    let dmg = Math.max(1, Math.floor(Math.pow(cp, 0.4) + cp * 0.01 + 1));

    // Skin bonus
    if (typeof SkinSystem !== 'undefined') {
      const bonus = SkinSystem.getBonus();
      if (bonus.bearDmgMult) dmg = Math.floor(dmg * bonus.bearDmgMult);
    }

    this._oppHp -= dmg;
    this._updateFightUI();

    // Vurus animasyonu
    const img = document.getElementById('arenaOppImg');
    if (img) {
      img.style.transform = 'scale(.82)';
      setTimeout(() => { img.style.transform = ''; }, 80);
    }

    // Hasar pop
    const fightArea = document.getElementById('arenaFightArea');
    if (fightArea) {
      const pop = document.createElement('div');
      pop.className = 'arena-dmg-pop';
      pop.textContent = '-' + dmg;
      pop.style.left = (40 + Math.random() * 20) + '%';
      pop.style.top = (20 + Math.random() * 20) + '%';
      fightArea.appendChild(pop);
      setTimeout(() => pop.remove(), 700);
    }

    if (this._oppHp <= 0) this._endFight(true);
  },

  /* ==================== DOVUS BITIR ==================== */
  _endFight(won) {
    this._active = false;
    this._lastFight = Date.now();
    clearInterval(this._interval);
    clearInterval(this._oppAttackInterval);
    this._interval = null;
    this._oppAttackInterval = null;

    if (won) {
      SFX.bearKill();
      const reward = Math.floor(Game.state.clickPower * Math.max(1, this._opponent.level || 1) * 5);
      Game.addCoins(reward);
      Game.state.arenaWins = (Game.state.arenaWins || 0) + 1;
      this._result = { won: true, reward };
      UI.toast('🏆 Arena Victory! +' + formatNum(reward));
    } else {
      SFX.bearEscape();
      Game.state.arenaLosses = (Game.state.arenaLosses || 0) + 1;
      this._result = { won: false, reward: 0 };
      UI.toast('💀 Defeated by ' + escapeHtml(this._opponent.display_name));
    }

    Game.state.arenaFights = (Game.state.arenaFights || 0) + 1;
    Game.save();
    this._renderFightResult();
  },

  /* ==================== RAKIP SECIM EKRANI ==================== */
  async renderPanel() {
    const modal = document.getElementById('arenaModal');
    const container = document.getElementById('arenaContent');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:30px;color:#888">Finding opponents...</div>';
    modal.classList.add('show');

    const opponents = await this.getOpponents();
    this._cachedOpponents = opponents;

    const canFight = Date.now() - this._lastFight >= this.COOLDOWN;
    const cooldown = Math.max(0, Math.ceil((this.COOLDOWN - (Date.now() - this._lastFight)) / 1000));
    const wins = Game.state.arenaWins || 0;
    const losses = Game.state.arenaLosses || 0;
    const fights = Game.state.arenaFights || 0;
    const winRate = fights > 0 ? Math.round((wins / fights) * 100) : 0;

    let html = '';

    // Arena istatistikleri
    html += '<div class="arena-stats-bar">';
    html += '<div class="arena-stat"><span class="arena-stat-val">' + wins + '</span><span class="arena-stat-label">Wins</span></div>';
    html += '<div class="arena-stat"><span class="arena-stat-val">' + losses + '</span><span class="arena-stat-label">Losses</span></div>';
    html += '<div class="arena-stat"><span class="arena-stat-val">' + winRate + '%</span><span class="arena-stat-label">Rate</span></div>';
    html += '</div>';

    if (!canFight) {
      html += '<div class="arena-cooldown">⏳ Next fight in ' + cooldown + 's</div>';
    }

    // Rakip kartlari
    html += '<div class="arena-opponents">';
    opponents.forEach((opp, i) => {
      const oppStats = this._calcOpponentStats(opp);
      const playerStats = this._calcPlayerStats();
      // Zorluk gostergesi
      const difficulty = oppStats.hp > playerStats.hp * 1.3 ? 'hard' :
                         oppStats.hp < playerStats.hp * 0.7 ? 'easy' : 'medium';
      const diffLabel = difficulty === 'hard' ? '🔴 HARD' : difficulty === 'easy' ? '🟢 EASY' : '🟡 FAIR';

      html += '<div class="arena-opp-card arena-diff-' + difficulty + '" onclick="Arena.startFight(Arena._cachedOpponents[' + i + '])">';
      html += '<div class="arena-opp-header">';
      html += '<span class="arena-opp-name">' + (opp.is_bot ? '🤖' : '👤') + ' ' + escapeHtml(opp.display_name) + '</span>';
      html += '<span class="arena-opp-diff">' + diffLabel + '</span>';
      html += '</div>';
      html += '<div class="arena-opp-info">';
      html += '<span>Lvl ' + opp.level + '</span>';
      html += '<span>⭐' + opp.prestige + '</span>';
      html += '<span>HP: ' + oppStats.hp + '</span>';
      html += '<span>DPS: ' + oppStats.dps + '</span>';
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';

    html += '<button class="arena-refresh-btn" onclick="Arena.renderPanel()">🔄 New Opponents</button>';

    container.innerHTML = html;
  },

  /* ==================== DOVUS EKRANI ==================== */
  _renderFight() {
    const container = document.getElementById('arenaContent');
    if (!container) return;

    const skin = typeof SkinSystem !== 'undefined' ? SkinSystem.getActive() : { idle: 'assets/dumb_idle.png' };

    let html = '<div class="arena-fight" id="arenaFightArea">';

    // Timer
    html += '<div class="arena-timer-bar">';
    html += '<span class="arena-timer" id="arenaTimer">⏱ ' + this._timer + 's</span>';
    html += '</div>';

    // Dovus alani
    html += '<div class="arena-fighters">';

    // Oyuncu (sol)
    html += '<div class="arena-fighter">';
    html += '<div class="arena-fighter-name" style="color:var(--gold)">' + escapeHtml(Auth.getDisplayName()) + '</div>';
    html += '<img class="arena-fighter-img" src="' + skin.idle + '" alt="You">';
    html += '<div class="arena-hp-bar" id="arenaPlayerHpBar"><div class="arena-hp-fill arena-hp-green" id="arenaPlayerHp" style="width:100%"></div></div>';
    html += '<div class="arena-hp-text" id="arenaPlayerHpText">' + this._playerHp + '/' + this._playerMaxHp + '</div>';
    html += '</div>';

    // VS
    html += '<div class="arena-vs">⚔️</div>';

    // Rakip (sag)
    html += '<div class="arena-fighter">';
    html += '<div class="arena-fighter-name" style="color:var(--red)">' + escapeHtml(this._opponent.display_name) + '</div>';
    html += '<img class="arena-fighter-img arena-opp-flip" id="arenaOppImg" src="assets/dumb_idle.png" alt="Opponent" onclick="Arena.hitOpponent()">';
    html += '<div class="arena-hp-bar"><div class="arena-hp-fill arena-hp-red" id="arenaOppHp" style="width:100%"></div></div>';
    html += '<div class="arena-hp-text" id="arenaOppHpText">' + this._oppHp + '/' + this._oppMaxHp + '</div>';
    html += '</div>';

    html += '</div>'; // .arena-fighters

    html += '<div class="arena-fight-hint">👆 TAP OPPONENT TO ATTACK!</div>';
    html += '</div>'; // .arena-fight

    container.innerHTML = html;
  },

  /* ==================== DOVUS UI GUNCELLE ==================== */
  _updateFightUI() {
    const oppHpEl = document.getElementById('arenaOppHp');
    const oppText = document.getElementById('arenaOppHpText');
    const playerHpEl = document.getElementById('arenaPlayerHp');
    const playerText = document.getElementById('arenaPlayerHpText');
    const timerEl = document.getElementById('arenaTimer');

    if (oppHpEl) oppHpEl.style.width = Math.max(0, (this._oppHp / this._oppMaxHp) * 100) + '%';
    if (oppText) oppText.textContent = Math.max(0, this._oppHp) + '/' + this._oppMaxHp;
    if (playerHpEl) playerHpEl.style.width = Math.max(0, (this._playerHp / this._playerMaxHp) * 100) + '%';
    if (playerText) playerText.textContent = Math.max(0, this._playerHp) + '/' + this._playerMaxHp;
    if (timerEl) timerEl.textContent = '⏱ ' + this._timer + 's';
  },

  /* ==================== SONUC EKRANI ==================== */
  _renderFightResult() {
    const container = document.getElementById('arenaContent');
    if (!container || !this._result) return;

    const r = this._result;
    let html = '<div class="arena-result">';

    if (r.won) {
      html += '<div class="arena-result-icon">🏆</div>';
      html += '<div class="arena-result-title" style="color:var(--gold)">VICTORY!</div>';
      html += '<div class="arena-result-vs">vs ' + escapeHtml(this._opponent.display_name) + '</div>';
      html += '<div class="arena-result-reward">+' + formatNum(r.reward) + ' coins</div>';
    } else {
      html += '<div class="arena-result-icon">💀</div>';
      html += '<div class="arena-result-title" style="color:var(--red)">DEFEATED</div>';
      html += '<div class="arena-result-vs">by ' + escapeHtml(this._opponent.display_name) + '</div>';
      html += '<div class="arena-result-sub">Train harder and try again!</div>';
    }

    html += '<div class="arena-result-btns">';
    html += '<button class="arena-btn-primary" onclick="Arena.renderPanel()">BACK TO ARENA</button>';
    html += '<button class="arena-btn-secondary" onclick="Arena.closeModal()">CLOSE</button>';
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;
  },

  /* ==================== MODAL KAPAT ==================== */
  closeModal() {
    if (this._active) {
      this._active = false;
      clearInterval(this._interval);
      clearInterval(this._oppAttackInterval);
      this._interval = null;
      this._oppAttackInterval = null;
    }
    document.getElementById('arenaModal').classList.remove('show');
  },
};
