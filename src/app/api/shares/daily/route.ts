import { NextRequest, NextResponse } from "next/server";
import { getDbUserId } from "@/auth";
import { sql } from "@vercel/postgres";

function generateShortId(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getDbUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date } = await request.json();
    const targetDate = date ? new Date(date) : new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    // 既存のシェア設定を確認
    const { rows: existing } = await sql`
      SELECT share_id, short_id FROM daily_shares
      WHERE user_id = ${userId} AND share_date = ${dateStr}
      LIMIT 1;
    `;

    if (existing.length > 0) {
      return NextResponse.json({
        share_id: existing[0].share_id,
        short_id: existing[0].short_id,
      });
    }

    // 新規作成
    const short_id = generateShortId();
    const { rows: created } = await sql`
      INSERT INTO daily_shares (user_id, share_date, short_id)
      VALUES (${userId}, ${dateStr}, ${short_id})
      RETURNING share_id, short_id;
    `;

    return NextResponse.json({
      share_id: created[0].share_id,
      short_id: created[0].short_id,
    });

  } catch (error) {
    console.error("Failed to create daily share:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
