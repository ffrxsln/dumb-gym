/* ============================================
   DUMB GYM TYCOON - Global Leaderboard
   localStorage + API backend support
   ============================================ */

const Leaderboard = {

  // API endpoint (set your backend URL here)
  // Options: Supabase, Firebase, Cloudflare Worker, or custom API
  API_URL: '', // Leave empty for localStorage-only mode

  data: [],
  lastSync: 0,
  sortBy: 'totalCoins', // Default sort

  /* ---- Get Player Entry ---- */
  getPlayerEntry() {
    const s = Game.state;
    const addr = s.walletAddr || '';
    return {
      id: addr || 'local_' + s.startTime,
      wallet: addr,
      name: addr ? addr.slice(0, 4) + '...' + addr.slice(-4) : 'Anonymous',
      level: s.level,
      prestige: s.prestige,
      totalCoins: s.totalCoins,
      bearKills: s.bearKills,
      totalClicks: s.totalClicks,
      tokenReward: Game.calcTokenReward(),
      prestigeMult: s.prestigeMult,
      timestamp: Date.now(),
    };
  },

  /* ---- Submit Score ---- */
  async submit() {
    const entry = this.getPlayerEntry();

    // Always save locally
    this._saveLocal(entry);

    // Try API if configured
    if (this.API_URL) {
      try {
        await fetch(this.API_URL + '/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
      } catch (e) { /* API unavailable, local only */ }
    }
  },

  /* ---- Fetch Leaderboard ---- */
  async fetch() {
    // Try API first
    if (this.API_URL && Date.now() - this.lastSync > 30000) {
      try {
        const res = await fetch(this.API_URL + '/leaderboard?sort=' + this.sortBy + '&limit=50');
        if (res.ok) {
          this.data = await res.json();
          this.lastSync = Date.now();
          return;
        }
      } catch (e) { /* fallback to local */ }
    }

    // Fallback: localStorage
    this.data = this._loadLocal();
  },

  /* ---- Local Storage ---- */
  _saveLocal(entry) {
    try {
      let board = JSON.parse(localStorage.getItem('dumbgym_lb') || '[]');

      // Update or add
      const idx = board.findIndex(e => e.id === entry.id);
      if (idx >= 0) {
        board[idx] = entry;
      } else {
        board.push(entry);
      }

      // Keep top 100
      board.sort((a, b) => b.totalCoins - a.totalCoins);
      board = board.slice(0, 100);
      localStorage.setItem('dumbgym_lb', JSON.stringify(board));
    } catch (e) { /* storage full */ }
  },

  _loadLocal() {
    try {
      const board = JSON.parse(localStorage.getItem('dumbgym_lb') || '[]');
      // Sort by current criteria
      board.sort((a, b) => (b[this.sortBy] || 0) - (a[this.sortBy] || 0));
      return board;
    } catch (e) { return []; }
  },

  /* ---- Render Leaderboard ---- */
  async render() {
    const panel = document.getElementById('lbPanel');

    // Submit current score
    this.submit();

    // Show loading
    panel.innerHTML = '<div style="text-align:center;padding:20px;color:#888">Loading leaderboard...</div>';

    await this.fetch();

    const myId = this.getPlayerEntry().id;
    let html = '';

    // Header
    html += '<div class="lb-header">';
    html += '<h3 class="lb-title">👑 GLOBAL LEADERBOARD</h3>';
    html += '<div class="lb-subtitle">' + (this.API_URL ? '🌐 Global Rankings' : '📱 Local Rankings') + '</div>';
    html += '</div>';

    // Sort buttons
    html += '<div class="lb-sorts">';
    const sorts = [
      { key: 'totalCoins', label: '💰 Coins' },
      { key: 'level', label: '📈 Level' },
      { key: 'prestige', label: '⭐ Prestige' },
      { key: 'bearKills', label: '🐻 Bears' },
      { key: 'tokenReward', label: '🪙 Tokens' },
    ];
    sorts.forEach(s => {
      const active = this.sortBy === s.key ? ' lb-sort-active' : '';
      html += '<button class="lb-sort-btn' + active + '" onclick="Leaderboard.changeSort(\'' + s.key + '\')">' + s.label + '</button>';
    });
    html += '</div>';

    // Player entries
    if (this.data.length === 0) {
      html += '<div class="lb-empty">';
      html += '<div style="font-size:40px;margin-bottom:10px">🏋️</div>';
      html += '<div>No players yet!</div>';
      html += '<div style="font-size:12px;color:#666;margin-top:5px">Connect wallet & play to get on the board</div>';
      html += '</div>';
    } else {
      // Re-sort by current criteria
      const sorted = [...this.data].sort((a, b) => (b[this.sortBy] || 0) - (a[this.sortBy] || 0));

      sorted.forEach((entry, i) => {
        const rank = i + 1;
        const isMe = entry.id === myId;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '#' + rank;

        html += '<div class="lb-entry' + (isMe ? ' lb-me' : '') + (rank <= 3 ? ' lb-top3' : '') + '">';

        // Rank
        html += '<div class="lb-rank">' + medal + '</div>';

        // Player info
        html += '<div class="lb-info">';
        html += '<div class="lb-name">' + (entry.wallet ? '🔗 ' : '👤 ') + entry.name + (isMe ? ' (YOU)' : '') + '</div>';
        html += '<div class="lb-details">';
        html += 'Lvl ' + entry.level + ' · ⭐' + entry.prestige + ' · 🐻 ' + entry.bearKills;
        html += '</div></div>';

        // Score
        const score = entry[this.sortBy] || 0;
        html += '<div class="lb-score">' + formatNum(score) + '</div>';

        html += '</div>';
      });
    }

    // My position
    const sorted = [...this.data].sort((a, b) => (b[this.sortBy] || 0) - (a[this.sortBy] || 0));
    const myRank = sorted.findIndex(e => e.id === myId) + 1;
    if (myRank > 0) {
      html += '<div class="lb-myrank">Your Rank: #' + myRank + ' of ' + sorted.length + '</div>';
    }

    // Connect wallet CTA
    if (!Game.state.walletAddr) {
      html += '<div class="lb-cta">';
      html += '<div style="font-size:13px;color:#aaa;margin-bottom:8px">🔗 Connect wallet to claim your spot!</div>';
      html += '<button class="lb-connect-btn" onclick="Wallet.connect()">Connect Wallet</button>';
      html += '</div>';
    }

    // Share
    const me = this.getPlayerEntry();
    const tweet = '👑 I\'m ranked #' + myRank + ' on DUMB GYM TYCOON!\n\n💰 ' + formatNum(me.totalCoins) +
      ' coins\n⭐ Level ' + me.level + ' · Prestige ' + me.prestige +
      '\n🐻 ' + me.bearKills + ' bears killed\n\nCan you beat me?\n\nCA: ' + CA + '\n#DUMB #Solana';
    html += '<div style="text-align:center;margin-top:12px">';
    html += '<a class="share-btn" href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweet) + '" target="_blank">Share Rank on 𝕏 🐦</a></div>';

    panel.innerHTML = html;
  },

  /* ---- Change Sort ---- */
  changeSort(key) {
    this.sortBy = key;
    this.render();
  },
};
