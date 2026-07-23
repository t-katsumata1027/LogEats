import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  createDailyReportHandler,
  type DailyReportDependencies,
  type DailyReportExecutionStore,
} from "../src/lib/daily-report-handler";

type ExecutionRecord = {
  executionId: string;
  status: "pending" | "pre_send_fail" | "unknown_fail" | "sent";
  errorMessage?: string;
};

class InMemoryExecutionStore implements DailyReportExecutionStore {
  readonly records = new Map<string, ExecutionRecord>();
  sentEvents = 0;

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

async function testPreSendFailure() {
  const fixture = createDependencies({
    fetchGoogleMetrics: async () => ({
      success: false,
      ga4: null,
      gsc: null,
      error: "テスト用Google APIエラー",
    }),
  });
  const handler = createDailyReportHandler(fixture.dependencies);
  const response = await handler(createRequest());

  assert.equal(response.status, 502);
  assert.equal(
    fixture.store.records.get(expectedReportDate)?.status,
    "pre_send_fail",
  );
  assert.equal(fixture.getReportSendCount(), 0);
  assert.equal(fixture.getAlertSendCount(), 1);
}

async function testUnknownDeliveryFailure() {
  let reportSendCount = 0;
  const fixture = createDependencies({
    sendDiscordReport: async () => {
      reportSendCount += 1;
      return false;
    },
  });
  const handler = createDailyReportHandler(fixture.dependencies);

  const firstResponse = await handler(createRequest());
  const secondResponse = await handler(createRequest());
  const secondBody = await secondResponse.json();

  assert.equal(firstResponse.status, 502);
  assert.equal(secondResponse.status, 200);
  assert.match(secondBody.message, /already initiated/);
  assert.equal(
    fixture.store.records.get(expectedReportDate)?.status,
    "unknown_fail",
  );
  assert.equal(reportSendCount, 1);
  assert.equal(fixture.getAlertSendCount(), 1);
}

async function testUnexpectedPreSendException() {
  const fixture = createDependencies({
    checkSiteHealth: async () => {
      throw new Error("テスト用送信前例外");
    },
  });
  const handler = createDailyReportHandler(fixture.dependencies);
  const originalConsoleError = console.error;
  console.error = () => {};
  const response = await handler(createRequest()).finally(() => {
    console.error = originalConsoleError;
  });

  assert.equal(response.status, 500);
  assert.equal(
    fixture.store.records.get(expectedReportDate)?.status,
    "pre_send_fail",
  );
  assert.equal(fixture.getReportSendCount(), 0);
  assert.equal(fixture.getAlertSendCount(), 1);
}

async function main() {
  await testUnauthorized();
  await testConcurrentExecution();
  await testPreSendFailure();
  await testUnknownDeliveryFailure();
  await testUnexpectedPreSendException();

  console.log("Cron Route Handler統合テスト: 全5ケース成功");
  console.log("- 未認証アクセス: 401");
  console.log("- 並行3リクエスト: 通常送信1件、スキップ2件");
  console.log("- Google API失敗: pre_send_fail、通常送信0件");
  console.log("- Discord結果不明: unknown_fail、自動再送0件");
  console.log("- 送信前例外: pre_send_fail、障害通知1件");
  console.log("- 本番DB・実Discord Webhookへのアクセス: 0件");
}

main().catch((error) => {
  console.error("Cron Route Handler統合テストに失敗しました。", error);
  process.exitCode = 1;
});
