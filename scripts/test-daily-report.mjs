import dotenv from 'dotenv';
import { fetchGoogleMetrics } from '../src/lib/google-analytics.js';
import { sendDiscordReport } from '../src/lib/discord.js';

dotenv.config({ path: '.env.local' });

async function testReport() {
  // 実Discordへ送信するスモークテストは明示的な許可がある場合だけ実行する。
  if (process.env.ALLOW_LIVE_DAILY_REPORT_TEST !== 'true') {
    throw new Error(
      '実Discord送信は無効です。実行する場合だけALLOW_LIVE_DAILY_REPORT_TEST=trueを指定してください。'
    );
  }

  console.log("Testing Google Metrics Fetch...");
  const googleRes = await fetchGoogleMetrics();
  console.log("Google Metrics Result:", JSON.stringify(googleRes, null, 2));

  const webhookUrl = process.env.DISCORD_REPORT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log("DISCORD_REPORT_WEBHOOK_URL is not set, skipping Discord send test.");
    return;
  }

  console.log("Testing Discord Webhook Send...");
  const dummyData = {
    date: new Date().toISOString().split('T')[0],
    ga4: googleRes.ga4,
    gsc: googleRes.gsc,
    usage: {
      totalAnalysis: 12,
      successAnalysis: 11,
      failedAnalysis: 1,
      successRate: 91.6,
      imageAnalysis: 8,
      textAnalysis: 4
    },
    activation: {
      newUsers: 3,
      firstMealLogs: 2
    },
    quality: {
      healthCheckOk: true,
      errorRate: 8.3
    }
  };

  const ok = await sendDiscordReport(webhookUrl, dummyData);
  console.log("Discord Webhook Send Status:", ok ? "SUCCESS 🟢" : "FAILED 🔴");
}

testReport().catch(console.error);
