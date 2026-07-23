/**
 * last_touch 構造化保存の隔離DB検証スクリプト
 *
 * 目的: /api/track に affiliate_impression と affiliate_click を送信し、
 *       product_events.properties に first_touch と last_touch が
 *       全8フィールド構造化保存されていること、およびトップレベル UTM 列に
 *       last_touch 値が反映されていることを厳密に検証する。
 *
 * 安全設計:
 *   - TEST_POSTGRES_URL 必須（POSTGRES_URL フォールバックなし）
 *   - ALLOW_ISOLATED_DB_TESTS=1 必須
 *   - 接続後に DB 名が ^logeats_test_ であることを検証
 *
 * 前提条件:
 *   - ローカル Next.js dev サーバーが http://localhost:3000 で起動済み
 *   - 隔離 DB にマイグレーション適用済み（affiliate_banners テーブル + Banner ID 101）
 *
 * 実行方法:
 *   $env:ALLOW_ISOLATED_DB_TESTS = "1"
 *   $env:TEST_POSTGRES_URL = "postgres://postgres:postgres@localhost:5432/logeats_test_db"
 *   npx tsx scripts/verify-last-touch.ts
 */
import { Pool } from "pg";
import { randomUUID } from "crypto";
import assert from "node:assert/strict";

// ─────────────────────────────────────────────
// 1. 環境変数ガード
// ─────────────────────────────────────────────

if (process.env.ALLOW_ISOLATED_DB_TESTS !== "1") {
  console.error("❌ ALLOW_ISOLATED_DB_TESTS=1 が設定されていません。安全のため中止します。");
  process.exit(1);
}

const testDbUrl = process.env.TEST_POSTGRES_URL;
if (!testDbUrl) {
  console.error("❌ TEST_POSTGRES_URL が設定されていません。POSTGRES_URL へのフォールバックは安全のため無効です。");
  process.exit(1);
}

// ─────────────────────────────────────────────
// 2. 定数定義
// ─────────────────────────────────────────────

const BASE_URL = "http://localhost:3000";

const anonymousId = randomUUID();
const sessionId = randomUUID();
const impressionEventId = randomUUID();
const clickEventId = randomUUID();

// first_touch と last_touch は意図的に異なる値を設定し、
// DB 上で正しく分離保存されていることを検証する
const FIRST_TOUCH = {
  utm_source: "google",
  utm_medium: "cpc",
  utm_campaign: "summer_2026",
  utm_content: "banner_a",
  utm_term: "食事管理",
  referrer: "https://www.google.com/search?q=食事管理",
  landing_path: "/",
  captured_at: "2026-07-23T08:00:00.000Z",
} as const;

const LAST_TOUCH = {
  utm_source: "twitter",
  utm_medium: "social",
  utm_campaign: "health_promo",
  utm_content: "tweet_1",
  utm_term: "カロリー計算",
  referrer: "https://t.co/abc123",
  landing_path: "/dashboard",
  captured_at: "2026-07-23T09:45:00.000Z",
} as const;

// ─────────────────────────────────────────────
// 3. ヘルパー関数
// ─────────────────────────────────────────────

/** ローカル Next.js サーバーの起動確認（最大 5 秒リトライ） */
async function waitForServer(url: string, maxRetries = 5): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok || res.status === 404) return; // サーバー応答あり
    } catch {
      // 接続拒否 → リトライ
    }
    console.log(`  サーバー応答待ち... (${i + 1}/${maxRetries})`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(
    `❌ ${url} に接続できません。ローカル Next.js dev サーバーが起動していることを確認してください。\n` +
    `   実行例: cmd /c "set POSTGRES_URL=${testDbUrl}&& npm run dev"`
  );
}

/** /api/track にイベントを POST する */
async function sendTrackEvent(eventType: string, eventId: string): Promise<Response> {
  return fetch(`${BASE_URL}/api/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_type: eventType,
      path: "/",
      attribution: {
        event_id: eventId,
        anonymous_id: anonymousId,
        session_id: sessionId,
        first_touch: FIRST_TOUCH,
        last_touch: LAST_TOUCH,
      },
      affiliate_properties: {
        banner_id: 101,
        placement_id: "card",
        page_path: "/",
      },
    }),
  });
}

/** 全 8 フィールドの厳密一致 assert */
function assertTouchEquals(
  actual: Record<string, unknown>,
  expected: Record<string, string>,
  label: string
): void {
  const fields = [
    "utm_source", "utm_medium", "utm_campaign", "utm_content",
    "utm_term", "referrer", "landing_path", "captured_at",
  ] as const;
  for (const field of fields) {
    assert.equal(
      actual[field],
      expected[field],
      `${label}.${field}: 期待="${expected[field]}" 実際="${actual[field]}"`
    );
  }
}

// ─────────────────────────────────────────────
// 4. メイン処理
// ─────────────────────────────────────────────

async function main() {
  const pool = new Pool({ connectionString: testDbUrl });
  let isValidatedTestDatabase = false;

  try {
    console.log("=".repeat(70));
    console.log("  last_touch 構造化保存 隔離DB検証スクリプト");
    console.log("=".repeat(70));
    console.log();

    // ── DB 名検証 ──
    console.log("--- 0. 隔離 DB 安全検証 ---");
    const { rows: dbRows } = await pool.query("SELECT current_database() AS db_name");
    const dbName = dbRows[0].db_name as string;
    console.log(`  接続先 DB 名: ${dbName}`);
    if (!/^logeats_test_/.test(dbName)) {
      throw new Error(
        `❌ DB 名 "${dbName}" は ^logeats_test_ に一致しません。本番 DB への接続を防ぐため中止します。`
      );
    }
    isValidatedTestDatabase = true;
    console.log("  ✅ DB 名が logeats_test_ プレフィックスに一致");
    console.log();

    // ── サーバー起動確認 ──
    console.log("--- 0b. ローカルサーバー起動確認 ---");
    await waitForServer(BASE_URL);
    console.log("  ✅ サーバー応答あり");
    console.log();

    // ── affiliate_impression 送信 ──
    console.log("--- 1. affiliate_impression 送信 ---");
    console.log(`  event_id: ${impressionEventId}`);
    const impRes = await sendTrackEvent("affiliate_impression", impressionEventId);
    assert.equal(impRes.status, 200, `affiliate_impression HTTP Status: ${impRes.status}`);
    console.log("  ✅ 200 OK");
    console.log();

    // ── affiliate_click 送信 ──
    console.log("--- 2. affiliate_click 送信 ---");
    console.log(`  event_id: ${clickEventId}`);
    const clickRes = await sendTrackEvent("affiliate_click", clickEventId);
    assert.equal(clickRes.status, 200, `affiliate_click HTTP Status: ${clickRes.status}`);
    console.log("  ✅ 200 OK");
    console.log();

    // ── properties 内 first_touch / last_touch の全フィールド厳密検証 ──
    console.log("--- 3. product_events.properties 内 first_touch / last_touch 全フィールド突合 ---");
    const { rows } = await pool.query(
      `SELECT event_id, event_type, properties
       FROM product_events
       WHERE event_id = ANY($1::uuid[])
       ORDER BY occurred_at ASC`,
      [[impressionEventId, clickEventId]]
    );
    assert.equal(rows.length, 2, `期待 2 件、実際 ${rows.length} 件`);

    for (const row of rows) {
      console.log();
      console.log(`  event_type: ${row.event_type}`);
      console.log(`  event_id:   ${row.event_id}`);
      const props = row.properties;

      // first_touch 全 8 フィールド
      assert.ok(props.first_touch, `${row.event_type}: first_touch が存在しない`);
      console.log("  first_touch:");
      for (const [k, v] of Object.entries(props.first_touch)) {
        console.log(`    ${k}: ${v}`);
      }
      assertTouchEquals(props.first_touch, FIRST_TOUCH, `${row.event_type}.first_touch`);
      console.log("  ✅ first_touch 全 8 フィールド厳密一致");

      // last_touch 全 8 フィールド
      assert.ok(props.last_touch, `${row.event_type}: last_touch が存在しない`);
      console.log("  last_touch:");
      for (const [k, v] of Object.entries(props.last_touch)) {
        console.log(`    ${k}: ${v}`);
      }
      assertTouchEquals(props.last_touch, LAST_TOUCH, `${row.event_type}.last_touch`);
      console.log("  ✅ last_touch 全 8 フィールド厳密一致");

      // affiliate 属性
      assert.equal(props.banner_id, 101, `banner_id: 期待=101 実際=${props.banner_id}`);
      assert.equal(props.affiliate_network, "a8", `affiliate_network: 期待=a8 実際=${props.affiliate_network}`);
      console.log("  ✅ affiliate 属性正常 (banner_id=101, network=a8)");
    }
    console.log();

    // ── トップレベル UTM 列の厳密検証 ──
    console.log("--- 4. トップレベル UTM 列の厳密検証 (= last_touch 値) ---");
    const { rows: utmRows } = await pool.query(
      `SELECT event_id, event_type, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer
       FROM product_events
       WHERE event_id = ANY($1::uuid[])
       ORDER BY occurred_at ASC`,
      [[impressionEventId, clickEventId]]
    );

    for (const row of utmRows) {
      console.log(`  ${row.event_type}:`);
      console.log(`    utm_source:   ${row.utm_source}`);
      console.log(`    utm_medium:   ${row.utm_medium}`);
      console.log(`    utm_campaign: ${row.utm_campaign}`);
      console.log(`    utm_content:  ${row.utm_content}`);
      console.log(`    utm_term:     ${row.utm_term}`);
      console.log(`    referrer:     ${row.referrer}`);

      // last_touch の値がトップレベル列に反映されていることを厳密検証
      assert.equal(row.utm_source, LAST_TOUCH.utm_source, `トップレベル utm_source 不一致`);
      assert.equal(row.utm_medium, LAST_TOUCH.utm_medium, `トップレベル utm_medium 不一致`);
      assert.equal(row.utm_campaign, LAST_TOUCH.utm_campaign, `トップレベル utm_campaign 不一致`);
      assert.equal(row.utm_content, LAST_TOUCH.utm_content, `トップレベル utm_content 不一致`);
      assert.equal(row.utm_term, LAST_TOUCH.utm_term, `トップレベル utm_term 不一致`);
      assert.equal(row.referrer, LAST_TOUCH.referrer, `トップレベル referrer 不一致`);
      console.log("  ✅ トップレベル UTM 全 5 列 + referrer = last_touch 値（厳密一致）");
    }

    console.log();
    console.log("=".repeat(70));
    console.log("  🎉 全検証項目パス: first_touch / last_touch 構造化保存 OK");
    console.log("=".repeat(70));
  } finally {
    if (isValidatedTestDatabase) {
      await pool.query(
        "DELETE FROM product_events WHERE event_id = ANY($1::uuid[])",
        [[impressionEventId, clickEventId]]
      );
    }
    await pool.end();
  }
}

main().catch((e) => {
  if (e instanceof Error) {
    console.error(`❌ 検証失敗: ${e.message}`);
  } else {
    console.error(e);
  }
  process.exit(1);
});
