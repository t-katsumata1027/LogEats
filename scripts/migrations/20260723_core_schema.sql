-- LogEats の計測系マイグレーションが依存する最小基底スキーマ
-- 既存環境のデータを変更せず、新規環境でも冪等に適用できる。

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  image TEXT,
  target_calories INTEGER DEFAULT 2000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS access_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  path VARCHAR(255) NOT NULL,
  duration_ms INTEGER,
  action_detail VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
