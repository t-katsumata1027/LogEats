import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getDbUserId } from "@/auth";

export async function POST(request: NextRequest) {
    try {
        const { event_type, path, duration_ms, action_detail } = await request.json();

        if (!event_type || !path) {
            return NextResponse.json({ error: "Missing event_type or path" }, { status: 400 });
        }

        const userId = await getDbUserId();

        await sql`
      INSERT INTO access_logs (user_id, event_type, path, duration_ms, action_detail)
      VALUES (${userId}, ${event_type}, ${path}, ${duration_ms || null}, ${action_detail || null})
    `;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to insert access log:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
