/* ============================================
   DUMB GYM TYCOON - Auth & User System (v4.3)
   Sabit user ID + cloud save entegrasyonu
   ============================================ */

const AUTH_ID_KEY = 'dumbgym_uid';

const Auth = {

  user: null,

  /* ---- Başlat ---- */
  init() {
    // 1. Telegram kullanıcısı
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
      const oldId = Game.state.userId;
      this.user = {
        id: 'tg_' + tgUser.id,
        name: escapeHtml((tgUser.first_name || '') + (tgUser.last_name ? ' ' + tgUser.last_name.charAt(0) + '.' : '')),
        username: tgUser.username ? '@' + escapeHtml(tgUser.username) : '',
        avatar: '📱',
        method: 'telegram',
        tgId: tgUser.id,
      };
      this._setStoredUid(this.user.id);
      Game.state.userId = this.user.id;
      Game.state.userName = this.user.name;
      this._updateUI();
      if (oldId && oldId !== this.user.id && !oldId.startsWith('tg_')) {
        CloudSave.migrate(oldId, this.user.id);
      }
      CloudSave.syncOnLogin();
      return;
    }

    // 2. Kaydedilmiş kullanıcı
    const saved = Game.state.userId;
    if (saved && Game.state.userName) {
      const method = saved.startsWith('tg_') ? 'telegram' : saved.startsWith('w_') ? 'wallet' : 'username';
      this.user = {
        id: saved,
        name: Game.state.userName,
        username: '',
        avatar: method === 'telegram' ? '📱' : method === 'wallet' ? '🔗' : '👤',
        method: method,
      };
      this._updateUI();
      CloudSave.syncOnLogin();
      return;
    }
  },

  /* ---- Sabit ID yönetimi ---- */
  _getStoredUid() {
    try { return localStorage.getItem(AUTH_ID_KEY); } catch (e) { return null; }
  },
  _setStoredUid(uid) {
    try { localStorage.setItem(AUTH_ID_KEY, uid); } catch (e) {}
  },

  /* ---- Kullanıcı adı ile giriş ---- */
  loginUsername() {
    const input = document.getElementById('usernameInput');
    if (!input) return;
    let name = input.value.trim();

    if (name.length < 2 || name.length > 20) {
      UI.toast('❌ Name must be 2-20 characters');
      return;
    }
    name = name.replace(/[<>"'&]/g, '');
    if (name.length < 2) {
      UI.toast('❌ Invalid characters in name');
      return;
    }

    // Sabit ID — varsa tekrar kullan, yoksa yeni üret
    let uid = this._getStoredUid();
    if (!uid || uid.startsWith('tg_') || uid.startsWith('w_')) {
      uid = 'u_' + name.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Math.random().toString(36).slice(2, 8);
      this._setStoredUid(uid);
    }

    const oldId = Game.state.userId;

    this.user = {
      id: uid,
      name: name,
      username: '',
      avatar: '👤',
      method: 'username',
    };

    Game.state.userId = uid;
    Game.state.userName = name;
    Game.save();

    this._updateUI();
    SFX.notify();
    UI.toast('✅ Welcome, ' + escapeHtml(name) + '!');
    document.getElementById('loginModal').classList.remove('show');

    if (oldId && oldId !== uid && oldId !== '') {
      CloudSave.migrate(oldId, uid);
    }
    CloudSave.syncOnLogin();
    Leaderboard.submit();
  },

  /* ---- Wallet ile giriş ---- */
  loginWallet(addr) {
    if (!addr || addr.length < 32 || addr.length > 44) return;

    const oldId = Game.state.userId;
    const uid = 'w_' + addr;

    this.user = {
      id: uid,
      name: addr.slice(0, 4) + '...' + addr.slice(-4),
      username: '',
      avatar: '🔗',
      method: 'wallet',
    };

    Game.state.userId = uid;
    Game.state.userName = this.user.name;
    Game.state.walletAddr = addr;
    this._setStoredUid(uid);
    Game.save();
    this._updateUI();

    if (oldId && oldId !== uid && oldId !== '') {
      CloudSave.migrate(oldId, uid);
    }
    CloudSave.syncOnLogin();
    Leaderboard.submit();
  },

  /* ---- Login Modal ---- */
  showLogin() {
    const modal = document.getElementById('loginModal');
    modal.classList.add('show');
    setTimeout(() => {
      const inp = document.getElementById('usernameInput');
      if (inp) inp.focus();
    }, 100);
  },

  /* ---- Header UI ---- */
  _updateUI() {
    const btn = document.getElementById('walletBtn');
    if (this.user) {
      btn.textContent = this.user.avatar + ' ' + this.user.name;
      btn.classList.add('connected');
      btn.onclick = () => Auth.showProfile();
    }
  },

  /* ---- Profil ---- */
  showProfile() {
    const msg = document.getElementById('walletMsg');
    const u = this.user;
    // FIX: Tüm alanları escape et — sadece name değil
    const safeName = escapeHtml(u.name);
    const safeUsername = u.username ? escapeHtml(u.username) : '';
    const safeMethod = escapeHtml(u.method);
    const safeId = escapeHtml(u.id).slice(0, 24);
    msg.innerHTML =
      '<div style="text-align:center">' +
      '<div style="font-size:40px;margin-bottom:8px">' + escapeHtml(u.avatar) + '</div>' +
      '<div style="font-size:20px;font-weight:900;color:var(--gold)">' + safeName + '</div>' +
      (safeUsername ? '<div style="font-size:12px;color:#888">' + safeUsername + '</div>' : '') +
      '<div style="font-size:11px;color:#555;margin-top:4px">Login: ' + safeMethod + '</div>' +
      '<div style="font-size:10px;color:#444;margin-top:2px">ID: ' + safeId + '</div>' +
      (Game.state.walletAddr ? '<div style="font-size:11px;color:var(--green);margin-top:4px">🔗 ' + escapeHtml(Game.state.walletAddr.slice(0,6)) + '...' + escapeHtml(Game.state.walletAddr.slice(-4)) + '</div>' : '') +
      '<div style="font-size:10px;color:#336633;margin-top:6px">☁️ Cloud save: ' + (Leaderboard.isOnline() ? 'Active' : 'Offline') + '</div>' +
      '<div style="margin-top:12px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">' +
      (!Game.state.walletAddr ? '<button onclick="document.getElementById(\'walletModal\').classList.remove(\'show\');Wallet.connect()" style="font-size:12px;padding:6px 14px;border:1px solid var(--purple);background:transparent;color:var(--purple);cursor:pointer;border-radius:6px">Link Wallet</button>' : '') +
      '<button onclick="Auth.forceCloudSync()" style="font-size:12px;padding:6px 14px;border:1px solid #336633;background:transparent;color:#44AA44;cursor:pointer;border-radius:6px">☁️ Sync</button>' +
      '<button onclick="Auth.logout()" style="font-size:12px;padding:6px 14px;border:1px solid #FF4444;background:transparent;color:#FF4444;cursor:pointer;border-radius:6px">Logout</button>' +
      '</div></div>';
    document.getElementById('walletModal').classList.add('show');
  },

  /* ---- Manuel sync ---- */
  forceCloudSync() {
    if (!this.user) return;
    CloudSave._doSave();
    UI.toast('☁️ Synced!');
  },

  /* ---- Çıkış ---- */
  logout() {
    if (this.user) CloudSave._doSave();
    this.user = null;
    Game.state.userId = '';
    Game.state.userName = '';
    // NOT: localStorage'daki AUTH_ID_KEY silinMEZ — tekrar girişte aynı ID kullanılır
    Game.save();
    const btn = document.getElementById('walletBtn');
    btn.textContent = '👤 Login';
    btn.classList.remove('connected');
    btn.onclick = () => Auth.showLogin();
    document.getElementById('walletModal').classList.remove('show');
    UI.toast('Logged out');
  },

  /* ---- Helpers ---- */
  getDisplayName() {
    if (this.user) return this.user.name;
    if (Game.state.walletAddr) return Game.state.walletAddr.slice(0,4) + '...' + Game.state.walletAddr.slice(-4);
    return 'Anonymous';
  },

  getId() {
    if (this.user) return this.user.id;
    if (Game.state.walletAddr) return 'w_' + Game.state.walletAddr;
    const stored = this._getStoredUid();
    if (stored) return stored;
    return 'anon_' + Game.state.startTime;
  },
};