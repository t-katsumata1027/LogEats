import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const migrationPath = path.resolve(
  "scripts/migrations/20260723_affiliate_banners_phase1_1.sql"
);

export async function runAffiliateMigration(client) {
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("POSTGRES_URL または DATABASE_URL が設定されていません。");
  }

  console.log(`[DB Migration] 対象DB接続確認: ${dbUrl.replace(/:[^:@]+@/, ":****@")}`);

  const ownedPool = client ? null : new Pool({ connectionString: dbUrl });
  const queryClient = client ?? ownedPool;

  if (!fs.existsSync(migrationPath)) {
    throw new Error(`マイグレーションSQLファイルが見つかりません: ${migrationPath}`);
  }

  const migration = fs.readFileSync(migrationPath, "utf8");
  const statements = migration
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`[DB Migration] 全 ${statements.length} 件のSQLステートメントを実行します...`);

  try {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`  [${i + 1}/${statements.length}] 実行中: ${stmt.slice(0, 60)}...`);
      await queryClient.query(stmt);
    }

    console.log("[DB Migration] affiliate_bannersテーブルのマイグレーションが正常に完了しました。");
  } finally {
    if (ownedPool) {
      await ownedPool.end();
    }
  }
}

// 直接スクリプトとして実行された場合
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.includes("migrate-affiliate-banners")) {
  runAffiliateMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("[DB Migration Error] マイグレーション実行中にエラーが発生しました:", error);
      console.error("[復旧手順] .env.local の POSTGRES_URL 設定および対象DBのロールバック/権限を確認し、再実行してください。");
      process.exit(1);
    });
}
