/* ============================================
   DUMB GYM TYCOON - Wallet Integration
   Phantom auto-connect + manual address input
   ============================================ */

const Wallet = {

  /* ---- Get Provider ---- */
  getProvider() {
    return window.phantom?.solana || window.solana || null;
  },

  /* ---- Connect ---- */
  connect() {
    const provider = this.getProvider();

    // Phantom tarayıcıda açıksa → otomatik bağla
    if (provider?.isPhantom) {
      provider.connect()
        .then(resp => {
          Game.state.walletAddr = resp.publicKey.toString();
          this._updateButton();
          SFX.notify();
          UI.toast('✅ Wallet connected!');
          Game.save();
          Leaderboard.submit();
        })
        .catch(err => {
          if (err.code === 4001) UI.toast('❌ Connection rejected');
          else this._showManualInput();
        });
      return;
    }

    // Phantom yoksa → manual wallet address girişi
    this._showManualInput();
  },

  /* ---- Manual Wallet Input Modal ---- */
  _showManualInput() {
    const msg = document.getElementById('walletMsg');
    msg.innerHTML =
      '<div style="text-align:center">' +
      '<div style="font-size:14px;color:#aaa;margin-bottom:12px">Enter your Solana wallet address:</div>' +
      '<input type="text" id="walletInput" placeholder="Solana address (e.g. AbC4...)" ' +
      'style="width:100%;padding:10px;border:2px solid var(--purple);border-radius:8px;' +
      'background:#1a0a0a;color:var(--gold);font-size:14px;text-align:center;' +
      'font-family:monospace;outline:none" maxlength="50" autocomplete="off">' +
      '<div style="font-size:10px;color:#555;margin-top:6px">Only used for leaderboard display</div>' +
      '<button onclick="Wallet._submitManual()" style="margin-top:12px;font-family:Bangers,cursive;' +
      'font-size:18px;padding:8px 30px;border:2px solid var(--purple);' +
      'background:linear-gradient(180deg,#6622AA,#441177);color:#fff;cursor:pointer;border-radius:8px">CONNECT</button>' +
      '</div>';
    document.getElementById('walletModal').classList.add('show');

    setTimeout(() => {
      const input = document.getElementById('walletInput');
      if (input && Game.state.walletAddr) input.value = Game.state.walletAddr;
    }, 100);
  },

  /* ---- Submit Manual Address ---- */
  _submitManual() {
    const input = document.getElementById('walletInput');
    if (!input) return;
    const addr = input.value.trim();

    if (addr.length >= 32 && addr.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(addr)) {
      Game.state.walletAddr = addr;
      this._updateButton();
      SFX.notify();
      UI.toast('✅ Wallet connected!');
      Game.save();
      Leaderboard.submit();
      document.getElementById('walletModal').classList.remove('show');
    } else {
      UI.toast('❌ Invalid Solana address');
      input.style.borderColor = '#FF4444';
      setTimeout(() => { input.style.borderColor = 'var(--purple)'; }, 1500);
    }
  },

  /* ---- Auto Reconnect ---- */
  autoReconnect() {
    if (Game.state.walletAddr) this._updateButton();

    const provider = this.getProvider();
    if (provider?.isPhantom && Game.state.walletAddr) {
      provider.connect({ onlyIfTrusted: true })
        .then(resp => {
          Game.state.walletAddr = resp.publicKey.toString();
          this._updateButton();
        })
        .catch(() => {});
    }
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
