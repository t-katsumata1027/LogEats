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
}

export async function sendDiscordReport(webhookUrl: string, data: ReportData): Promise<boolean> {
  const embed = {
    title: `📊 LogEats 日次プロダクト朝報 (${data.date})`,
    color: 0x3b82f6, // Blue
    fields: [
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
    ],
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
