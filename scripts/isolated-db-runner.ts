import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import * as vercelPg from "@vercel/postgres";
import { NextRequest } from "next/server";
import { runAffiliateMigration } from "./migrate-affiliate-banners.mjs";

function createJsonRequest(url: string, body: object) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// 既存の正式マイグレーション SQL ファイルを安全に順次適用する関数
async function applyOfficialMigrations(poolAdapter: any) {
  const migrationFiles = [
    "scripts/migrations/20260723_core_schema.sql",
    "scripts/migrations/20260723_product_events.sql",
    "scripts/migrations/20260723_cron_report_executions.sql",
  ];

  for (const relPath of migrationFiles) {
    const fullPath = path.resolve(relPath);
    if (!fs.existsSync(fullPath)) {
      continue;
    }
    const sqlContent = fs.readFileSync(fullPath, "utf8");
    const statements = sqlContent
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await poolAdapter.query(statement);
    }
  }

  // アフィリエイトマスタマイグレーション
  await runAffiliateMigration(poolAdapter);
}

async function run() {
  const dbUrl = process.env.POSTGRES_URL;
  if (!dbUrl) {
    throw new Error("子プロセスに POSTGRES_URL が渡されていません");
  }

  const pool = new Pool({ connectionString: dbUrl });

  // VercelPool プロトタイプの sql / query を実 pg.Pool へフック
  (vercelPg.VercelPool.prototype as any).sql = function (strings: any, ...values: any[]) {
    if (typeof strings === "string") {
      return pool.query(strings, values[0] || []);
    }
    let queryStr = strings[0];
    for (let i = 1; i < strings.length; i++) {
      queryStr += `$${i}` + strings[i];
    }
    return pool.query(queryStr, values);
  };

  (vercelPg.VercelPool.prototype as any).query = function (sqlText: any, values: any) {
    return pool.query(sqlText, values);
  };

  const poolAdapter = {
    query: (sqlText: string, params?: any[]) => pool.query(sqlText, params),
  };

  try {
    // 1. 厳格な DB 名プレフィックスチェック (/^logeats_test_/i)
    const { rows: dbInfo } = await pool.query("SELECT current_database()");
    const currentDb = String(dbInfo[0]?.current_database || "");
    console.log(`[ChildProcess] 接続先データベース名: '${currentDb}'`);

    const isStrictTestDb = /^logeats_test_/i.test(currentDb);
    if (!isStrictTestDb) {
      throw new Error(
        `【安全保護拒否】DB名 '${currentDb}' は指定された許可形式 '^logeats_test_' に一致しません。本番DB保護のため処理を即時中断しました。`
      );
    }

    console.log("[ChildProcess] 1. 正式マイグレーション SQL 群の適用...");
    await applyOfficialMigrations(poolAdapter);

    // テスト用バナーの挿入
    await pool.query(`
      INSERT INTO affiliate_banners (id, name, html_content, is_active, affiliate_network, campaign_id, creative_id, target_domain)
      VALUES
        (88881, '隔離DB有効バナー', '<a href="https://px.a8.net">Valid</a>', true, 'a8', 'isolated_camp_1', 'isolated_cre_1', 'px.a8.net'),
        (88882, '隔離DB無効バナー', '<a href="https://px.a8.net">Disabled</a>', false, 'a8', 'isolated_camp_2', 'isolated_cre_2', 'px.a8.net')
      ON CONFLICT (id) DO UPDATE SET
        is_active = EXCLUDED.is_active,
        affiliate_network = EXCLUDED.affiliate_network,
        campaign_id = EXCLUDED.campaign_id,
        target_domain = EXCLUDED.target_domain;
    `);

    console.log("[ChildProcess] 2. /api/track API ハンドラー動的ロード & マスタ上書き保存テスト...");
    // 子プロセスの POSTGRES_URL が確定した状態で初めて API Route をインポート
    const { POST: trackPOST } = await import("../src/app/api/track/route");

    const testEventId = "88888888-8888-4888-a888-888888888888";
    const req = createJsonRequest("http://localhost:3000/api/track", {
      event_type: "affiliate_impression",
      path: "/dashboard",
      attribution: {
        event_id: testEventId,
        anonymous_id: "77777777-7777-4777-a777-777777777777",
        session_id: "66666666-6666-4666-a666-666666666666",
        first_touch: { landing_path: "/dashboard", captured_at: new Date().toISOString() },
        last_touch: { landing_path: "/dashboard", captured_at: new Date().toISOString() },
      },
      affiliate_properties: {
        banner_id: 88881,
        placement_id: "card",
        affiliate_network: "fake_network_client_sent", // 偽装
        campaign_id: "fake_campaign_client_sent",       // 偽装
        target_domain: "evil-domain.com",              // 偽装
        page_path: "/dashboard",
      },
    });

    const res = await trackPOST(req);
    assert.equal(res.status, 200, "有効バナーの送信は 200 OK になること");

    const { rows: eventRows } = await pool.query(
      "SELECT properties, path FROM product_events WHERE event_id = $1::uuid",
      [testEventId]
    );
    assert.equal(eventRows.length, 1, "product_events にレコードが保存されていること");
    const props = eventRows[0].properties;

    assert.equal(props.affiliate_network, "a8", "network が DB マスタ値で上書きされていること");
    assert.equal(props.campaign_id, "isolated_camp_1", "campaign_id が DB マスタ値で上書きされていること");
    assert.equal(props.target_domain, "px.a8.net", "target_domain が DB マスタ値で上書きされていること");
    assert.equal(props.page_path, "/dashboard", "page_path がルート path と一致すること");

    console.log("[ChildProcess] 3. 朝報 collectAffiliateMetrics 5大品質警告の個別 assert 検証...");
    const { defaultDailyReportDependencies: dailyDeps } = await import("../src/lib/daily-report-handler");
    const startInclusive = new Date("2026-07-22T00:00:00+09:00");
    const endExclusive = new Date(startInclusive.getTime() + 24 * 60 * 60 * 1000);
    const dayMinus2Start = new Date(startInclusive.getTime() - 24 * 60 * 60 * 1000).toISOString();

    await pool.query("DELETE FROM product_events WHERE path LIKE '/isolated-test-%'");

    // (A) 10分窓スパムクリック
    for (let i = 0; i < 5; i++) {
      await pool.query(
        `INSERT INTO product_events (event_id, anonymous_id, session_id, event_type, path, properties, occurred_at)
         VALUES ($1::uuid, '77777777-7777-4777-a777-777777777777'::uuid, '66666666-6666-4666-a666-666666666661'::uuid, 'affiliate_click', '/isolated-test-spam', '{"banner_id": 88881, "placement_id": "card", "target_domain": "px.a8.net"}'::jsonb, $2::timestamptz)`,
        [`88888888-8888-4888-a888-88888888800${i}`, new Date(startInclusive.getTime() + 60000 + i * 1000).toISOString()]
      );
    }

    // (B) ID 欠損イベント
    await pool.query(
      `INSERT INTO product_events (event_id, anonymous_id, session_id, event_type, path, properties, occurred_at)
       VALUES ('88888888-8888-4888-a888-888888888010'::uuid, '77777777-7777-4777-a777-777777777777'::uuid, '66666666-6666-4666-a666-666666666662'::uuid, 'affiliate_impression', '/isolated-test-missing', '{}'::jsonb, $1::timestamptz)`,
      [new Date(startInclusive.getTime() + 120000).toISOString()]
    );

    // (C) 許可外ドメインへのクリック (`a8.net.evil.example`)
    await pool.query(
      `INSERT INTO product_events (event_id, anonymous_id, session_id, event_type, path, properties, occurred_at)
       VALUES ('88888888-8888-4888-a888-888888888020'::uuid, '77777777-7777-4777-a777-777777777777'::uuid, '66666666-6666-4666-a666-666666666663'::uuid, 'affiliate_click', '/isolated-test-evil', '{"banner_id": 88881, "placement_id": "card", "target_domain": "a8.net.evil.example"}'::jsonb, $1::timestamptz)`,
      [new Date(startInclusive.getTime() + 180000).toISOString()]
    );

    // (D) 無効化バナーのイベント発生
    await pool.query(
      `INSERT INTO product_events (event_id, anonymous_id, session_id, event_type, path, properties, occurred_at)
       VALUES ('88888888-8888-4888-a888-888888888030'::uuid, '77777777-7777-4777-a777-777777777777'::uuid, '66666666-6666-4666-a666-666666666664'::uuid, 'affiliate_impression', '/isolated-test-disabled', '{"banner_id": 88882, "placement_id": "card"}'::jsonb, $1::timestamptz)`,
      [new Date(startInclusive.getTime() + 240000).toISOString()]
    );

    // (E) Day-2 急減イベント
    for (let i = 0; i < 30; i++) {
      await pool.query(
        `INSERT INTO product_events (event_id, anonymous_id, session_id, event_type, path, properties, occurred_at)
         VALUES ($1::uuid, '77777777-7777-4777-a777-777777777777'::uuid, '66666666-6666-4666-a666-666666666665'::uuid, 'affiliate_impression', '/isolated-test-day2', '{"banner_id": 88881, "placement_id": "card"}'::jsonb, $2::timestamptz)`,
        [`88888888-8888-4888-a888-8888888870${i < 10 ? '0' + i : i}`, new Date(new Date(dayMinus2Start).getTime() + i * 1000).toISOString()]
      );
    }

    const store = dailyDeps.store;
    const metrics = await store.collectAffiliateMetrics(startInclusive, endExclusive, 10);
    const warningsText = metrics.qualityWarnings.join("\n");

    assert.ok(warningsText.includes("10分間") || warningsText.includes("集中クリック"), "① 10分窓スパム判定警告が検出されること");
    assert.ok(warningsText.includes("欠損率"), "② ID欠損率 5% 以上判定警告が検出されること");
    assert.ok(warningsText.includes("未許可ドメイン") || warningsText.includes("a8.net.evil.example"), "③ 許可外ドメイン判定警告が検出されること");
    assert.ok(warningsText.includes("無効化") || warningsText.includes("削除済"), "④ 無効バナーイベント発生判定警告が検出されること");
    assert.ok(warningsText.includes("50% 以上急減") || warningsText.includes("前前日"), "⑤ Day-2 表示数 50% 急減判定警告が検出されること");

    console.log("[ChildProcess] ✓ 隔離PostgreSQL E2Eテスト全ケース完全成功");
  } finally {
    try {
      await pool.query("DELETE FROM product_events WHERE path LIKE '/isolated-test-%' OR event_id = '88888888-8888-4888-a888-888888888888'::uuid");
      await pool.query("DELETE FROM affiliate_banners WHERE id IN (88881, 88882)");
    } catch {}
    await pool.end();
  }
}

run().catch((err) => {
  console.error("[ChildProcess] エラー:", err);
  process.exit(1);
});
