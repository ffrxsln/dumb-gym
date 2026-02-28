/* ============================================
   DUMB GYM TYCOON - Wallet Integration
   Phantom / Solana wallet connection
   ============================================ */

const Wallet = {

  /* ---- Get Provider ---- */
  getProvider() {
    return window.phantom?.solana || window.solana || null;
  },

  /* ---- Connect ---- */
  connect() {
    // file:// protocol check
    if (window.location.protocol === 'file:') {
      const msg = document.getElementById('walletMsg');
      msg.innerHTML =
        '⚠️ Wallet requires a web server!<br><br>' +
        'Phantom can\'t connect on local files.<br><br>' +
        '<b>Options:</b><br>' +
        '• Host on GitHub Pages<br>' +
        '• Host on Vercel / Netlify<br>' +
        '• Local: <code style="color:var(--gold)">python3 -m http.server 8000</code>';
      document.getElementById('walletModal').classList.add('show');
      return;
    }

    const provider = this.getProvider();

    if (provider?.isPhantom) {
      provider.connect()
        .then(resp => {
          Game.state.walletAddr = resp.publicKey.toString();
          this._updateButton();
          UI.toast('✅ Wallet connected!');
          Game.save();
        })
        .catch(err => {
          if (err.code === 4001) UI.toast('❌ Connection rejected');
          else UI.toast('❌ Connection failed');
        });

    } else if (window.Telegram?.WebApp) {
      UI.toast('📱 Telegram wallet coming soon!');

    } else {
      const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
      if (isMobile) {
        const url = encodeURIComponent(window.location.href);
        window.location.href = 'https://phantom.app/ul/browse/' + url + '?ref=' + url;
      } else {
        const msg = document.getElementById('walletMsg');
        msg.innerHTML =
          'Phantom wallet not detected!<br><br>' +
          '1. Install from <a href="https://phantom.app" target="_blank" style="color:var(--gold)">phantom.app</a><br>' +
          '2. Refresh this page<br>' +
          '3. Click Connect again';
        document.getElementById('walletModal').classList.add('show');
      }
    }
  },

  /* ---- Auto Reconnect ---- */
  autoReconnect() {
    if (!Game.state.walletAddr) return;
    if (window.location.protocol === 'file:') return;

    const provider = this.getProvider();
    if (!provider?.isPhantom) return;

    provider.connect({ onlyIfTrusted: true })
      .then(resp => {
        Game.state.walletAddr = resp.publicKey.toString();
        this._updateButton();
      })
      .catch(() => { /* user hasn't trusted yet */ });
  },

  /* ---- Update Button UI ---- */
  _updateButton() {
    const addr = Game.state.walletAddr;
    const btn = document.getElementById('walletBtn');
    if (addr) {
      btn.textContent = '🟢 ' + addr.slice(0, 4) + '...' + addr.slice(-4);
      btn.classList.add('connected');
    }
  },
};
