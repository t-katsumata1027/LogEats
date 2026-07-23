import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
    try {
        // 有効なバナーの識別情報とコンテンツを取得
        const { rows } = await sql`
            SELECT
                id,
                name,
                COALESCE(affiliate_network, 'a8') AS affiliate_network,
                campaign_id,
                creative_id,
                target_domain,
                html_content
            FROM affiliate_banners
            WHERE is_active = true
        `;

        if (rows.length === 0) {
            return NextResponse.json({ banner: null });
        }

        // ランダムに1件選択
        const randomIndex = Math.floor(Math.random() * rows.length);
        const selectedBanner = rows[randomIndex];

        return NextResponse.json({ banner: selectedBanner });
    } catch (error) {
        console.error('Failed to fetch affiliate banner:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
