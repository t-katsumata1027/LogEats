import crypto from "node:crypto";
import { sql } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";
import {
  fetchGoogleMetrics,
  type GoogleMetricsResult,
} from "@/lib/google-analytics";
import {
  sendDiscordAlert,
  sendDiscordReport,
  type ReportData,
} from "@/lib/discord";

type ExecutionStatus =
  | "pending"
  | "pre_send_fail"
  | "unknown_fail"
  | "sent";

type ProductMetrics = {
  totalAnalysis: number;
  successAnalysis: number;
  failedAnalysis: number;
  successRate: number;
  imageAnalysis: number;
  textAnalysis: number;
  newUsers: number;
  firstMealLogs: number;
};

export interface DailyReportExecutionStore {
  reserve(reportDate: string, executionId: string): Promise<boolean>;
  hasOwnership(reportDate: string, executionId: string): Promise<boolean>;
  updateStatus(
    reportDate: string,
    executionId: string,
    status: ExecutionStatus,
    errorMessage?: string,
  ): Promise<boolean>;
  collectProductMetrics(
    startInclusive: Date,
    endExclusive: Date,
  ): Promise<ProductMetrics>;
  recordSentEvent(
    reportDate: string,
    executionId: string,
  ): Promise<void>;
}

export type DailyReportDependencies = {
  store: DailyReportExecutionStore;
  getNow: () => Date;
  fetchGoogleMetrics: () => Promise<GoogleMetricsResult>;
  sendDiscordReport: (
    webhookUrl: string,
    data: ReportData,
  ) => Promise<boolean>;
  sendDiscordAlert: (
    webhookUrl: string,
    title: string,
    reason: string,
  ) => Promise<boolean>;
  checkSiteHealth: (siteUrl: string) => Promise<boolean>;
};

class PostgresDailyReportExecutionStore
  implements DailyReportExecutionStore
{
  async reserve(reportDate: string, executionId: string) {
    const { rowCount } = await sql`
      INSERT INTO cron_report_executions (
        report_date,
        status,
        execution_id,
        started_at
      ) VALUES (
        ${reportDate}::date,
        'pending',
        ${executionId}::uuid,
        NOW()
      )
      ON CONFLICT (report_date) DO NOTHING;
    `;

    return rowCount === 1;
  }

  async hasOwnership(reportDate: string, executionId: string) {
    const { rows } = await sql`
      SELECT 1
      FROM cron_report_executions
      WHERE report_date = ${reportDate}::date
        AND execution_id = ${executionId}::uuid
        AND status = 'pending'
      LIMIT 1;
    `;

    return rows.length === 1;
  }

  async updateStatus(
    reportDate: string,
    executionId: string,
    status: ExecutionStatus,
    errorMessage?: string,
  ) {
    const completedAt = status === "sent" ? new Date() : null;
    const { rowCount } = await sql`
      UPDATE cron_report_executions
      SET
        status = ${status},
        completed_at = ${completedAt?.toISOString() ?? null}::timestamptz,
        error_message = ${errorMessage ?? null}
      WHERE report_date = ${reportDate}::date
        AND execution_id = ${executionId}::uuid
        AND status = 'pending';
    `;

    return rowCount === 1;
  }

  async collectProductMetrics(startInclusive: Date, endExclusive: Date) {
    const startIso = startInclusive.toISOString();
    const endIso = endExclusive.toISOString();

    const [{ rows: usageRows }, { rows: userRows }, { rows: firstMealRows }] =
      await Promise.all([
        sql`
          SELECT
            COUNT(*) FILTER (
              WHERE event_type = 'analysis_start'
            ) AS start_count,
            COUNT(*) FILTER (
              WHERE event_type = 'analysis_success'
            ) AS success_count,
            COUNT(*) FILTER (
              WHERE event_type = 'analysis_error'
            ) AS error_count,
            COUNT(*) FILTER (
              WHERE event_type = 'analysis_start'
                AND properties->>'action_detail' LIKE '%method=image%'
            ) AS image_count,
            COUNT(*) FILTER (
              WHERE event_type = 'analysis_start'
                AND properties->>'action_detail' LIKE '%method=text%'
            ) AS text_count
          FROM product_events
          WHERE occurred_at >= ${startIso}::timestamptz
            AND occurred_at < ${endIso}::timestamptz;
        `,
        sql`
          SELECT COUNT(*) AS count
          FROM users
          WHERE created_at >= ${startIso}::timestamptz
            AND created_at < ${endIso}::timestamptz;
        `,
        sql`
          SELECT COUNT(DISTINCT m1.user_id) AS count
          FROM meal_logs m1
          WHERE m1.logged_at >= ${startIso}::timestamptz
            AND m1.logged_at < ${endIso}::timestamptz
            AND NOT EXISTS (
              SELECT 1
              FROM meal_logs m2
              WHERE m2.user_id = m1.user_id
                AND m2.logged_at < m1.logged_at
            );
        `,
      ]);

    const startCount = Number(usageRows[0]?.start_count ?? 0);
    const successAnalysis = Number(usageRows[0]?.success_count ?? 0);
    const failedAnalysis = Number(usageRows[0]?.error_count ?? 0);
    const finishedAnalysis = successAnalysis + failedAnalysis;

    return {
      totalAnalysis: startCount || finishedAnalysis,
      successAnalysis,
      failedAnalysis,
      successRate:
        finishedAnalysis > 0
          ? (successAnalysis / finishedAnalysis) * 100
          : 100,
      imageAnalysis: Number(usageRows[0]?.image_count ?? 0),
      textAnalysis: Number(usageRows[0]?.text_count ?? 0),
      newUsers: Number(userRows[0]?.count ?? 0),
      firstMealLogs: Number(firstMealRows[0]?.count ?? 0),
    };
  }

  async recordSentEvent(reportDate: string, executionId: string) {
    const eventId = crypto.randomUUID();
    const properties = JSON.stringify({
      date: reportDate,
      status: "sent",
      execution_id: executionId,
    });

    await sql`
      INSERT INTO product_events (
        event_id,
        event_type,
        path,
        properties,
        occurred_at
      ) VALUES (
        ${eventId}::uuid,
        'daily_report_sent',
        '/api/cron/daily-report',
        ${properties}::jsonb,
        NOW()
      );
    `;
  }
}

function getPreviousJstDate(now: Date) {
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  jstNow.setUTCDate(jstNow.getUTCDate() - 1);
  return jstNow.toISOString().slice(0, 10);
}

function getJstDayRange(reportDate: string) {
  const startInclusive = new Date(`${reportDate}T00:00:00+09:00`);
  const endExclusive = new Date(
    startInclusive.getTime() + 24 * 60 * 60 * 1000,
  );
  return { startInclusive, endExclusive };
}

async function defaultCheckSiteHealth(siteUrl: string) {
  try {
    const response = await fetch(
      new URL("/robots.txt", siteUrl).toString(),
      {
        method: "HEAD",
        signal: AbortSignal.timeout(5_000),
      },
    );
    return response.status < 500;
  } catch {
    return false;
  }
}

export const defaultDailyReportDependencies: DailyReportDependencies = {
  store: new PostgresDailyReportExecutionStore(),
  getNow: () => new Date(),
  fetchGoogleMetrics,
  sendDiscordReport,
  sendDiscordAlert,
  checkSiteHealth: defaultCheckSiteHealth,
};

export function createDailyReportHandler(
  dependencies: DailyReportDependencies,
) {
  return async function dailyReportHandler(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");

    // Vercel Cron以外からの呼び出しは必ず拒否する。
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const webhookUrl = process.env.DISCORD_REPORT_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { error: "DISCORD_REPORT_WEBHOOK_URL is missing" },
        { status: 500 },
      );
    }

    const siteUrl =
      process.env.GSC_SITE_URL || "https://www.log-eats.com/";
    const reportDate = getPreviousJstDate(dependencies.getNow());
    const { startInclusive, endExclusive } = getJstDayRange(reportDate);
    const executionId = crypto.randomUUID();
    let sendStarted = false;

    const updateFailureStatus = async (
      status: "pre_send_fail" | "unknown_fail",
      title: string,
      errorMessage: string,
    ) => {
      await dependencies.store
        .updateStatus(
          reportDate,
          executionId,
          status,
          errorMessage.slice(0, 2_000),
        )
        .catch((statusError) => {
          console.error(
            `[DailyReport] ${status}への更新に失敗しました。`,
            statusError,
          );
        });

      await dependencies
        .sendDiscordAlert(
          webhookUrl,
          title,
          `${errorMessage}\n対象日: ${reportDate}`,
        )
        .catch((alertError) => {
          console.error(
            "[DailyReport] Discord障害通知に失敗しました。",
            alertError,
          );
        });
    };

    try {
      const reserved = await dependencies.store.reserve(
        reportDate,
        executionId,
      );

      if (!reserved) {
        return NextResponse.json(
          {
            message: `Report for ${reportDate} already initiated or sent.`,
          },
          { status: 200 },
        );
      }
    } catch (reservationError) {
      const message =
        reservationError instanceof Error
          ? reservationError.message
          : String(reservationError);
      console.error("[DailyReport] 実行予約に失敗しました。", reservationError);
      await dependencies
        .sendDiscordAlert(
          webhookUrl,
          "朝報の実行予約に失敗",
          `${message}\n対象日: ${reportDate}`,
        )
        .catch(() => {});
      return NextResponse.json(
        { error: "Failed to reserve daily report execution" },
        { status: 500 },
      );
    }

    try {
      const healthOk = await dependencies.checkSiteHealth(siteUrl);
      if (!healthOk) {
        const message = `サイト（${siteUrl}）のrobots.txtが5xxまたは応答不能です。`;
        await updateFailureStatus(
          "pre_send_fail",
          "サイト異常を検知",
          message,
        );
        return NextResponse.json({ error: message }, { status: 503 });
      }

      const [productMetrics, googleResult] = await Promise.all([
        dependencies.store.collectProductMetrics(
          startInclusive,
          endExclusive,
        ),
        dependencies.fetchGoogleMetrics(),
      ]);

      if (!googleResult.success || !googleResult.ga4) {
        const message =
          googleResult.error || "GA4/GSCデータの取得に失敗しました。";
        await updateFailureStatus(
          "pre_send_fail",
          "Google API取得失敗",
          message,
        );
        return NextResponse.json({ error: message }, { status: 502 });
      }

      const stillOwner = await dependencies.store.hasOwnership(
        reportDate,
        executionId,
      );
      if (!stillOwner) {
        return NextResponse.json(
          { error: "Lost execution ownership" },
          { status: 409 },
        );
      }

      const reportData: ReportData = {
        date: reportDate,
        ga4: googleResult.ga4,
        gsc: googleResult.gsc,
        usage: {
          totalAnalysis: productMetrics.totalAnalysis,
          successAnalysis: productMetrics.successAnalysis,
          failedAnalysis: productMetrics.failedAnalysis,
          successRate: productMetrics.successRate,
          imageAnalysis: productMetrics.imageAnalysis,
          textAnalysis: productMetrics.textAnalysis,
        },
        activation: {
          newUsers: productMetrics.newUsers,
          firstMealLogs: productMetrics.firstMealLogs,
        },
        quality: {
          healthCheckOk: true,
          errorRate:
            productMetrics.successAnalysis +
              productMetrics.failedAnalysis >
            0
              ? (productMetrics.failedAnalysis /
                  (productMetrics.successAnalysis +
                    productMetrics.failedAnalysis)) *
                100
              : 0,
        },
      };

      // ここから先は送信結果が不明になる可能性があるため、自動再送しない。
      sendStarted = true;
      const sent = await dependencies.sendDiscordReport(
        webhookUrl,
        reportData,
      );

      if (!sent) {
        const message =
          "Discord Webhookが成功応答を返しませんでした。送信済みの可能性があるため自動再送しません。";
        await updateFailureStatus(
          "unknown_fail",
          "Discord送信結果不明",
          message,
        );
        return NextResponse.json({ error: message }, { status: 502 });
      }

      const markedSent = await dependencies.store.updateStatus(
        reportDate,
        executionId,
        "sent",
      );
      if (!markedSent) {
        throw new Error("Discord送信後のsent状態更新に失敗しました。");
      }

      // 監査イベントの失敗で送信済み状態を巻き戻さない。
      await dependencies.store
        .recordSentEvent(reportDate, executionId)
        .catch((eventError) => {
          console.error(
            "[DailyReport] daily_report_sentイベントの保存に失敗しました。",
            eventError,
          );
        });

      return NextResponse.json({
        success: true,
        date: reportDate,
        reportData,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      const status = sendStarted ? "unknown_fail" : "pre_send_fail";
      const title = sendStarted
        ? "朝報送信後の処理結果不明"
        : "朝報送信前の処理失敗";

      console.error(`[DailyReport] ${title}`, error);
      await updateFailureStatus(status, title, message);

      return NextResponse.json(
        { error: message },
        { status: sendStarted ? 502 : 500 },
      );
    }
  };
}
