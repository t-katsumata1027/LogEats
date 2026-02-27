import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@vercel/postgres";

// ユーザーの過去の食事記録（meal_logs）を取得するAPI
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // クエリパラメータから取得期間や件数を指定できるようにする（将来用）
    const searchParams = request.nextUrl.searchParams;
    const limitParams = searchParams.get('limit');
    let limit = 50; // デフォルトで直近50件まで
    if (limitParams && !isNaN(parseInt(limitParams))) {
      limit = parseInt(limitParams);
    }

    // ログイン中のユーザーの履歴を日時の新しい順に取得
    const { rows: logsRows } = await sql`
      SELECT 
        id, 
        image_url, 
        meal_type, 
        total_calories, 
        total_protein, 
        total_fat, 
        total_carbs, 
        analyzed_data,
        logged_at
      FROM meal_logs
      WHERE user_id = ${session.user.id}
      ORDER BY logged_at DESC
      LIMIT ${limit}
    `;

    // ユーザーの目標カロリー・PFCも取得しておく
    const { rows: userRows } = await sql`
      SELECT target_calories, target_protein, target_fat, target_carbs, tolerance_pct
      FROM users WHERE id = ${session.user.id} LIMIT 1
    `;
    const targetCalories = userRows.length > 0 ? userRows[0].target_calories : null;
    const targetProtein = userRows.length > 0 ? userRows[0].target_protein : null;
    const targetFat = userRows.length > 0 ? userRows[0].target_fat : null;
    const targetCarbs = userRows.length > 0 ? userRows[0].target_carbs : null;
    const tolerancePct = userRows.length > 0 ? (userRows[0].tolerance_pct ?? 10) : 10;

    return NextResponse.json({ logs: logsRows, targetCalories, targetProtein, targetFat, targetCarbs, tolerancePct });
  } catch (error) {
    console.error("Failed to fetch meal logs:", error);
    return NextResponse.json({ error: "Failed to fetch meal logs" }, { status: 500 });
  }
}
