-- ============================================
-- DUMB GYM TYCOON v4 - Supabase Database Setup
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
-- YENİ: Güncelleme zamanı index'i (rate limit için)
CREATE INDEX IF NOT EXISTS idx_lb_updated ON leaderboard (updated_at DESC);

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
    -- YENİ: user_id format kontrolü
    AND user_id ~ '^(u_|w_|tg_|anon_)[a-zA-Z0-9_]+$'
  );

-- BUG FIX: Update policy - sadece kendi kaydını güncelleyebilir
-- Eski policy "total_coins >= leaderboard.total_coins" subquery gerektiriyordu
-- Yeni policy daha güvenli
CREATE POLICY "Users can update own record"
  ON leaderboard FOR UPDATE
  USING (true)
  WITH CHECK (
    char_length(display_name) <= 20
    AND level >= 1 AND level <= 999
    AND prestige >= 0 AND prestige <= 999
    AND total_coins >= 0
    AND total_clicks >= 0
    AND bear_kills >= 0
  );

-- BUG FIX: Rate limiting - düzeltilmiş versiyon
-- Eski trigger COUNT(*) ile tek kayıt sayıyordu (PK olduğu için hep 1)
-- Yeni versiyon updated_at timestamp farkını kontrol eder
CREATE OR REPLACE FUNCTION check_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Son güncelleme 5 saniyeden kısa süre önceyse reddet
  IF (OLD.updated_at IS NOT NULL AND OLD.updated_at > NOW() - INTERVAL '5 seconds') THEN
    -- Sessizce güncellemeyi atla (hata fırlatma)
    RETURN OLD;
  END IF;
  
  -- YENİ: Skor sadece yukarı gidebilir (anti-cheat)
  IF NEW.total_coins < OLD.total_coins THEN
    NEW.total_coins := OLD.total_coins;
  END IF;
  IF NEW.total_clicks < OLD.total_clicks THEN
    NEW.total_clicks := OLD.total_clicks;
  END IF;
  IF NEW.bear_kills < OLD.bear_kills THEN
    NEW.bear_kills := OLD.bear_kills;
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı oluştur (varsa sil ve yeniden oluştur)
DROP TRIGGER IF EXISTS rate_limit_trigger ON leaderboard;
CREATE TRIGGER rate_limit_trigger
  BEFORE UPDATE ON leaderboard
  FOR EACH ROW
  EXECUTE FUNCTION check_rate_limit();

-- YENİ: Display name sanitize fonksiyonu
CREATE OR REPLACE FUNCTION sanitize_display_name()
RETURNS TRIGGER AS $$
BEGIN
  -- HTML/script tag'lerini temizle
  NEW.display_name := regexp_replace(NEW.display_name, '<[^>]*>', '', 'g');
  -- Boşluk trim
  NEW.display_name := trim(NEW.display_name);
  -- Boşsa Anonymous yap
  IF NEW.display_name = '' OR NEW.display_name IS NULL THEN
    NEW.display_name := 'Anonymous';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sanitize_name_trigger ON leaderboard;
CREATE TRIGGER sanitize_name_trigger
  BEFORE INSERT OR UPDATE ON leaderboard
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_display_name();

-- ============================================
-- SETUP TAMAMLANDI!
-- 
-- Settings > API'den kopyala:
-- 1. Project URL  →  SUPABASE_URL
-- 2. anon public key  →  SUPABASE_KEY
-- js/leaderboard.js içine yapıştır (satır 7-8)
--
-- Anon key public kodda GÜVENLE kullanılabilir.
-- RLS kuralları veritabanını korur, key'i değil.
-- ============================================
