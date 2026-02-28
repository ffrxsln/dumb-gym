/* ============================================
   DUMB GYM TYCOON - Game Data
   Upgrades, Milestones, Constants
   ============================================ */

const CA = '8DodKZzn1PnbmiJTKhavVxqpsTMiepHSuqwTKnDSpump';

/* ---- Upgrade Definitions ---- */
const UPGRADES = [
  // CLICK POWER
  { id: 'protein', cat: '💪 Click Power', name: 'Protein Shake',   desc: '+1 per click',       icon: '🥤',  base: 10,     scale: 1.12, max: 250, effect: { cp: 1 } },
  { id: 'energy',  cat: '💪 Click Power', name: 'Energy Drink',    desc: '+5 per click',       icon: '⚡',  base: 75,     scale: 1.12, max: 200, effect: { cp: 5 } },
  { id: 'prework', cat: '💪 Click Power', name: 'Pre-Workout',     desc: '+25 per click',      icon: '💊',  base: 500,    scale: 1.12, max: 150, effect: { cp: 25 } },
  { id: 'roids',   cat: '💪 Click Power', name: 'Bull Juice',      desc: '+100 per click',     icon: '🐂',  base: 5000,   scale: 1.12, max: 100, effect: { cp: 100 } },
  { id: 'cosmic',  cat: '💪 Click Power', name: 'Cosmic Power',    desc: '+500 per click',     icon: '🌟',  base: 100000, scale: 1.12, max: 75,  effect: { cp: 500 } },

  // PER SECOND (AUTO)
  { id: 'mini',    cat: '⏱️ Auto Lift', name: 'Mini DUMB',        desc: '+1/sec',             icon: 'mini', base: 25,     scale: 1.12, max: 250, effect: { ps: 1 } },
  { id: 'bro',     cat: '⏱️ Auto Lift', name: 'Gym Bro',          desc: '+8/sec',             icon: 'bro',  base: 300,    scale: 1.12, max: 200, effect: { ps: 8 } },
  { id: 'trainer', cat: '⏱️ Auto Lift', name: 'Personal Trainer',  desc: '+40/sec',            icon: '💼',  base: 3000,   scale: 1.12, max: 150, effect: { ps: 40 } },
  { id: 'army',    cat: '⏱️ Auto Lift', name: 'DUMB Army',        desc: '+200/sec',           icon: '🎖️', base: 30000,  scale: 1.12, max: 100, effect: { ps: 200 } },
  { id: 'robot',   cat: '⏱️ Auto Lift', name: 'Robo Lifter',      desc: '+1000/sec',          icon: '🤖',  base: 500000, scale: 1.12, max: 75,  effect: { ps: 1000 } },

  // MULTIPLIERS
  { id: 'dbell',   cat: '🏋️ Equipment', name: 'Gold Dumbbells',   desc: 'x1.25 all income',  icon: 'eq',   base: 1000,    scale: 3,   max: 1, effect: { mult: 1.25 } },
  { id: 'bench',   cat: '🏋️ Equipment', name: 'Diamond Bench',    desc: 'x1.5 all income',   icon: 'eq2',  base: 15000,   scale: 1,   max: 1, effect: { mult: 1.5 } },
  { id: 'belt',    cat: '🏋️ Equipment', name: 'Championship Belt', desc: 'x2 all income',     icon: '🏆',  base: 200000,  scale: 1,   max: 1, effect: { mult: 2 } },
  { id: 'ring',    cat: '🏋️ Equipment', name: 'DUMB Arena',       desc: 'x2.5 all income',   icon: '🏟️', base: 2000000, scale: 1,   max: 1, effect: { mult: 2.5 } },
];

/* ---- Milestone Definitions ---- */
const MILESTONES = [
  { id: 'c50',   name: 'First Steps',       desc: 'Click 50 times',        target: 50,     current: () => Game.state.totalClicks,  reward: 50 },
  { id: 'c500',  name: 'Getting Warmed Up',  desc: 'Click 500 times',       target: 500,    current: () => Game.state.totalClicks,  reward: 500 },
  { id: 'c5k',   name: 'Machine Mode',       desc: 'Click 5,000 times',     target: 5000,   current: () => Game.state.totalClicks,  reward: 5000 },
  { id: 'c50k',  name: 'Click Legend',        desc: 'Click 50,000 times',    target: 50000,  current: () => Game.state.totalClicks,  reward: 50000 },
  { id: 'g1k',   name: 'First Grand',         desc: 'Earn 1K total',         target: 1e3,    current: () => Game.state.totalCoins,   reward: 200 },
  { id: 'g100k', name: 'Money Bags',          desc: 'Earn 100K total',       target: 1e5,    current: () => Game.state.totalCoins,   reward: 10000 },
  { id: 'g1m',   name: 'Millionaire',         desc: 'Earn 1M total',         target: 1e6,    current: () => Game.state.totalCoins,   reward: 100000 },
  { id: 'g10m',  name: 'Multi-Millionaire',   desc: 'Earn 10M total',        target: 1e7,    current: () => Game.state.totalCoins,   reward: 1000000 },
  { id: 'b5',    name: 'Bear Hunter',         desc: 'Defeat 5 bears',        target: 5,      current: () => Game.state.bearKills,    reward: 1000 },
  { id: 'b25',   name: 'Bear Slayer',         desc: 'Defeat 25 bears',       target: 25,     current: () => Game.state.bearKills,    reward: 10000 },
  { id: 'b100',  name: 'Bear Extinction',     desc: 'Defeat 100 bears',      target: 100,    current: () => Game.state.bearKills,    reward: 100000 },
  { id: 'l10',   name: 'Level 10',            desc: 'Reach level 10',        target: 10,     current: () => Game.state.level,        reward: 2000 },
  { id: 'l25',   name: 'Level 25',            desc: 'Reach level 25',        target: 25,     current: () => Game.state.level,        reward: 20000 },
  { id: 'l50',   name: 'DUMB Legend',          desc: 'Reach level 50',        target: 50,     current: () => Game.state.level,        reward: 200000 },
  { id: 'p1',    name: 'Reborn',              desc: 'Prestige once',          target: 1,      current: () => Game.state.prestige,     reward: 0 },
];

/* ---- Bear Definitions ---- */
const BEARS = {
  small: { label: '🐻 FUD BEAR ATTACK!',   img: 'bear_small', ko: 'bear_small_ko', size: '100px' },
  big:   { label: '🐻 BIG BEAR!',           img: 'bear_big',   ko: 'bear_big_ko',   size: '120px' },
  boss:  { label: '👑 BEAR MARKET BOSS!',   img: 'bear_boss',  ko: 'bear_boss_ko',  size: '150px' },
};

/* ---- Lucky Spin Prizes ---- */
const LUCKY_PRIZES = [
  { weight: 30, text: '💰 +{x} coins!',              calc: () => Game.state.clickPower * 50 },
  { weight: 25, text: '💰 +{x} coins!',              calc: () => Game.state.clickPower * 100 },
  { weight: 15, text: '🔥 +{x} coins!',              calc: () => Game.state.clickPower * 250 },
  { weight: 10, text: '💎 +{x} coins!',              calc: () => Game.state.clickPower * 500 },
  { weight: 8,  text: '⚡ 2x click power for 30s!',  calc: () => 'boost' },
  { weight: 7,  text: '🐻 Bear bounty! +{x}!',       calc: () => Game.state.clickPower * 150 },
  { weight: 5,  text: '🏆 JACKPOT! +{x}!',           calc: () => Game.state.clickPower * 1000 },
];

/* ---- Helper: Number Formatting ---- */
function formatNum(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? h + 'h ' + m + 'm' : m + 'm';
}
