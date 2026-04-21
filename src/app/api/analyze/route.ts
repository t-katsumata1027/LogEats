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
import { getDbUserId } from "@/auth";
import { put } from "@vercel/blob";
import { sql } from "@vercel/postgres";
import { logErrorAndNotify } from "@/lib/errorLogger";

const PROMPT = `あなたは食事解析の専門AIです。提供された画像から料理や食品を特定し、以下の手順で分析を行ってください。

【分析ステップ】
1. **画像全体の確認**: 何が写っているか、食事シーンか、それとも食品以外（薬など）かを判断します。
2. **料理の特定**: 各お皿やパッケージを確認し、料理名、主な食材、調理法（焼く、揚げる、煮る等）を推測します。
3. **分量の推計**: 器のサイズや比較対象から、一般的な基準（1人前、1杯、100g等）で分量を推計します。
4. **市販品の識別**: コンビニやスーパーのラベル、ロゴがある場合は正確な商品名を読み取ります。

【最重要ルール】
- 食事や食品「以外」のもの（薬、人物など）しか写っていない場合は、絶対に解析せず \`foods: []\` としてください。
- 解析が困難なほど不鮮明、または複数人の食事が混在している場合は \`is_ambiguous: true\` とし、その理由を記載してください。

【出力例】
- 定食の写真の場合:
  {
    "foods": [
      { "name": "銀鮭の塩焼き", "amount": "1切れ" },
      { "name": "白米", "amount": "茶碗1杯(約150g)" },
      { "name": "味噌汁（わかめと豆腐）", "amount": "1杯" }
    ],
    "is_ambiguous": false
  }
- コンビニおにぎりの場合:
  {
    "foods": [{ "name": "セブンイレブン 手巻おにぎり 紀州南高梅", "amount": "1個" }],
    "is_ambiguous": false
  }

【フォーマット】必ず以下のJSONスキーマに従ってください。
{ 
  "foods": [{ "name": "食品名（日本語）", "amount": "量の目安" }],
  "is_ambiguous": boolean,
  "reason": "理由（必要な場合のみ）"
}
説明文やマークダウンは不要です。`;

const NUTRITION_PROMPT = (foodName: string, amountStr?: string) =>
  `あなたは栄養学に精通した管理栄養士です。
「${foodName}」（目安量: ${amountStr || "1食分"}）の栄養成分を、日本食品標準成分表（八訂）に基づき論理的に推計してください。

【推計のガイドライン】
1. **調理法と味付けの考慮**: 揚げ物の場合は吸油率（衣の種類等）を、煮物や炒め物の場合は一般的な調味料（砂糖、醤油、油等）の使用量を考慮に含めてください。
2. **標準重量の参照**: 特記がない場合、以下の標準的な重量を参考にしてください。
   - ご飯（茶碗1杯）: 150g
   - 味噌汁（1杯）: 180-200g
   - 鶏の唐揚げ（1個）: 30g
   - トースト（6枚切り1枚）: 60g
3. **市販品の優先**: 具体的な商品名の場合は、その商品の公表値を最優先してください。
4. **PFCバランスの整合性**: 推計したカロリーと、PFC（タンパク質:4, 脂質:9, 炭水化物:4 kcal/g）の合計が矛盾しないようにしてください。

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
純粋なJSONテキストのみを出力してください。`;

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
export async function recognizeWithOpenAI(base64Image: string): Promise<{ foods: { name: string; amount?: string }[], is_ambiguous?: boolean, reason?: string }> {
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

/** Google Gemini で写っている料理・食品リストを取得 */
export async function recognizeWithGemini(base64Image: string): Promise<{ foods: { name: string; amount?: string }[], is_ambiguous?: boolean, reason?: string }> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  const endpoint = `https://generativelanguage.googleapis.com/v1alpha/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`;

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
export async function estimateNutritionWithAI(foodName: string, amountStr?: string): Promise<FoodMasterRecord> {
  const useGemini = !!process.env.GEMINI_API_KEY;
  if (useGemini) {
    const apiKey = process.env.GEMINI_API_KEY ?? "";
    const endpoint = `https://generativelanguage.googleapis.com/v1alpha/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`;
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
export function validateAndCalculateCalories(protein: number, fat: number, carbs: number): number {
  return (protein * 4) + (fat * 9) + (carbs * 4);
}

export function buildSummary(foods: AnalyzedFood[]): NutritionSummary {
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

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString('base64');
}

function generateShortId(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
      let weightG = masterRecord.standard_weight_g;

      // ユーザーが「g」や「ml」などで具体的な量を指定している場合はそちらを優先する
      if (amount) {
        const match = amount.match(/([0-9０-９]+(?:\.[0-9０-９]+)?)\s*(g|グラム|ml|ミリリットル)/i);
        if (match) {
          // 全角数字を半角に変換
          const numStr = match[1].replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
          const parsed = parseFloat(numStr);
          if (!isNaN(parsed) && parsed > 0) {
            weightG = parsed;
          }
        }
      }

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

    // --- Phase 2: 画像をBlobへアップロードしDBに記録する ---
    const userId = await getDbUserId();
    let imageUrl = null;
    let savedLogId = null;
    let shareId = null;
    const shortIdValue = generateShortId();

    // 1. 画像をVercel Blobへアップロード (public access)
    try {
      const ext = image.name?.split('.').pop() || 'jpg';
      const blobFilename = `meals/${userId || 'guest'}_${Date.now()}.${ext}`;
      const blobResult = await put(blobFilename, image, { access: 'public' });
      imageUrl = blobResult.url;
    } catch (e) {
      console.error("Vercel Blob Upload Error:", e);
      // 画像保存に失敗しても解析結果自体は返せるように続行
    }

    // 2. Postgres の meal_logs に記録を保存
    try {
      const mealType = (formData.get("meal_type") as string) || "other";
      const validMealTypes = ["breakfast", "lunch", "dinner", "snack", "other"];
      const safeMealType = validMealTypes.includes(mealType) ? mealType : "other";

      // Parse logged_at if provided
      const loggedAtRaw = formData.get("logged_at") as string | null;
      let loggedAtValue: string | null = null;
      if (loggedAtRaw) {
        const parsed = new Date(loggedAtRaw);
        if (!isNaN(parsed.getTime())) {
          loggedAtValue = parsed.toISOString();
        }
      }

      const { rows } = loggedAtValue
        ? await sql`
          INSERT INTO meal_logs (
            user_id, image_url, total_calories, total_protein, 
            total_fat, total_carbs, analyzed_data, meal_type, logged_at, short_id
          ) VALUES (
            ${userId}, 
            ${imageUrl}, 
            ${summary.totalCalories}, 
            ${summary.totalProtein}, 
            ${summary.totalFat}, 
            ${summary.totalCarbs}, 
            ${JSON.stringify({ foods })},
            ${safeMealType},
            ${loggedAtValue},
            ${shortIdValue}
          )
          RETURNING id, share_id, short_id;
        `
        : await sql`
          INSERT INTO meal_logs (
            user_id, image_url, total_calories, total_protein, 
            total_fat, total_carbs, analyzed_data, meal_type, short_id
          ) VALUES (
            ${userId}, 
            ${imageUrl}, 
            ${summary.totalCalories}, 
            ${summary.totalProtein}, 
            ${summary.totalFat}, 
            ${summary.totalCarbs}, 
            ${JSON.stringify({ foods })},
            ${safeMealType},
            ${shortIdValue}
          )
          RETURNING id, share_id, short_id;
        `;
      if (rows.length > 0) {
        savedLogId = rows[0].id;
        const share_id = rows[0].share_id;
        const short_id = rows[0].short_id;
        return NextResponse.json({ foods, summary, savedLogId, share_id, short_id, is_ambiguous });
      }
    } catch (e) {
      console.error("Database Insert Error:", e);
    }

    if (!userId) {
      // 未ログイン状態の場合は analyze API の利用ログを記録
      try {
        await sql`
          INSERT INTO access_logs (event_type, path)
          VALUES ('anonymous_upload', '/api/analyze')
        `;
      } catch (e) {
        console.error("Failed to insert anonymous access log:", e);
      }
    }

    return NextResponse.json({ foods, summary, savedLogId, share_id: shareId, short_id: shortIdValue, is_ambiguous });
  } catch (e) {
    console.error("=== API Analysis Error ===", e);
    const err = e as { status?: number; message?: string; name?: string; stack?: string };

    await logErrorAndNotify("画像の解析", e, { useGemini: !!process.env.GEMINI_API_KEY });

    let message = "画像の解析に失敗しました";
    if (err.message) {
      message += `: ${err.message}`;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
