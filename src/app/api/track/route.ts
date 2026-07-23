import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getDbUserId } from "@/auth";
import {
    checkRateLimit,
    exceedsContentLength,
    rateLimitExceededResponse,
} from "@/lib/requestSecurity";

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

function optionalString(value: unknown, maxLength: number) {
    return typeof value === "string" && value.length > 0
        ? value.slice(0, maxLength)
        : null;
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

        const {
            event_type,
            path,
            duration_ms,
            action_detail,
            attribution,
        } = (await request.json()) as {
            event_type?: unknown;
            path?: unknown;
            duration_ms?: unknown;
            action_detail?: unknown;
            attribution?: AttributionInput;
        };

        if (
            typeof event_type !== "string" ||
            !ALLOWED_EVENT_TYPES.has(event_type) ||
            typeof path !== "string" ||
            !path.startsWith("/") ||
            path.length > 200 ||
            (action_detail !== undefined &&
                (typeof action_detail !== "string" ||
                    action_detail.length > 500))
        ) {
            return NextResponse.json({ error: "Invalid tracking event" }, { status: 400 });
        }

        const userId = await getDbUserId();
        const safeDuration =
            typeof duration_ms === "number" &&
            Number.isFinite(duration_ms) &&
            duration_ms >= 0
                ? Math.min(Math.round(duration_ms), 86_400_000)
                : null;

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
            const properties = JSON.stringify({
                duration_ms: safeDuration,
                action_detail: action_detail || null,
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
            });

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
                // 移行期間中も既存のaccess_logs計測を止めない
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
