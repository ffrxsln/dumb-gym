/* ============================================
   DUMB GYM TYCOON - Global Leaderboard (v4)
   Supabase backend + localStorage fallback
   ============================================ */

const Leaderboard = {

  // ⬇️ SUPABASE CONFIG
  SUPABASE_URL: 'https://ncvxriggroxkpsovpxxk.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jdnhyaWdncm94a3Bzb3ZweHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDMyNDcsImV4cCI6MjA4Nzg3OTI0N30.eM-WhHnFGF5YD4ZB133JgEjA2tL_HR6MGzki7H1ZbhU',

  data: [],
  lastSync: 0,
  sortBy: 'total_coins',
  loading: false,
  _submitDebounce: null,  // YENİ: Submit debounce

  /* ---- Supabase yapılandırılmış mı? ---- */
  isOnline() {
    return this.SUPABASE_URL && this.SUPABASE_KEY &&
           this.SUPABASE_URL.startsWith('https://') && this.SUPABASE_KEY.length > 10;
  },

  /* ---- Oyuncu Kaydı Oluştur ---- */
  getPlayerEntry() {
    const s = Game.state;
    return {
      user_id: Auth.getId(),
      display_name: Auth.getDisplayName().slice(0, 20), // Güvenlik: max 20 karakter
      wallet: s.walletAddr || null,
      login_method: Auth.user ? Auth.user.method : 'anonymous',
      level: clampValue(s.level, 1, 999),
      prestige: clampValue(s.prestige, 0, 999),
      prestige_mult: s.prestigeMult,
      total_coins: clampValue(s.totalCoins, 0, LIMITS.maxCoins),
      total_clicks: clampValue(s.totalClicks, 0, LIMITS.maxClicks),
      bear_kills: clampValue(s.bearKills, 0, LIMITS.maxBearKills),
      token_reward: Game.calcTokenReward(),
      updated_at: new Date().toISOString(),
    };
  },

  /* ---- Skor Gönder (debounced) ---- */
  submit() {
    // BUG FIX: Her 15sn'de 1'den fazla istek engelle
    if (this._submitDebounce) clearTimeout(this._submitDebounce);
    this._submitDebounce = setTimeout(() => this._doSubmit(), 1000);
  },

  async _doSubmit() {
    const entry = this.getPlayerEntry();

    // Her zaman yerel kaydet
    this._saveLocal(entry);

    // Supabase'e gönder
    if (this.isOnline()) {
      try {
        const res = await fetch(this.SUPABASE_URL + '/rest/v1/leaderboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.SUPABASE_KEY,
            'Authorization': 'Bearer ' + this.SUPABASE_KEY,
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify(entry),
        });
        if (!res.ok) {
          console.warn('Leaderboard submit failed:', res.status);
        }
      } catch (e) {
        // Çevrimdışı, yerel kaydedildi
        console.warn('Leaderboard submit offline');
      }
    }
  },

  /* ---- Leaderboard Getir ---- */
  async fetch() {
    if (this.loading) return;

    // Supabase: Global veri getir (15sn cache)
    if (this.isOnline() && Date.now() - this.lastSync > 15000) {
      this.loading = true;
      try {
        const col = this.sortBy;
        const res = await fetch(
          this.SUPABASE_URL + '/rest/v1/leaderboard?select=*&order=' + encodeURIComponent(col) + '.desc&limit=50',
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
          this.loading = false;
          return;
        }
      } catch (e) {
        console.warn('Leaderboard fetch failed');
      }
      this.loading = false;
    }

    // Fallback: localStorage
    this.data = this._loadLocal();
  },

  /* ---- Yerel Depolama Yedek ---- */
  _saveLocal(entry) {
    try {
      let board = JSON.parse(localStorage.getItem('dumbgym_lb') || '[]');
      if (!Array.isArray(board)) board = [];
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
      if (!Array.isArray(board)) return [];
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

    // Sort butonları
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

    // Kayıtlar
    if (this.data.length === 0) {
      html += '<div class="lb-empty"><div style="font-size:40px;margin-bottom:10px">🏋️</div>';
      html += '<div>No players yet! Start lifting!</div></div>';
    } else {
      const sorted = [...this.data].sort((a, b) => (b[this.sortBy] || 0) - (a[this.sortBy] || 0));
      sorted.forEach((entry, i) => {
        const rank = i + 1;
        const isMe = entry.user_id === myId;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '#' + rank;

        let avatar = '👤';
        if (entry.login_method === 'telegram') avatar = '📱';
        else if (entry.login_method === 'wallet' || entry.wallet) avatar = '🔗';

        // BUG FIX: XSS koruması - escapeHtml kullan
        const safeName = escapeHtml(entry.display_name || 'Anonymous');

        html += '<div class="lb-entry' + (isMe ? ' lb-me' : '') + (rank <= 3 ? ' lb-top3' : '') + '">';
        html += '<div class="lb-rank">' + medal + '</div>';
        html += '<div class="lb-info">';
        html += '<div class="lb-name">' + avatar + ' ' + safeName + (isMe ? ' (YOU)' : '') + '</div>';
        html += '<div class="lb-details">';
        html += 'Lvl ' + (entry.level || 1) + ' · ⭐' + (entry.prestige || 0) + ' · 🐻 ' + (entry.bear_kills || 0);
        if (entry.wallet) html += ' · 🔗' + entry.wallet.slice(0, 4);
        html += '</div></div>';
        html += '<div class="lb-score">' + formatNum(entry[this.sortBy] || 0) + '</div>';
        html += '</div>';
      });
    }

    // Benim sıramam
    const sorted = [...this.data].sort((a, b) => (b[this.sortBy] || 0) - (a[this.sortBy] || 0));
    const myRank = sorted.findIndex(e => e.user_id === myId) + 1;
    if (myRank > 0) {
      html += '<div class="lb-myrank">Your Rank: #' + myRank + ' of ' + sorted.length + '</div>';
    }

    // Giriş çağrısı
    if (!Auth.user) {
      html += '<div class="lb-cta">';
      html += '<div style="font-size:13px;color:#aaa;margin-bottom:8px">Login to claim your spot!</div>';
      html += '<button class="lb-connect-btn" onclick="Auth.showLogin()">👤 Login / Sign Up</button>';
      html += '</div>';
    }

    // Paylaş
    const me = this.getPlayerEntry();
    const tweet = '👑 #' + (myRank || '?') + ' on DUMB GYM TYCOON!\n\n💰 ' + formatNum(me.total_coins) +
      '\n⭐ Lvl ' + me.level + ' · Prestige ' + me.prestige +
      '\n🐻 ' + me.bear_kills + ' bears\n\nBeat me! 💪\n\nCA: ' + CA + '\n#DUMB #Solana';
    html += '<div style="text-align:center;margin-top:12px">';
    html += '<a class="share-btn" href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweet) + '" target="_blank" rel="noopener">Share Rank on 𝕏 🐦</a></div>';

    panel.innerHTML = html;
  },

  changeSort(key) {
    this.sortBy = key;
    this.lastSync = 0;
    this.render();
  },
};
