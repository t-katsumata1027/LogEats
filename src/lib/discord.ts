export interface AffiliateMetricsData {
  impressions: number;
  clicks: number;
  ctr: number;
  uniqueImpressionSessions: number;
  uniqueClickSessions: number;
  topBanners: Array<{
    bannerId: string | number;
    name: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
  topPlacements: Array<{
    placementId: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
  topSources: Array<{ source: string; clicks: number }>;
  topCampaigns: Array<{ campaignId: string; clicks: number }>;
  missingBannerIdCount: number;
  missingPlacementIdCount: number;
  qualityWarnings: string[];
}

export interface ReportData {
  date: string;
  ga4: { activeUsers: number; sessions: number; eventCount: number } | null;
  gsc: { clicks: number; impressions: number } | null;
  usage: {
    totalAnalysis: number;
    successAnalysis: number;
    failedAnalysis: number;
    successRate: number;
    imageAnalysis: number;
    textAnalysis: number;
  };
  activation: {
    newUsers: number;
    firstMealLogs: number;
  };
  quality: {
    healthCheckOk: boolean;
    errorRate: number;
  };
  affiliate?: AffiliateMetricsData | null;
}

export async function sendDiscordReport(webhookUrl: string, data: ReportData): Promise<boolean> {
  const fields = [
    {
      name: "1. 獲得 (GA4 / GSC)",
      value: [
        `👥 ユーザー: **${data.ga4 ? data.ga4.activeUsers : 'データなし'}**`,
        `🔄 セッション: **${data.ga4 ? data.ga4.sessions : 'データなし'}**`,
        `🔍 検索クリック: **${data.gsc ? data.gsc.clicks : 'データなし'}** (表示: ${data.gsc ? data.gsc.impressions : 'データなし'})`
      ].join('\n'),
      inline: false
    },
    {
      name: "2. 利用 (食事解析)",
      value: [
        `📈 解析実行: **${data.usage.totalAnalysis}** 件 (成功率: **${data.usage.successRate.toFixed(1)}%**)`,
        `✅ 成功: ${data.usage.successAnalysis} 件 / ❌ 失敗: ${data.usage.failedAnalysis} 件`,
        `📷 画像: ${data.usage.imageAnalysis} 件 / 📝 テキスト: ${data.usage.textAnalysis} 件`
      ].join('\n'),
      inline: false
    },
    {
      name: "3. 活性化",
      value: [
        `🆕 新規ユーザー登録: **${data.activation.newUsers}** 名`,
        `🍽️ 初回食事記録: **${data.activation.firstMealLogs}** 件`
      ].join('\n'),
      inline: false
    },
    {
      name: "4. 品質 & ヘルス",
      value: [
        `🏥 公開ページヘルスチェック: ${data.quality.healthCheckOk ? '🟢 正常 (200 OK)' : '🔴 異常検知 (5xx)'}`,
        `⚠️ エラー率: **${data.quality.errorRate.toFixed(1)}%**`
      ].join('\n'),
      inline: false
    }
  ];

  if (data.affiliate) {
    const aff = data.affiliate;
    const bannerLines = aff.topBanners.length > 0
      ? aff.topBanners.map(b => `  - [ID:${b.bannerId}] ${b.name}: **${b.clicks}** clicks / ${b.impressions} imps (CTR ${b.ctr.toFixed(1)}%)`).join('\n')
      : '  - データなし';

    const placementLines = aff.topPlacements.length > 0
      ? aff.topPlacements.map(p => `  - ${p.placementId}: **${p.clicks}** clicks / ${p.impressions} imps (CTR ${p.ctr.toFixed(1)}%)`).join('\n')
      : '  - データなし';

    const warningLines = aff.qualityWarnings.length > 0
      ? aff.qualityWarnings.map(w => `⚠️ ${w}`).join('\n')
      : '🟢 計測異常なし';

    fields.push({
      name: "5. 💰 アフィリエイト収益計測",
      value: [
        `👀 表示: **${aff.impressions}** imps (${aff.uniqueImpressionSessions} unique sessions)`,
        `👆 クリック: **${aff.clicks}** clicks (${aff.uniqueClickSessions} unique sessions)`,
        `📊 全体CTR: **${aff.ctr.toFixed(2)}%**`,
        `🏆 広告別:`,
        bannerLines,
        `📍 掲載位置別:`,
        placementLines,
        `🚨 欠損検知: Banner ID欠損 ${aff.missingBannerIdCount}件 / Placement ID欠損 ${aff.missingPlacementIdCount}件`,
        `⚙️ 品質診断: ${warningLines}`
      ].join('\n'),
      inline: false
    });
  }

  const embed = {
    title: `📊 LogEats 日次プロダクト朝報 (${data.date})`,
    color: 0x3b82f6, // Blue
    fields,
    timestamp: new Date().toISOString(),
    footer: {
      text: "LogEats Phase 1 Analytics Bot"
    }
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to send Discord webhook:", err);
    return false;
  }
}

export async function sendDiscordAlert(webhookUrl: string, title: string, reason: string): Promise<boolean> {
  const embed = {
    title: `🚨 朝報自動停止・警告通知`,
    color: 0xef4444, // Red
    description: `**理由**: ${reason}`,
    fields: [
      {
        name: "ステータス",
        value: "自動更新・朝報送信をスキップ/停止しました。手動で原因を確認してください。"
      }
    ],
    timestamp: new Date().toISOString()
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to send Discord alert:", err);
    return false;
  }
}
