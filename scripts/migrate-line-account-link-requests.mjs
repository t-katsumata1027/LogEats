import fs from "node:fs";
import path from "node:path";
import { sql } from "@vercel/postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const migrationPath = path.resolve(
  "scripts/migrations/20260723_line_account_link_requests.sql"
);
const migration = fs.readFileSync(migrationPath, "utf8");

export async function runLineAccountLinkMigration(clientOrPool = sql) {
  for (const statement of migration
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean)) {
    await clientOrPool.query(statement);
  }
}

async function migrate() {
  console.log("line_account_link_requestsテーブルの移行を開始します。");
  await runLineAccountLinkMigration(sql);
  console.log("line_account_link_requestsテーブルの移行が完了しました。");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve("scripts/migrate-line-account-link-requests.mjs")) {
  migrate().catch((error) => {
    console.error("line_account_link_requestsテーブルの移行に失敗しました。", error);
    process.exitCode = 1;
  });
}
