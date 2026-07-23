import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as trackPOST } from "../src/app/api/track/route";

function createJsonRequest(url: string, body: object) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function testTrackApiValidation() {
  console.log("--- 1. /api/track 入力・セキュリティバリデーション統合テスト ---");

  const validAttribution = {
    event_id: "11111111-1111-4111-a111-111111111111",
    anonymous_id: "22222222-2222-4222-a222-222222222222",
    session_id: "33333333-3333-4333-a333-333333333333",
    first_touch: { landing_path: "/dashboard", captured_at: new Date().toISOString() },
    last_touch: { landing_path: "/dashboard", captured_at: new Date().toISOString() },
  };

  // (1) PII 検出拒否 (400)
  {
    const req = createJsonRequest("http://localhost:3000/api/track", {
      event_type: "page_view",
      path: "/dashboard",
      action_detail: "user_email=test@example.com",
      attribution: validAttribution,
    });
    const res = await trackPOST(req);
    assert.equal(res.status, 400, "PIIが含まれる場合は 400 で拒否されること");
    const json = await res.json();
    assert.ok(json.error.includes("PII"), "エラーメッセージに PII が含まれること");
  }

  // (2) 危険スキーム拒否 (400)
  {
    const req = createJsonRequest("http://localhost:3000/api/track", {
      event_type: "click",
      path: "/dashboard",
      action_detail: "javascript:alert(1)",
      attribution: validAttribution,
    });
    const res = await trackPOST(req);
    assert.equal(res.status, 400, "危険スキームが含まれる場合は 400 で拒否されること");
  }

  // (3) 不正 duration_ms 拒否 (400)
  {
    const req = createJsonRequest("http://localhost:3000/api/track", {
      event_type: "page_view",
      path: "/dashboard",
      duration_ms: -500,
      attribution: validAttribution,
    });
    const res = await trackPOST(req);
    assert.equal(res.status, 400, "負数の duration_ms は 400 で拒否されること");
  }

  // (4) 欠損 banner_id 拒否 (400)
  {
    const req = createJsonRequest("http://localhost:3000/api/track", {
      event_type: "affiliate_impression",
      path: "/dashboard",
      attribution: validAttribution,
      affiliate_properties: {
        placement_id: "card",
      },
    });
    const res = await trackPOST(req);
    assert.equal(res.status, 400, "banner_id が欠損している広告イベントは 400 で拒否されること");
  }

  // (5) 不一致 page_path 拒否 (400)
  {
    const req = createJsonRequest("http://localhost:3000/api/track", {
      event_type: "affiliate_impression",
      path: "/dashboard",
      attribution: validAttribution,
      affiliate_properties: {
        banner_id: 1,
        placement_id: "card",
        page_path: "/fake-path",
      },
    });
    const res = await trackPOST(req);
    assert.equal(res.status, 400, "不一致な page_path は 400 で拒否されること");
  }

  console.log("✓ /api/track 入力・セキュリティバリデーション統合テスト成功");
}

async function main() {
  console.log("==================================================");
  console.log("  LogEats Phase 1.1 ハンドラーバリデーションテスト  ");
  console.log("==================================================");

  await testTrackApiValidation();

  console.log("==================================================");
  console.log("  全バリデーションテストケース成功  ");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("テスト実行失敗:", err);
  process.exit(1);
});
