"use client";

import type { AnalyzedFood, NutritionSummary } from "@/lib/types";

interface NutritionResultProps {
  foods: AnalyzedFood[];
  summary: NutritionSummary;
}

function SummaryCard({ summary }: { summary: NutritionSummary }) {
  const items = [
    { label: "カロリー", value: Math.round(summary.totalCalories), unit: "kcal", highlight: true },
    { label: "タンパク質", value: Math.round(summary.totalProtein * 10) / 10, unit: "g" },
    { label: "脂質", value: Math.round(summary.totalFat * 10) / 10, unit: "g" },
    { label: "炭水化物", value: Math.round(summary.totalCarbs * 10) / 10, unit: "g" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(({ label, value, unit, highlight }) => (
        <div
          key={label}
          className={`rounded-xl p-4 text-center ${highlight ? "bg-sage-100 border border-sage-200" : "bg-white border border-sage-100"
            }`}
        >
          <p className="text-xs text-sage-600 uppercase tracking-wide">{label}</p>
          <p className={`mt-1 font-semibold ${highlight ? "text-sage-800 text-lg" : "text-sage-700"}`}>
            {value}
            <span className="text-sage-600 font-normal text-sm ml-0.5">{unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

export function NutritionResult({ foods, summary }: NutritionResultProps) {
  return (
    <section className="mt-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-sage-800">推定結果（概算）</h2>
      </div>

      <SummaryCard summary={summary} />

      <div>
        <h3 className="text-sm font-medium text-sage-700 mb-2">検出した料理・食品</h3>
        <div className="overflow-x-auto rounded-xl border border-sage-200 bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-sage-50 text-sage-700 font-medium border-b border-sage-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">料理・食品</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">カロリー</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">タンパク質</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">脂質</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">炭水化物</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage-100 text-sage-600">
              {foods.map((food, i) => (
                <tr key={`${food.name}-${i}`} className="hover:bg-sage-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-sage-800">{food.name}</span>
                    {food.amount && (
                      <span className="text-sage-500 ml-2">{food.amount}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{food.calories} kcal</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{food.protein} g</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{food.fat} g</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{food.carbs} g</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-sage-500">
        ※ 写真からの推定のため目安です。実際の摂取量は調理法・量により異なります。
      </p>
    </section>
  );
}
