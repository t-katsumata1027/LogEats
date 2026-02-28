import { NextRequest, NextResponse } from "next/server";
import { getDbUserId } from "@/auth";
import { sql } from "@vercel/postgres";
import OpenAI from "openai";
import {
  lookupFoodMasterWithLearned,
  loadLearnedFoods,
  addLearnedFood,
  defaultFoodMaster,
  type FoodMasterRecord,
} from "@/lib/foodDatabase";
import type { AnalyzedFood } from "@/lib/types";

export const maxDuration = 60;

// ---- AI プロンプト ----

/** テキストから料理名リストと食事タイプを抽出するプロンプト */
const TEXT_TO_FOODS_PROMPT = (text: string) =>
  `あなたは食事記録AIです。ユーザーが食べたものを自然言語で説明したテキストから、食品・料理のリストと食事タイプを抽出し、JSONのみで返してください。\n\nユーザーの入力: 「${text}」\n\n【出力JSONスキーマ】\n{\n  \"foods\": [ { \"name\": \"料理名（日本語）\", \"amount\": \"量の目安（例: 1杯、1個。不明なら省略可）\" } ],\n  \"meal_type\": \"breakfast | lunch | dinner | snack | other\"\n}\n\n説明文やマークダウンは一切含めず、純粋なJSONテキストのみを出力してください。`;

/** 食品名と目安量から栄養素を推定するプロンプト */
const NUTRITION_PROMPT = (foodName: string, amountStr?: string) =>
  `あなたは栄養学に精通した管理栄養士です。\n食品・料理名「${foodName}」と目安量「${amountStr || "1食分"}」に基づき、日本食品標準成分表（八訂）等に準拠した妥当な数値を推定し、JSONフォーマットのみで返答してください。\n\n【出力JSONスキーマ】\n{\n  \"estimated_weight_g\": 数値(g),\n  \"per_100g\": {\n    \"calories\": 数値(kcal),\n    \"protein\": 数値(g),\n    \"fat\": 数値(g),\n    \"carbs\": 数値(g)\n  }\n}`;

// ---- ユーティリティ ----

function parseJson(content: string) {
  const jsonStr = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function parseNutritionJson(content: string): FoodMasterRecord | null {
  const o = parseJson(content);
  if (!o) return null;
  const weight = Number(o.estimated_weight_g);
  const p100 = o.per_100g || {};
  const cal = Number(p100.calories);
  const pro = Number(p100.protein);
  const fat = Number(p100.fat);
  const carb = Number(p100.carbs);
  if (
    !Number.isFinite(weight) ||
    !Number.isFinite(cal) ||
    !Number.isFinite(pro) ||
    !Number.isFinite(fat) ||
    !Number.isFinite(carb)
  )
    return null;
  return {
    unit_name: "1食分",
    standard_weight_g: weight,
    per_100g: { calories: cal, protein: pro, fat: fat, carbs: carb },
  };
}

/** テキストから料理名リストと食事タイプをAIで抽出 */
async function extractFoodsFromText(
  text: string
): Promise<{ foods: { name: string; amount?: string }[]; meal_type: string }> {
  const useGemini = !!process.env.GEMINI_API_KEY;

  if (useGemini) {
    const apiKey = process.env.GEMINI_API_KEY ?? "";
    const endpoint = `https://generativelanguage.googleapis.com/v1alpha/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: TEXT_TO_FOODS_PROMPT(text) }] }],
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
                  },
                  required: ["name"],
                },
              },
              meal_type: { type: "STRING" },
            },
            required: ["foods", "meal_type"],
          },
        },
      }),
    });
    if (!res.ok)
      throw new Error(`Gemini API Error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const content =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      '{"foods":[],"meal_type":"other"}';
    const parsed = parseJson(content);
    return {
      foods: parsed?.foods || [],
      meal_type: parsed?.meal_type || "other",
    };
  } else {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "",
      fetch: globalThis.fetch.bind(globalThis),
    });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: TEXT_TO_FOODS_PROMPT(text) }],
    });
    const content =
      response.choices[0]?.message?.content?.trim() ??
      '{"foods":[],"meal_type":"other"}';
    const parsed = parseJson(content);
    return {
      foods: parsed?.foods || [],
      meal_type: parsed?.meal_type || "other",
    };
  }
}

/** 食品名と目安量からAIで栄養素を推定 */
async function estimateNutritionWithAI(
  foodName: string,
  amountStr?: string
): Promise<FoodMasterRecord> {
  const useGemini = !!process.env.GEMINI_API_KEY;

  if (useGemini) {
    const apiKey = process.env.GEMINI_API_KEY ?? "";
    const endpoint = `https://generativelanguage.googleapis.com/v1alpha/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: NUTRITION_PROMPT(foodName, amountStr) }] },
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
                  carbs: { type: "NUMBER" },
                },
                required: ["calories", "protein", "fat", "carbs"],
              },
            },
            required: ["estimated_weight_g", "per_100g"],
          },
        },
      }),
    });
    if (!res.ok)
      throw new Error(`Gemini API Error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    const parsed = parseNutritionJson(text);
    if (parsed) return parsed;
  } else {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "",
      fetch: globalThis.fetch.bind(globalThis),
    });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 250,
      response_format: { type: "json_object" },
      messages: [
        { role: "user", content: NUTRITION_PROMPT(foodName, amountStr) },
      ],
    });
    const text = response.choices[0]?.message?.content?.trim() ?? "";
    const parsed = parseNutritionJson(text);
    if (parsed) return parsed;
  }
  return defaultFoodMaster;
}

// ---- POST ハンドラー ----

export async function POST(request: NextRequest) {
  try {
    const userId = await getDbUserId();
    const isGuest = !userId;

    const body = await request.json();
    const { text, meal_type: bodyMealType, logged_at } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "食事内容のテキストを入力してください。" },
        { status: 400 }
      );
    }

    // logged_at の検証（ISO文字列 or 無し）
    let loggedAtValue: string | null = null;
    if (logged_at) {
      const parsed = new Date(logged_at);
      if (!isNaN(parsed.getTime())) {
        loggedAtValue = parsed.toISOString();
      }
    }

    // Step 1: テキストから料理リストを抽出（食事タイプもAIが推定）
    const { foods: recognizedRaw, meal_type: aiMealType } =
      await extractFoodsFromText(text.trim());

    if (recognizedRaw.length === 0) {
      return NextResponse.json(
        {
          error:
            "食事内容を認識できませんでした。より具体的に入力してください。",
        },
        { status: 400 }
      );
    }

    // Step 2: 各料理の栄養素を推定
    const learned = await loadLearnedFoods();
    const foods: AnalyzedFood[] = [];

    for (const { name, amount } of recognizedRaw) {
      let masterRecord = lookupFoodMasterWithLearned(name, learned);
      if (!masterRecord) {
        masterRecord = await estimateNutritionWithAI(name, amount);
        await addLearnedFood(name, masterRecord);
      }

      const weightG = masterRecord.standard_weight_g;
      const ratio = weightG / 100;
      const protein = masterRecord.per_100g.protein * ratio;
      const fat = masterRecord.per_100g.fat * ratio;
      const carbs = masterRecord.per_100g.carbs * ratio;
      const calories = protein * 4 + fat * 9 + carbs * 4;

      foods.push({
        name,
        nameJa: name,
        amount: amount || masterRecord.unit_name,
        calories: Math.round(calories),
        protein: Math.round(protein * 10) / 10,
        fat: Math.round(fat * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
      });
    }

    const totalCalories = foods.reduce((s, f) => s + f.calories, 0);
    const totalProtein = foods.reduce((s, f) => s + f.protein, 0);
    const totalFat = foods.reduce((s, f) => s + f.fat, 0);
    const totalCarbs = foods.reduce((s, f) => s + f.carbs, 0);

    // bodyMealType が指定された場合はそちらを優先、なければAI推定値を使う
    const validMealTypes = ["breakfast", "lunch", "dinner", "snack", "other"];
    const safeMealType =
      bodyMealType && validMealTypes.includes(bodyMealType)
        ? bodyMealType
        : validMealTypes.includes(aiMealType)
          ? aiMealType
          : "other";

    // Step 3: DB に保存 (ログイン時のみ)
    let savedLogId = null;
    if (!isGuest) {
      const { rows } = loggedAtValue
        ? await sql`
            INSERT INTO meal_logs (
              user_id, image_url, total_calories, total_protein,
              total_fat, total_carbs, analyzed_data, meal_type, logged_at
            ) VALUES (
              ${userId},
              NULL,
              ${totalCalories},
              ${totalProtein},
              ${totalFat},
              ${totalCarbs},
              ${JSON.stringify({ foods })},
              ${safeMealType},
              ${loggedAtValue}
            )
            RETURNING id;
          `
        : await sql`
            INSERT INTO meal_logs (
              user_id, image_url, total_calories, total_protein,
              total_fat, total_carbs, analyzed_data, meal_type
            ) VALUES (
              ${userId},
              NULL,
              ${totalCalories},
              ${totalProtein},
              ${totalFat},
              ${totalCarbs},
              ${JSON.stringify({ foods })},
              ${safeMealType}
            )
            RETURNING id;
          `;

      savedLogId = rows[0]?.id ?? null;
    } else {
      // 未ログイン状態の場合はアクセスログのみ記録
      try {
        await sql`
          INSERT INTO access_logs (event_type, path)
          VALUES ('anonymous_text_log', '/api/logs/manual')
        `;
      } catch (e) {
        console.error("Failed to insert anonymous access log:", e);
      }
    }

    return NextResponse.json({
      success: true,
      savedLogId,
      foods,
      totalCalories,
      totalProtein,
      totalFat,
      totalCarbs,
      meal_type: safeMealType,
    });
  } catch (error) {
    console.error("Failed to create manual log:", error);
    return NextResponse.json(
      { error: "食事記録の保存に失敗しました。" },
      { status: 500 }
    );
  }
}
