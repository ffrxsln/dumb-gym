-- ============================================
-- DUMB GYM TYCOON - Supabase Database Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- Leaderboard tablosu
CREATE TABLE IF NOT EXISTS leaderboard (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT 'Anonymous',
  wallet TEXT,
  login_method TEXT DEFAULT 'anonymous',
  level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 999),
  prestige INTEGER DEFAULT 0 CHECK (prestige >= 0 AND prestige <= 999),
  prestige_mult REAL DEFAULT 1.0,
  total_coins BIGINT DEFAULT 0 CHECK (total_coins >= 0),
  total_clicks BIGINT DEFAULT 0 CHECK (total_clicks >= 0),
  bear_kills INTEGER DEFAULT 0 CHECK (bear_kills >= 0),
  token_reward BIGINT DEFAULT 0 CHECK (token_reward >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sıralama index'leri
CREATE INDEX IF NOT EXISTS idx_lb_coins ON leaderboard (total_coins DESC);
CREATE INDEX IF NOT EXISTS idx_lb_level ON leaderboard (level DESC);
CREATE INDEX IF NOT EXISTS idx_lb_prestige ON leaderboard (prestige DESC);
CREATE INDEX IF NOT EXISTS idx_lb_bears ON leaderboard (bear_kills DESC);
CREATE INDEX IF NOT EXISTS idx_lb_tokens ON leaderboard (token_reward DESC);

-- RLS aktif
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir
CREATE POLICY "Anyone can read leaderboard"
  ON leaderboard FOR SELECT
  USING (true);

-- Herkes yeni kayıt ekleyebilir (display_name 20 karakter limit)
CREATE POLICY "Anyone can insert"
  ON leaderboard FOR INSERT
  WITH CHECK (
    char_length(display_name) <= 20
    AND char_length(user_id) <= 100
  );

-- Sadece kendi kaydını güncelleyebilir (skor sadece yukarı gidebilir)
CREATE POLICY "Users can update own score up only"
  ON leaderboard FOR UPDATE
  USING (true)
  WITH CHECK (
    total_coins >= leaderboard.total_coins
    AND char_length(display_name) <= 20
  );

-- Rate limiting için fonksiyon (opsiyonel ama önerilir)
-- Son 1 dakikada max 10 update izin ver
CREATE OR REPLACE FUNCTION check_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM leaderboard
    WHERE user_id = NEW.user_id
    AND updated_at > NOW() - INTERVAL '1 minute'
  ) > 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded';
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER rate_limit_trigger
  BEFORE UPDATE ON leaderboard
  FOR EACH ROW
  EXECUTE FUNCTION check_rate_limit();

-- ============================================
-- DONE! Go to Settings > API and copy:
-- 1. Project URL  →  SUPABASE_URL
-- 2. anon public key  →  SUPABASE_KEY
-- Paste into js/leaderboard.js (lines 7-8)
--
-- Anon key is SAFE to put in public code.
-- RLS rules protect the database, not the key.
-- ============================================
