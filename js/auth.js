/* ============================================
   DUMB GYM TYCOON - Auth & User System
   Telegram auto-login + wallet + username
   ============================================ */

const Auth = {

  user: null,

  /* ---- Initialize: Auto-detect login method ---- */
  init() {
    // 1. Try Telegram user (auto-login)
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
      this.user = {
        id: 'tg_' + tgUser.id,
        name: tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name.charAt(0) + '.' : ''),
        username: tgUser.username ? '@' + tgUser.username : '',
        avatar: '📱',
        method: 'telegram',
        tgId: tgUser.id,
      };
      Game.state.userId = this.user.id;
      Game.state.userName = this.user.name;
      this._updateUI();
      return;
    }

    // 2. Try saved user from localStorage
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
      return;
    }

    // 3. No login yet - show login prompt on first visit
    // User can play without login, prompt appears in leaderboard
  },

  /* ---- Login with Username ---- */
  loginUsername() {
    const input = document.getElementById('usernameInput');
    if (!input) return;
    const name = input.value.trim();
    if (name.length < 2 || name.length > 20) {
      UI.toast('❌ Name must be 2-20 characters');
      return;
    }

    // Generate unique ID from name + random
    const uid = 'u_' + name.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Math.random().toString(36).slice(2, 8);

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
    UI.toast('✅ Welcome, ' + name + '!');
    document.getElementById('loginModal').classList.remove('show');
    Leaderboard.submit();
  },

  /* ---- Login with Wallet ---- */
  loginWallet(addr) {
    this.user = {
      id: 'w_' + addr,
      name: addr.slice(0, 4) + '...' + addr.slice(-4),
      username: '',
      avatar: '🔗',
      method: 'wallet',
    };

    Game.state.userId = this.user.id;
    Game.state.userName = this.user.name;
    Game.save();
    this._updateUI();
  },

  /* ---- Show Login Modal ---- */
  showLogin() {
    const modal = document.getElementById('loginModal');
    modal.classList.add('show');
  },

  /* ---- Update Header UI ---- */
  _updateUI() {
    const btn = document.getElementById('walletBtn');
    if (this.user) {
      btn.textContent = this.user.avatar + ' ' + this.user.name;
      btn.classList.add('connected');
      btn.onclick = () => Auth.showProfile();
    }
  },

  /* ---- Show Profile ---- */
  showProfile() {
    const msg = document.getElementById('walletMsg');
    const u = this.user;
    msg.innerHTML =
      '<div style="text-align:center">' +
      '<div style="font-size:40px;margin-bottom:8px">' + u.avatar + '</div>' +
      '<div style="font-size:20px;font-weight:900;color:var(--gold)">' + u.name + '</div>' +
      (u.username ? '<div style="font-size:12px;color:#888">' + u.username + '</div>' : '') +
      '<div style="font-size:11px;color:#555;margin-top:4px">Login: ' + u.method + '</div>' +
      (Game.state.walletAddr ? '<div style="font-size:11px;color:var(--green);margin-top:4px">🔗 ' + Game.state.walletAddr.slice(0,6) + '...' + Game.state.walletAddr.slice(-4) + '</div>' : '') +
      '<div style="margin-top:12px;display:flex;gap:8px;justify-content:center">' +
      (!Game.state.walletAddr ? '<button onclick="document.getElementById(\'walletModal\').classList.remove(\'show\');Wallet.connect()" style="font-size:12px;padding:6px 14px;border:1px solid var(--purple);background:transparent;color:var(--purple);cursor:pointer;border-radius:6px">Link Wallet</button>' : '') +
      '<button onclick="Auth.logout()" style="font-size:12px;padding:6px 14px;border:1px solid #FF4444;background:transparent;color:#FF4444;cursor:pointer;border-radius:6px">Logout</button>' +
      '</div></div>';
    document.getElementById('walletModal').classList.add('show');
  },

  /* ---- Logout ---- */
  logout() {
    this.user = null;
    Game.state.userId = '';
    Game.state.userName = '';
    Game.save();
    const btn = document.getElementById('walletBtn');
    btn.textContent = '👤 Login';
    btn.classList.remove('connected');
    btn.onclick = () => Auth.showLogin();
    document.getElementById('walletModal').classList.remove('show');
    UI.toast('Logged out');
  },

  /* ---- Get display name for leaderboard ---- */
  getDisplayName() {
    if (this.user) return this.user.name;
    if (Game.state.walletAddr) return Game.state.walletAddr.slice(0,4) + '...' + Game.state.walletAddr.slice(-4);
    return 'Anonymous';
  },

  /* ---- Get unique ID ---- */
  getId() {
    if (this.user) return this.user.id;
    if (Game.state.walletAddr) return 'w_' + Game.state.walletAddr;
    return 'anon_' + Game.state.startTime;
  },
};
