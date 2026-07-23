export type LineAccountLinkLogEvent =
  | 'line_link_started'
  | 'line_link_completed'
  | 'line_link_transferred'
  | 'line_link_failed'
  | 'line_link_expired'
  | 'line_link_replayed'
  | 'line_link_token_issue_failed';

export type LineAccountLinkErrorCategory =
  | 'database_error'
  | 'line_api_error'
  | 'transaction_error'
  | 'invalid_params'
  | 'link_token_error'
  | 'request_not_found'
  | 'request_expired'
  | 'signature_invalid'
  | 'unauthorized'
  | 'unknown_error';

export interface LineAccountLinkLogPayload {
  event: LineAccountLinkLogEvent;
  success: boolean;
  errorType?: LineAccountLinkErrorCategory;
  durationMs?: number;
  isTransferred?: boolean;
}

/**
 * LINEアカウント連携の安全な構造化ログ出力
 * 個人情報（line_user_id, nonce, nonce_hash, linkToken, email, 氏名など）は一切出力しません。
 * 任意オブジェクト(details)の受け取りは廃止し、許可された固定型フィールドのみを出力します。
 */
export function logLineAccountLink(payload: LineAccountLinkLogPayload): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    system: "line_account_link",
    event: payload.event,
    success: payload.success,
    ...(payload.errorType ? { errorType: payload.errorType } : {}),
    ...(typeof payload.durationMs === "number" ? { durationMs: payload.durationMs } : {}),
    ...(typeof payload.isTransferred === "boolean" ? { isTransferred: payload.isTransferred } : {}),
  };

  if (payload.success) {
    console.log(JSON.stringify(logEntry));
  } else {
    console.error(JSON.stringify(logEntry));
  }
}
