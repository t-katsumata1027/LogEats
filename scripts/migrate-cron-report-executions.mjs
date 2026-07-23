import fs from "node:fs";
import path from "node:path";
import { sql } from "@vercel/postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const migrationPath = path.resolve(
  "scripts/migrations/20260723_cron_report_executions.sql"
);
const migration = fs.readFileSync(migrationPath, "utf8");

async function migrate() {
  console.log("cron_report_executions テーブルの移行を開始します。");

  for (const statement of migration
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean)) {
    await sql.query(statement);
  }

  console.log("cron_report_executions テーブルの移行が完了しました。");
}

migrate().catch((error) => {
  console.error("cron_report_executions テーブルの移行に失敗しました。", error);
  process.exitCode = 1;
});
