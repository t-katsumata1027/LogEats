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
        const result = await sql`
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
        console.log("テーブルが正常に作成されました！");
        process.exit(0);
    } catch (e) {
        console.error("テーブルの作成に失敗しました:", e);
        process.exit(1);
    }
}

setup();
