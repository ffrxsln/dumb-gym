/* ============================================
   DUMB GYM TYCOON - Global Leaderboard
   Supabase backend + localStorage fallback
   ============================================ */

const Leaderboard = {

  // ⬇️ SUPABASE CONFIG - Set these after creating your project!
  SUPABASE_URL: 'https://ncvxriggroxkpsovpxxk.supabase.co',   // e.g. 'https://abc123.supabase.co'
  SUPABASE_KEY: 'sb_publishable_SWFqmw5dLAbINWzn4Mb97Q_bYnC-xfk',   // anon/public key

  data: [],
  lastSync: 0,
  sortBy: 'total_coins',
  loading: false,

  /* ---- Check if Supabase is configured ---- */
  isOnline() {
    return this.SUPABASE_URL && this.SUPABASE_KEY;
  },

  /* ---- Build Player Entry ---- */
  getPlayerEntry() {
    const s = Game.state;
    return {
      user_id: Auth.getId(),
      display_name: Auth.getDisplayName(),
      wallet: s.walletAddr || null,
      login_method: Auth.user ? Auth.user.method : 'anonymous',
      level: s.level,
      prestige: s.prestige,
      prestige_mult: s.prestigeMult,
      total_coins: s.totalCoins,
      total_clicks: s.totalClicks,
      bear_kills: s.bearKills,
      token_reward: Game.calcTokenReward(),
      updated_at: new Date().toISOString(),
    };
  },

  /* ---- Submit Score ---- */
  async submit() {
    const entry = this.getPlayerEntry();

    // Always save locally
    this._saveLocal(entry);

    // Submit to Supabase if configured
    if (this.isOnline()) {
      try {
        await fetch(this.SUPABASE_URL + '/rest/v1/leaderboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.SUPABASE_KEY,
            'Authorization': 'Bearer ' + this.SUPABASE_KEY,
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify(entry),
        });
      } catch (e) { /* offline, local saved */ }
    }
  },

  /* ---- Fetch Leaderboard ---- */
  async fetch() {
    // Supabase: fetch global data
    if (this.isOnline() && Date.now() - this.lastSync > 15000) {
      try {
        const col = this.sortBy;
        const res = await fetch(
          this.SUPABASE_URL + '/rest/v1/leaderboard?select=*&order=' + col + '.desc&limit=50',
          {
            headers: {
              'apikey': this.SUPABASE_KEY,
              'Authorization': 'Bearer ' + this.SUPABASE_KEY,
            },
          }
        );
        if (res.ok) {
          this.data = await res.json();
          this.lastSync = Date.now();
          return;
        }
      } catch (e) { /* fallback */ }
    }

    // Fallback: localStorage
    this.data = this._loadLocal();
  },

  /* ---- Local Storage Fallback ---- */
  _saveLocal(entry) {
    try {
      let board = JSON.parse(localStorage.getItem('dumbgym_lb') || '[]');
      const idx = board.findIndex(e => e.user_id === entry.user_id);
      if (idx >= 0) board[idx] = entry;
      else board.push(entry);
      board.sort((a, b) => (b.total_coins || 0) - (a.total_coins || 0));
      board = board.slice(0, 100);
      localStorage.setItem('dumbgym_lb', JSON.stringify(board));
    } catch (e) {}
  },

  _loadLocal() {
    try {
      const board = JSON.parse(localStorage.getItem('dumbgym_lb') || '[]');
      board.sort((a, b) => (b[this.sortBy] || 0) - (a[this.sortBy] || 0));
      return board;
    } catch (e) { return []; }
  },

  /* ---- Render ---- */
  async render() {
    const panel = document.getElementById('lbPanel');
    panel.innerHTML = '<div style="text-align:center;padding:30px;color:#888">Loading...</div>';

    this.submit();
    await this.fetch();

    const myId = Auth.getId();
    let html = '';

    // Header
    html += '<div class="lb-header">';
    html += '<h3 class="lb-title">👑 GLOBAL LEADERBOARD</h3>';
    html += '<div class="lb-subtitle">' + (this.isOnline() ? '🌐 Live Global Rankings' : '📱 Local Rankings — Setup Supabase for global!') + '</div>';
    html += '</div>';

    // Sort buttons
    html += '<div class="lb-sorts">';
    [
      { key: 'total_coins', label: '💰 Coins' },
      { key: 'level', label: '📈 Level' },
      { key: 'prestige', label: '⭐ Prestige' },
      { key: 'bear_kills', label: '🐻 Bears' },
      { key: 'token_reward', label: '🪙 Tokens' },
    ].forEach(s => {
      const active = this.sortBy === s.key ? ' lb-sort-active' : '';
      html += '<button class="lb-sort-btn' + active + '" onclick="Leaderboard.changeSort(\'' + s.key + '\')">' + s.label + '</button>';
    });
    html += '</div>';

    // Entries
    if (this.data.length === 0) {
      html += '<div class="lb-empty"><div style="font-size:40px;margin-bottom:10px">🏋️</div>';
      html += '<div>No players yet! Start lifting!</div></div>';
    } else {
      const sorted = [...this.data].sort((a, b) => (b[this.sortBy] || 0) - (a[this.sortBy] || 0));
      sorted.forEach((entry, i) => {
        const rank = i + 1;
        const isMe = entry.user_id === myId;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '#' + rank;

        // Avatar based on login method
        let avatar = '👤';
        if (entry.login_method === 'telegram') avatar = '📱';
        else if (entry.login_method === 'wallet' || entry.wallet) avatar = '🔗';

        html += '<div class="lb-entry' + (isMe ? ' lb-me' : '') + (rank <= 3 ? ' lb-top3' : '') + '">';
        html += '<div class="lb-rank">' + medal + '</div>';
        html += '<div class="lb-info">';
        html += '<div class="lb-name">' + avatar + ' ' + (entry.display_name || 'Anonymous') + (isMe ? ' (YOU)' : '') + '</div>';
        html += '<div class="lb-details">';
        html += 'Lvl ' + entry.level + ' · ⭐' + entry.prestige + ' · 🐻 ' + (entry.bear_kills || 0);
        if (entry.wallet) html += ' · 🔗' + entry.wallet.slice(0, 4);
        html += '</div></div>';
        html += '<div class="lb-score">' + formatNum(entry[this.sortBy] || 0) + '</div>';
        html += '</div>';
      });
    }

    // My rank
    const sorted = [...this.data].sort((a, b) => (b[this.sortBy] || 0) - (a[this.sortBy] || 0));
    const myRank = sorted.findIndex(e => e.user_id === myId) + 1;
    if (myRank > 0) {
      html += '<div class="lb-myrank">Your Rank: #' + myRank + ' of ' + sorted.length + '</div>';
    }

    // Login CTA
    if (!Auth.user) {
      html += '<div class="lb-cta">';
      html += '<div style="font-size:13px;color:#aaa;margin-bottom:8px">Login to claim your spot!</div>';
      html += '<button class="lb-connect-btn" onclick="Auth.showLogin()">👤 Login / Sign Up</button>';
      html += '</div>';
    }

    // Share
    const me = this.getPlayerEntry();
    const tweet = '👑 #' + (myRank || '?') + ' on DUMB GYM TYCOON!\n\n💰 ' + formatNum(me.total_coins) +
      '\n⭐ Lvl ' + me.level + ' · Prestige ' + me.prestige +
      '\n🐻 ' + me.bear_kills + ' bears\n\nBeat me! 💪\n\nCA: ' + CA + '\n#DUMB #Solana';
    html += '<div style="text-align:center;margin-top:12px">';
    html += '<a class="share-btn" href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweet) + '" target="_blank">Share Rank on 𝕏 🐦</a></div>';

    panel.innerHTML = html;
  },

  changeSort(key) {
    this.sortBy = key;
    this.lastSync = 0; // Force refetch
    this.render();
  },
};
