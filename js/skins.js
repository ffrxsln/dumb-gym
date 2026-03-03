/* ============================================
   DUMB GYM TYCOON - Skin System (v4.3)
   Karakter skin'leri + Telegram Stars satın alma
   ============================================ */

/* ---- Skin Tanımları ---- */
const SKINS = [
  {
    id: 'dumb',
    name: 'THE ORIGINAL DUMB',
    rarity: 'common',
    color: '#4488CC',
    idle: 'assets/dumb_idle.png',
    lift: 'assets/dumb_lift.png',
    lift2: 'assets/dumb_lift2.png',
    stats: { health: 70, speed: 50, memePower: 80 },
    bonus: {},
    unlock: 'default',
    price: 0,
    desc: 'The original bag lifter. Where it all began.',
  },
  {
    id: 'doge',
    name: 'DOGE DUD',
    rarity: 'rare',
    color: '#55AA44',
    idle: 'assets/doge_idle.png',
    lift: 'assets/doge_lift.png',
    lift2: 'assets/doge_lift2.png',
    stats: { health: 60, speed: 70, memePower: 90 },
    bonus: { coinMult: 1.1 },
    unlock: 'stars',
    price: 50,
    desc: 'Much lift. Very strong. Wow.',
  },
  {
    id: 'shiba',
    name: 'SHIBA SMASHER',
    rarity: 'rare',
    color: '#4488CC',
    idle: 'assets/shiba_idle.png',
    lift: 'assets/shiba_lift.png',
    lift2: 'assets/shiba_lift2.png',
    stats: { health: 65, speed: 75, memePower: 85 },
    bonus: { clickMult: 1.1 },
    unlock: 'stars',
    price: 50,
    desc: 'Smashes bears with puppy power.',
  },
  {
    id: 'floki',
    name: 'FLOKI FIGHTER',
    rarity: 'epic',
    color: '#5C4033',
    idle: 'assets/floki_idle.png',
    lift: 'assets/floki_lift.png',
    lift2: 'assets/floki_lift2.png',
    stats: { health: 90, speed: 40, memePower: 75 },
    bonus: { bearDmgMult: 1.25 },
    unlock: 'stars',
    price: 100,
    desc: 'Viking warrior. +25% bear damage.',
  },
  {
    id: 'pepe',
    name: 'PEPE PUNCHER',
    rarity: 'rare',
    color: '#44AA44',
    idle: 'assets/pepe_idle.png',
    lift: 'assets/pepe_lift.png',
    lift2: 'assets/pepe_lift2.png',
    stats: { health: 55, speed: 65, memePower: 95 },
    bonus: { comboMult: 1.15 },
    unlock: 'stars',
    price: 50,
    desc: 'Feels strong man. +15% combo bonus.',
  },
  {
    id: 'eth',
    name: 'ETH CYBERPUNK',
    rarity: 'epic',
    color: '#6366F1',
    idle: 'assets/eth_idle.png',
    lift: 'assets/eth_lift.png',
    lift2: 'assets/eth_lift2.png',
    stats: { health: 70, speed: 80, memePower: 80 },
    bonus: { psMult: 1.2 },
    unlock: 'stars',
    price: 100,
    desc: 'Cyberpunk lifter. +20% per second.',
  },
  {
    id: 'hodl',
    name: "HOLD'EM HODL",
    rarity: 'legendary',
    color: '#F59E0B',
    idle: 'assets/hodl_idle.png',
    lift: 'assets/hodl_lift.png',
    lift2: 'assets/hodl_lift2.png',
    stats: { health: 80, speed: 60, memePower: 100 },
    bonus: { coinMult: 1.25 },
    unlock: 'stars',
    price: 250,
    desc: 'Solid gold. +25% all coins.',
  },
  {
    id: 'zombie',
    name: 'ZOMBIE COIN',
    rarity: 'epic',
    color: '#6B7280',
    idle: 'assets/zombie_idle.png',
    lift: 'assets/zombie_lift.png',
    lift2: 'assets/zombie_lift2.png',
    stats: { health: 95, speed: 35, memePower: 70 },
    bonus: { bearDmgMult: 1.3 },
    unlock: 'stars',
    price: 100,
    desc: 'Undead lifter. +30% bear damage.',
  },
];

/* ---- Rarity Renkleri ---- */
const RARITY_COLORS = {
  common: { bg: '#1a2a3a', border: '#4488CC', label: 'COMMON', labelColor: '#88BBDD' },
  rare: { bg: '#1a2a1a', border: '#44AA44', label: 'RARE', labelColor: '#66CC66' },
  epic: { bg: '#2a1a3a', border: '#8844CC', label: 'EPIC', labelColor: '#AA66EE' },
  legendary: { bg: '#2a2a0a', border: '#FFD700', label: 'LEGENDARY', labelColor: '#FFD700' },
};

/* ---- Skin Sistemi ---- */
const SkinSystem = {

  /* Aktif skin bilgisini al */
  getActive() {
    const id = Game.state.selectedSkin || 'dumb';
    return SKINS.find(s => s.id === id) || SKINS[0];
  },

  /* Skin'e sahip mi? */
  owns(id) {
    if (id === 'dumb') return true;
    return (Game.state.ownedSkins || []).includes(id);
  },

  /* Skin seç */
  select(id) {
    if (!this.owns(id)) return;
    Game.state.selectedSkin = id;
    const skin = this.getActive();
    // Karakter görselini güncelle
    document.getElementById('dumbImg').src = skin.idle;
    Game.calcStats();
    UI.updateStats();
    Game.save();
    SFX.buy();
    UI.toast('🎨 ' + skin.name + ' selected!');
    this.renderModal();
  },

  /* Telegram Stars ile satın al */
  async purchase(id) {
    const skin = SKINS.find(s => s.id === id);
    if (!skin || this.owns(id)) return;

    // Telegram Stars API
    if (window.Telegram?.WebApp?.openInvoice) {
      try {
        // Telegram Stars invoice oluştur
        // Backend'den invoice URL alınması gerekiyor
        // Şimdilik placeholder — backend entegrasyonu lazım
        UI.toast('⭐ Telegram Stars ile satın alma yakında!');

        // TODO: Backend API call
        // const res = await fetch('/api/create-invoice', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ skin_id: id, stars: skin.price, user_id: Auth.getId() })
        // });
        // const { invoiceUrl } = await res.json();
        // window.Telegram.WebApp.openInvoice(invoiceUrl, (status) => {
        //   if (status === 'paid') {
        //     this._unlockSkin(id);
        //   }
        // });

        return;
      } catch (e) {
        console.error('Stars purchase error:', e);
      }
    }

    // Telegram dışında: coin ile satın alma fallback
    const coinPrice = skin.price * 1000;
    if (Game.state.coins >= coinPrice) {
      // FIX: confirm() Telegram Mini App'te düzgün çalışmaz — custom modal kullan
      this._showPurchaseConfirm(id, skin.name, coinPrice);
    } else {
      UI.toast('❌ Not enough coins! Need ' + formatNum(coinPrice));
    }
  },

  // FIX: Telegram-uyumlu satın alma onay modalı
  _showPurchaseConfirm(skinId, skinName, price) {
    const modal = document.getElementById('walletModal');
    const msg = document.getElementById('walletMsg');
    msg.innerHTML =
      '<div style="text-align:center">' +
      '<div style="font-size:24px;margin-bottom:8px">🛒</div>' +
      '<div style="font-size:16px;font-weight:700;color:var(--gold);margin-bottom:8px">Buy ' + escapeHtml(skinName) + '?</div>' +
      '<div style="font-size:14px;color:#aaa;margin-bottom:16px">Cost: ' + formatNum(price) + ' coins</div>' +
      '<div style="display:flex;gap:8px;justify-content:center">' +
      '<button onclick="SkinSystem._confirmPurchase(\'' + skinId + '\',' + price + ')" style="font-family:Bangers,cursive;font-size:16px;padding:8px 24px;border:2px solid var(--green);background:linear-gradient(180deg,#228B22,#006400);color:#fff;cursor:pointer;border-radius:8px">BUY 💰</button>' +
      '<button onclick="UI.closeWallet()" style="font-size:14px;padding:8px 20px;border:1px solid #333;background:transparent;color:#888;cursor:pointer;border-radius:6px">Cancel</button>' +
      '</div></div>';
    modal.classList.add('show');
  },

  _confirmPurchase(id, price) {
    document.getElementById('walletModal').classList.remove('show');
    if (Game.state.coins >= price) {
      Game.state.coins -= price;
      this._unlockSkin(id);
    } else {
      UI.toast('❌ Not enough coins!');
    }
  },

  _unlockSkin(id) {
    if (!Game.state.ownedSkins) Game.state.ownedSkins = [];
    if (!Game.state.ownedSkins.includes(id)) {
      Game.state.ownedSkins.push(id);
    }
    Game.state.selectedSkin = id;
    document.getElementById('dumbImg').src = this.getActive().idle;
    Game.calcStats();
    Game.save();
    SFX.milestone();
    UI.toast('🎉 ' + SKINS.find(s => s.id === id).name + ' unlocked!');
    this.renderModal();
  },

  /* Skin bonus'unu stat hesaplamaya uygula */
  getBonus() {
    const skin = this.getActive();
    return skin.bonus || {};
  },

  /* ---- STAT BAR HTML ---- */
  _statBar(label, value, color) {
    const pct = Math.min(100, value);
    return '<div class="skin-stat">' +
      '<span class="skin-stat-label">' + label + '</span>' +
      '<div class="skin-stat-bar"><div class="skin-stat-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
      '</div>';
  },

  /* ---- RENDER SKIN MODAL ---- */
  renderModal() {
    const modal = document.getElementById('skinModal');
    const container = document.getElementById('skinGrid');
    if (!container) return;

    const activeId = Game.state.selectedSkin || 'dumb';
    let html = '';

    SKINS.forEach(skin => {
      const owned = this.owns(skin.id);
      const selected = skin.id === activeId;
      const rarity = RARITY_COLORS[skin.rarity];
      const inTelegram = !!window.Telegram?.WebApp?.initDataUnsafe?.user;

      html += '<div class="skin-card' + (selected ? ' skin-selected' : '') + (owned ? '' : ' skin-locked') + '" style="border-color:' + rarity.border + ';background:' + rarity.bg + '">';

      // Rarity label
      html += '<div class="skin-rarity" style="color:' + rarity.labelColor + '">' + rarity.label + '</div>';

      // Karakter görseli
      html += '<div class="skin-preview">';
      if (owned) {
        html += '<img src="' + skin.idle + '" alt="' + escapeHtml(skin.name) + '" onerror="this.src=\'assets/dumb_idle.png\'">';
      } else {
        html += '<div class="skin-silhouette"><img src="' + skin.idle + '" alt="' + escapeHtml(skin.name) + '" onerror="this.src=\'assets/dumb_idle.png\'"></div>';
      }
      html += '</div>';

      // İsim
      html += '<div class="skin-name">' + escapeHtml(skin.name) + '</div>';

      // Stat barları
      html += '<div class="skin-stats">';
      html += this._statBar('Health', skin.stats.health, '#EF4444');
      html += this._statBar('Speed', skin.stats.speed, '#F59E0B');
      html += this._statBar('Meme Power', skin.stats.memePower, '#22C55E');
      html += '</div>';

      // Bonus
      if (skin.bonus && Object.keys(skin.bonus).length > 0) {
        let bonusText = '';
        if (skin.bonus.coinMult) bonusText = '+' + Math.round((skin.bonus.coinMult - 1) * 100) + '% coins';
        if (skin.bonus.clickMult) bonusText = '+' + Math.round((skin.bonus.clickMult - 1) * 100) + '% click';
        if (skin.bonus.psMult) bonusText = '+' + Math.round((skin.bonus.psMult - 1) * 100) + '% per sec';
        if (skin.bonus.bearDmgMult) bonusText = '+' + Math.round((skin.bonus.bearDmgMult - 1) * 100) + '% bear dmg';
        if (skin.bonus.comboMult) bonusText = '+' + Math.round((skin.bonus.comboMult - 1) * 100) + '% combo';
        if (bonusText) {
          html += '<div class="skin-bonus">⚡ ' + bonusText + '</div>';
        }
      }

      // Buton
      if (selected) {
        html += '<button class="skin-btn skin-btn-active">✅ SELECTED</button>';
      } else if (owned) {
        html += '<button class="skin-btn skin-btn-select" onclick="SkinSystem.select(\'' + skin.id + '\')">SELECT</button>';
      } else {
        const priceLabel = inTelegram ? '⭐ ' + skin.price + ' Stars' : '💰 ' + formatNum(skin.price * 1000);
        html += '<button class="skin-btn skin-btn-buy" onclick="SkinSystem.purchase(\'' + skin.id + '\')">' + priceLabel + '</button>';
      }

      html += '</div>';
    });

    container.innerHTML = html;
    modal.classList.add('show');
  },

  closeModal() {
    document.getElementById('skinModal').classList.remove('show');
  },
};