export interface AnalyzedFood {
  name: string;
  nameJa?: string;
  amount?: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface NutritionSummary {
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
}
