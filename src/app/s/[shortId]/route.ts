import { sql } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { shortId: string } }
) {
  const { shortId } = await params;

  try {
    // まずは単体 meal_logs を検索
    const { rows: mealRows } = await sql`
      SELECT share_id FROM meal_logs WHERE short_id = ${shortId} LIMIT 1;
    `;

    if (mealRows.length > 0) {
      const shareId = mealRows[0].share_id;
      const url = new URL(`/share/${shareId}`, request.url);
      return NextResponse.redirect(url);
    }

    // 次に daily_shares を検索
    const { rows: dailyRows } = await sql`
      SELECT share_id FROM daily_shares WHERE short_id = ${shortId} LIMIT 1;
    `;

    if (dailyRows.length > 0) {
      const shareId = dailyRows[0].share_id;
      const url = new URL(`/share/daily/${shareId}`, request.url);
      return NextResponse.redirect(url);
    }

    return new NextResponse("Not Found", { status: 404 });
  } catch (error) {
    console.error("Short URL redirect error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
