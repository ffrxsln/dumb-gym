/* ============================================
   DUMB GYM TYCOON - Tutorial / Onboarding (v4.3)
   Yeni oyuncular icin adim adim rehber
   ============================================ */

const Tutorial = {

  STEPS: [
    {
      msg: 'Welcome to DUMB GYM! 💪\nTap the character to lift bags!',
      highlight: 'clickArea',
      action: 'click',
      targetClicks: 3,
    },
    {
      msg: 'Nice! You earned coins! 💰\nOpen the Shop to get stronger.',
      highlight: 'shopTab',
      action: 'tab',
      targetTab: 'shop',
    },
    {
      msg: 'Buy "Protein Shake" to boost\nyour click power! 🥤',
      highlight: 'shopPanel',
      action: 'buy',
    },
    {
      msg: '🐻 Bears attack randomly!\nTap them fast to win big coins.',
      action: 'dismiss',
    },
    {
      msg: '⚔️ Challenge other players\nin the Arena from the Gym!',
      action: 'dismiss',
    },
    {
      msg: 'You\'re ready to lift! 🏋️\nGet stronger, crush bears, dominate!',
      action: 'dismiss',
    },
  ],

  _step: 0,
  _active: false,
  _clickCount: 0,

  /* ---- Baslatma ---- */
  init() {
    if (Game.state.totalClicks > 5 || Game.state.level > 1) return;
    try { if (localStorage.getItem('dumbgym_tutorial') === 'done') return; } catch (e) {}
    this.start();
  },

  start() {
    this._step = 0;
    this._active = true;
    this._clickCount = 0;
    this._showStep();
  },

  /* ---- Adim goster ---- */
  _showStep() {
    const step = this.STEPS[this._step];
    if (!step) { this.finish(); return; }

    const overlay = document.getElementById('tutorialOverlay');
    const msgEl = document.getElementById('tutorialMsg');
    const btnEl = document.getElementById('tutorialBtn');
    if (!overlay || !msgEl) return;

    overlay.classList.add('show');
    msgEl.textContent = step.msg;

    // Onceki highlight'i temizle
    document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));

    // Yeni highlight
    if (step.highlight) {
      let el = document.getElementById(step.highlight);
      // Tab highlight icin data-tab attribute'u dene
      if (!el) el = document.querySelector('[data-tab="' + step.highlight.replace('Tab', '') + '"]');
      if (el) el.classList.add('tutorial-highlight');
    }

    if (step.action === 'dismiss') {
      btnEl.style.display = 'block';
      btnEl.textContent = this._step < this.STEPS.length - 1 ? 'NEXT' : 'LET\'S GO! 💪';
    } else {
      btnEl.style.display = 'none';
    }
  },

  /* ---- Event callback'leri ---- */
  onClick() {
    if (!this._active) return;
    const step = this.STEPS[this._step];
    if (step && step.action === 'click') {
      this._clickCount++;
      if (this._clickCount >= step.targetClicks) this._nextStep();
    }
  },

  onTabSwitch(tab) {
    if (!this._active) return;
    const step = this.STEPS[this._step];
    if (step && step.action === 'tab' && tab === step.targetTab) this._nextStep();
  },

  onBuy() {
    if (!this._active) return;
    const step = this.STEPS[this._step];
    if (step && step.action === 'buy') this._nextStep();
  },

  dismiss() {
    if (!this._active) return;
    const step = this.STEPS[this._step];
    if (step && step.action === 'dismiss') this._nextStep();
  },

  /* ---- Adim ilerleme ---- */
  _nextStep() {
    this._step++;
    if (this._step >= this.STEPS.length) {
      this.finish();
    } else {
      this._showStep();
    }
  },

  /* ---- Bitir ---- */
  finish() {
    this._active = false;
    document.getElementById('tutorialOverlay').classList.remove('show');
    document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
    try { localStorage.setItem('dumbgym_tutorial', 'done'); } catch (e) {}
  },

  isActive() { return this._active; },
};
