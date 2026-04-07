import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Try selecting from the table. If it doesn't exist, we just return empty array
        // to not crash the public site before the admin visits the dashboard.
        const result = await sql`SELECT name, html_content FROM affiliate_banners WHERE is_active = true`;
        return NextResponse.json({ banners: result.rows });
    } catch (error: any) {
        // Fallback: If table doesn't exist yet, just return empty gracefully
        if (error.message.includes('does not exist')) {
            return NextResponse.json({ banners: [] });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
