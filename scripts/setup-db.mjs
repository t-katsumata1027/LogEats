import fs from 'fs';
import { sql } from '@vercel/postgres';

// .env.local から環境変数を読み込んで process.env にセットする
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^(?!#)([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      process.env[match[1].trim()] = val;
    }
  });
}

async function setup() {
  try {
    console.log("データベースへ接続し、テーブルを作成します...");

    // 1. learned_foods (既存: 共有学習データ)
    await sql`
      CREATE TABLE IF NOT EXISTS learned_foods (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        unit_name VARCHAR(50) NOT NULL,
        standard_weight_g REAL NOT NULL,
        calories REAL NOT NULL,
        protein REAL NOT NULL,
        fat REAL NOT NULL,
        carbs REAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. users (新規: 個人のプロファイルと目標設定)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        image TEXT,
        target_calories INTEGER DEFAULT 2000,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. meal_logs (新規: 食事の履歴記録)
    await sql`
      CREATE TABLE IF NOT EXISTS meal_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        image_url TEXT,
        meal_type VARCHAR(50) DEFAULT 'other',
        total_calories REAL NOT NULL,
        total_protein REAL NOT NULL,
        total_fat REAL NOT NULL,
        total_carbs REAL NOT NULL,
        analyzed_data JSONB,
        logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 4. error_logs (新規: API解析失敗の記録)
    await sql`
      CREATE TABLE IF NOT EXISTS error_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        error_message TEXT NOT NULL,
        context JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 5. access_logs (新規: 未ログイン利用やページビューの記録)
    await sql`DROP TABLE IF EXISTS access_logs`;
    await sql`
      CREATE TABLE access_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        path VARCHAR(255) NOT NULL,
        duration_ms INTEGER,
        action_detail VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log("すべてのテーブルが正常に作成・検証されました！");
    process.exit(0);
  } catch (e) {
    console.error("テーブルの作成に失敗しました:", e);
    process.exit(1);
  }
}

setup();
