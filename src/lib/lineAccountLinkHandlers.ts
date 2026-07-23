import { NextRequest, NextResponse } from "next/server";
import { getDbUserId } from "@/auth";
import { startAccountLink, unlinkAccount } from "@/lib/lineAccountLink";
import { logLineAccountLink } from "@/lib/lineAccountLinkLogger";
import { db } from "@vercel/postgres";

export type GetDbUserIdFunction = () => Promise<number | null>;
export type StartAccountLinkFunction = (dbUserId: number, linkToken: string) => Promise<string>;
export type UnlinkAccountFunction = (dbUserId: number, client: any) => Promise<void>;

interface StartHandlerOptions {
  getUserIdFn?: GetDbUserIdFunction;
  startAccountLinkFn?: StartAccountLinkFunction;
}

interface DeleteHandlerOptions {
  getUserIdFn?: GetDbUserIdFunction;
  unlinkAccountFn?: UnlinkAccountFunction;
  getDbClientFn?: () => Promise<any>;
}

/**
 * POST /api/line/account-link/start のハンドラファクトリ
 * テスト用に認証関数やドメイン処理関数を依存性注入可能です。
 */
export function createStartAccountLinkHandler(options: StartHandlerOptions = {}) {
  const getUserIdFn = options.getUserIdFn || getDbUserId;
  const startFn = options.startAccountLinkFn || startAccountLink;

  return async function POST(req: NextRequest) {
    try {
      const dbUserId = await getUserIdFn();
      if (!dbUserId) {
        logLineAccountLink({ event: 'line_link_failed', success: false, errorType: 'unauthorized' });
        return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
      }

      const body = await req.json().catch(() => ({}));
      const linkToken = body.linkToken;

      if (!linkToken || typeof linkToken !== "string" || linkToken.trim().length === 0 || linkToken.length > 1000) {
        logLineAccountLink({ event: 'line_link_failed', success: false, errorType: 'invalid_params' });
        return NextResponse.json({ error: "linkTokenが無効または不正です" }, { status: 400 });
      }

      const redirectUrl = await startFn(dbUserId, linkToken);
      return NextResponse.json({ redirectUrl });
    } catch (error) {
      // 生の例外オブジェクトや秘匿情報メッセージをログへ出力せず、構造化ログのみを出力
      logLineAccountLink({ event: 'line_link_failed', success: false, errorType: 'database_error' });
      return NextResponse.json(
        { error: "LINE連携の開始処理に失敗しました" },
        { status: 500 }
      );
    }
  };
}

/**
 * DELETE /api/line/account-link のハンドラファクトリ
 * テスト用に認証関数、ドメイン処理関数、DBクライアント取得を依存性注入可能です。
 */
export function createDeleteAccountLinkHandler(options: DeleteHandlerOptions = {}) {
  const getUserIdFn = options.getUserIdFn || getDbUserId;
  const unlinkFn = options.unlinkAccountFn || unlinkAccount;
  const getClientFn = options.getDbClientFn || (() => db.connect());

  return async function DELETE(req: NextRequest) {
    try {
      const dbUserId = await getUserIdFn();
      if (!dbUserId) {
        logLineAccountLink({ event: 'line_link_failed', success: false, errorType: 'unauthorized' });
        return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
      }

      let client;
      try {
        client = await getClientFn();
      } catch {
        logLineAccountLink({ event: 'line_link_failed', success: false, errorType: 'database_error' });
        return NextResponse.json(
          { error: "LINE連携の解除処理に失敗しました" },
          { status: 500 }
        );
      }

      try {
        try {
          await client.query("BEGIN");
          await unlinkFn(dbUserId, client);
          await client.query("COMMIT");
        } catch (err) {
          await client.query("ROLLBACK").catch(() => {});
          throw err;
        } finally {
          if (typeof client.release === "function") {
            try {
              client.release();
            } catch {}
          }
        }
      } catch (error) {
        logLineAccountLink({ event: 'line_link_failed', success: false, errorType: 'transaction_error' });
        return NextResponse.json(
          { error: "LINE連携の解除処理に失敗しました" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      logLineAccountLink({ event: 'line_link_failed', success: false, errorType: 'transaction_error' });
      return NextResponse.json(
        { error: "LINE連携の解除処理に失敗しました" },
        { status: 500 }
      );
    }
  };
}
