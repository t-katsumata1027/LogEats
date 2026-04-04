const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  try {
    console.log('Creating daily_shares table...');
    await sql`
      CREATE TABLE IF NOT EXISTS daily_shares (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        share_date DATE NOT NULL,
        share_id UUID DEFAULT gen_random_uuid() UNIQUE,
        short_id VARCHAR(10) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, share_date)
      );
    `;
    console.log('Success: daily_shares table created.');

    // インデックス作成
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_shares_short_id ON daily_shares(short_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_shares_user_date ON daily_shares(user_id, share_date);`;
    console.log('Success: Indexes created.');

  } catch (err) {
    console.error('Migration failed:', err.message);
  }
}

migrate();
