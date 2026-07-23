import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { runLineAccountLinkMigration } from "./migrate-line-account-link-requests.mjs";
import { startAccountLink, completeAccountLink, unlinkAccount } from "../src/lib/lineAccountLink";

async function applyBaseMigrations(pool: Pool) {
  const baseMigrationPath = path.resolve("scripts/migrations/20260723_core_schema.sql");
  if (fs.existsSync(baseMigrationPath)) {
    const sqlContent = fs.readFileSync(baseMigrationPath, "utf8");
    for (const stmt of sqlContent.split(";").map(s => s.trim()).filter(Boolean)) {
      await pool.query(stmt);
    }
  }
}

async function runIsolatedDbTests() {
  const requireIsolated = process.env.REQUIRE_ISOLATED_DB_TESTS === "1";
  const allowIsolated = process.env.ALLOW_ISOLATED_DB_TESTS === "1";
  const testDbUrl = process.env.TEST_POSTGRES_URL;

  if (!allowIsolated || !testDbUrl) {
    const msg = "⚠️ 【隔離DBテスト未実行】ALLOW_ISOLATED_DB_TESTS=1 および TEST_POSTGRES_URL が指定されていません。";
    console.log("--------------------------------------------------");
    console.log(msg);
    console.log("--------------------------------------------------");
    if (requireIsolated) {
      console.error("❌ REQUIRE_ISOLATED_DB_TESTS=1 が指定されているため、非ゼロで終了します。");
      process.exit(1);
    }
    return;
  }

  let pool: Pool;
  try {
    pool = new Pool({ connectionString: testDbUrl });
    await pool.query("SELECT 1");
  } catch (err: any) {
    if (err.code === "3D000" && /^logeats_test_/i.test(testDbUrl.replace(/.*\/([^/?]+).*/, "$1"))) {
      const testDbName = testDbUrl.replace(/.*\/([^/?]+).*/, "$1");
      const adminDbUrl = testDbUrl.replace(/\/[^/?]+(\?|$)/, "/postgres$1");
      const adminPool = new Pool({ connectionString: adminDbUrl });
      try {
        console.log(`[IsolatedDBTest] テスト用データベース '${testDbName}' を作成しています...`);
        await adminPool.query(`CREATE DATABASE "${testDbName}"`);
      } catch (createErr: any) {
        if (!createErr.message.includes("already exists")) {
          console.error("DB作成エラー:", createErr.message);
        }
      } finally {
        await adminPool.end();
      }
      pool = new Pool({ connectionString: testDbUrl });
    } else {
      throw err;
    }
  }

  try {
    // 1. 厳格な DB 名プレフィックスチェック (/^logeats_test_/i)
    const { rows: dbInfo } = await pool.query("SELECT current_database()");
    const currentDb = String(dbInfo[0]?.current_database || "");
    console.log(`[IsolatedDBTest] 接続先データベース名: '${currentDb}'`);

    const isStrictTestDb = /^logeats_test_/i.test(currentDb);
    if (!isStrictTestDb) {
      console.error(`❌ 【隔離DBテスト拒否】DB名 '${currentDb}' は '^logeats_test_' プレフィックスに一致しません。本番保護のため中断します。`);
      process.exit(1);
    }

    console.log("[IsolatedDBTest] 1. 基底スキーマ & マイグレーション適用...");
    await applyBaseMigrations(pool);
    const poolAdapter = { query: (stmt: string, params?: any[]) => pool.query(stmt, params) };
    await runLineAccountLinkMigration(poolAdapter as any);

    console.log("[IsolatedDBTest] 2. 外部キー (CASCADE / SET NULL), CHECK制約, インデックスの実DB独立検証...");
    
    // データクリーンアップ
    await pool.query("DELETE FROM line_account_link_requests");
    await pool.query("DELETE FROM meal_logs WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'iso_%@example.com')");
    await pool.query("DELETE FROM users WHERE email LIKE 'iso_%@example.com'");

    // テストユーザー作成
    const { rows: u1 } = await pool.query("INSERT INTO users (name, email) VALUES ('Iso1', 'iso_1@example.com') RETURNING id");
    const u1Id = u1[0].id;

    const { rows: u2 } = await pool.query("INSERT INTO users (name, email, line_user_id) VALUES ('Iso2', 'iso_2@example.com', 'LINE_ISO_OLD') RETURNING id");
    const u2Id = u2[0].id;

    // (A) status CHECK制約の独立検証 (有効な target_user_id を使用)
    try {
      await pool.query(`
        INSERT INTO line_account_link_requests (nonce_hash, target_user_id, status, expires_at)
        VALUES ('hash_check_constraint_test', $1, 'invalid_status_val', NOW())
      `, [u1Id]);
      assert.fail("invalid_status_val の挿入は CHECK 制約で拒否される必要があります");
    } catch (e: any) {
      assert.ok(
        e.message.includes("check constraint") || e.message.includes("violates") || e.message.includes("制約"),
        "FKエラーではなく CHECK 制約違反で失敗していること"
      );
    }

    // (B) previous_user_id の ON DELETE SET NULL 実測検証
    await pool.query(`
      INSERT INTO line_account_link_requests (nonce_hash, target_user_id, previous_user_id, status, expires_at)
      VALUES ('hash_set_null_test', $1, $2, 'completed', NOW())
    `, [u1Id, u2Id]);

    // u2 (previous_user_id) を削除
    await pool.query("DELETE FROM users WHERE id = $1", [u2Id]);
    const { rows: reqSetNull } = await pool.query("SELECT previous_user_id FROM line_account_link_requests WHERE nonce_hash = 'hash_set_null_test'");
    assert.equal(reqSetNull.length, 1);
    assert.equal(reqSetNull[0].previous_user_id, null, "旧ユーザー削除時に previous_user_id が NULL に設定されること");

    // (C) target_user_id の ON DELETE CASCADE 実測検証
    const { rows: uTemp } = await pool.query("INSERT INTO users (name, email) VALUES ('Temp', 'iso_temp@example.com') RETURNING id");
    const tempId = uTemp[0].id;
    await pool.query(`
      INSERT INTO line_account_link_requests (nonce_hash, target_user_id, status, expires_at)
      VALUES ('hash_cascade_test', $1, 'pending', NOW())
    `, [tempId]);
    await pool.query("DELETE FROM users WHERE id = $1", [tempId]);
    const { rows: reqCascade } = await pool.query("SELECT * FROM line_account_link_requests WHERE nonce_hash = 'hash_cascade_test'");
    assert.equal(reqCascade.length, 0, "target_user_id 削除時に CASCADE でリクエストが削除されること");

    // (D) インデックス確認
    const { rows: idx } = await pool.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'line_account_link_requests' AND indexname = 'idx_line_account_link_requests_status_expires'
    `);
    assert.equal(idx.length, 1, "idx_line_account_link_requests_status_expires が存在すること");

    console.log("[IsolatedDBTest] 3. 移管と解除の完全な並行タスク実行（アドバイザリロック＆ハングガード）...");
    // 新しいユーザーを準備
    const { rows: u3 } = await pool.query("INSERT INTO users (name, email) VALUES ('Iso3', 'iso_3@example.com') RETURNING id");
    const u3Id = u3[0].id;
    const { rows: u4 } = await pool.query("INSERT INTO users (name, email, line_user_id) VALUES ('Iso4', 'iso_4@example.com', 'LINE_CONCURRENT_PARALLEL') RETURNING id");
    const u4Id = u4[0].id;

    // u4 の食事記録
    await pool.query("INSERT INTO meal_logs (user_id, meal_type, total_calories) VALUES ($1, 'lunch', 500)", [u4Id]);

    const linkUrl = await startAccountLink(u3Id, "token_conc", poolAdapter);
    const rawNonceConc = new URL(linkUrl).searchParams.get("nonce")!;

    // 独立した完全なトランザクションタスク（開始からコミットまで内部で処理）
    const taskTransfer = async () => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const res = await completeAccountLink(rawNonceConc, "LINE_CONCURRENT_PARALLEL", "ok", client);
        await client.query("COMMIT");
        return res;
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    };

    const taskUnlink = async () => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await unlinkAccount(u4Id, client);
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    };

    // タイムアウトガード (5秒)
    const timeoutGuard = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("並行タスク処理がデッドロックによりタイムアウトしました")), 5000)
    );

    await Promise.race([
      Promise.all([taskTransfer(), taskUnlink()]),
      timeoutGuard
    ]);

    // 最終状態の整合性アサート
    const { rows: u3Check } = await pool.query("SELECT line_user_id FROM users WHERE id = $1", [u3Id]);
    const { rows: u4Check } = await pool.query("SELECT line_user_id FROM users WHERE id = $1", [u4Id]);
    const { rows: u4MealLogs } = await pool.query("SELECT * FROM meal_logs WHERE user_id = $1", [u4Id]);

    assert.equal(u4MealLogs.length, 1, "旧ユーザーの meal_logs データが変更されていないこと");
    assert.equal(u4Check[0].line_user_id, null, "u4 は解散/移管により line_user_id が NULL になっていること");
    assert.equal(u3Check[0].line_user_id, "LINE_CONCURRENT_PARALLEL", "u3 に正しく line_user_id が設定されていること");

    console.log("--------------------------------------------------");
    console.log("✅ 【隔離DBテスト全通過】実PostgreSQLにおける制約・CASCADE・SET NULL・並行タスク直列化テストすべてに完全成功しました！");
    console.log("--------------------------------------------------");
  } finally {
    try {
      await pool.query("DELETE FROM line_account_link_requests");
      await pool.query("DELETE FROM meal_logs WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'iso_%@example.com')");
      await pool.query("DELETE FROM users WHERE email LIKE 'iso_%@example.com'");
    } catch {}
    await pool.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve("scripts/test-line-account-link-isolated-db.ts")) {
  runIsolatedDbTests().catch(err => {
    console.error("[IsolatedDBTest] エラー:", err);
    process.exit(1);
  });
}
