import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60; // Vercel ホスティングにおけるAPIタイムアウトを最大化 (Proの場合は300など可能)

import OpenAI from "openai";
import {
  lookupFoodMasterWithLearned,
  loadLearnedFoods,
  addLearnedFood,
  defaultFoodMaster,
  type FoodMasterRecord,
} from "@/lib/foodDatabase";
import type { AnalyzedFood, NutritionSummary } from "@/lib/types";
import { auth } from "@/auth";
import { put } from "@vercel/blob";
import { sql } from "@vercel/postgres";

const PROMPT = `この写真に写っている料理・食品をすべて列挙し、JSONで返してください。
フォーマットは必ず以下のJSONスキーマに従ってください:
{ 
  "foods": [{ "name": "食品名（日本語）", "amount": "量の目安（例: 1杯、1枚、小皿1つ。不明な場合は省略可）" }],
  "is_ambiguous": boolean, // 写真が遠い、複数人の食事が写っている、料理が一部しか写っていないなど不鮮明な場合にtrueにしてください
  "reason": "is_ambiguousがtrueの場合の理由文（省略可）"
}
説明文やマークダウンは不要です。`;

const NUTRITION_PROMPT = (foodName: string, amountStr?: string) =>
  `あなたは栄養学に精通した管理栄養士です。
ユーザーから入力された食品・料理名「${foodName}」と目安量「${amountStr || "1食分"}」に基づき、日本食品標準成分表（八訂）等に準拠した妥当な数値を推定し、JSONフォーマットのみで返答してください。

【算出の厳密なルール】
1. 一般的なレシピに基づく目安量の「推定重量（g）」を算出して \`estimated_weight_g\` に設定してください。
2. その食品の「100gあたりの成分値（per_100g）」を、成分表に基づき厳密に出力してください。
3. 日本人の食事摂取基準のPFCバランス（P:13-20%, F:20-30%, C:50-65%）を考慮し、極端な脂質超過や炭水化物不足など非現実的な数値にならないよう補正してください。
4. 説明文やマークダウン（\`\`\`json 等）は一切含めず、純粋なJSONテキストのみを出力してください。

【出力JSONスキーマ】
{
  "estimated_weight_g": 数値(g),
  "per_100g": {
    "calories": 数値(kcal),
    "protein": 数値(g),
    "fat": 数値(g),
    "carbs": 数値(g)
  }
}
`;

function parseFoodListJson(content: string): { foods: { name: string; amount?: string }[], is_ambiguous?: boolean, reason?: string } {
  const jsonStr = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const parsed = JSON.parse(jsonStr);
    const arr = parsed.foods || parsed || [];
    const is_ambiguous = parsed.is_ambiguous || false;
    const reason = parsed.reason || "";

    if (!Array.isArray(arr)) return { foods: [], is_ambiguous };

    const foods = arr.map((item: any) => {
      if (typeof item === "string") return { name: item };
      return { name: item.name ?? String(item), amount: item.amount };
    });

    return { foods, is_ambiguous, reason };
  } catch {
    return { foods: [], is_ambiguous: false };
  }
}

function parseNutritionJson(content: string): FoodMasterRecord | null {
  const jsonStr = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const o = JSON.parse(jsonStr) as any;
    const weight = Number(o.estimated_weight_g);
    const p100 = o.per_100g || {};
    const cal = Number(p100.calories);
    const pro = Number(p100.protein);
    const fat = Number(p100.fat);
    const carb = Number(p100.carbs);

    if (!Number.isFinite(weight) || !Number.isFinite(cal) || !Number.isFinite(pro) || !Number.isFinite(fat) || !Number.isFinite(carb))
      return null;

    return {
      unit_name: "1食分", // AI推定のデフォルト単位
      standard_weight_g: weight,
      per_100g: {
        calories: cal,
        protein: pro,
        fat: fat,
        carbs: carb
      }
    };
  } catch {
    return null;
  }
}

/** OpenAI Vision で写っている料理・食品リストを取得 */
async function recognizeWithOpenAI(base64Image: string): Promise<{ foods: { name: string; amount?: string }[], is_ambiguous?: boolean, reason?: string }> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? "",
    fetch: globalThis.fetch.bind(globalThis) // Edge Runtime の Illegal Invocation 対策
  });
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 800,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
        ],
      },
    ],
  });
  const content = response.choices[0]?.message?.content?.trim() ?? '{"foods":[]}';
  return parseFoodListJson(content);
}

/** Google Gemini で写っている料理・食品リストを取得（無料枠あり / Node.js非依存のためREST APIを使用） */
async function recognizeWithGemini(base64Image: string): Promise<{ foods: { name: string; amount?: string }[], is_ambiguous?: boolean, reason?: string }> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  const endpoint = `https://generativelanguage.googleapis.com/v1alpha/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
            { text: PROMPT }
          ]
        }
      ],
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
                  amount: { type: "STRING" }
                },
                required: ["name"]
              }
            },
            is_ambiguous: { type: "BOOLEAN" },
            reason: { type: "STRING" }
          },
          required: ["foods"]
        }
      }
    })
  });
  if (!res.ok) {
    throw new Error(`Gemini API Error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{"foods":[]}';
  return parseFoodListJson(content);
}

/** 食品名と目安量からAIで栄養素（100gあたり）と重量を推定 */
async function estimateNutritionWithAI(foodName: string, amountStr?: string): Promise<FoodMasterRecord> {
  const useGemini = !!process.env.GEMINI_API_KEY;
  if (useGemini) {
    const apiKey = process.env.GEMINI_API_KEY ?? "";
    const endpoint = `https://generativelanguage.googleapis.com/v1alpha/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: NUTRITION_PROMPT(foodName, amountStr) }] }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              estimated_weight_g: { type: "NUMBER" },
              per_100g: {
                type: "OBJECT",
                properties: {
                  calories: { type: "NUMBER" },
                  protein: { type: "NUMBER" },
                  fat: { type: "NUMBER" },
                  carbs: { type: "NUMBER" }
                },
                required: ["calories", "protein", "fat", "carbs"]
              }
            },
            required: ["estimated_weight_g", "per_100g"]
          }
        }
      })
    });
    if (!res.ok) {
      throw new Error(`Gemini API Error: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    const parsed = parseNutritionJson(text);
    if (parsed) return parsed;
  } else {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "",
      fetch: globalThis.fetch.bind(globalThis) // Edge Runtime の Illegal Invocation 対策
    });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 250,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: NUTRITION_PROMPT(foodName, amountStr) }],
    });
    const text = response.choices[0]?.message?.content?.trim() ?? "";
    const parsed = parseNutritionJson(text);
    if (parsed) return parsed;
  }
  return defaultFoodMaster;
}

/** カロリー検算（P: 4kcal/g, F: 9kcal/g, C: 4kcal/g） */
function validateAndCalculateCalories(protein: number, fat: number, carbs: number): number {
  return (protein * 4) + (fat * 9) + (carbs * 4);
}

function buildSummary(foods: AnalyzedFood[]): NutritionSummary {
  return foods.reduce(
    (acc, f) => ({
      totalCalories: acc.totalCalories + f.calories,
      totalProtein: acc.totalProtein + f.protein,
      totalFat: acc.totalFat + f.fat,
      totalCarbs: acc.totalCarbs + f.carbs,
    }),
    { totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 }
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function POST(request: NextRequest) {
  const useGemini = !!process.env.GEMINI_API_KEY;
  const useOpenAI = !!process.env.OPENAI_API_KEY;

  try {
    if (!useGemini && !useOpenAI) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY または OPENAI_API_KEY のどちらかを .env.local に設定してください。",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image");

    if (!image || !(image instanceof Blob)) {
      return NextResponse.json({ error: "画像ファイルを送信してください。" }, { status: 400 });
    }

    // Node.js の Buffer ではなく Edge 環境で確実に安全な Base64 変換を利用する
    const arrayBuffer = await image.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    const { foods: recognizedRaw, is_ambiguous } = useGemini
      ? await recognizeWithGemini(base64)
      : await recognizeWithOpenAI(base64);

    const learned = await loadLearnedFoods();
    const foods: AnalyzedFood[] = [];

    for (const { name, amount } of recognizedRaw) {
      let masterRecord = lookupFoodMasterWithLearned(name, learned);

      // DBにない場合はAIでグラム単位の推定を実行
      if (!masterRecord) {
        masterRecord = await estimateNutritionWithAI(name, amount);
        await addLearnedFood(name, masterRecord);
      }

      // TODO: 実際のアプリでは "amount" の文字列から重量をさらに調整等が可能
      // 今回は一旦 DB標準値 / または AI推定重量 をそのまま使用する
      const weightG = masterRecord.standard_weight_g;

      // 重量に応じた成分量の計算
      const ratio = weightG / 100;
      const initialProtein = masterRecord.per_100g.protein * ratio;
      const initialFat = masterRecord.per_100g.fat * ratio;
      const initialCarbs = masterRecord.per_100g.carbs * ratio;

      // 検算ロジックのアトウォーター係数を適用して全体のカロリーを算出
      const validatedCalories = validateAndCalculateCalories(initialProtein, initialFat, initialCarbs);

      foods.push({
        name,
        nameJa: name,
        amount: amount || masterRecord.unit_name, // 指定が無い場合はマスター情報の単位を出す
        calories: Math.round(validatedCalories),
        protein: Math.round(initialProtein * 10) / 10,
        fat: Math.round(initialFat * 10) / 10,
        carbs: Math.round(initialCarbs * 10) / 10,
      });
    }

    if (foods.length === 0) {
      return NextResponse.json(
        { error: "料理や食品を検知できませんでした。より認識しやすい写真を再度お試しください。" },
        { status: 400 }
      );
    }

    const summary = buildSummary(foods);

    // --- Phase 2: ログイン中ユーザーなら画像をBlobへアップロードしDBに記録する ---
    const session = await auth();
    let imageUrl = null;
    let savedLogId = null;

    if (session?.user?.id) {
      // 1. 画像をVercel Blobへアップロード (public access)
      try {
        const ext = image.name?.split('.').pop() || 'jpg';
        const blobFilename = `meals/${session.user.id}_${Date.now()}.${ext}`;
        const blobResult = await put(blobFilename, image, { access: 'public' });
        imageUrl = blobResult.url;
      } catch (e) {
        console.error("Vercel Blob Upload Error:", e);
        // 画像保存に失敗しても解析結果自体は返せるように続行
      }

      // 2. Postgres の meal_logs に記録を保存
      try {
        const { rows } = await sql`
          INSERT INTO meal_logs (
            user_id, image_url, total_calories, total_protein, 
            total_fat, total_carbs, analyzed_data
          ) VALUES (
            ${session.user.id}, 
            ${imageUrl}, 
            ${summary.totalCalories}, 
            ${summary.totalProtein}, 
            ${summary.totalFat}, 
            ${summary.totalCarbs}, 
            ${JSON.stringify({ foods })}
          )
          RETURNING id;
        `;
        if (rows.length > 0) {
          savedLogId = rows[0].id;
        }
      } catch (e) {
        console.error("Database Insert Error:", e);
      }
    }

    return NextResponse.json({ foods, summary, savedLogId, is_ambiguous });
  } catch (e) {
    console.error("=== API Analysis Error ===", e);
    const err = e as { status?: number; message?: string; name?: string; stack?: string };

    // エラーログをDBに記録
    let savedLogId = null;
    try {
      const session = await auth();
      const userId = session?.user?.id || null;
      let errorMessage = "画像の解析に失敗しました";
      if (err.message) errorMessage += `: ${err.message}`;

      const context = {
        name: err.name,
        stack: err.stack,
        useGemini: !!process.env.GEMINI_API_KEY
      };

      await sql`
        INSERT INTO error_logs (
          user_id, error_message, context
        ) VALUES (
          ${userId ? Number(userId) : null}, 
          ${errorMessage}, 
          ${JSON.stringify(context)}
        )
      `;
    } catch (dbError) {
      console.error("Failed to save error_log to database:", dbError);
    }

    let message = "画像の解析に失敗しました";
    if (err.message) {
      message += `: ${err.message}`;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
