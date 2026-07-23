import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { hashNonce, startAccountLink, completeAccountLink, unlinkAccount, issueLinkToken } from "../src/lib/lineAccountLink";
import { logLineAccountLink, LineAccountLinkLogPayload } from "../src/lib/lineAccountLinkLogger";
import { createStartAccountLinkHandler, createDeleteAccountLinkHandler } from "../src/lib/lineAccountLinkHandlers";
import { NextRequest } from "next/server";
import { POST as lineWebhookPOST } from "../src/app/api/webhooks/line/route";

// 簡易Mock DBクライアント / トランザクションエミュレータ
class MockPgClient {
  users: Array<{ id: number; email: string; name: string; line_user_id: string | null }> = [];
  requests: Array<{
    nonce_hash: string;
    target_user_id: number;
    previous_user_id: number | null;
    status: 'pending' | 'completed' | 'failed' | 'expired';
    expires_at: Date;
    created_at: Date;
    completed_at: Date | null;
  }> = [];
  meal_logs: Array<{ id: number; user_id: number; meal_type: string }> = [];
  advisoryLocks: Set<string> = new Set();
  lockedUsers: Set<number> = new Set();

  async query(sqlText: string, params: any[] = []): Promise<{ rows: any[] }> {
    const text = sqlText.trim();

    if (text.startsWith("DELETE FROM line_account_link_requests")) {
      this.requests = this.requests.filter(r => !(r.created_at < new Date(Date.now() - 24 * 60 * 60 * 1000) && r.status !== 'pending'));
      return { rows: [] };
    }

    if (text.startsWith("INSERT INTO line_account_link_requests")) {
      const [nonce_hash, target_user_id, expires_at] = params;
      this.requests.push({
        nonce_hash,
        target_user_id,
        previous_user_id: null,
        status: 'pending',
        expires_at: new Date(expires_at),
        created_at: new Date(),
        completed_at: null,
      });
      return { rows: [] };
    }

    if (text.includes("SELECT pg_advisory_xact_lock")) {
      const key = params[0];
      this.advisoryLocks.add(key);
      return { rows: [] };
    }

    if (text.includes("FROM line_account_link_requests WHERE nonce_hash = $1 FOR UPDATE")) {
      const hash = params[0];
      const match = this.requests.find(r => r.nonce_hash === hash);
      return { rows: match ? [{ ...match }] : [] };
    }

    if (text.includes("FROM users WHERE line_user_id = $1 FOR UPDATE") || text.includes("FROM users WHERE line_user_id = $1")) {
      const lineUserId = params[0];
      const matches = this.users.filter(u => u.line_user_id === lineUserId);
      return { rows: matches.map(u => ({ ...u })) };
    }

    if (text.includes("FROM users WHERE id = $1 FOR UPDATE") || text.includes("FROM users WHERE id = $1")) {
      const id = params[0];
      this.lockedUsers.add(id);
      const matches = this.users.filter(u => u.id === id);
      return { rows: matches.map(u => ({ ...u })) };
    }

    if (text.includes("UPDATE line_account_link_requests SET status = 'expired'")) {
      const hash = params[0];
      const match = this.requests.find(r => r.nonce_hash === hash);
      if (match) match.status = 'expired';
      return { rows: [] };
    }

    if (text.includes("UPDATE line_account_link_requests SET status = 'failed'")) {
      const hash = params[0];
      const match = this.requests.find(r => r.nonce_hash === hash);
      if (match) match.status = 'failed';
      return { rows: [] };
    }

    if (text.includes("UPDATE users SET line_user_id = NULL WHERE id = $1")) {
      const id = params[0];
      const match = this.users.find(u => u.id === id);
      if (match) match.line_user_id = null;
      return { rows: [] };
    }

    if (text.includes("UPDATE users SET line_user_id = $1 WHERE id = $2")) {
      const [lineUserId, id] = params;
      const match = this.users.find(u => u.id === id);
      if (match) match.line_user_id = lineUserId;
      return { rows: [] };
    }

    if (text.includes("UPDATE line_account_link_requests")) {
      const [prevUserId, hash] = params;
      const match = this.requests.find(r => r.nonce_hash === hash);
      if (match) {
        match.status = 'completed';
        match.completed_at = new Date();
        match.previous_user_id = prevUserId;
      }
      return { rows: [] };
    }

    return { rows: [] };
  }
}

test("LINE アカウント連携 クリーン統合テストスイート", async (t) => {
  let mockDb: MockPgClient;

  t.beforeEach(() => {
    mockDb = new MockPgClient();
    mockDb.users.push(
      { id: 1, email: "user1@example.com", name: "User 1", line_user_id: null },
      { id: 2, email: "user2@example.com", name: "User 2", line_user_id: "LINE_USER_OLD" }
    );
    mockDb.meal_logs.push(
      { id: 101, user_id: 2, meal_type: "lunch" }
    );
  });

  await t.test("1. 未連携ユーザーが正常に連携できる", async () => {
    const url = await startAccountLink(1, "valid_token_123", mockDb);
    assert.ok(url.includes("https://access.line.me/dialog/bot/accountLink"));
    
    const parsedUrl = new URL(url);
    const rawNonce = parsedUrl.searchParams.get("nonce")!;
    assert.ok(rawNonce);

    const completeRes = await completeAccountLink(rawNonce, "LINE_USER_NEW", "ok", mockDb);
    assert.equal(completeRes.status, "completed");
    assert.equal(completeRes.isTransferred, false);

    const user1 = mockDb.users.find(u => u.id === 1);
    assert.equal(user1?.line_user_id, "LINE_USER_NEW");
  });

  await t.test("2. 別ユーザーに紐付いたLINEを現在のユーザーへ移管できる", async () => {
    const url = await startAccountLink(1, "valid_token_123", mockDb);
    const parsedUrl = new URL(url);
    const rawNonce = parsedUrl.searchParams.get("nonce")!;

    const completeRes = await completeAccountLink(rawNonce, "LINE_USER_OLD", "ok", mockDb);
    assert.equal(completeRes.status, "completed");
    assert.equal(completeRes.isTransferred, true);

    const user1 = mockDb.users.find(u => u.id === 1);
    const user2 = mockDb.users.find(u => u.id === 2);
    assert.equal(user1?.line_user_id, "LINE_USER_OLD");
    assert.equal(user2?.line_user_id, null);
  });

  await t.test("3. 移管後も旧ユーザーの食事記録が変更されない", async () => {
    const url = await startAccountLink(1, "valid_token_123", mockDb);
    const rawNonce = new URL(url).searchParams.get("nonce")!;

    await completeAccountLink(rawNonce, "LINE_USER_OLD", "ok", mockDb);
    
    const oldUserMealLogs = mockDb.meal_logs.filter(m => m.user_id === 2);
    assert.equal(oldUserMealLogs.length, 1);
    assert.equal(oldUserMealLogs[0].id, 101);
  });

  await t.test("4. 実装API: 未ログインで POST /api/line/account-link/start を呼ぶと 401 が返る (モック注入検証)", async () => {
    const startHandler = createStartAccountLinkHandler({ getUserIdFn: async () => null });

    const req = new NextRequest("http://localhost:3000/api/line/account-link/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkToken: "token123" }),
    });

    const res = await startHandler(req);
    assert.equal(res.status, 401, "未ログインの場合は 401 になること");
  });

  await t.test("5. 実装API: 未ログインで DELETE /api/line/account-link を呼ぶと 401 が返る (モック注入検証)", async () => {
    const deleteHandler = createDeleteAccountLinkHandler({ getUserIdFn: async () => null });

    const req = new NextRequest("http://localhost:3000/api/line/account-link", {
      method: "DELETE",
    });

    const res = await deleteHandler(req);
    assert.equal(res.status, 401, "未ログインの場合は 401 になること");
  });

  await t.test("6. 実装Webhook: 不正な署名のWebhookリクエストを送ると 401 が返る", async () => {
    const { lineConfig } = await import("../src/lib/line");
    lineConfig.channelSecret = "test_channel_secret_key";

    const body = JSON.stringify({ events: [{ type: "message" }] });
    const req = new NextRequest("http://localhost:3000/api/webhooks/line", {
      method: "POST",
      headers: {
        "x-line-signature": "invalid_sig_value",
        "Content-Type": "application/json",
      },
      body,
    });

    const res = await lineWebhookPOST(req);
    assert.equal(res.status, 401, "署名不正のWebhookは 401 になること");
  });

  await t.test("7. 解除(unlinkAccount)と連携完了(completeAccountLink)の統一ロック順序とusers行ロック検証", async () => {
    const url = await startAccountLink(1, "valid_token_123", mockDb);
    const rawNonce = new URL(url).searchParams.get("nonce")!;

    await completeAccountLink(rawNonce, "LINE_USER_NEW", "ok", mockDb);
    assert.ok(mockDb.lockedUsers.has(1), "target_user_id 行がロックされたこと");

    await unlinkAccount(1, mockDb);
    assert.equal(mockDb.users.find(u => u.id === 1)?.line_user_id, null);
    assert.ok(mockDb.advisoryLocks.has("LINE_USER_NEW"));
  });

  await t.test("8. 構造化ログから details プロパティおよび個人情報が排除されていることの検証", () => {
    const logged: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => logged.push(msg);

    try {
      const payload: LineAccountLinkLogPayload = {
        event: "line_link_completed",
        success: true,
        durationMs: 15,
        isTransferred: false,
      };

      logLineAccountLink(payload);

      assert.equal(logged.length, 1);
      const str = logged[0];
      assert.ok(!str.includes("details"));
      assert.ok(!str.includes("line_user_id"));
      assert.ok(!str.includes("nonce"));
      assert.ok(!str.includes("token"));
      assert.ok(!str.includes("email"));

      const parsed = JSON.parse(str);
      assert.equal(parsed.event, "line_link_completed");
      assert.equal(parsed.success, true);
      assert.equal((parsed as any).details, undefined);
    } finally {
      console.log = originalLog;
    }
  });

  await t.test("9. 開始API例外経路の秘匿テスト: ドメイン関数から秘匿例外が送出されてもログ・レスポンスに露出しない", async () => {
    const loggedConsole: string[] = [];
    const origLog = console.log;
    const origErr = console.error;
    console.log = (msg: string) => loggedConsole.push(String(msg));
    console.error = (msg: string) => loggedConsole.push(String(msg));

    try {
      const secretErrorMsg = "secret-link-token@example.com";
      const startHandlerWithError = createStartAccountLinkHandler({
        getUserIdFn: async () => 1,
        startAccountLinkFn: async () => {
          throw new Error(secretErrorMsg);
        },
      });

      const req = new NextRequest("http://localhost:3000/api/line/account-link/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkToken: "valid_token_xyz" }),
      });

      const res = await startHandlerWithError(req);

      assert.equal(res.status, 500, "例外発生時は 500 になること");
      const json = await res.json();
      assert.equal(json.error, "LINE連携の開始処理に失敗しました", "固定の日本語エラーメッセージが返ること");
      assert.ok(!JSON.stringify(json).includes(secretErrorMsg), "レスポンスに秘匿文字列が含まれないこと");

      const allLogs = loggedConsole.join("\n");
      assert.ok(!allLogs.includes(secretErrorMsg), "コンソール/構造化ログに秘匿文字列が含まれないこと");
      assert.ok(allLogs.includes("database_error"), "構造化ログの固定カテゴリが出力されていること");
    } finally {
      console.log = origLog;
      console.error = origErr;
    }
  });

  await t.test("10. 解除API例外経路の秘匿テスト: DB接続エラー時に固定500と構造化ログ(database_error)を返し秘匿文字列を出力しない", async () => {
    const loggedConsole: string[] = [];
    const origLog = console.log;
    const origErr = console.error;
    console.log = (msg: string) => loggedConsole.push(String(msg));
    console.error = (msg: string) => loggedConsole.push(String(msg));

    try {
      const secretDbErrMsg = "secret-db-conn-fail@example.com";
      const deleteHandler = createDeleteAccountLinkHandler({
        getUserIdFn: async () => 1,
        getDbClientFn: async () => {
          throw new Error(secretDbErrMsg);
        },
      });

      const req = new NextRequest("http://localhost:3000/api/line/account-link", {
        method: "DELETE",
      });

      const res = await deleteHandler(req);

      assert.equal(res.status, 500);
      const json = await res.json();
      assert.equal(json.error, "LINE連携の解除処理に失敗しました");
      assert.ok(!JSON.stringify(json).includes(secretDbErrMsg));

      const allLogs = loggedConsole.join("\n");
      assert.ok(!allLogs.includes(secretDbErrMsg));
      assert.ok(allLogs.includes("database_error"));
    } finally {
      console.log = origLog;
      console.error = origErr;
    }
  });

  await t.test("11. 解除API例外経路の秘匿テスト: unlinkAccountFn例外およびROLLBACK失敗時でも固定500と構造化ログ(transaction_error)を返す", async () => {
    const loggedConsole: string[] = [];
    const origLog = console.log;
    const origErr = console.error;
    console.log = (msg: string) => loggedConsole.push(String(msg));
    console.error = (msg: string) => loggedConsole.push(String(msg));

    try {
      const secretUnlinkErrMsg = "secret-unlink-fail@example.com";
      const secretRollbackErrMsg = "secret-rollback-fail@example.com";

      const mockFaultyClient = {
        query: async (text: string) => {
          if (text.includes("ROLLBACK")) {
            throw new Error(secretRollbackErrMsg);
          }
          return { rows: [] };
        },
        release: () => {},
      };

      const deleteHandler = createDeleteAccountLinkHandler({
        getUserIdFn: async () => 1,
        getDbClientFn: async () => mockFaultyClient,
        unlinkAccountFn: async () => {
          throw new Error(secretUnlinkErrMsg);
        },
      });

      const req = new NextRequest("http://localhost:3000/api/line/account-link", {
        method: "DELETE",
      });

      const res = await deleteHandler(req);

      assert.equal(res.status, 500);
      const json = await res.json();
      assert.equal(json.error, "LINE連携の解除処理に失敗しました");
      assert.ok(!JSON.stringify(json).includes(secretUnlinkErrMsg));
      assert.ok(!JSON.stringify(json).includes(secretRollbackErrMsg));

      const allLogs = loggedConsole.join("\n");
      assert.ok(!allLogs.includes(secretUnlinkErrMsg));
      assert.ok(!allLogs.includes(secretRollbackErrMsg));
      assert.ok(allLogs.includes("transaction_error"));
    } finally {
      console.log = origLog;
      console.error = origErr;
    }
  });
});
