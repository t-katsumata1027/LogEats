import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getCurrentUserEmail } from "@/auth";

export async function GET(req: Request) {
    try {
        const email = await getCurrentUserEmail();
        const adminEmail = process.env.ADMIN_EMAIL;

        if (!email || email !== adminEmail) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Initialize table if it doesn't exist
        await sql`
            CREATE TABLE IF NOT EXISTS affiliate_banners (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                html_content TEXT NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const result = await sql`SELECT * FROM affiliate_banners ORDER BY created_at DESC`;
        return NextResponse.json({ banners: result.rows });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const email = await getCurrentUserEmail();
        const adminEmail = process.env.ADMIN_EMAIL;

        if (!email || email !== adminEmail) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, html_content } = await req.json();

        if (!name || !html_content) {
            return NextResponse.json({ error: "Name and HTML content are required" }, { status: 400 });
        }

        // Make sure table exists
        await sql`
            CREATE TABLE IF NOT EXISTS affiliate_banners (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                html_content TEXT NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const result = await sql`
            INSERT INTO affiliate_banners (name, html_content)
            VALUES (${name}, ${html_content})
            RETURNING *
        `;

        return NextResponse.json({ banner: result.rows[0] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
