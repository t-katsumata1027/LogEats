-- LINEアカウント連携要求テーブルの作成
CREATE TABLE IF NOT EXISTS line_account_link_requests (
  nonce_hash VARCHAR(64) PRIMARY KEY,
  target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  previous_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_line_account_link_requests_status_expires
  ON line_account_link_requests (status, expires_at);
