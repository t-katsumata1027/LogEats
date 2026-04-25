import { sql } from "@vercel/postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

function generateShortId(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  try {
    // short_id が NULL のレコードを取得
    const { rows } = await sql`SELECT id FROM meal_logs WHERE short_id IS NULL`;
    console.log(`short_id が NULL のレコード数: ${rows.length}`);

    if (rows.length === 0) {
      console.log("補填不要です。すべてのレコードに short_id が存在します。");
      return;
    }

    let updated = 0;
    for (const row of rows) {
      const shortId = generateShortId();
      await sql`UPDATE meal_logs SET short_id = ${shortId} WHERE id = ${row.id}`;
      updated++;
    }

    console.log(`✅ ${updated} 件のレコードに short_id を補填しました。`);

    // daily_shares も確認
    const { rows: dsRows } = await sql`SELECT id FROM daily_shares WHERE short_id IS NULL`;
    console.log(`daily_shares: short_id が NULL のレコード数: ${dsRows.length}`);
    for (const row of dsRows) {
      const shortId = generateShortId();
      await sql`UPDATE daily_shares SET short_id = ${shortId} WHERE id = ${row.id}`;
    }
    if (dsRows.length > 0) {
      console.log(`✅ daily_shares: ${dsRows.length} 件補填しました。`);
    }
  } catch (err) {
    console.error("エラー:", err);
  }
}

main();
