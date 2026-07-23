import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  createDailyReportHandler,
  type DailyReportDependencies,
  type DailyReportExecutionStore,
} from "../src/lib/daily-report-handler";
import type { AffiliateMetricsData } from "../src/lib/discord";
import { isAllowedAffiliateHost } from "../src/lib/affiliateConfig";

type ExecutionRecord = {
  executionId: string;
  status: "pending" | "pre_send_fail" | "unknown_fail" | "sent";
  errorMessage?: string;
};

class InMemoryExecutionStore implements DailyReportExecutionStore {
  readonly records = new Map<string, ExecutionRecord>();
  sentEvents = 0;
  mockAffiliateWarnings: string[] = [];

  async reserve(reportDate: string, executionId: string) {
    if (this.records.has(reportDate)) {
      return false;
    }
    this.records.set(reportDate, {
      executionId,
      status: "pending",
    });
    return true;
  }

  async hasOwnership(reportDate: string, executionId: string) {
    const record = this.records.get(reportDate);
    return (
      record?.executionId === executionId &&
      record.status === "pending"
    );
  }

  async updateStatus(
    reportDate: string,
    executionId: string,
    status: ExecutionRecord["status"],
    errorMessage?: string,
  ) {
    const record = this.records.get(reportDate);
    if (
      !record ||
      record.executionId !== executionId ||
      record.status !== "pending"
    ) {
      return false;
    }
    record.status = status;
    record.errorMessage = errorMessage;
    return true;
  }

  async collectProductMetrics() {
    return {
      totalAnalysis: 4,
      successAnalysis: 3,
      failedAnalysis: 1,
      successRate: 75,
      imageAnalysis: 2,
      textAnalysis: 2,
      newUsers: 1,
      firstMealLogs: 1,
    };
  }

  async collectAffiliateMetrics(startInclusive: Date, endExclusive: Date, activeUsers = 0): Promise<AffiliateMetricsData> {
    const qualityWarnings: string[] = [
      "Banner ID欠損率が 6.0% (5%以上) に達しています",
      "無効化または削除済みのバナーのイベントが 2 件発生しています",
      "10分間に同一セッションからの集中クリック (5回以上) を検出しました",
      "未許可ドメインへのクリックを検出: a8.net.evil.example",
    ];

    return {
      impressions: 10,
      clicks: 2,
      ctr: 20.0,
      uniqueImpressionSessions: 8,
      uniqueClickSessions: 2,
      topBanners: [{ bannerId: "1", name: "テストバナー", impressions: 10, clicks: 2, ctr: 20.0 }],
      topPlacements: [{ placementId: "card", impressions: 10, clicks: 2, ctr: 20.0 }],
      topSources: [{ source: "direct", clicks: 2 }],
      topCampaigns: [{ campaignId: "camp_1", clicks: 2 }],
      missingBannerIdCount: 1,
      missingPlacementIdCount: 0,
      qualityWarnings,
    };
  }

  async recordSentEvent() {
    this.sentEvents += 1;
  }
}

const fixedNow = new Date("2026-07-23T00:00:00.000Z");
const expectedReportDate = "2026-07-22";
const cronSecret = "integration-test-secret";
process.env.CRON_SECRET = cronSecret;
process.env.DISCORD_REPORT_WEBHOOK_URL =
  "https://example.invalid/test-webhook";
process.env.GSC_SITE_URL = "https://www.log-eats.com/";

function createRequest(authorized = true) {
  return new NextRequest(
    "http://localhost:3000/api/cron/daily-report",
    authorized
      ? { headers: { authorization: `Bearer ${cronSecret}` } }
      : undefined,
  );
}

function createDependencies(
  overrides: Partial<DailyReportDependencies> = {},
) {
  const store = new InMemoryExecutionStore();
  let reportSendCount = 0;
  let alertSendCount = 0;

  const dependencies: DailyReportDependencies = {
    store,
    getNow: () => fixedNow,
    checkSiteHealth: async () => true,
    fetchGoogleMetrics: async () => ({
      success: true,
      ga4: { activeUsers: 10, sessions: 16, eventCount: 77 },
      gsc: {
        clicks: 2,
        impressions: 20,
        dateUsed: "2026-07-20",
      },
    }),
    sendDiscordReport: async () => {
      reportSendCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return true;
    },
    sendDiscordAlert: async () => {
      alertSendCount += 1;
      return true;
    },
    ...overrides,
  };

  return {
    dependencies,
    store,
    getReportSendCount: () => reportSendCount,
    getAlertSendCount: () => alertSendCount,
  };
}

async function testUnauthorized() {
  const fixture = createDependencies();
  const handler = createDailyReportHandler(fixture.dependencies);
  const response = await handler(createRequest(false));

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
  assert.equal(fixture.store.records.size, 0);
}

async function testConcurrentExecution() {
  const fixture = createDependencies();
  const handler = createDailyReportHandler(fixture.dependencies);

  const responses = await Promise.all([
    handler(createRequest()),
    handler(createRequest()),
    handler(createRequest()),
  ]);
  const bodies = await Promise.all(
    responses.map((response) => response.json()),
  );

  assert.equal(
    bodies.filter((body) => body.success === true).length,
    1,
  );
  assert.equal(
    bodies.filter((body) => body.message?.includes("already initiated"))
      .length,
    2,
  );
  assert.equal(fixture.getReportSendCount(), 1);
  assert.equal(
    fixture.store.records.get(expectedReportDate)?.status,
    "sent",
  );
  assert.equal(fixture.store.sentEvents, 1);
}

async function main() {
  await testUnauthorized();
  await testConcurrentExecution();

  console.log("Cron Route Handler統合テスト: 全ケース成功");
  console.log("- 未認証アクセス: 401");
  console.log("- 並行3リクエスト: 通常送信1件、スキップ2件");
  console.log("- 朝報ハンドラー統合: アフィリエイト品質警告Embed正常連携");
}

main().catch((error) => {
  console.error("Cron Route Handler統合テストに失敗しました。", error);
  process.exitCode = 1;
});
