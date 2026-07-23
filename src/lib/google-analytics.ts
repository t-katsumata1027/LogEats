import { GoogleAuth } from 'google-auth-library';

export interface GA4Metrics {
  activeUsers: number;
  sessions: number;
  eventCount: number;
}

export interface GSCMetrics {
  clicks: number;
  impressions: number;
  dateUsed: string;
}

export interface GoogleMetricsResult {
  success: boolean;
  ga4: GA4Metrics | null;
  gsc: GSCMetrics | null;
  error?: string;
}

export async function fetchGoogleMetrics(): Promise<GoogleMetricsResult> {
  const base64Json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  const propertyId = process.env.GA4_PROPERTY_ID;
  const siteUrl = process.env.GSC_SITE_URL;

  if (!base64Json) {
    return { success: false, ga4: null, gsc: null, error: "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 is missing" };
  }

  try {
    const jsonStr = Buffer.from(base64Json, 'base64').toString('utf-8');
    const credentials = JSON.parse(jsonStr);

    const auth = new GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/webmasters.readonly'
      ]
    });

    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    const token = tokenRes.token;

    if (!token) {
      return { success: false, ga4: null, gsc: null, error: "Failed to acquire Google access token" };
    }

    let ga4Data: GA4Metrics | null = null;
    let gscData: GSCMetrics | null = null;
    const errors: string[] = [];

    // 1. GA4 Data API
    if (propertyId) {
      try {
        const ga4Res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
            metrics: [
              { name: 'activeUsers' },
              { name: 'sessions' },
              { name: 'eventCount' }
            ]
          })
        });

        if (ga4Res.ok) {
          const json = await ga4Res.json();
          const metricValues = json.rows?.[0]?.metricValues || [];
          ga4Data = {
            activeUsers: parseInt(metricValues[0]?.value || '0', 10),
            sessions: parseInt(metricValues[1]?.value || '0', 10),
            eventCount: parseInt(metricValues[2]?.value || '0', 10)
          };
        } else {
          const errText = await ga4Res.text();
          console.error("GA4 API Error:", errText);
          errors.push(`GA4 API Non-200: ${ga4Res.status}`);
        }
      } catch (err: any) {
        console.error("GA4 API Exception:", err);
        errors.push(`GA4 API Exception: ${err.message}`);
      }
    } else {
      errors.push("GA4_PROPERTY_ID is missing");
    }

    // 2. Search Console API (GSC APIは通常2〜3日遅延があるため、直近3日前を取得)
    if (siteUrl) {
      const targetDate = getDateDaysAgo(3);
      try {
        const gscRes = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            startDate: targetDate,
            endDate: targetDate,
            rowLimit: 10
          })
        });

        if (gscRes.ok) {
          const json = await gscRes.json();
          const rows = json.rows || [];
          let clicks = 0;
          let impressions = 0;
          for (const r of rows) {
            clicks += r.clicks || 0;
            impressions += r.impressions || 0;
          }
          gscData = { clicks, impressions, dateUsed: targetDate };
        } else {
          const errText = await gscRes.text();
          console.error("GSC API Error:", errText);
          errors.push(`GSC API Non-200: ${gscRes.status}`);
        }
      } catch (err: any) {
        console.error("GSC API Exception:", err);
        errors.push(`GSC API Exception: ${err.message}`);
      }
    } else {
      errors.push("GSC_SITE_URL is missing");
    }

    if (errors.length > 0 && !ga4Data && !gscData) {
      return { success: false, ga4: null, gsc: null, error: errors.join("; ") };
    }

    return {
      success: errors.length === 0,
      ga4: ga4Data,
      gsc: gscData,
      error: errors.length > 0 ? errors.join("; ") : undefined
    };
  } catch (err: any) {
    return { success: false, ga4: null, gsc: null, error: err.message || "Google Authentication Exception" };
  }
}

function getDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}
