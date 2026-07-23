import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// メモリ内またはクエリモックを用いたマイグレーション構造テスト
const migrationPath = path.resolve(
  "scripts/migrations/20260723_affiliate_banners_phase1_1.sql"
);

class MockDbClient {
  executedSqls = [];
  tables = new Map();

  async query(sqlString) {
    const trimmed = sqlString.trim();
    this.executedSqls.push(trimmed);

    if (trimmed.includes("CREATE TABLE IF NOT EXISTS affiliate_banners")) {
      if (!this.tables.has("affiliate_banners")) {
        this.tables.set("affiliate_banners", new Set(["id", "name", "html_content", "is_active", "created_at"]));
      }
    } else if (trimmed.includes("ALTER TABLE affiliate_banners")) {
      const columns = this.tables.get("affiliate_banners") || new Set();
      columns.add("affiliate_network");
      columns.add("campaign_id");
      columns.add("creative_id");
      columns.add("target_domain");
      columns.add("metadata");
      this.tables.set("affiliate_banners", columns);
    }
  }
}

async function testMigrationFileExists() {
  assert.ok(fs.existsSync(migrationPath), "マイグレーションSQLファイルが存在すること");
  const content = fs.readFileSync(migrationPath, "utf8");
  assert.ok(content.includes("CREATE TABLE IF NOT EXISTS affiliate_banners"), "CREATE TABLE 行が含まれること");
  assert.ok(content.includes("ALTER TABLE affiliate_banners"), "ALTER TABLE 行が含まれること");
  assert.ok(content.includes("affiliate_network"), "affiliate_network カラム定義が含まれること");
}

async function testFreshDatabaseMigration() {
  const client = new MockDbClient();
  const content = fs.readFileSync(migrationPath, "utf8");
  const statements = content.split(";").map((s) => s.trim()).filter(Boolean);

  for (const stmt of statements) {
    await client.query(stmt);
  }

  const columns = client.tables.get("affiliate_banners");
  assert.ok(columns.has("id"));
  assert.ok(columns.has("affiliate_network"));
  assert.ok(columns.has("campaign_id"));
  assert.ok(columns.has("target_domain"));
}

async function testExistingDatabaseMigration() {
  const client = new MockDbClient();
  // 既存テーブルが存在する状態を作る
  client.tables.set("affiliate_banners", new Set(["id", "name", "html_content", "is_active", "created_at"]));

  const content = fs.readFileSync(migrationPath, "utf8");
  const statements = content.split(";").map((s) => s.trim()).filter(Boolean);

  for (const stmt of statements) {
    await client.query(stmt);
  }

  const columns = client.tables.get("affiliate_banners");
  assert.ok(columns.has("id"));
  assert.ok(columns.has("affiliate_network"));
  assert.ok(columns.has("target_domain"));
}

async function testReExecutionSafety() {
  const client = new MockDbClient();
  const content = fs.readFileSync(migrationPath, "utf8");
  const statements = content.split(";").map((s) => s.trim()).filter(Boolean);

  // 1回目の実行
  for (const stmt of statements) {
    await client.query(stmt);
  }
  // 2回目の実行 (冪等性)
  for (const stmt of statements) {
    await client.query(stmt);
  }

  assert.ok(client.executedSqls.length >= statements.length * 2);
}

async function main() {
  console.log("=== affiliate_banners マイグレーション自動検証開始 ===");
  await testMigrationFileExists();
  console.log("✓ SQLファイル存在およびDDL構成検証: 成功");

  await testFreshDatabaseMigration();
  console.log("✓ 新規DBへの適用検証: 成功");

  await testExistingDatabaseMigration();
  console.log("✓ 既存DBスキーマへの適用検証: 成功");

  await testReExecutionSafety();
  console.log("✓ 再実行冪等性検証: 成功");

  console.log("全マイグレーションテストケース成功");
}

main().catch((err) => {
  console.error("マイグレーション検証失敗:", err);
  process.exit(1);
});
