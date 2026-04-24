/**
 * analyzeLogger.ts
 * 食事解析パイプライン用の構造化デバッグロガー
 *
 * Vercel / Edge 環境では console.log がそのままログ基盤に流れるため、
 * JSON 形式で出力することで Vercel ダッシュボードや外部ログツールで
 * フィルタリング・検索が容易になります。
 */

export type AnalyzeStep =
  | "START"
  | "IMAGE_RECEIVED"
  | "AI_RECOGNITION_RESULT"
  | "LABEL_BYPASS"
  | "DB_LOOKUP_HIT"
  | "DB_LOOKUP_MISS"
  | "AI_ESTIMATION_RESULT"
  | "WEIGHT_OVERRIDE"
  | "FOOD_CALC"
  | "SUMMARY"
  | "SAVED"
  | "ERROR";

export interface AnalyzeLogEntry {
  requestId: string;
  ts: string; // ISO8601
  step: AnalyzeStep;
  source: "web" | "line";
  data: Record<string, unknown>;
}

/** requestId を生成（各リクエストで一意） */
export function createRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 構造化ログを console.log に出力する。
 * Vercel のランタイムログで `[ANALYZE]` プレフィックスでフィルタリング可能。
 */
export function logStep(
  requestId: string,
  source: "web" | "line",
  step: AnalyzeStep,
  data: Record<string, unknown>
): void {
  const entry: AnalyzeLogEntry = {
    requestId,
    ts: new Date().toISOString(),
    step,
    source,
    data,
  };
  // プレフィックスを付けることで Vercel ログ上での grep が容易に
  console.log(`[ANALYZE] ${JSON.stringify(entry)}`);
}
