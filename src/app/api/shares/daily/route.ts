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
    let dateStr;
    if (date) {
      // フロントから yyyy-MM-dd 形式で渡されている場合はそのまま使用
      dateStr = date;
    } else {
      // 未指定の場合は日本時間(JST)での日付を生成
      const now = new Date();
      const jstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
      dateStr = jstDate.toISOString().split('T')[0];
    }

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
