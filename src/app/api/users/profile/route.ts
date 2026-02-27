import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from "@/auth";

export async function PATCH(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { target_calories, age, gender, height, weight, activity_level, target_weight,
            target_protein, target_fat, target_carbs, tolerance_pct } = body;

        // 値の検証 (nullやundefined、負の数などを防ぐ)
        if (target_calories === undefined || target_calories === null) {
            return NextResponse.json({ error: "Missing target_calories" }, { status: 400 });
        }

        const numericTarget = Number(target_calories);
        if (isNaN(numericTarget) || numericTarget < 0) {
            return NextResponse.json({ error: "Invalid target_calories value" }, { status: 400 });
        }

        // DBを更新 (usersテーブルの該当レコードのtarget_caloriesと身体情報を一括更新)
        const result = await sql`
            UPDATE users 
            SET 
                target_calories = ${numericTarget},
                age = ${age},
                gender = ${gender},
                height = ${height},
                weight = ${weight},
                target_weight = ${target_weight},
                activity_level = ${activity_level},
                target_protein = ${target_protein ?? null},
                target_fat = ${target_fat ?? null},
                target_carbs = ${target_carbs ?? null},
                tolerance_pct = ${tolerance_pct ?? 10}
            WHERE id = ${session.user.id}
            RETURNING id, target_calories, target_protein, target_fat, target_carbs, tolerance_pct,
                      age, gender, height, weight, target_weight, activity_level;
        `;

        if (result.rowCount === 0) {
            return NextResponse.json({ error: "User record not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Failed to update user profile:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
