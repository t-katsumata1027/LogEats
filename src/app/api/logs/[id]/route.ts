import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getDbUserId } from "@/auth";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getDbUserId();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const logId = parseInt(resolvedParams.id, 10);
        if (isNaN(logId)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        // 所有者確認と削除
        const result = await sql`
            DELETE FROM meal_logs 
            WHERE id = ${logId} AND user_id = ${userId}
            RETURNING id;
        `;

        if (result.rowCount === 0) {
            return NextResponse.json({ error: "Record not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({ success: true, deletedId: logId });
    } catch (error) {
        console.error("Failed to delete log:", error);
        return NextResponse.json({ error: "Failed to delete log" }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getDbUserId();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const logId = parseInt(resolvedParams.id, 10);
        if (isNaN(logId)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        const body = await request.json();
        const { total_calories, total_protein, total_fat, total_carbs, analyzed_data, meal_type } = body;

        // 数値チェック
        if (
            typeof total_calories !== 'number' ||
            typeof total_protein !== 'number' ||
            typeof total_fat !== 'number' ||
            typeof total_carbs !== 'number'
        ) {
            return NextResponse.json({ error: "Invalid nutritional values" }, { status: 400 });
        }

        // meal_type バリデーション
        const validMealTypes = ["breakfast", "lunch", "dinner", "snack", "other"];
        const safeMealType = meal_type && validMealTypes.includes(meal_type) ? meal_type : null;

        // 補正と更新
        const result = await sql`
            UPDATE meal_logs 
            SET total_calories = ${total_calories},
                total_protein = ${total_protein},
                total_fat = ${total_fat},
                total_carbs = ${total_carbs},
                analyzed_data = ${analyzed_data ? JSON.stringify(analyzed_data) : null},
                meal_type = COALESCE(${safeMealType}, meal_type)
            WHERE id = ${logId} AND user_id = ${userId}
            RETURNING id;
        `;

        if (result.rowCount === 0) {
            return NextResponse.json({ error: "Record not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({ success: true, updatedId: logId });
    } catch (error) {
        console.error("Failed to update log:", error);
        return NextResponse.json({ error: "Failed to update log" }, { status: 500 });
    }
}
