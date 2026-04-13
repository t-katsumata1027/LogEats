import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 有効なバナーをすべて取得
        const { rows } = await sql`
            SELECT html_content FROM affiliate_banners 
            WHERE is_active = true
        `;

        if (!rows || rows.length === 0) {
            return NextResponse.json({ banner: null });
        }

        // ランダムに1つ選択
        const randomIndex = Math.floor(Math.random() * rows.length);
        const banner = rows[randomIndex];

        return NextResponse.json({ banner });
    } catch (error: any) {
        console.error('Failed to fetch random affiliate banner:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
