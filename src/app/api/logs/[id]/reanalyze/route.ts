import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getDbUserId } from "@/auth";
import OpenAI from "openai";
import type { AnalyzedFood } from "@/lib/types";

export const maxDuration = 60;

const PROMPT_REANALYZE = (previousFoodsStr: string, userInstruction: string) => `
あなたは栄養学に精通した管理栄養士です。
以下の料理データ（前回解析結果）について、ユーザーから修正依頼がありました。

【前回の記録データ】
${previousFoodsStr}

【ユーザーからの修正依頼】
「${userInstruction}」

ユーザーの指示に従い、各料理の内容や分量を修正し、日本食品標準成分表（八訂）等に準拠して数値（kcal, g）を再計算してください。
・「少なめ」や「半分」と言われた場合は、その分カロリーやPFC（タンパク質・脂質・炭水化物）を適切に減算してください。
・料理が変更・追加された場合は、一般的なレシピに基づきその数値を推定してください。
・【重要】ユーザーが市販品やコンビニ商品などの「具体的な商品名」を指定してきた場合は、一般的な推定値ではなく、その商品の実際の正確な栄養成分値（カロリー・PFC）を知識ベースから検索・抽出し、それを計算に優先して使用してください。
・指示に基づいて算出した最終的な数値を直接出力してください。
・フォーマットは必ず以下のJSONスキーマに従ってください。説明文やマークダウンは不要です。
{
  "foods": [
    {
      "name": "食品名",
      "amount": "分量の目安（書き換えられた量。例: 半分、少なめ）",
      "calories": 数値(kcal),
      "protein": 数値(g),
      "fat": 数値(g),
      "carbs": 数値(g)
    }
  ]
}
`;

function parseReanalyzedListJson(content: string): AnalyzedFood[] {
    const jsonStr = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    try {
        const parsed = JSON.parse(jsonStr);
        const arr = parsed.foods || parsed || [];
        if (!Array.isArray(arr)) return [];
        return arr.map((item: any) => ({
            name: item.name ?? String(item),
            nameJa: item.name ?? String(item),
            amount: item.amount || "1食分",
            calories: Number(item.calories) || 0,
            protein: Number(item.protein) || 0,
            fat: Number(item.fat) || 0,
            carbs: Number(item.carbs) || 0
        }));
    } catch {
        return [];
    }
}

function validateAndCalculateCalories(protein: number, fat: number, carbs: number): number {
    return (protein * 4) + (fat * 9) + (carbs * 4);
}

export async function POST(
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
        const { instruction, previous_foods } = body;

        if (!instruction || !previous_foods) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const previousFoodsStr = JSON.stringify(previous_foods, null, 2);

        let foods: AnalyzedFood[] = [];
        const useGemini = !!process.env.GEMINI_API_KEY;

        if (useGemini) {
            const apiKey = process.env.GEMINI_API_KEY ?? "";
            const endpoint = `https://generativelanguage.googleapis.com/v1alpha/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: PROMPT_REANALYZE(previousFoodsStr, instruction) }] }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: "OBJECT",
                            properties: {
                                foods: {
                                    type: "ARRAY",
                                    items: {
                                        type: "OBJECT",
                                        properties: {
                                            name: { type: "STRING" },
                                            amount: { type: "STRING" },
                                            calories: { type: "NUMBER" },
                                            protein: { type: "NUMBER" },
                                            fat: { type: "NUMBER" },
                                            carbs: { type: "NUMBER" }
                                        },
                                        required: ["name", "calories", "protein", "carbs", "fat"]
                                    }
                                }
                            },
                            required: ["foods"]
                        }
                    }
                })
            });
            if (!res.ok) throw new Error(`Gemini Error: ${res.status} ${await res.text()}`);
            const data = await res.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{"foods":[]}';
            foods = parseReanalyzedListJson(content);
        } else {
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY ?? "",
                fetch: globalThis.fetch.bind(globalThis)
            });
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                max_tokens: 1000,
                response_format: { type: "json_object" },
                messages: [{ role: "user", content: PROMPT_REANALYZE(previousFoodsStr, instruction) }],
            });
            const content = response.choices[0]?.message?.content?.trim() ?? '{"foods":[]}';
            foods = parseReanalyzedListJson(content);
        }

        // Validate calories based on PFC
        foods = foods.map(f => {
            const valCals = validateAndCalculateCalories(f.protein, f.fat, f.carbs);
            return {
                ...f,
                calories: Math.round(valCals),
                protein: Math.round(f.protein * 10) / 10,
                fat: Math.round(f.fat * 10) / 10,
                carbs: Math.round(f.carbs * 10) / 10,
            };
        });

        const totalCalories = foods.reduce((sum, f) => sum + f.calories, 0);
        const totalProtein = foods.reduce((sum, f) => sum + f.protein, 0);
        const totalFat = foods.reduce((sum, f) => sum + f.fat, 0);
        const totalCarbs = foods.reduce((sum, f) => sum + f.carbs, 0);

        const updateResult = await sql`
            UPDATE meal_logs 
            SET total_calories = ${totalCalories},
                total_protein = ${totalProtein},
                total_fat = ${totalFat},
                total_carbs = ${totalCarbs},
                analyzed_data = ${JSON.stringify({ foods })}
            WHERE id = ${logId} AND user_id = ${userId}
            RETURNING id;
        `;

        if (updateResult.rowCount === 0) {
            return NextResponse.json({ error: "Record not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            updatedData: {
                total_calories: totalCalories,
                total_protein: totalProtein,
                total_fat: totalFat,
                total_carbs: totalCarbs,
                analyzed_data: { foods }
            }
        });

    } catch (e) {
        console.error("=== Re-analyze API Error ===", e);
        const err = e as { message?: string };
        let message = "AI再計算に失敗しました";
        if (err.message) {
            message += `: ${err.message}`;
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
