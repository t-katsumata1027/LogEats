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

console.log("POSTGRES_URL length:", process.env.POSTGRES_URL?.length || 0);

async function alterTable() {
    try {
        console.log("Vercel Postgres に接続し、usersテーブルに target_weight カラムを追加します...");
        await sql`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS target_weight REAL;
        `;
        console.log("target_weight カラムの追加に成功しました！");
    } catch (error) {
        console.error("カラムの追加に失敗:", error);
    }
}

alterTable();
