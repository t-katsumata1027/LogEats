-- 食事記録の共有は、ユーザーが明示的に共有操作を行った場合だけ公開する。
-- 既存の共有IDを持つ記録も、明示的な再共有まで非公開とする。

ALTER TABLE meal_logs
  ADD COLUMN IF NOT EXISTS share_enabled_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS meal_logs_public_share_id_idx
  ON meal_logs (share_id)
  WHERE share_enabled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS meal_logs_public_short_id_idx
  ON meal_logs (short_id)
  WHERE share_enabled_at IS NOT NULL;
