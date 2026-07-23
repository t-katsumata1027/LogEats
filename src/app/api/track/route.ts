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

        const { event_type, path, duration_ms, action_detail } = await request.json();

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

        return NextResponse.json(
            { success: true },
            { headers: { "Cache-Control": "no-store" } }
        );
    } catch (error) {
        console.error("Failed to insert access log:", error);
        return NextResponse.json({ error: "Tracking failed" }, { status: 500 });
    }
}
