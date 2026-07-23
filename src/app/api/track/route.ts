import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getDbUserId } from "@/auth";
import {
  checkRateLimit,
  exceedsContentLength,
  rateLimitExceededResponse,
} from "@/lib/requestSecurity";
import {
  containsDangerousPattern,
  containsPii,
  isAllowedAffiliateHost,
} from "@/lib/affiliateConfig";

const ALLOWED_EVENT_TYPES = new Set([
  "page_view",
  "page_leave",
  "click",
  "analysis_start",
  "analysis_success",
  "analysis_error",
  "affiliate_impression",
  "affiliate_click",
  "share_created",
  "share_click",
]);

const MAX_BODY_BYTES = 4 * 1024;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TouchpointInput = {
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_content?: unknown;
  utm_term?: unknown;
  referrer?: unknown;
  landing_path?: unknown;
  captured_at?: unknown;
};

type AttributionInput = {
  event_id?: unknown;
  anonymous_id?: unknown;
  session_id?: unknown;
  first_touch?: TouchpointInput;
  last_touch?: TouchpointInput;
};

type RawAffiliateInput = {
  banner_id?: unknown;
  placement_id?: unknown;
  page_path?: unknown;
};

function optionalString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : null;
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export async function POST(request: NextRequest) {
  try {
    if (exceedsContentLength(request, MAX_BODY_BYTES)) {
      return NextResponse.json(
        { error: "Request body is too large" },
        { status: 413 }
      );
    }

    const rateLimit = checkRateLimit(request, {
      scope: "track",
      limit: 180,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit.retryAfterSeconds);
    }

    const rawText = await request.text();

    // 1. 全体レベルでの PII スキャン & 危険スキーム検知
    if (containsPii(rawText)) {
      return NextResponse.json(
        { error: "PII is not allowed in tracking payload" },
        { status: 400 }
      );
    }
    if (containsDangerousPattern(rawText)) {
      return NextResponse.json(
        { error: "Dangerous characters or scheme in payload" },
        { status: 400 }
      );
    }

    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      event_type,
      path,
      duration_ms,
      action_detail,
      attribution,
      affiliate_properties: rawAffiliate,
    } = body as {
      event_type?: unknown;
      path?: unknown;
      duration_ms?: unknown;
      action_detail?: unknown;
      attribution?: AttributionInput;
      affiliate_properties?: RawAffiliateInput;
    };

    // 2. 基本パラメータ型・範囲バリデーション
    if (
      typeof event_type !== "string" ||
      !ALLOWED_EVENT_TYPES.has(event_type) ||
      typeof path !== "string" ||
      !path.startsWith("/") ||
      path.length > 200 ||
      (action_detail !== undefined &&
        (typeof action_detail !== "string" || action_detail.length > 500))
    ) {
      return NextResponse.json(
        { error: "Invalid tracking event parameters" },
        { status: 400 }
      );
    }

    // 3. duration_ms の厳格バリデーション (指定がある場合は 0 ~ 86,400,000 ms の有限数値を要求)
    let safeDuration: number | null = null;
    if (duration_ms !== undefined && duration_ms !== null) {
      if (
        typeof duration_ms !== "number" ||
        !Number.isFinite(duration_ms) ||
        duration_ms < 0 ||
        duration_ms > 86_400_000
      ) {
        return NextResponse.json(
          { error: "Invalid duration_ms parameter" },
          { status: 400 }
        );
      }
      safeDuration = Math.round(duration_ms);
    }

    // 4. 広告イベント専用の厳格なサーバー側バリデーション & DBマスタ照合
    const isAffiliateEvent =
      event_type === "affiliate_impression" || event_type === "affiliate_click";

    let verifiedAffiliate: {
      banner_id: number;
      placement_id: string;
      affiliate_network: string;
      campaign_id: string | null;
      creative_id: string | null;
      target_domain: string | null;
      page_path: string;
    } | null = null;

    if (isAffiliateEvent) {
      if (!rawAffiliate || typeof rawAffiliate !== "object") {
        return NextResponse.json(
          { error: "Missing affiliate_properties for affiliate event" },
          { status: 400 }
        );
      }

      const bannerIdNum = Number(rawAffiliate.banner_id);
      const placementId = optionalString(rawAffiliate.placement_id, 50);

      if (!Number.isInteger(bannerIdNum) || bannerIdNum <= 0 || !placementId) {
        return NextResponse.json(
          { error: "Missing or invalid banner_id or placement_id" },
          { status: 400 }
        );
      }

      // クライアントが渡した page_path が存在する場合、ルート path と一致しなければ拒否
      if (rawAffiliate.page_path !== undefined && rawAffiliate.page_path !== null) {
        if (typeof rawAffiliate.page_path !== "string" || rawAffiliate.page_path !== path) {
          return NextResponse.json(
            { error: "Mismatched page_path in affiliate_properties" },
            { status: 400 }
          );
        }
      }

      // サーバー側で DB のマスタテーブルに照合し、広告属性を確定する (クライアント値は完全に無視)
      const { rows } = await sql`
        SELECT id, name, is_active, affiliate_network, campaign_id, creative_id, target_domain
        FROM affiliate_banners
        WHERE id = ${bannerIdNum}
        LIMIT 1
      `;

      if (!rows || rows.length === 0 || !rows[0].is_active) {
        return NextResponse.json(
          { error: "Banner does not exist or is inactive" },
          { status: 400 }
        );
      }

      const bannerMaster = rows[0];
      const targetDomain = bannerMaster.target_domain
        ? String(bannerMaster.target_domain)
        : null;

      if (targetDomain && !isAllowedAffiliateHost(targetDomain)) {
        return NextResponse.json(
          { error: "Target domain is not in allowed affiliate domain list" },
          { status: 400 }
        );
      }

      // page_path はクライアント指定値ではなく、検証済みのルート path を正とする
      verifiedAffiliate = {
        banner_id: Number(bannerMaster.id),
        placement_id: placementId,
        affiliate_network: String(bannerMaster.affiliate_network || "a8"),
        campaign_id: bannerMaster.campaign_id ? String(bannerMaster.campaign_id) : null,
        creative_id: bannerMaster.creative_id ? String(bannerMaster.creative_id) : null,
        target_domain: targetDomain,
        page_path: path,
      };
    }

    const userId = await getDbUserId();

    await sql`
      INSERT INTO access_logs (user_id, event_type, path, duration_ms, action_detail)
      VALUES (${userId}, ${event_type}, ${path}, ${safeDuration}, ${action_detail || null})
    `;

    if (
      attribution &&
      validUuid(attribution.event_id) &&
      validUuid(attribution.anonymous_id) &&
      validUuid(attribution.session_id)
    ) {
      const firstTouch = attribution.first_touch ?? {};
      const lastTouch = attribution.last_touch ?? {};

      const propertiesObj: Record<string, unknown> = {
        duration_ms: safeDuration,
        action_detail: action_detail || null,
        page_path: path,
        first_touch: {
          utm_source: optionalString(firstTouch.utm_source, 100),
          utm_medium: optionalString(firstTouch.utm_medium, 100),
          utm_campaign: optionalString(firstTouch.utm_campaign, 200),
          utm_content: optionalString(firstTouch.utm_content, 200),
          utm_term: optionalString(firstTouch.utm_term, 200),
          referrer: optionalString(firstTouch.referrer, 500),
          landing_path: optionalString(firstTouch.landing_path, 500),
          captured_at: optionalString(firstTouch.captured_at, 50),
        },
        last_touch: {
          utm_source: optionalString(lastTouch.utm_source, 100),
          utm_medium: optionalString(lastTouch.utm_medium, 100),
          utm_campaign: optionalString(lastTouch.utm_campaign, 200),
          utm_content: optionalString(lastTouch.utm_content, 200),
          utm_term: optionalString(lastTouch.utm_term, 200),
          referrer: optionalString(lastTouch.referrer, 500),
          landing_path: optionalString(lastTouch.landing_path, 500),
          captured_at: optionalString(lastTouch.captured_at, 50),
        },
      };

      if (verifiedAffiliate) {
        propertiesObj.affiliate = verifiedAffiliate;
        propertiesObj.banner_id = verifiedAffiliate.banner_id;
        propertiesObj.placement_id = verifiedAffiliate.placement_id;
        propertiesObj.affiliate_network = verifiedAffiliate.affiliate_network;
        propertiesObj.campaign_id = verifiedAffiliate.campaign_id;
        propertiesObj.creative_id = verifiedAffiliate.creative_id;
        propertiesObj.target_domain = verifiedAffiliate.target_domain;
        propertiesObj.page_path = verifiedAffiliate.page_path;
      }

      const properties = JSON.stringify(propertiesObj);

      try {
        await sql`
          INSERT INTO product_events (
            event_id,
            user_id,
            anonymous_id,
            session_id,
            event_type,
            path,
            properties,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
            referrer
          )
          VALUES (
            ${attribution.event_id},
            ${userId},
            ${attribution.anonymous_id},
            ${attribution.session_id},
            ${event_type},
            ${path},
            ${properties}::jsonb,
            ${optionalString(lastTouch.utm_source, 100)},
            ${optionalString(lastTouch.utm_medium, 100)},
            ${optionalString(lastTouch.utm_campaign, 200)},
            ${optionalString(lastTouch.utm_content, 200)},
            ${optionalString(lastTouch.utm_term, 200)},
            ${optionalString(lastTouch.referrer, 500)}
          )
          ON CONFLICT (event_id) DO NOTHING
        `;
      } catch (eventError) {
        console.error("Failed to insert product event:", eventError);
      }
    }

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Failed to insert access log:", error);
    return NextResponse.json({ error: "Tracking failed" }, { status: 500 });
  }
}
