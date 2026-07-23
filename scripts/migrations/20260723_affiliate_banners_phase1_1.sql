-- scripts/migrations/20260723_affiliate_banners_phase1_1.sql
-- affiliate_banners テーブルの初期作成および Phase 1.1 用カラム追加
-- 新規環境・既存環境のどちらでも冪等（何度実行しても安全）に適用可能です。

-- 1. テーブルが未存在の場合は初期作成
CREATE TABLE IF NOT EXISTS affiliate_banners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Phase 1.1 用のカラムを安全に追加
ALTER TABLE affiliate_banners
  ADD COLUMN IF NOT EXISTS affiliate_network VARCHAR(50) NOT NULL DEFAULT 'a8',
  ADD COLUMN IF NOT EXISTS campaign_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS creative_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS target_domain VARCHAR(255),
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 3. 検索・集計用インデックスの作成
CREATE INDEX IF NOT EXISTS idx_affiliate_banners_active_network
  ON affiliate_banners (is_active, affiliate_network);

CREATE INDEX IF NOT EXISTS idx_affiliate_banners_campaign
  ON affiliate_banners (campaign_id)
  WHERE campaign_id IS NOT NULL;
