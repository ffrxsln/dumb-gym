/* ============================================
   DUMB GYM TYCOON - Global Leaderboard (v4.2)
   Supabase backend + düzeltilmiş UI
   ============================================ */

const Leaderboard = {

    SUPABASE_URL: 'https://ncvxriggroxkpsovpxxk.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jdnhyaWdncm94a3Bzb3ZweHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDMyNDcsImV4cCI6MjA4Nzg3OTI0N30.eM-WhHnFGF5YD4ZB133JgEjA2tL_HR6MGzki7H1ZbhU',

    data: [],
    lastSync: 0,
    sortBy: 'level',
    loading: false,
    _submitDebounce: null,
    _online: null,
    _lastError: '',
    _failCount: 0,

    isOnline() {
        if (!this.SUPABASE_URL || !this.SUPABASE_KEY) return false;
        if (!this.SUPABASE_URL.startsWith('https://')) return false;
        const keyParts = this.SUPABASE_KEY.split('.');
        if (keyParts.length !== 3) return false;
        if (this._failCount >= 5) return false;
        return true;
    },

    async testConnection() {
        if (this._online !== null) return this._online;
        if (!this.isOnline()) { this._online = false; return false; }
        try {
            const res = await fetch(
                this.SUPABASE_URL + '/rest/v1/leaderboard?select=user_id&limit=1', { headers: { 'apikey': this.SUPABASE_KEY, 'Authorization': 'Bearer ' + this.SUPABASE_KEY } }
            );
            this._online = res.ok;
            if (!res.ok) this._lastError = 'HTTP ' + res.status;
            return this._online;
        } catch (e) {
            this._online = false;
            this._lastError = e.message;
            return false;
        }
    },

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
                if (res.ok) this._failCount = 0;
                else this._failCount++;
            } catch (e) { this._failCount++; }
        }
    },

    async fetch() {
        if (this.loading) return;
        if (this.isOnline() && Date.now() - this.lastSync > 15000) {
            this.loading = true;
            try {
                const col = this.sortBy;
                const res = await fetch(
                    this.SUPABASE_URL + '/rest/v1/leaderboard?select=*&order=' + encodeURIComponent(col) + '.desc&limit=50', { headers: { 'apikey': this.SUPABASE_KEY, 'Authorization': 'Bearer ' + this.SUPABASE_KEY } }
                );
                if (res.ok) {
                    const json = await res.json();
                    if (Array.isArray(json)) {
                        this.data = json;
                        this.lastSync = Date.now();
                        this._failCount = 0;
                        this.loading = false;
                        const myId = Auth.getId();
                        if (!this.data.find(e => e.user_id === myId)) {
                            this.data.push(this.getPlayerEntry());
                        }
                        return;
                    }
                } else { this._failCount++; }
            } catch (e) { this._failCount++; }
            this.loading = false;
        }
        this.data = this._loadLocal();
    },

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

    async render() {
        const panel = document.getElementById('lbPanel');
        panel.innerHTML = '<div style="text-align:center;padding:30px;color:#888">Loading...</div>';

        await this._doSubmit();
        await this.fetch();

        const myId = Auth.getId();
        let html = '';

        // Header — subtitle yok
        html += '<div class="lb-header">';
        html += '<h3 class="lb-title">👑 GLOBAL LEADERBOARD</h3>';
        html += '</div>';

        // Sort — sadece Level ve Prestige
        html += '<div class="lb-sorts">';
        [
            { key: 'level', label: '📈 Level' },
            { key: 'prestige', label: '⭐ Prestige' },
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
            html += '<div class="lb-list">';
            sorted.forEach((entry, i) => {
                const rank = i + 1;
                const isMe = entry.user_id === myId;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '#' + rank;

                let avatar = '👤';
                if (entry.login_method === 'telegram') avatar = '📱';
                else if (entry.login_method === 'wallet' || entry.wallet) avatar = '🔗';

                const safeName = escapeHtml(entry.display_name || 'Anonymous');
                const scoreVal = entry[this.sortBy] || 0;
                const scoreLabel = this.sortBy === 'level' ? ('Lvl ' + scoreVal) : ('⭐ ' + scoreVal);

                html += '<div class="lb-entry' + (isMe ? ' lb-me' : '') + (rank <= 3 ? ' lb-top3' : '') + '">';
                html += '<div class="lb-rank">' + medal + '</div>';
                html += '<div class="lb-info">';
                html += '<div class="lb-name">' + avatar + ' ' + safeName + (isMe ? ' <span style="color:#FFD700;font-size:11px">(YOU)</span>' : '') + '</div>';
                html += '<div class="lb-details">';
                html += 'Lvl ' + (entry.level || 1) + ' · ⭐' + (entry.prestige || 0) + ' · 🐻 ' + (entry.bear_kills || 0);
                html += '</div></div>';
                html += '<div class="lb-score">' + scoreLabel + '</div>';
                html += '</div>';
            });
            html += '</div>';
        }

        // Sıralama
        const myRank = sorted.findIndex(e => e.user_id === myId) + 1;
        if (myRank > 0) {
            html += '<div class="lb-myrank">YOUR RANK: #' + myRank + ' OF ' + sorted.length + '</div>';
        }

        // Giriş
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