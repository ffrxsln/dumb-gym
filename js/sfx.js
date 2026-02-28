/* ============================================
   DUMB GYM TYCOON - Sound Effects
   Web Audio API synthesized sounds
   Zero external files needed
   ============================================ */

const SFX = {

  ctx: null,
  enabled: true,
  volume: 0.3,

  /* ---- Initialize Audio Context ---- */
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { this.enabled = false; }
  },

  /* ---- Resume (needed after user gesture) ---- */
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  /* ---- Core: Play a tone ---- */
  _tone(freq, duration, type, vol, delay) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + (delay || 0);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime((vol || 1) * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  },

  /* ---- Core: Play noise burst ---- */
  _noise(duration, vol, delay) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + (delay || 0);
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime((vol || 0.3) * this.volume, t);
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(t);
  },

  // ==================== GAME SOUNDS ====================

  /* 💪 Click/Tap - kısa pop */
  click() {
    this.resume();
    this._tone(600, 0.06, 'sine', 0.4);
    this._tone(900, 0.04, 'sine', 0.2, 0.02);
  },

  /* 💪 Click with combo - yükselen pitch */
  clickCombo(combo) {
    this.resume();
    const pitch = Math.min(600 + combo * 15, 1200);
    this._tone(pitch, 0.06, 'sine', 0.5);
    this._tone(pitch * 1.5, 0.04, 'triangle', 0.2, 0.02);
  },

  /* 💰 Coin kazanma - ching */
  coin() {
    this._tone(1200, 0.08, 'sine', 0.3);
    this._tone(1600, 0.06, 'sine', 0.2, 0.05);
  },

  /* 🛒 Satın alma - cash register */
  buy() {
    this._tone(500, 0.05, 'square', 0.2);
    this._tone(700, 0.05, 'square', 0.2, 0.05);
    this._tone(1000, 0.1, 'sine', 0.3, 0.1);
  },

  /* ⬆️ Level Up - ascending jingle */
  levelUp() {
    this._tone(523, 0.12, 'sine', 0.4);        // C5
    this._tone(659, 0.12, 'sine', 0.4, 0.1);   // E5
    this._tone(784, 0.12, 'sine', 0.4, 0.2);   // G5
    this._tone(1047, 0.25, 'sine', 0.5, 0.3);  // C6
  },

  /* 🐻 Bear Attack - ominous growl */
  bearAttack() {
    this._tone(80, 0.3, 'sawtooth', 0.4);
    this._tone(60, 0.4, 'sawtooth', 0.3, 0.1);
    this._noise(0.2, 0.3, 0.05);
  },

  /* 👊 Bear Hit - punch */
  bearHit() {
    this._noise(0.08, 0.5);
    this._tone(200, 0.06, 'square', 0.3);
    this._tone(100, 0.08, 'square', 0.2, 0.03);
  },

  /* 🎉 Bear Killed - victory fanfare */
  bearKill() {
    this._tone(523, 0.08, 'sine', 0.3);
    this._tone(659, 0.08, 'sine', 0.3, 0.08);
    this._tone(784, 0.08, 'sine', 0.3, 0.16);
    this._tone(1047, 0.2, 'triangle', 0.4, 0.24);
    this._noise(0.1, 0.2, 0.24);
  },

  /* 🐻💨 Bear Escape */
  bearEscape() {
    this._tone(400, 0.15, 'sine', 0.3);
    this._tone(200, 0.2, 'sine', 0.2, 0.1);
  },

  /* 🏆 Milestone - achievement ding */
  milestone() {
    this._tone(880, 0.1, 'sine', 0.3);
    this._tone(1100, 0.1, 'sine', 0.3, 0.1);
    this._tone(1320, 0.15, 'sine', 0.4, 0.2);
    this._tone(1760, 0.3, 'sine', 0.3, 0.3);
  },

  /* 🎰 Lucky Spin */
  spin() {
    for (let i = 0; i < 8; i++) {
      this._tone(400 + i * 80, 0.05, 'sine', 0.2, i * 0.06);
    }
  },

  /* 🎰 Spin Win */
  spinWin() {
    this._tone(600, 0.1, 'sine', 0.4);
    this._tone(800, 0.1, 'sine', 0.4, 0.1);
    this._tone(1000, 0.1, 'sine', 0.4, 0.2);
    this._tone(1200, 0.25, 'triangle', 0.5, 0.3);
  },

  /* ⭐ Prestige - epic ascending */
  prestige() {
    const notes = [262, 330, 392, 523, 659, 784, 1047, 1319, 1568, 2093];
    notes.forEach((n, i) => {
      this._tone(n, 0.15, 'sine', 0.3 + i * 0.02, i * 0.08);
    });
    this._noise(0.3, 0.2, 0.7);
  },

  /* 📅 Daily Reward */
  daily() {
    this._tone(440, 0.1, 'sine', 0.3);
    this._tone(550, 0.1, 'sine', 0.3, 0.12);
    this._tone(660, 0.1, 'sine', 0.3, 0.24);
    this._tone(880, 0.2, 'sine', 0.4, 0.36);
  },

  /* 🔔 Generic notification */
  notify() {
    this._tone(800, 0.08, 'sine', 0.25);
    this._tone(1000, 0.1, 'sine', 0.2, 0.08);
  },

  /* 🔇 Toggle sound */
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  },
};
