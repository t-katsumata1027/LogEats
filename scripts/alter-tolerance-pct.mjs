import fs from 'fs';
import { sql } from '@vercel/postgres';

const envPath = '.env.local';
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^(?!#)([^=]+)=(.*)$/);
        if (match) {
            let val = match[2].trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            process.env[match[1].trim()] = val;
        }
    });
}

async function run() {
    try {
        console.log("usersテーブルに tolerance_pct カラムを追加します...");
        await sql`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS tolerance_pct INTEGER DEFAULT 10;
        `;
        console.log("完了！ (tolerance_pct, デフォルト10%)");
    } catch (error) {
        console.error("失敗:", error);
    }
}

run();
