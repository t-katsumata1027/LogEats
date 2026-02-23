"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SettingsForm({ initialData }: { initialData: any }) {
    // 身体情報State
    const [age, setAge] = useState<number | "">(initialData?.age || "");
    const [gender, setGender] = useState<"male" | "female" | "">(initialData?.gender || "");
    const [height, setHeight] = useState<number | "">(initialData?.height || "");
    const [weight, setWeight] = useState<number | "">(initialData?.weight || "");
    const [targetWeight, setTargetWeight] = useState<number | "">(initialData?.target_weight || "");
    const [activityLevel, setActivityLevel] = useState<"low" | "normal" | "high" | "">(initialData?.activity_level || "normal");

    // 目標カロリーState
    const [targetCalories, setTargetCalories] = useState<number | "">(initialData?.target_calories || "");
    const [calculationDetails, setCalculationDetails] = useState<string | null>(null);

    // UI制御State
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
    const router = useRouter();

    // カロリー自動計算（ハリス・ベネディクト方程式 ＋ ダイエット補正）
    const calculateRecommendedCalories = () => {
        if (!age || !gender || !height || !weight || !activityLevel) return;

        let bmr = 0; // 基礎代謝
        if (gender === "male") {
            bmr = 88.362 + (13.397 * Number(weight)) + (4.799 * Number(height)) - (5.677 * Number(age));
        } else if (gender === "female") {
            bmr = 447.593 + (9.247 * Number(weight)) + (3.098 * Number(height)) - (4.330 * Number(age));
        }

        let multiplier = 1.2; // low
        if (activityLevel === "normal") multiplier = 1.55;
        if (activityLevel === "high") multiplier = 1.725;

        const tdee = bmr * multiplier;
        let targetDailyCalories = tdee;

        // 目標体重が現在の体重より少ない場合はダイエットモード（TDEEの15%カット）
        if (targetWeight && Number(targetWeight) < Number(weight)) {
            // ダイエット補正：TDEEから15%オフ
            targetDailyCalories = tdee * 0.85;

            // セーフティ：基礎代謝は下回らないようにする
            if (targetDailyCalories < bmr) {
                targetDailyCalories = bmr;
            }
        }

        // step="10" の制約に合わせるため、10の倍数に丸める
        const finalCalories = Math.round(targetDailyCalories / 10) * 10;
        setTargetCalories(finalCalories);

        // 算出ロジックの表示テキストを生成
        let details = `基礎代謝(BMR): ${Math.round(bmr)}kcal × 活動量係数(${multiplier}) = 1日の総消費カロリー(TDEE): ${Math.round(tdee)}kcal\n`;
        if (targetWeight && Number(targetWeight) < Number(weight)) {
            details += `【ダイエットモード】 目標体重が現在の体重より低いため、TDEEから15%（-${Math.round(tdee * 0.15)}kcal）をカットしています。\n`;
            if (targetDailyCalories === bmr) {
                details += `※安全のため、基礎代謝の数値(${Math.round(bmr)}kcal)を下限として設定しています。`;
            } else {
                details += `算出結果: ${Math.round(targetDailyCalories)}kcal → 10kcal単位で丸めて ${finalCalories}kcal としています。`;
            }
        } else {
            details += `【体重維持モード】 現在の体重を維持するためのカロリー設定です。\n10kcal単位で丸めて ${finalCalories}kcal としています。`;
        }
        setCalculationDetails(details);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsSaving(true);
        setCalculationDetails(null);

        try {
            const bodyData = {
                target_calories: targetCalories === "" ? 0 : Number(targetCalories),
                age: age === "" ? null : Number(age),
                gender: gender === "" ? null : gender,
                height: height === "" ? null : Number(height),
                weight: weight === "" ? null : Number(weight),
                target_weight: targetWeight === "" ? null : Number(targetWeight),
                activity_level: activityLevel === "" ? null : activityLevel
            };

            const res = await fetch("/api/users/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData)
            });

            if (!res.ok) {
                throw new Error("更新に失敗しました");
            }

            setMessage({ type: "success", text: "プロフィールと目標を保存しました！" });
            router.refresh();
        } catch (error) {
            setMessage({ type: "error", text: error instanceof Error ? error.message : "エラーが発生しました" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 md:p-8 border border-sage-100 shadow-sm space-y-8">
            <h2 className="text-lg font-bold text-sage-800 flex items-center gap-2">
                <span>👤</span> プロフィール・身体情報
            </h2>

            {message && (
                <div className={`alert text-sm py-3 ${message.type === 'success' ? 'bg-sage-50 text-sage-800 border-sage-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                    <span>{message.type === 'success' ? '✅' : '❌'} {message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-sage-50/50 p-6 rounded-xl border border-sage-100/50">
                <div className="form-control">
                    <label className="label"><span className="label-text font-semibold text-sage-700">性別</span></label>
                    <select className="select select-bordered bg-white focus:border-sage-400 focus:ring-1 focus:ring-sage-400" value={gender} onChange={(e) => setGender(e.target.value as any)}>
                        <option value="">未設定</option>
                        <option value="male">男性</option>
                        <option value="female">女性</option>
                    </select>
                </div>
                <div className="form-control">
                    <label className="label"><span className="label-text font-semibold text-sage-700">年齢</span></label>
                    <div className="flex items-center gap-2">
                        <input type="number" min="0" value={age} onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))} className="input input-bordered bg-white w-full focus:border-sage-400 focus:ring-1 focus:ring-sage-400" />
                        <span className="text-sage-500 font-medium">歳</span>
                    </div>
                </div>
                <div className="form-control">
                    <label className="label"><span className="label-text font-semibold text-sage-700">身長</span></label>
                    <div className="flex items-center gap-2">
                        <input type="number" min="0" step="0.1" value={height} onChange={(e) => setHeight(e.target.value === "" ? "" : Number(e.target.value))} className="input input-bordered bg-white w-full focus:border-sage-400 focus:ring-1 focus:ring-sage-400" />
                        <span className="text-sage-500 font-medium">cm</span>
                    </div>
                </div>
                <div className="form-control">
                    <label className="label"><span className="label-text font-semibold text-sage-700">現在の体重</span></label>
                    <div className="flex items-center gap-2">
                        <input type="number" min="0" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))} className="input input-bordered bg-white w-full focus:border-sage-400 focus:ring-1 focus:ring-sage-400" />
                        <span className="text-sage-500 font-medium">kg</span>
                    </div>
                </div>
                <div className="form-control">
                    <label className="label"><span className="label-text font-semibold text-sage-700">目標体重</span></label>
                    <div className="flex items-center gap-2">
                        <input type="number" min="0" step="0.1" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value === "" ? "" : Number(e.target.value))} className="input input-bordered bg-white w-full focus:border-sage-400 focus:ring-1 focus:ring-sage-400" />
                        <span className="text-sage-500 font-medium">kg</span>
                    </div>
                </div>
                <div className="form-control md:col-span-2">
                    <label className="label"><span className="label-text font-semibold text-sage-700">普段の活動量</span></label>
                    <select className="select select-bordered bg-white focus:border-sage-400 focus:ring-1 focus:ring-sage-400" value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as any)}>
                        <option value="low">低い (デスクワーク中心、運動習慣なし)</option>
                        <option value="normal">普通 (立ち仕事や、軽い運動習慣あり)</option>
                        <option value="high">高い (肉体労働や、激しいスポーツ習慣あり)</option>
                    </select>
                </div>
            </div>

            <div className="pt-2">
                <h2 className="text-lg font-bold text-sage-800 mb-4 flex items-center gap-2 border-t border-sage-100 pt-8">
                    <span>🎯</span> 1日の目標設定
                </h2>

                <div className="form-control mb-4">
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                        <div className="flex-1">
                            <label className="label">
                                <span className="label-text font-semibold text-sage-700">目標摂取カロリー (kcal)</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number" min="0" step="10" placeholder="例: 2000"
                                    value={targetCalories}
                                    onChange={(e) => setTargetCalories(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="input input-bordered bg-white w-full max-w-xs focus:border-sage-400 focus:ring-1 focus:ring-sage-400 font-bold text-lg text-sage-800"
                                />
                                <span className="text-sage-500 font-medium pb-1">kcal / 日</span>
                            </div>
                            <label className="label mt-1">
                                <span className="label-text-alt text-sage-500">ダッシュボードの残りカロリー表示に使用されます。</span>
                            </label>
                        </div>

                        <div className="pb-8">
                            <button
                                type="button"
                                onClick={calculateRecommendedCalories}
                                disabled={!age || !gender || !height || !weight || !activityLevel}
                                className="btn btn-outline border-sage-300 text-sage-700 hover:bg-sage-50 hover:border-sage-400"
                            >
                                ✨ 身体情報から自動計算
                            </button>
                        </div>
                    </div>
                    {calculationDetails && (
                        <div className="mt-4 p-4 bg-sage-50/80 rounded-lg text-sm text-sage-700 leading-relaxed border border-sage-200 shadow-sm whitespace-pre-wrap">
                            <div className="font-bold text-sage-800 mb-2 flex items-center gap-2">
                                <span className="text-xl">📊</span> カロリーの算出ロジック
                            </div>
                            {calculationDetails}
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-6 border-t border-sage-100 flex justify-end">
                <button type="submit" disabled={isSaving || targetCalories === ""} className="btn bg-sage-600 hover:bg-sage-700 text-white border-none shadow-sm min-w-[140px]">
                    {isSaving ? <span className="loading loading-spinner loading-sm"></span> : "設定を保存する"}
                </button>
            </div>
        </form>
    );
}
