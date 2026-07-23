import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDbUserId } from "@/auth";
import { sql } from "@vercel/postgres";

function generateShortId(length = 8) {
  return crypto.randomBytes(length).toString("base64url").slice(0, length).toLowerCase();
}

/** 食事記録をユーザーの明示操作で公開共有できる状態にする。 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getDbUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const mealLogId = Number(body?.meal_log_id);
    if (!Number.isInteger(mealLogId) || mealLogId <= 0) {
      return NextResponse.json({ error: "Invalid meal_log_id" }, { status: 400 });
    }

    const { rows } = await sql`
      WITH newly_enabled AS (
        UPDATE meal_logs
        SET share_enabled_at = NOW()
        WHERE id = ${mealLogId}
          AND user_id = ${userId}
          AND share_enabled_at IS NULL
        RETURNING share_id, short_id, TRUE AS created
      ), existing AS (
        SELECT share_id, short_id, FALSE AS created
        FROM meal_logs
        WHERE id = ${mealLogId}
          AND user_id = ${userId}
          AND share_enabled_at IS NOT NULL
      )
      SELECT * FROM newly_enabled
      UNION ALL
      SELECT * FROM existing
      LIMIT 1;
    `;

    if (rows.length === 0 || !rows[0].share_id) {
      return NextResponse.json({ error: "Meal log not found" }, { status: 404 });
    }

    if (!rows[0].short_id) {
      const { rows: updatedRows } = await sql`
        UPDATE meal_logs
        SET short_id = ${generateShortId()}
        WHERE id = ${mealLogId}
          AND user_id = ${userId}
        RETURNING share_id, short_id;
      `;
      if (updatedRows.length === 0 || !updatedRows[0].short_id) {
        return NextResponse.json({ error: "Failed to create share URL" }, { status: 500 });
      }
      rows[0].share_id = updatedRows[0].share_id;
      rows[0].short_id = updatedRows[0].short_id;
    }

    if (rows[0].created) {
      const eventId = crypto.randomUUID();
      const properties = JSON.stringify({ meal_log_id: mealLogId, scope: "meal" });
      try {
        await sql`
          INSERT INTO product_events (event_id, user_id, event_type, path, properties)
          VALUES (
            ${eventId}::uuid,
            ${userId},
            'share_created',
            '/api/shares/meal',
            ${properties}::jsonb
          );
        `;
      } catch (eventError) {
        // 計測不能でもユーザーが要求した共有操作は成功させる。
        console.error("Failed to record meal share event:", eventError);
      }
    }

    return NextResponse.json({
      share_id: rows[0].share_id,
      short_id: rows[0].short_id,
      created: Boolean(rows[0].created),
    });
  } catch (error) {
    console.error("Failed to enable meal share:", error);
    return NextResponse.json({ error: "Failed to enable meal share" }, { status: 500 });
  }
}
