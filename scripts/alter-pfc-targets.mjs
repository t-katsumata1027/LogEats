import fs from 'fs';
import { sql } from '@vercel/postgres';

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

async function alterTable() {
    try {
        console.log("Vercel Postgres に接続し、usersテーブルに PFC 目標カラムを追加します...");
        await sql`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS target_protein INTEGER DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS target_fat     INTEGER DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS target_carbs   INTEGER DEFAULT NULL;
        `;
        console.log("カラムの追加に成功しました！ (target_protein, target_fat, target_carbs)");
    } catch (error) {
        console.error("カラムの追加に失敗:", error);
    }
}

alterTable();
