/* ============================================
   DUMB GYM TYCOON - Cloud Save System (v4.3)
   Supabase üzerinden save/load
   ============================================ */

const CloudSave = {

  _debounce: null,
  _saving: false,
  _lastCloud: 0,
  SYNC_INTERVAL: 30000, // 30 saniye

  /* ---- Supabase bağlantı bilgileri (Leaderboard ile aynı) ---- */
  _url() { return Leaderboard.SUPABASE_URL; },
  _key() { return Leaderboard.SUPABASE_KEY; },
  _headers() {
    return {
      'Content-Type': 'application/json',
      'apikey': this._key(),
      'Authorization': 'Bearer ' + this._key(),
      'Prefer': 'resolution=merge-duplicates',
    };
  },

  /* ---- Cloud'a kaydet (debounced) ---- */
  save() {
    if (!Auth.user || !Leaderboard.isOnline()) return;
    if (this._debounce) clearTimeout(this._debounce);
    this._debounce = setTimeout(() => this._doSave(), 5000);
  },

  /* ---- Gerçek kayıt ---- */
  async _doSave() {
    if (this._saving || !Auth.user) return;
    this._saving = true;

    try {
      const userId = Auth.getId();
      // Kaydetmeyeceğimiz geçici alanları temizle
      const saveData = { ...Game.state };
      delete saveData.comboCount;
      delete saveData.comboTime;

      const payload = {
        user_id: userId,
        display_name: Auth.getDisplayName().slice(0, 20),
        login_method: Auth.user.method,
        save_data: saveData,
        save_version: SAVE_VERSION,
        updated_at: new Date().toISOString(),
      };

      const res = await fetch(this._url() + '/rest/v1/game_saves', {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        this._lastCloud = Date.now();
      }
    } catch (e) {
      console.warn('Cloud save hata:', e.message);
    }

    this._saving = false;
  },

  /* ---- Cloud'dan yükle ---- */
  async load(userId) {
    if (!userId || !Leaderboard.isOnline()) return null;

    try {
      const res = await fetch(
        this._url() + '/rest/v1/game_saves?user_id=eq.' + encodeURIComponent(userId) + '&select=save_data,save_version,updated_at&limit=1',
        { headers: { 'apikey': this._key(), 'Authorization': 'Bearer ' + this._key() } }
      );

      if (!res.ok) return null;

      const rows = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) return null;

      const row = rows[0];
      if (!row.save_data) return null;

      return {
        data: row.save_data,
        version: row.save_version || 4,
        updatedAt: row.updated_at,
      };
    } catch (e) {
      console.warn('Cloud load hata:', e.message);
      return null;
    }
  },

  /* ---- Cloud ve local save'i karşılaştır, en iyisini seç ---- */
  async syncOnLogin() {
    if (!Auth.user) return;

    // FIX: Sync sırasında game tick'leri duraklat — race condition önleme
    Game._syncLock = true;

    try {
      const userId = Auth.getId();
      const cloud = await this.load(userId);

      if (!cloud || !cloud.data) {
        // Cloud'da save yok — mevcut local'i cloud'a yükle
        this._doSave();
        return;
      }

      const localSave = Game.state;
      const cloudData = cloud.data;

      // Hangisi daha ileri? totalCoins + prestige + level karşılaştır
      const localScore = (localSave.totalCoins || 0) + (localSave.prestige || 0) * 1e9 + (localSave.level || 1) * 1e6;
      const cloudScore = (cloudData.totalCoins || 0) + (cloudData.prestige || 0) * 1e9 + (cloudData.level || 1) * 1e6;

      if (cloudScore > localScore) {
        // Cloud daha ileri — cloud'u yükle
        const defaults = Game._defaultState();
        Object.keys(defaults).forEach(key => {
          if (cloudData[key] !== undefined) {
            Game.state[key] = cloudData[key];
          }
        });

        // User bilgilerini güncelle
        Game.state.userId = userId;
        Game.state.userName = Auth.getDisplayName();

        Game.calcStats();
        Game._dirty = true;
        Game.save();
        UI.updateStats();
        if (UI.currentTab === 'shop') UI.renderShop();

        UI.toast('☁️ Cloud save yüklendi!');
      } else {
        // Local daha ileri — cloud'u güncelle
        this._doSave();
      }
    } catch (e) {
      console.warn('syncOnLogin hata:', e.message);
    } finally {
      // FIX: Her durumda sync lock'u kaldır
      Game._syncLock = false;
    }
  },

  /* ---- Eski user_id'nin verilerini yeni user_id'ye taşı ---- */
  async migrate(oldUserId, newUserId) {
    if (!oldUserId || !newUserId || oldUserId === newUserId) return;
    if (!Leaderboard.isOnline()) return;

    try {
      // Eski save'i oku
      const oldSave = await this.load(oldUserId);
      if (!oldSave || !oldSave.data) return;

      // Yeni user_id ile kaydet
      const payload = {
        user_id: newUserId,
        display_name: Auth.getDisplayName().slice(0, 20),
        login_method: Auth.user ? Auth.user.method : 'unknown',
        save_data: oldSave.data,
        save_version: oldSave.version,
        updated_at: new Date().toISOString(),
      };

      await fetch(this._url() + '/rest/v1/game_saves', {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify(payload),
      });

      // Eski leaderboard kaydını da temizle
      await fetch(
        this._url() + '/rest/v1/leaderboard?user_id=eq.' + encodeURIComponent(oldUserId),
        { method: 'DELETE', headers: { 'apikey': this._key(), 'Authorization': 'Bearer ' + this._key() } }
      );

      // Eski save'i temizle
      await fetch(
        this._url() + '/rest/v1/game_saves?user_id=eq.' + encodeURIComponent(oldUserId),
        { method: 'DELETE', headers: { 'apikey': this._key(), 'Authorization': 'Bearer ' + this._key() } }
      );

    } catch (e) {
      console.warn('Migration hata:', e.message);
    }
  },
};