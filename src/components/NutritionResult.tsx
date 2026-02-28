"use client";

import type { AnalyzedFood, NutritionSummary } from "@/lib/types";

interface NutritionResultProps {
  foods: AnalyzedFood[];
  summary: NutritionSummary;
  isAmbiguous?: boolean;
  isLoggedIn?: boolean;
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

export function NutritionResult({ foods, summary, isAmbiguous, isLoggedIn }: NutritionResultProps) {
  return (
    <section className="mt-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-sage-800">推定結果（概算）</h2>
      </div>

      {isAmbiguous && (
        <div className="alert bg-orange-50 border border-orange-200 text-orange-800 text-sm shadow-sm flex items-start px-4 py-3 gap-3 rounded-xl mt-3 -mb-2">
          <span className="text-xl leading-none">⚠️</span>
          <span className="leading-relaxed">
            写真が遠い・または複数人の食事が写っている等のため、推定精度が低くなっている可能性があります。
            {isLoggedIn
              ? "結果を確認し必要な場合は履歴から調整してください。"
              : "ログインすると履歴画面から結果を調整することができます。"}
          </span>
        </div>
      )}

      <SummaryCard summary={summary} />

      <div>
        <h3 className="text-sm font-medium text-sage-700 mb-2 mt-4 sm:mt-0">検出した料理・食品</h3>
        <div className="hidden sm:block overflow-x-auto rounded-box border border-sage-200 bg-base-100 shadow-sm">
          <table className="table table-sm text-sage-700">
            <thead className="bg-sage-50 text-sage-700 border-b border-sage-200">
              <tr>
                <th className="font-semibold text-sm py-3">料理・食品</th>
                <th className="font-semibold text-sm py-3 text-right">カロリー</th>
                <th className="font-semibold text-sm py-3 text-right">タンパク質</th>
                <th className="font-semibold text-sm py-3 text-right">脂質</th>
                <th className="font-semibold text-sm py-3 text-right">炭水化物</th>
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

        {/* モバイル用のカード型表示 */}
        <div className="sm:hidden flex flex-col gap-3">
          {foods.map((food, i) => (
            <div key={`mobile-${food.name}-${i}`} className="bg-base-100 border border-sage-200 rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3 border-b border-sage-100 pb-2">
                <span className="font-bold text-sage-800 break-words flex-1 pr-2">{food.name}</span>
                {food.amount && (
                  <span className="text-xs text-sage-500 bg-sage-50 px-2 py-1 rounded-md shrink-0 whitespace-nowrap">
                    {food.amount}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                <div className="flex justify-between items-center bg-sage-50/50 p-2 rounded-lg col-span-2">
                  <span className="text-sage-600 font-medium text-xs">🔥 カロリー</span>
                  <span className="font-bold text-sage-800">{food.calories} <span className="text-xs text-sage-500 font-normal">kcal</span></span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-sage-500 text-xs">💪 P</span>
                  <span className="font-semibold text-sage-700">{food.protein}<span className="text-[10px] text-sage-400 font-normal ml-0.5">g</span></span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-sage-500 text-xs">🥑 F</span>
                  <span className="font-semibold text-sage-700">{food.fat}<span className="text-[10px] text-sage-400 font-normal ml-0.5">g</span></span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-sage-500 text-xs">🌾 C</span>
                  <span className="font-semibold text-sage-700">{food.carbs}<span className="text-[10px] text-sage-400 font-normal ml-0.5">g</span></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-sage-500">
        ※ 写真からの推定のため目安です。実際の摂取量は調理法・量により異なります。
      </p>
    </section>
  );
}
