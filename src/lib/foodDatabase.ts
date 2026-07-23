/**
 * 食品名（日本語・英語）から概算栄養を返すデータベース
 * 写真認識で得た食材名にマッチするよう、よくある料理・食材を登録
 * 末尾: Edge Runtime対応のためfsのインポートは除外
 */

export interface FoodNutrient {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  estimated_weight_g?: number; // 解析の際に算出したグラム数
}

export interface FoodMasterRecord {
  unit_name: string;
  standard_weight_g: number;
  per_100g: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
}

const db: { keys: string[]; data: FoodMasterRecord }[] = [
  // 主食
  { keys: ["ご飯", "白飯", "ごはん", "rice", "white rice", " steamed rice"], data: { unit_name: "1杯", standard_weight_g: 150, per_100g: { calories: 156, protein: 2.5, fat: 0.3, carbs: 37.1 } } },
  { keys: ["玄米", "brown rice"], data: { unit_name: "1杯", standard_weight_g: 150, per_100g: { calories: 152, protein: 2.8, fat: 1.0, carbs: 34.2 } } },
  { keys: ["食パン", "パン", "bread", "white bread", "toast"], data: { unit_name: "1枚(6枚切り)", standard_weight_g: 60, per_100g: { calories: 260, protein: 9.0, fat: 4.1, carbs: 48.0 } } },
  { keys: ["うどん", "udon"], data: { unit_name: "1玉", standard_weight_g: 250, per_100g: { calories: 95, protein: 2.6, fat: 0.4, carbs: 21.6 } } },
  { keys: ["ラーメン", "ramen", "中華そば"], data: { unit_name: "1杯", standard_weight_g: 500, per_100g: { calories: 94, protein: 3.5, fat: 3.6, carbs: 12.0 } } },
  // 肉類
  { keys: ["鶏むね肉", "鶏胸肉", "chicken breast", "chicken"], data: { unit_name: "100g", standard_weight_g: 100, per_100g: { calories: 108, protein: 22.3, fat: 1.5, carbs: 0 } } },
  { keys: ["豚肉", "pork", "豚バラ", "pork belly"], data: { unit_name: "100g", standard_weight_g: 100, per_100g: { calories: 386, protein: 14.2, fat: 34.6, carbs: 0.1 } } },
  { keys: ["牛肉", "beef", "ステーキ", "beef steak"], data: { unit_name: "100g", standard_weight_g: 100, per_100g: { calories: 317, protein: 14.4, fat: 25.8, carbs: 0.2 } } },
  // 卵・乳製品
  { keys: ["卵", "玉子", "egg", "eggs", "ゆで卵", "目玉焼き"], data: { unit_name: "1個", standard_weight_g: 60, per_100g: { calories: 142, protein: 12.3, fat: 10.3, carbs: 0.3 } } },
  { keys: ["牛乳", "ミルク", "milk"], data: { unit_name: "1杯", standard_weight_g: 200, per_100g: { calories: 61, protein: 3.3, fat: 3.8, carbs: 4.8 } } },
  // 魚類
  { keys: ["鯖の塩焼き", "鯖", "サバ"], data: { unit_name: "1切れ", standard_weight_g: 80, per_100g: { calories: 288, protein: 20.6, fat: 21.3, carbs: 0.3 } } },
  { keys: ["鮭", "salmon"], data: { unit_name: "1切れ", standard_weight_g: 80, per_100g: { calories: 138, protein: 22.3, fat: 4.5, carbs: 0.1 } } },
  // 野菜・その他
  { keys: ["キャベツ", "cabbage", "サラダ", "salad"], data: { unit_name: "1皿", standard_weight_g: 100, per_100g: { calories: 23, protein: 1.3, fat: 0.2, carbs: 4.0 } } },
  { keys: ["味噌汁", "みそ汁", "miso soup"], data: { unit_name: "1杯", standard_weight_g: 200, per_100g: { calories: 20, protein: 1.5, fat: 0.6, carbs: 2.5 } } },
];

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[　\s]/g, "");
}

import { sql } from '@vercel/postgres';

export function getLearnedFoodsPath(): string {
  return "";
}

/** 
 * 学習済み食品のロード。
 * Vercel Postgres データベースから学習済みの品目を一括で取得します。
 */
export async function loadLearnedFoods(): Promise<Record<string, FoodMasterRecord>> {
  try {
    const { rows } = await sql`SELECT * FROM learned_foods`;
    const recordMap: Record<string, FoodMasterRecord> = {};
    for (const row of rows) {
      recordMap[row.name] = {
        unit_name: row.unit_name,
        standard_weight_g: row.standard_weight_g,
        per_100g: {
          calories: row.calories,
          protein: row.protein,
          fat: row.fat,
          carbs: row.carbs
        }
      };
    }
    return recordMap;
  } catch (err: any) {
    console.warn("Learned foods load error (DB):", err.message);
    return {};
  }
}

/** 
 * 学習済みに1件追加する処理。
 * Vercel Postgresへ永続化し、既存の検証済み値は自動で上書きしません。
 */
export async function addLearnedFood(name: string, record: FoodMasterRecord): Promise<void> {
  const trimmedName = name.trim();
  const key = normalize(trimmedName);
  const values = [
    record.standard_weight_g,
    record.per_100g.calories,
    record.per_100g.protein,
    record.per_100g.fat,
    record.per_100g.carbs,
  ];

  // 公開解析からのDB汚染を防ぐため、名称と栄養値を保存前に制限する
  if (
    trimmedName.length < 2 ||
    trimmedName.length > 120 ||
    values.some((value) => !Number.isFinite(value)) ||
    record.standard_weight_g <= 0 ||
    record.standard_weight_g > 5000 ||
    record.per_100g.calories < 0 ||
    record.per_100g.calories > 2000 ||
    record.per_100g.protein < 0 ||
    record.per_100g.protein > 500 ||
    record.per_100g.fat < 0 ||
    record.per_100g.fat > 500 ||
    record.per_100g.carbs < 0 ||
    record.per_100g.carbs > 500
  ) {
    console.warn(`[DB] Learned food rejected: ${key}`);
    return;
  }

  try {
    await sql`
      INSERT INTO learned_foods (name, unit_name, standard_weight_g, calories, protein, fat, carbs)
      VALUES (
        ${key}, 
        ${record.unit_name}, 
        ${record.standard_weight_g}, 
        ${record.per_100g.calories}, 
        ${record.per_100g.protein}, 
        ${record.per_100g.fat}, 
        ${record.per_100g.carbs}
      )
      ON CONFLICT (name) DO NOTHING;
    `;
    console.log(`[DB] Learned food saved: ${key}`);
  } catch (err: any) {
    console.error("Failed to save learned food to DB:", err.message);
  }
}

/**
 * 1食分の解析結果をfoodDBの100g基準へ変換します。
 * 生画像、入力文、ユーザー識別子は含めません。
 */
export function buildLearnedFoodFromServing(
  amount: string | undefined,
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  }
): FoodMasterRecord {
  const weightMatch = amount?.match(
    /([0-9０-９]+(?:\.[0-9０-９]+)?)\s*(g|グラム|ml|ミリリットル)/i
  );
  const parsedWeight = weightMatch
    ? Number(
        weightMatch[1].replace(/[０-９]/g, (character) =>
          String.fromCharCode(character.charCodeAt(0) - 0xfee0)
        )
      )
    : 100;
  const standardWeight =
    Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : 100;
  const per100Ratio = 100 / standardWeight;

  return {
    unit_name: amount?.trim() || "1食分",
    standard_weight_g: standardWeight,
    per_100g: {
      calories: nutrition.calories * per100Ratio,
      protein: nutrition.protein * per100Ratio,
      fat: nutrition.fat * per100Ratio,
      carbs: nutrition.carbs * per100Ratio,
    },
  };
}

/**
 * 食品名（写真認識で得た文字列）からマスターデータを検索（静的DBのみ）
 */
export function lookupFoodMaster(name: string): FoodMasterRecord | null {
  if (!name || name.length < 2) return null;
  const n = normalize(name);
  for (const entry of db) {
    for (const key of entry.keys) {
      if (n.includes(normalize(key)) || normalize(key).includes(n)) {
        return entry.data;
      }
    }
  }
  return null;
}

/**
 * 静的DB ＋ 学習済みマップ からマスターデータを取得
 */
export function lookupFoodMasterWithLearned(name: string, learned: Record<string, FoodMasterRecord>): FoodMasterRecord | null {
  if (!name || name.trim().length < 2) return null;
  const n = normalize(name.trim());
  
  // 1. 学習済み食品から検索（完全一致）
  if (learned[n]) return learned[n];

  // 2. 学習済み食品から検索（部分一致）
  // 3500件程度であればループで回しても十分に高速
  for (const [key, record] of Object.entries(learned)) {
    if (key.includes(n) || n.includes(key)) {
      return record;
    }
  }

  // 3. 静的DBから検索（フォールバック）
  return lookupFoodMaster(name);
}

/**
 * マッチしなかった場合の極端ではない安全なデフォルト（野菜炒めなどを想定）
 */
export const defaultFoodMaster: FoodMasterRecord = {
  unit_name: "1食分",
  standard_weight_g: 150,
  per_100g: {
    calories: 120,
    protein: 4.5,
    fat: 6.0,
    carbs: 11.5,
  }
};
