import { AnalyzedFood, LabelNutrition } from "./types";

/**
 * アトウォーター係数に基づきカロリーを算出する
 * P: 4, F: 9, C: 4 kcal/g
 */
export function calculateAtwaterCalories(protein: number, fat: number, carbs: number): number {
  return (protein * 4) + (fat * 9) + (carbs * 4);
}

export interface NutritionCorrectionResult {
  food: AnalyzedFood;
  isCorrected: boolean;
  originalCalories: number;
  calculatedCalories: number;
  reason?: string;
}

/**
 * 栄養素の整合性をチェックし、必要に応じて修正する
 */
export function sanitizeNutrition(
  food: AnalyzedFood
): NutritionCorrectionResult {
  const { protein, fat, carbs, calories } = food;
  const calculated = calculateAtwaterCalories(protein, fat, carbs);
  const roundedCalculated = Math.round(calculated);
  
  let finalCalories = calories;
  let isCorrected = false;
  let reason = "";

  // 1. カロリーが0または未設定なのに、PFCのいずれかが存在する場合
  if (calories <= 0 && (protein > 0 || fat > 0 || carbs > 0)) {
    finalCalories = roundedCalculated;
    isCorrected = true;
    reason = "Calories were 0 but macros were present.";
  } 
  // 2. カロリーとPFCの計算値が大きく乖離している場合 (20%以上かつ20kcal以上の差)
  // ※食物繊維やエリスリトールなどで低くなるケースはあるが、AIの誤読の可能性が高い
  else if (calories > 0) {
    const diff = Math.abs(calories - roundedCalculated);
    const ratio = diff / Math.max(calories, 1);
    
    if (ratio > 0.3 && diff > 30) {
      // 30%以上の乖離かつ30kcal以上の差がある場合は、AIの誤認と判断して計算値を優先
      finalCalories = roundedCalculated;
      isCorrected = true;
      reason = `Large deviation detected (${Math.round(ratio * 100)}%). Original: ${calories}, Calculated: ${roundedCalculated}`;
    }
  }

  return {
    food: {
      ...food,
      calories: finalCalories,
    },
    isCorrected,
    originalCalories: calories,
    calculatedCalories: roundedCalculated,
    reason,
  };
}
