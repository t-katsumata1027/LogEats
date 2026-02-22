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

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[　\s]/g, "");
}

import fs from 'fs/promises';
import path from 'path';

export function getLearnedFoodsPath(): string {
  return path.join(process.cwd(), "data", "learnedFoods.json");
}

/** 
 * 学習済み食品のロード。
 * Vercelのサーバーレス環境でもローカルでも、読み込みは可能です。
 */
export async function loadLearnedFoods(): Promise<Record<string, FoodMasterRecord>> {
  try {
    const filePath = getLearnedFoodsPath();
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      console.warn("Learned foods load error:", err.message);
    }
    return {};
  }
}

/** 
 * 学習済みに1件追加する処理。
 * VercelのProduction環境では書き込み権限がないためスキップし、
 * ローカル(npm run dev)の場合のみファイルに永続化します。
 */
export async function addLearnedFood(name: string, record: FoodMasterRecord): Promise<void> {
  const key = normalize(name.trim());

  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV) {
    // Vercel などの ReadOnly なサーバーレス環境の場合、ファイル書き出しは行わずスキップ。
    console.log(`[Vercel/Production] Add learned food skipped: ${key}`);
    return Promise.resolve();
  }

  try {
    const data = await loadLearnedFoods();
    data[key] = record;
    const filePath = getLearnedFoodsPath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`[Local] Learned food saved: ${key}`);
  } catch (err: any) {
    console.error("Failed to save learned food:", err.message);
  }
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
  const fromStatic = lookupFoodMaster(name);
  if (fromStatic) return fromStatic;
  const key = normalize(name.trim());
  return learned[key] ?? null;
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
