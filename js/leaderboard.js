/* ============================================
   DUMB GYM TYCOON - Global Leaderboard (v4.1)
   Supabase backend + doğru hata yönetimi
   ============================================ */

const Leaderboard = {

  // ⬇️ SUPABASE CONFIG
  // ÖNEMLİ: Supabase Dashboard → Settings → API → anon public key
  // Key "eyJ..." ile başlamalı (JWT token formatı)
  // "sb_publishable_" formatı ÇALIŞMAZ!
  SUPABASE_URL: 'https://ncvxriggroxkpsovpxxk.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jdnhyaWdncm94a3Bzb3ZweHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDMyNDcsImV4cCI6MjA4Nzg3OTI0N30.eM-WhHnFGF5YD4ZB133JgEjA2tL_HR6MGzki7H1ZbhU',

  data: [],
  lastSync: 0,
  sortBy: 'total_coins',
  loading: false,
  _submitDebounce: null,
  _online: null,           // null = bilinmiyor, true/false = test edildi
  _lastError: '',          // Son hata mesajı (debug için)
  _failCount: 0,           // Ardışık fail sayısı

  /* ---- Supabase yapılandırılmış ve erişilebilir mi? ---- */
  isOnline() {
    if (!this.SUPABASE_URL || !this.SUPABASE_KEY) return false;
    if (!this.SUPABASE_URL.startsWith('https://')) return false;

    // Key format kontrolü: Supabase anon key JWT olmalı (3 parça, nokta ile ayrılmış)
    const keyParts = this.SUPABASE_KEY.split('.');
    if (keyParts.length !== 3) {
      if (this._lastError !== 'invalid_key_format') {
        console.error(
          '❌ [Leaderboard] Supabase key formatı yanlış!\n' +
          'Mevcut: "' + this.SUPABASE_KEY.slice(0, 20) + '..."\n' +
          'Olması gereken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ..." (JWT formatı)\n' +
          '→ Supabase Dashboard → Settings → API → "anon public" key kopyalayın.'
        );
        this._lastError = 'invalid_key_format';
      }
      return false;
    }

    // Çok fazla ardışık fail varsa geçici offline (backoff)
    if (this._failCount >= 5) return false;

    return true;
  },

  /* ---- Bağlantı durumunu test et (ilk açılışta 1 kez) ---- */
  async testConnection() {
    if (this._online !== null) return this._online;
    if (!this.isOnline()) { this._online = false; return false; }

    try {
      const res = await fetch(
        this.SUPABASE_URL + '/rest/v1/leaderboard?select=user_id&limit=1',
        { headers: { 'apikey': this.SUPABASE_KEY, 'Authorization': 'Bearer ' + this.SUPABASE_KEY } }
      );
      if (res.ok) {
        this._online = true;
        this._failCount = 0;
        console.log('✅ [Leaderboard] Supabase bağlantısı başarılı');
        return true;
      } else {
        this._online = false;
        this._lastError = 'HTTP ' + res.status;
        console.error('❌ [Leaderboard] HTTP ' + res.status +
          (res.status === 401 ? ' → API key yanlış' : '') +
          (res.status === 404 ? ' → leaderboard tablosu yok' : '') +
          (res.status === 403 ? ' → RLS policy hatası' : ''));
        return false;
      }
    } catch (e) {
      this._online = false;
      this._lastError = e.message;
      return false;
    }
  },

  /* ---- Oyuncu Kaydı Oluştur ---- */
  getPlayerEntry() {
    const s = Game.state;
    return {
      user_id: Auth.getId(),
      display_name: escapeHtml(Auth.getDisplayName()).slice(0, 20),
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
    if (this._submitDebounce) clearTimeout(this._submitDebounce);
    this._submitDebounce = setTimeout(() => this._doSubmit(), 2000);
  },

  async _doSubmit() {
    const entry = this.getPlayerEntry();
    this._saveLocal(entry);

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
        if (res.ok) {
          this._failCount = 0;
        } else {
          this._failCount++;
          console.warn('[Leaderboard] Submit HTTP ' + res.status);
        }
      } catch (e) {
        this._failCount++;
      }
    }
  },

  /* ---- Leaderboard Getir ---- */
  async fetch() {
    if (this.loading) return;

    if (this.isOnline() && Date.now() - this.lastSync > 15000) {
      this.loading = true;
      try {
        const col = this.sortBy;
        const res = await fetch(
          this.SUPABASE_URL + '/rest/v1/leaderboard?select=*&order=' + encodeURIComponent(col) + '.desc&limit=50',
          { headers: { 'apikey': this.SUPABASE_KEY, 'Authorization': 'Bearer ' + this.SUPABASE_KEY } }
        );
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json)) {
            this.data = json;
            this.lastSync = Date.now();
            this._failCount = 0;
            this.loading = false;

            // Kendi verimi ekle (henüz listede yoksa)
            const myId = Auth.getId();
            if (!this.data.find(e => e.user_id === myId)) {
              this.data.push(this.getPlayerEntry());
            }
            return;
          }
        } else {
          this._failCount++;
        }
      } catch (e) {
        this._failCount++;
      }
      this.loading = false;
    }

    // Fallback: localStorage
    this.data = this._loadLocal();
  },

  /* ---- Yerel Depolama ---- */
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
      if (!Array.isArray(board)) return [this.getPlayerEntry()];
      const myId = Auth.getId();
      const myIdx = board.findIndex(e => e.user_id === myId);
      const myEntry = this.getPlayerEntry();
      if (myIdx >= 0) board[myIdx] = myEntry;
      else board.push(myEntry);
      board.sort((a, b) => (b[this.sortBy] || 0) - (a[this.sortBy] || 0));
      return board;
    } catch (e) { return [this.getPlayerEntry()]; }
  },

  /* ---- Durum Metni ---- */
  _getStatusText() {
    if (!this.SUPABASE_URL || !this.SUPABASE_KEY) {
      return { icon: '⚠️', text: 'Supabase yapılandırılmamış — sadece yerel sıralama', color: '#FF8800' };
    }
    if (this.SUPABASE_KEY.split('.').length !== 3) {
      return { icon: '❌', text: 'API key formatı yanlış! JWT key gerekli (eyJ...)', color: '#FF4444' };
    }
    if (this._failCount >= 5) {
      return { icon: '⏳', text: 'Bağlantı sorunu — geçici yerel mod (' + this._failCount + ' hata)', color: '#FF8800' };
    }
    if (this._online === true && this._failCount === 0) {
      return { icon: '🌐', text: 'Canlı Global Sıralama', color: '#00FF66' };
    }
    if (this._online === false) {
      return { icon: '❌', text: 'Bağlantı hatası: ' + this._lastError, color: '#FF4444' };
    }
    return { icon: '🔄', text: 'Bağlantı kontrol ediliyor...', color: '#888' };
  },

  /* ---- Render ---- */
  async render() {
    const panel = document.getElementById('lbPanel');
    panel.innerHTML = '<div style="text-align:center;padding:30px;color:#888">Loading...</div>';

    // FIX: Önce submit, sonra fetch (sıralı — race condition çözüldü)
    await this._doSubmit();
    await this.fetch();

    const myId = Auth.getId();
    const status = this._getStatusText();
    let html = '';

    // Header
    html += '<div class="lb-header">';
    html += '<h3 class="lb-title">👑 GLOBAL LEADERBOARD</h3>';
    html += '<div class="lb-subtitle" style="color:' + status.color + '">' + status.icon + ' ' + escapeHtml(status.text) + '</div>';
    html += '</div>';

    // Hata/uyarı kutusu (sadece sorun varsa)
    if (this._failCount > 0 || this._online === false || !this.SUPABASE_URL || !this.SUPABASE_KEY || this.SUPABASE_KEY.split('.').length !== 3) {
      html += '<div style="background:#1a0a0a;border:1px solid #FF444433;border-radius:8px;padding:8px 12px;margin-bottom:8px">';
      html += '<div style="font-size:10px;color:#FF8888">';
      if (!this.SUPABASE_URL || !this.SUPABASE_KEY) {
        html += '💡 Global sıralama için <b>leaderboard.js</b> içindeki SUPABASE_URL ve SUPABASE_KEY değerlerini doldurun.';
      } else if (this.SUPABASE_KEY.split('.').length !== 3) {
        html += '💡 API key formatı yanlış. Supabase Dashboard → Settings → API → <b>"anon public"</b> key kopyalayın. Key <b>"eyJ..."</b> ile başlamalı.';
      } else {
        html += '💡 Bağlantı hatası (' + this._failCount + '). Son hata: ' + escapeHtml(this._lastError);
      }
      html += '</div></div>';
    }

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
    const sorted = [...this.data].sort((a, b) => (b[this.sortBy] || 0) - (a[this.sortBy] || 0));

    if (sorted.length === 0) {
      html += '<div class="lb-empty"><div style="font-size:40px;margin-bottom:10px">🏋️</div>';
      html += '<div>No players yet! Start lifting!</div></div>';
    } else {
      sorted.forEach((entry, i) => {
        const rank = i + 1;
        const isMe = entry.user_id === myId;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '#' + rank;

        let avatar = '👤';
        if (entry.login_method === 'telegram') avatar = '📱';
        else if (entry.login_method === 'wallet' || entry.wallet) avatar = '🔗';

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
