/* ============================================
   DUMB GYM TYCOON - Game Data (v4.3)
   Dengelenmiş ekonomi
   ============================================ */

const CA = '8DodKZzn1PnbmiJTKhavVxqpsTMiepHSuqwTKnDSpump';

/* ---- Sabitler ---- */
// FIX: Mobilde touch latency yüzünden combo window genişletildi
const IS_MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const COMBO_WINDOW_MS = IS_MOBILE ? 550 : 400;
const COMBO_DISPLAY_MS = 800;
const MAX_COMBO = 50;
const BEAR_CHECK_INTERVAL = 15000;
const BEAR_BASE_CHANCE = 0.20;
const LUCKY_SPIN_COOLDOWN = 300000;
const AUTO_SAVE_INTERVAL = 15000;
const GAME_TICK_INTERVAL = 250;
const OFFLINE_CAP_SECONDS = 14400;
const OFFLINE_EFFICIENCY = 0.5;
const MAX_CLICK_POPS = 15;
const MAX_PARTICLES = 30;
const MAX_TOASTS = 3;

/* ---- Upgrade Tanımları ---- */
const UPGRADES = [
  // CLICK POWER — scale 1.15 (erken), 1.18-1.20 (geç)
  { id: 'protein', cat: '💪 Click Power', name: 'Protein Shake',   desc: '+1 per click',    icon: '🥤',  base: 15,       scale: 1.15, max: 100, effect: { cp: 1 } },
  { id: 'energy',  cat: '💪 Click Power', name: 'Energy Drink',    desc: '+5 per click',    icon: '⚡',  base: 150,      scale: 1.15, max: 80,  effect: { cp: 5 } },
  { id: 'prework', cat: '💪 Click Power', name: 'Pre-Workout',     desc: '+25 per click',   icon: '💊',  base: 1500,     scale: 1.15, max: 60,  effect: { cp: 25 } },
  { id: 'roids',   cat: '💪 Click Power', name: 'Bull Juice',      desc: '+100 per click',  icon: '🐂',  base: 20000,    scale: 1.15, max: 40,  effect: { cp: 100 } },
  { id: 'cosmic',  cat: '💪 Click Power', name: 'Cosmic Power',    desc: '+500 per click',  icon: '🌟',  base: 300000,   scale: 1.18, max: 30,  effect: { cp: 500 } },
  { id: 'titan',   cat: '💪 Click Power', name: 'Titan Serum',     desc: '+2500 per click', icon: '⚗️',  base: 5000000,  scale: 1.20, max: 20,  effect: { cp: 2500 } },

  // PER SECOND (AUTO) — ROI ilk alımda ~1-2 dakika
  { id: 'mini',    cat: '⏱️ Auto Lift', name: 'Mini DUMB',        desc: '+1/sec',    icon: 'mini', base: 75,       scale: 1.15, max: 100, effect: { ps: 1 } },
  { id: 'bro',     cat: '⏱️ Auto Lift', name: 'Gym Bro',          desc: '+8/sec',    icon: 'bro',  base: 1000,     scale: 1.15, max: 80,  effect: { ps: 8 } },
  { id: 'trainer', cat: '⏱️ Auto Lift', name: 'Personal Trainer',  desc: '+40/sec',   icon: '💼',  base: 12000,    scale: 1.15, max: 60,  effect: { ps: 40 } },
  { id: 'army',    cat: '⏱️ Auto Lift', name: 'DUMB Army',        desc: '+200/sec',  icon: '🎖️', base: 150000,   scale: 1.15, max: 40,  effect: { ps: 200 } },
  { id: 'robot',   cat: '⏱️ Auto Lift', name: 'Robo Lifter',      desc: '+1000/sec', icon: '🤖',  base: 2000000,  scale: 1.18, max: 30,  effect: { ps: 1000 } },
  { id: 'factory', cat: '⏱️ Auto Lift', name: 'DUMB Factory',     desc: '+5000/sec', icon: '🏭',  base: 25000000, scale: 1.20, max: 20,  effect: { ps: 5000 } },

  // MULTIPLIERS — fiyatlar yükseltildi, son mult düşürüldü
  { id: 'dbell',     cat: '🏋️ Equipment', name: 'Gold Dumbbells',    desc: 'x1.25 all income', icon: 'eq',  base: 5000,       scale: 1, max: 1, effect: { mult: 1.25 } },
  { id: 'bench',     cat: '🏋️ Equipment', name: 'Diamond Bench',     desc: 'x1.5 all income',  icon: 'eq2', base: 75000,      scale: 1, max: 1, effect: { mult: 1.5 } },
  { id: 'belt',      cat: '🏋️ Equipment', name: 'Championship Belt',  desc: 'x1.75 all income', icon: '🏆', base: 750000,     scale: 1, max: 1, effect: { mult: 1.75 } },
  { id: 'ring',      cat: '🏋️ Equipment', name: 'DUMB Arena',        desc: 'x2 all income',    icon: '🏟️', base: 10000000,  scale: 1, max: 1, effect: { mult: 2 } },
  { id: 'satellite', cat: '🏋️ Equipment', name: 'DUMB Satellite',    desc: 'x2.5 all income',  icon: '🛰️', base: 100000000, scale: 1, max: 1, effect: { mult: 2.5 } },
];

/* ---- Milestone Tanımları ---- */
const MILESTONES = [
  // Tıklama
  { id: 'c50',   name: 'First Steps',      desc: 'Click 50 times',        target: 50,      current: () => Game.state.totalClicks, reward: 50 },
  { id: 'c500',  name: 'Getting Warmed Up', desc: 'Click 500 times',       target: 500,     current: () => Game.state.totalClicks, reward: 300 },
  { id: 'c5k',   name: 'Machine Mode',      desc: 'Click 5,000 times',     target: 5000,    current: () => Game.state.totalClicks, reward: 3000 },
  { id: 'c50k',  name: 'Click Legend',       desc: 'Click 50,000 times',    target: 50000,   current: () => Game.state.totalClicks, reward: 25000 },
  { id: 'c200k', name: 'Click Machine',      desc: 'Click 200,000 times',   target: 200000,  current: () => Game.state.totalClicks, reward: 150000 },
  { id: 'c1m',   name: 'Click GOD',          desc: 'Click 1,000,000 times', target: 1000000, current: () => Game.state.totalClicks, reward: 1000000 },

  // Coin
  { id: 'g1k',   name: 'First Grand',       desc: 'Earn 1K total',   target: 1e3, current: () => Game.state.totalCoins, reward: 150 },
  { id: 'g100k', name: 'Money Bags',        desc: 'Earn 100K total', target: 1e5, current: () => Game.state.totalCoins, reward: 8000 },
  { id: 'g1m',   name: 'Millionaire',       desc: 'Earn 1M total',   target: 1e6, current: () => Game.state.totalCoins, reward: 50000 },
  { id: 'g10m',  name: 'Multi-Millionaire', desc: 'Earn 10M total',  target: 1e7, current: () => Game.state.totalCoins, reward: 400000 },
  { id: 'g100m', name: 'Billionaire Baby',  desc: 'Earn 100M total', target: 1e8, current: () => Game.state.totalCoins, reward: 3000000 },
  { id: 'g1b',   name: 'DUMB Billionaire',  desc: 'Earn 1B total',   target: 1e9, current: () => Game.state.totalCoins, reward: 25000000 },

  // Bear
  { id: 'b5',   name: 'Bear Hunter',     desc: 'Defeat 5 bears',   target: 5,   current: () => Game.state.bearKills, reward: 500 },
  { id: 'b25',  name: 'Bear Slayer',     desc: 'Defeat 25 bears',  target: 25,  current: () => Game.state.bearKills, reward: 5000 },
  { id: 'b100', name: 'Bear Extinction', desc: 'Defeat 100 bears', target: 100, current: () => Game.state.bearKills, reward: 50000 },
  { id: 'b500', name: 'Bear Apocalypse', desc: 'Defeat 500 bears', target: 500, current: () => Game.state.bearKills, reward: 500000 },

  // Level
  { id: 'l10',  name: 'Level 10',    desc: 'Reach level 10',  target: 10,  current: () => Game.state.level, reward: 1500 },
  { id: 'l25',  name: 'Level 25',    desc: 'Reach level 25',  target: 25,  current: () => Game.state.level, reward: 15000 },
  { id: 'l50',  name: 'DUMB Legend',  desc: 'Reach level 50',  target: 50,  current: () => Game.state.level, reward: 150000 },
  { id: 'l100', name: 'DUMB GOD',    desc: 'Reach level 100', target: 100, current: () => Game.state.level, reward: 1500000 },

  // Prestige
  { id: 'p1',  name: 'Reborn',   desc: 'Prestige once',     target: 1,  current: () => Game.state.prestige, reward: 0 },
  { id: 'p5',  name: 'Veteran',  desc: 'Prestige 5 times',  target: 5,  current: () => Game.state.prestige, reward: 0 },
  { id: 'p10', name: 'Immortal', desc: 'Prestige 10 times', target: 10, current: () => Game.state.prestige, reward: 0 },

  // Combo
  { id: 'combo20', name: 'Combo King', desc: 'Reach 20x combo', target: 20, current: () => Game.state.maxCombo || 0, reward: 3000 },
  { id: 'combo50', name: 'Combo GOD',  desc: 'Reach 50x combo', target: 50, current: () => Game.state.maxCombo || 0, reward: 30000 },

  // Streak
  { id: 's7',  name: 'Week Warrior',    desc: '7 day streak',  target: 7,  current: () => Game.state.streak, reward: 8000 },
  { id: 's30', name: 'Monthly Monster', desc: '30 day streak', target: 30, current: () => Game.state.streak, reward: 80000 },
];

/* ---- Bear Tanımları ---- */
const BEARS = {
  small: { label: '🐻 FUD BEAR ATTACK!', img: 'bear_small', ko: 'bear_small_ko', size: '100px', rewardMult: 8 },
  big:   { label: '🐻 BIG BEAR!',         img: 'bear_big',   ko: 'bear_big_ko',   size: '120px', rewardMult: 25 },
  boss:  { label: '👑 BEAR MARKET BOSS!', img: 'bear_boss',  ko: 'bear_boss_ko',  size: '150px', rewardMult: 80 },
};

/* ---- Lucky Spin Ödülleri — düşürüldü ---- */
const LUCKY_PRIZES = [
  { weight: 30, text: '💰 +{x} coins!',          calc: () => Game.state.clickPower * 30 },
  { weight: 25, text: '💰 +{x} coins!',          calc: () => Game.state.clickPower * 60 },
  { weight: 15, text: '🔥 +{x} coins!',          calc: () => Game.state.clickPower * 150 },
  { weight: 10, text: '💎 +{x} coins!',          calc: () => Game.state.clickPower * 300 },
  { weight: 8,  text: '⚡ 2x all power for 30s!', calc: () => 'boost' },
  { weight: 7,  text: '🐻 Bear bounty! +{x}!',   calc: () => Game.state.clickPower * 100 },
  { weight: 5,  text: '🏆 JACKPOT! +{x}!',       calc: () => Game.state.clickPower * 600 },
];

// FIX: Kümülatif ağırlık — her spin'de array oluşturmak yerine O(1) seçim
const LUCKY_TOTAL_WEIGHT = LUCKY_PRIZES.reduce((s, p) => s + p.weight, 0);
function pickLuckyPrize() {
  let roll = Math.random() * LUCKY_TOTAL_WEIGHT;
  for (let i = 0; i < LUCKY_PRIZES.length; i++) {
    roll -= LUCKY_PRIZES[i].weight;
    if (roll < 0) return LUCKY_PRIZES[i];
  }
  return LUCKY_PRIZES[LUCKY_PRIZES.length - 1];
}

/* ---- Daily Challenge — hedefler yükseltildi ---- */
const DAILY_CHALLENGES = [
  { id: 'dc_click', name: 'Click Frenzy',  desc: 'Click {t} times today',  type: 'clicks', targets: [200, 500, 1000, 2000] },
  { id: 'dc_coin',  name: 'Coin Collector', desc: 'Earn {t} coins today',  type: 'coins',  targets: [5000, 25000, 100000, 500000] },
  { id: 'dc_bear',  name: 'Bear Buster',    desc: 'Defeat {t} bears today', type: 'bears',  targets: [2, 5, 8, 12] },
  { id: 'dc_combo', name: 'Combo Master',   desc: 'Reach {t}x combo',      type: 'combo',  targets: [10, 20, 30, 50] },
  { id: 'dc_buy',   name: 'Big Spender',    desc: 'Buy {t} upgrades today', type: 'buys',   targets: [3, 5, 10, 15] },
];

/* ---- Yardımcı Fonksiyonlar ---- */
function formatNum(n) {
  if (n === undefined || n === null || isNaN(n)) return '0';
  if (n >= 1e15) return (n / 1e15).toFixed(1) + 'Q';
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

function formatTime(seconds) {
  if (seconds < 0 || isNaN(seconds)) return '0m';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return d + 'd ' + h + 'h';
  if (h > 0) return h + 'h ' + m + 'm';
  return m + 'm';
}

// FIX: Tek div reuse — her çağrıda yeni element oluşturmayı önler
const _escapeDiv = document.createElement('div');
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  _escapeDiv.textContent = str;
  return _escapeDiv.innerHTML;
}

const LIMITS = {
  maxCoins: 1e18,
  maxClicks: 1e12,
  maxLevel: 999,
  maxPrestige: 999,
  maxBearKills: 100000,
};

function clampValue(val, min, max) {
  if (typeof val !== 'number' || isNaN(val)) return min;
  return Math.min(max, Math.max(min, Math.floor(val)));
}