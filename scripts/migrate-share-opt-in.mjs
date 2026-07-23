import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const migrationPath = path.resolve("scripts/migrations/20260724_share_opt_in.sql");

async function migrate() {
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("POSTGRES_URL または DATABASE_URL が設定されていません。");
  }
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`マイグレーションSQLファイルが見つかりません: ${migrationPath}`);
  }

  const pool = new Pool({ connectionString: dbUrl });
  const migration = fs.readFileSync(migrationPath, "utf8");
  const statements = migration
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  try {
    for (const statement of statements) {
      await pool.query(statement);
    }
    console.log("食事記録の共有opt-inマイグレーションが完了しました。");
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("共有opt-inマイグレーションに失敗しました。", error);
  process.exitCode = 1;
});
