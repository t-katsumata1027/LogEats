export interface LabelNutrition {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface AnalyzedFood {
  name: string;
  nameJa?: string;
  amount?: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  label_nutrition?: LabelNutrition;
}

export interface NutritionSummary {
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
}
