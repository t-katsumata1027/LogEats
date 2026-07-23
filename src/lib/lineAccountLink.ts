import crypto from "crypto";
import { sql } from "@vercel/postgres";
import { lineConfig } from "./line";
import { logLineAccountLink, LineAccountLinkErrorCategory } from "./lineAccountLinkLogger";

export type AccountLinkCompleteResult = {
  status: 'completed' | 'failed' | 'expired' | 'invalid';
  isTransferred: boolean;
};

/**
 * rawNonceのSHA-256ハッシュ(hex 64文字)を生成します。
 */
export function hashNonce(rawNonce: string): string {
  return crypto.createHash('sha256').update(rawNonce).digest('hex');
}

/**
 * LINE Messaging APIからlinkTokenを発行します。
 * (POST https://api.line.me/v2/bot/user/{userId}/linkToken)
 */
export async function issueLinkToken(lineUserId: string): Promise<string> {
  const startTime = Date.now();
  if (!lineUserId || typeof lineUserId !== 'string') {
    logLineAccountLink({ event: 'line_link_token_issue_failed', success: false, errorType: 'invalid_params' });
    throw new Error("無効なLINEユーザーIDです");
  }

  const accessToken = lineConfig.channelAccessToken;
  if (!accessToken) {
    logLineAccountLink({ event: 'line_link_token_issue_failed', success: false, errorType: 'link_token_error' });
    throw new Error("LINE Messaging APIの設定が不足しています");
  }

  try {
    const res = await fetch(`https://api.line.me/v2/bot/user/${encodeURIComponent(lineUserId)}/linkToken`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      logLineAccountLink({
        event: 'line_link_token_issue_failed',
        success: false,
        errorType: 'line_api_error',
        durationMs: Date.now() - startTime,
      });
      throw new Error(`LINE連携用トークンの発行に失敗しました`);
    }

    const data = await res.json();
    if (!data || typeof data.linkToken !== 'string') {
      logLineAccountLink({
        event: 'line_link_token_issue_failed',
        success: false,
        errorType: 'link_token_error',
        durationMs: Date.now() - startTime,
      });
      throw new Error("LINE連携用トークンの形式が不正です");
    }

    return data.linkToken;
  } catch (err: any) {
    if (err.message && err.message.includes("LINE連携用")) {
      throw err;
    }
    logLineAccountLink({
      event: 'line_link_token_issue_failed',
      success: false,
      errorType: 'line_api_error',
      durationMs: Date.now() - startTime,
    });
    throw new Error("LINE連携用トークンの通信処理中にエラーが発生しました");
  }
}

/**
 * ログイン中ユーザーのLINE連携を開始し、LINE公式のaccount-linking URLを生成します。
 */
export async function startAccountLink(
  dbUserId: number,
  linkToken: string,
  clientOrPool: any = sql
): Promise<string> {
  const startTime = Date.now();

  if (!linkToken || typeof linkToken !== 'string' || linkToken.trim().length === 0 || linkToken.length > 1000) {
    logLineAccountLink({ event: 'line_link_failed', success: false, errorType: 'invalid_params' });
    throw new Error("linkTokenが無効または不正な長さです");
  }

  try {
    // 1. 24時間以上前の完了・失敗・期限切れ要求の遅延削除
    await clientOrPool.query(`
      DELETE FROM line_account_link_requests 
      WHERE created_at < NOW() - INTERVAL '24 hours' AND status != 'pending'
    `);

    // 2. 32バイトのnonceを生成（Base64URL形式）
    const rawNonceBuffer = crypto.randomBytes(32);
    const rawNonce = rawNonceBuffer.toString('base64url');
    const nonceHash = hashNonce(rawNonce);

    // 3. 有効期限（10分後）
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 4. DBへ保存
    await clientOrPool.query(`
      INSERT INTO line_account_link_requests (nonce_hash, target_user_id, status, expires_at)
      VALUES ($1, $2, 'pending', $3)
    `, [nonceHash, dbUserId, expiresAt]);

    // 5. LINE公式account-linking URL生成
    const accountLinkUrl = new URL("https://access.line.me/dialog/bot/accountLink");
    accountLinkUrl.searchParams.set("linkToken", linkToken);
    accountLinkUrl.searchParams.set("nonce", rawNonce);

    logLineAccountLink({
      event: 'line_link_started',
      success: true,
      durationMs: Date.now() - startTime,
    });

    return accountLinkUrl.toString();
  } catch (err: any) {
    logLineAccountLink({
      event: 'line_link_failed',
      success: false,
      errorType: 'database_error',
      durationMs: Date.now() - startTime,
    });
    throw err;
  }
}

/**
 * WebhookからのaccountLinkイベントを受信し、同一トランザクション内で安全に連携を完了します。
 * ロック順序（1. LINE advisory lock -> 2. target_user_id 行ロック -> 3. 既存所有者行ロック）を統一しデッドロックを防止します。
 */
export async function completeAccountLink(
  rawNonce: string,
  lineUserId: string,
  result: 'ok' | 'failed',
  client: any
): Promise<AccountLinkCompleteResult> {
  const startTime = Date.now();

  if (!rawNonce || typeof rawNonce !== 'string' || !lineUserId || typeof lineUserId !== 'string') {
    logLineAccountLink({ event: 'line_link_failed', success: false, errorType: 'invalid_params' });
    return { status: 'invalid', isTransferred: false };
  }

  const nonceHash = hashNonce(rawNonce);

  try {
    // 1. ロック順序 1: 同一LINE user IDをキーとしたアドバイザリロック取得
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext('line_user_link_' || $1))`,
      [lineUserId]
    );

    // 2. 対象の連携要求をFOR UPDATEで行ロック
    const { rows: reqRows } = await client.query(
      `SELECT * FROM line_account_link_requests WHERE nonce_hash = $1 FOR UPDATE`,
      [nonceHash]
    );

    if (reqRows.length === 0) {
      logLineAccountLink({ event: 'line_link_failed', success: false, errorType: 'request_not_found' });
      return { status: 'invalid', isTransferred: false };
    }

    const reqRecord = reqRows[0];

    // 二重更新（Webhook再送）のチェック
    if (reqRecord.status === 'completed') {
      logLineAccountLink({ event: 'line_link_replayed', success: true, isTransferred: false });
      return { status: 'completed', isTransferred: false };
    }

    if (reqRecord.status !== 'pending') {
      logLineAccountLink({ event: 'line_link_failed', success: false, errorType: 'invalid_params' });
      return { status: 'invalid', isTransferred: false };
    }

    // 3. ロック順序 2: 対象 LogEats ユーザー (target_user_id) の行を FOR UPDATE でロック
    const targetUserId = reqRecord.target_user_id;
    await client.query(
      `SELECT id FROM users WHERE id = $1 FOR UPDATE`,
      [targetUserId]
    );

    // 期限切れチェック
    const now = new Date();
    const expiresAt = new Date(reqRecord.expires_at);
    if (expiresAt < now) {
      await client.query(
        `UPDATE line_account_link_requests SET status = 'expired' WHERE nonce_hash = $1`,
        [nonceHash]
      );
      logLineAccountLink({ event: 'line_link_expired', success: false, errorType: 'request_expired' });
      return { status: 'expired', isTransferred: false };
    }

    // LINE側の結果が failed の場合
    if (result === 'failed') {
      await client.query(
        `UPDATE line_account_link_requests SET status = 'failed' WHERE nonce_hash = $1`,
        [nonceHash]
      );
      logLineAccountLink({ event: 'line_link_failed', success: false, errorType: 'line_api_error' });
      return { status: 'failed', isTransferred: false };
    }

    // LINE側の結果が ok の場合
    // 4. ロック順序 3: 現在このLINE user IDを所有している既存所有者ユーザーを検索（ロック付き）
    const { rows: existingOwners } = await client.query(
      `SELECT id FROM users WHERE line_user_id = $1 FOR UPDATE`,
      [lineUserId]
    );

    let isTransferred = false;
    let previousUserId: number | null = null;

    if (existingOwners.length > 0) {
      const existingUser = existingOwners[0];
      if (existingUser.id !== targetUserId) {
        // 別ユーザーに紐付いているため移管処理
        isTransferred = true;
        previousUserId = existingUser.id;
        // 旧ユーザーのline_user_idをNULL化（UNIQUE制約違反を防ぐ順序）
        await client.query(
          `UPDATE users SET line_user_id = NULL WHERE id = $1`,
          [previousUserId]
        );
      }
    }

    // 新ユーザーにline_user_idをセット
    await client.query(
      `UPDATE users SET line_user_id = $1 WHERE id = $2`,
      [lineUserId, targetUserId]
    );

    // 要求をcompletedへ更新
    await client.query(
      `UPDATE line_account_link_requests 
       SET status = 'completed', completed_at = NOW(), previous_user_id = $1 
       WHERE nonce_hash = $2`,
      [previousUserId, nonceHash]
    );

    if (isTransferred) {
      logLineAccountLink({
        event: 'line_link_transferred',
        success: true,
        isTransferred: true,
        durationMs: Date.now() - startTime,
      });
    } else {
      logLineAccountLink({
        event: 'line_link_completed',
        success: true,
        isTransferred: false,
        durationMs: Date.now() - startTime,
      });
    }

    return { status: 'completed', isTransferred };
  } catch (err: any) {
    logLineAccountLink({
      event: 'line_link_failed',
      success: false,
      errorType: 'transaction_error',
      durationMs: Date.now() - startTime,
    });
    throw err;
  }
}

/**
 * ユーザーのLINE連携を解除します。
 * ロック順序を「1. LINE advisory lock -> 2. users 行ロック」に統一しデッドロックを防止します。
 */
export async function unlinkAccount(dbUserId: number, client: any): Promise<void> {
  const startTime = Date.now();
  try {
    // 1. ロックなしで現在の line_user_id を取得
    const { rows: initialRows } = await client.query(
      `SELECT line_user_id FROM users WHERE id = $1`,
      [dbUserId]
    );

    if (initialRows.length === 0) return;

    const currentLineUserId = initialRows[0].line_user_id;

    // 2. ロック順序 1: line_user_id が存在する場合、先に LINE user ID 単位の advisory lock を取得
    if (currentLineUserId) {
      await client.query(
        `SELECT pg_advisory_xact_lock(hashtext('line_user_link_' || $1))`,
        [currentLineUserId]
      );
    }

    // 3. ロック順序 2: 対象ユーザー行を SELECT ... FOR UPDATE でロック
    const { rows: lockedRows } = await client.query(
      `SELECT id, line_user_id FROM users WHERE id = $1 FOR UPDATE`,
      [dbUserId]
    );

    if (lockedRows.length > 0) {
      const recheckedLineUserId = lockedRows[0].line_user_id;
      // ロック前後で line_user_id が変わっていないか安全チェック
      if (recheckedLineUserId === currentLineUserId) {
        await client.query(
          `UPDATE users SET line_user_id = NULL WHERE id = $1`,
          [dbUserId]
        );
      }
    }
  } catch (err: any) {
    logLineAccountLink({
      event: 'line_link_failed',
      success: false,
      errorType: 'transaction_error',
      durationMs: Date.now() - startTime,
    });
    throw err;
  }
}
