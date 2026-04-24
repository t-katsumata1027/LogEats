import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getCurrentUserEmail } from "@/auth";

export async function POST(_req: NextRequest) {
    const email = await getCurrentUserEmail();
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!email || email !== adminEmail) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        await sql`
            CREATE TABLE IF NOT EXISTS analyze_logs (
                id SERIAL PRIMARY KEY,
                request_id TEXT NOT NULL,
                source TEXT NOT NULL,
                step TEXT NOT NULL,
                data JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_analyze_logs_request_id ON analyze_logs(request_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_analyze_logs_created_at ON analyze_logs(created_at DESC)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_analyze_logs_step ON analyze_logs(step)`;

        return NextResponse.json({ success: true, message: "analyze_logs table created (or already existed)" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
