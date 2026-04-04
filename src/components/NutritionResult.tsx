"use client";

import type { AnalyzedFood, NutritionSummary } from "@/lib/types";
import { Share2, Copy, Check } from "lucide-react";
import { useState } from "react";

interface NutritionResultProps {
  foods: AnalyzedFood[];
  summary: NutritionSummary;
  isAmbiguous?: boolean;
  isLoggedIn?: boolean;
  share_id?: string;
  short_id?: string;
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

export function NutritionResult({ foods, summary, isAmbiguous, isLoggedIn, share_id, short_id }: NutritionResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const id = short_id || share_id;
    if (!id) return;
    
    // short_id がある場合は /s/ 形式、なければ /share/ 形式
    const path = short_id ? `/s/${short_id}` : `/share/${share_id}`;
    const shareUrl = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

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

      {share_id && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => {
                const id = short_id || share_id;
                const path = short_id ? `/s/${short_id}` : `/share/${share_id}`;
                const shareUrl = `${window.location.origin}${path}`;
                const shareText = `今日の食事解析結果 🔥\n${Math.round(summary.totalCalories)}kcal (P:${Math.round(summary.totalProtein)}g F:${Math.round(summary.totalFat)}g C:${Math.round(summary.totalCarbs)}g)\n#AI食事解析 #LogEats @EatsLog88161`;
                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
                window.open(twitterUrl, "_blank");
              }}
              className="btn flex-1 bg-black text-white hover:bg-gray-900 border-none shadow-md flex items-center justify-center gap-2 py-4 h-auto rounded-2xl transition-all transform active:scale-95"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
              </svg>
              <span className="font-bold whitespace-nowrap">Xでシェア</span>
            </button>

            <button
              onClick={handleCopy}
              className={`btn px-6 border border-sage-200 shadow-sm flex items-center justify-center gap-2 py-4 h-auto rounded-2xl transition-all transform active:scale-95 ${copied ? "bg-sage-100 border-sage-300 text-sage-700" : "bg-white text-sage-600 hover:bg-sage-50"
                }`}
            >
              {copied ? <Check size={20} className="text-green-600" /> : <Copy size={20} />}
              <span className="font-bold whitespace-nowrap">{copied ? "コピー済" : "URLコピー"}</span>
            </button>
          </div>
          <p className="text-[10px] text-sage-400 text-center">
            ※ シェアまたはURLを共有すると、この食事内容が公開されます
          </p>
        </div>
      )}

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
