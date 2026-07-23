import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import {
  fetchGoogleMetrics,
  type GoogleMetricsResult,
} from "@/lib/google-analytics";
import {
  sendDiscordAlert,
  sendDiscordReport,
  type ReportData,
  type AffiliateMetricsData,
} from "@/lib/discord";
import { isAllowedAffiliateHost } from "@/lib/affiliateConfig";

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
  collectAffiliateMetrics(
    startInclusive: Date,
    endExclusive: Date,
    activeUsers?: number,
  ): Promise<AffiliateMetricsData>;
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

  async collectAffiliateMetrics(
    startInclusive: Date,
    endExclusive: Date,
    activeUsers = 0,
  ): Promise<AffiliateMetricsData> {
    const startIso = startInclusive.toISOString();
    const endIso = endExclusive.toISOString();

    // 前前日 (Day-2) の期間算出
    const dayMinus2Start = new Date(startInclusive.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const [
      { rows: summaryRows },
      { rows: bannerRows },
      { rows: placementRows },
      { rows: sourceRows },
      { rows: campaignRows },
      { rows: prevImpRows },
      { rows: inactiveEventsRows },
      { rows: spamWindowRows },
      { rows: domainRows },
    ] = await Promise.all([
      // 1. 全体集計
      sql`
        SELECT
          COUNT(*) FILTER (WHERE event_type = 'affiliate_impression') AS imps,
          COUNT(*) FILTER (WHERE event_type = 'affiliate_click') AS clicks,
          COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'affiliate_impression') AS unique_imp_sessions,
          COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'affiliate_click') AS unique_click_sessions,
          COUNT(*) FILTER (
            WHERE event_type IN ('affiliate_impression', 'affiliate_click')
              AND COALESCE(properties->>'banner_id', properties->'affiliate'->>'banner_id') IS NULL
          ) AS missing_banner_ids,
          COUNT(*) FILTER (
            WHERE event_type IN ('affiliate_impression', 'affiliate_click')
              AND COALESCE(properties->>'placement_id', properties->'affiliate'->>'placement_id') IS NULL
          ) AS missing_placement_ids
        FROM product_events
        WHERE occurred_at >= ${startIso}::timestamptz
          AND occurred_at < ${endIso}::timestamptz
          AND event_type IN ('affiliate_impression', 'affiliate_click');
      `,

      // 2. 広告別集計
      sql`
        SELECT
          COALESCE(pe.properties->>'banner_id', pe.properties->'affiliate'->>'banner_id', 'unknown') AS banner_id,
          COALESCE(b.name, '不明な広告バナー') AS banner_name,
          COUNT(*) FILTER (WHERE pe.event_type = 'affiliate_impression') AS imps,
          COUNT(*) FILTER (WHERE pe.event_type = 'affiliate_click') AS clicks
        FROM product_events pe
        LEFT JOIN affiliate_banners b
          ON b.id = CASE
            WHEN COALESCE(pe.properties->>'banner_id', pe.properties->'affiliate'->>'banner_id', '') ~ '^[0-9]{1,10}$'
              THEN CASE
                WHEN COALESCE(pe.properties->>'banner_id', pe.properties->'affiliate'->>'banner_id')::numeric <= 2147483647
                  THEN COALESCE(pe.properties->>'banner_id', pe.properties->'affiliate'->>'banner_id')::integer
              END
          END
        WHERE pe.occurred_at >= ${startIso}::timestamptz
          AND pe.occurred_at < ${endIso}::timestamptz
          AND pe.event_type IN ('affiliate_impression', 'affiliate_click')
        GROUP BY 1, 2
        ORDER BY clicks DESC, imps DESC
        LIMIT 5;
      `,

      // 3. 掲載位置別集計
      sql`
        SELECT
          COALESCE(properties->>'placement_id', properties->'affiliate'->>'placement_id', 'unknown') AS placement_id,
          COUNT(*) FILTER (WHERE event_type = 'affiliate_impression') AS imps,
          COUNT(*) FILTER (WHERE event_type = 'affiliate_click') AS clicks
        FROM product_events
        WHERE occurred_at >= ${startIso}::timestamptz
          AND occurred_at < ${endIso}::timestamptz
          AND event_type IN ('affiliate_impression', 'affiliate_click')
        GROUP BY 1
        ORDER BY clicks DESC, imps DESC
        LIMIT 5;
      `,

      // 4. 流入元別クリック
      sql`
        SELECT
          COALESCE(utm_source, referrer, 'direct') AS source,
          COUNT(*) AS clicks
        FROM product_events
        WHERE occurred_at >= ${startIso}::timestamptz
          AND occurred_at < ${endIso}::timestamptz
          AND event_type = 'affiliate_click'
        GROUP BY 1
        ORDER BY clicks DESC
        LIMIT 3;
      `,

      // 5. キャンペーン別クリック
      sql`
        SELECT
          COALESCE(utm_campaign, properties->>'campaign_id', properties->'affiliate'->>'campaign_id', 'none') AS campaign_id,
          COUNT(*) AS clicks
        FROM product_events
        WHERE occurred_at >= ${startIso}::timestamptz
          AND occurred_at < ${endIso}::timestamptz
          AND event_type = 'affiliate_click'
        GROUP BY 1
        ORDER BY clicks DESC
        LIMIT 3;
      `,

      // 6. 前前日 (Day-2) 表示数 (前日比急減検知用)
      sql`
        SELECT COUNT(*) AS prev_imps
        FROM product_events
        WHERE occurred_at >= ${dayMinus2Start}::timestamptz
          AND occurred_at < ${startIso}::timestamptz
          AND event_type = 'affiliate_impression';
      `,

      // 7. 無効化または非存在バナーのイベント件数
      sql`
        SELECT COUNT(*) AS inactive_count
        FROM product_events pe
        LEFT JOIN affiliate_banners b
          ON b.id = CASE
            WHEN COALESCE(pe.properties->>'banner_id', pe.properties->'affiliate'->>'banner_id', '') ~ '^[0-9]{1,10}$'
              THEN CASE
                WHEN COALESCE(pe.properties->>'banner_id', pe.properties->'affiliate'->>'banner_id')::numeric <= 2147483647
                  THEN COALESCE(pe.properties->>'banner_id', pe.properties->'affiliate'->>'banner_id')::integer
              END
          END
        WHERE pe.occurred_at >= ${startIso}::timestamptz
          AND pe.occurred_at < ${endIso}::timestamptz
          AND pe.event_type IN ('affiliate_impression', 'affiliate_click')
          AND (b.id IS NULL OR b.is_active = false);
      `,

      // 8. スパム判定: 10分時間窓内で同一セッションから5回以上のクリック
      sql`
        SELECT session_id, date_trunc('hour', occurred_at) + (extract(minute from occurred_at)::int / 10) * interval '10 min' as window_start, COUNT(*) AS window_clicks
        FROM product_events
        WHERE occurred_at >= ${startIso}::timestamptz
          AND occurred_at < ${endIso}::timestamptz
          AND event_type = 'affiliate_click'
          AND session_id IS NOT NULL
        GROUP BY session_id, window_start
        HAVING COUNT(*) >= 5
        LIMIT 1;
      `,

      // 9. ドメインチェック: 過去イベントのターゲットドメイン取得
      sql`
        SELECT DISTINCT COALESCE(properties->>'target_domain', properties->'affiliate'->>'target_domain') AS target_domain
        FROM product_events
        WHERE occurred_at >= ${startIso}::timestamptz
          AND occurred_at < ${endIso}::timestamptz
          AND event_type = 'affiliate_click';
      `,
    ]);

    const summary = summaryRows[0] || {};
    const impressions = Number(summary.imps ?? 0);
    const clicks = Number(summary.clicks ?? 0);
    const totalEvents = impressions + clicks;
    const uniqueImpressionSessions = Number(summary.unique_imp_sessions ?? 0);
    const uniqueClickSessions = Number(summary.unique_click_sessions ?? 0);
    const missingBannerIdCount = Number(summary.missing_banner_ids ?? 0);
    const missingPlacementIdCount = Number(summary.missing_placement_ids ?? 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const prevDayMinus2Imps = Number(prevImpRows[0]?.prev_imps ?? 0);
    const inactiveEventCount = Number(inactiveEventsRows[0]?.inactive_count ?? 0);

    const topBanners = bannerRows.map((row: any) => {
      const imps = Number(row.imps ?? 0);
      const clks = Number(row.clicks ?? 0);
      return {
        bannerId: row.banner_id,
        name: row.banner_name,
        impressions: imps,
        clicks: clks,
        ctr: imps > 0 ? (clks / imps) * 100 : 0,
      };
    });

    const topPlacements = placementRows.map((row: any) => {
      const imps = Number(row.imps ?? 0);
      const clks = Number(row.clicks ?? 0);
      return {
        placementId: row.placement_id,
        impressions: imps,
        clicks: clks,
        ctr: imps > 0 ? (clks / imps) * 100 : 0,
      };
    });

    const topSources = sourceRows.map((r: any) => ({ source: String(r.source), clicks: Number(r.clicks) }));
    const topCampaigns = campaignRows.map((r: any) => ({ campaignId: String(r.campaign_id), clicks: Number(r.clicks) }));

    // データ品質異常チェック
    const qualityWarnings: string[] = [];

    if (clicks > impressions && clicks > 2) {
      qualityWarnings.push(`クリック数 (${clicks}) が表示数 (${impressions}) を超えています`);
    }

    if (totalEvents > 0) {
      const bannerIdMissingRatio = (missingBannerIdCount / totalEvents) * 100;
      if (bannerIdMissingRatio >= 5.0) {
        qualityWarnings.push(`Banner ID欠損率が ${bannerIdMissingRatio.toFixed(1)}% (5%以上) に達しています`);
      }

      const placementIdMissingRatio = (missingPlacementIdCount / totalEvents) * 100;
      if (placementIdMissingRatio >= 5.0) {
        qualityWarnings.push(`Placement ID欠損率が ${placementIdMissingRatio.toFixed(1)}% (5%以上) に達しています`);
      }
    } else if (missingBannerIdCount > 0 || missingPlacementIdCount > 0) {
      qualityWarnings.push(`ID欠損イベントが検出されました`);
    }

    if (activeUsers > 20 && impressions === 0) {
      qualityWarnings.push(`訪問者 (${activeUsers}人) がいるにもかかわらず広告表示が0件です`);
    }

    if (prevDayMinus2Imps >= 20 && impressions < prevDayMinus2Imps * 0.5) {
      qualityWarnings.push(`広告表示数が前前日 (${prevDayMinus2Imps} imps) から 50% 以上急減しました (${impressions} imps)`);
    }

    if (inactiveEventCount > 0) {
      qualityWarnings.push(`無効化または削除済みのバナーのイベントが ${inactiveEventCount} 件発生しています`);
    }

    if (spamWindowRows.length > 0) {
      qualityWarnings.push(`10分間に同一セッションからの集中クリック (5回以上) を検出しました`);
    }

    for (const dRow of domainRows) {
      const domain = String(dRow.target_domain || '');
      if (domain && !isAllowedAffiliateHost(domain)) {
        qualityWarnings.push(`未許可ドメインへのクリックを検出: ${domain}`);
      }
    }

    return {
      impressions,
      clicks,
      ctr,
      uniqueImpressionSessions,
      uniqueClickSessions,
      topBanners,
      topPlacements,
      topSources,
      topCampaigns,
      missingBannerIdCount,
      missingPlacementIdCount,
      qualityWarnings,
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

      let affiliateMetrics: AffiliateMetricsData | null = null;
      try {
        affiliateMetrics = await dependencies.store.collectAffiliateMetrics(
          startInclusive,
          endExclusive,
          googleResult.ga4.activeUsers,
        );
      } catch (affError) {
        console.error("[DailyReport] アフィリエイト指標の取得に失敗しました:", affError);
        affiliateMetrics = {
          impressions: 0,
          clicks: 0,
          ctr: 0,
          uniqueImpressionSessions: 0,
          uniqueClickSessions: 0,
          topBanners: [],
          topPlacements: [],
          topSources: [],
          topCampaigns: [],
          missingBannerIdCount: 0,
          missingPlacementIdCount: 0,
          qualityWarnings: ["アフィリエイトデータの取得中に例外が発生しました"],
        };
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
        affiliate: affiliateMetrics,
      };

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
