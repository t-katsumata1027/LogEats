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

    // 目標 State
    const [targetCalories, setTargetCalories] = useState<number | "">(initialData?.target_calories || "");
    const [targetProtein, setTargetProtein] = useState<number | "">(initialData?.target_protein || "");
    const [targetFat, setTargetFat] = useState<number | "">(initialData?.target_fat || "");
    const [targetCarbs, setTargetCarbs] = useState<number | "">(initialData?.target_carbs || "");
    const [tolerancePct, setTolerancePct] = useState<number>(initialData?.tolerance_pct ?? 10);
    const [calculationDetails, setCalculationDetails] = useState<string | null>(null);

    // UI制御State
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const router = useRouter();

    // カロリー + PFC 自動計算（ハリス・ベネディクト方程式 ＋ ダイエット補正）
    const calculateRecommended = () => {
        if (!age || !gender || !height || !weight || !activityLevel) return;

        let bmr = 0;
        if (gender === "male") {
            bmr = 88.362 + (13.397 * Number(weight)) + (4.799 * Number(height)) - (5.677 * Number(age));
        } else {
            bmr = 447.593 + (9.247 * Number(weight)) + (3.098 * Number(height)) - (4.330 * Number(age));
        }

        let multiplier = 1.2;
        if (activityLevel === "normal") multiplier = 1.55;
        if (activityLevel === "high") multiplier = 1.725;

        const tdee = bmr * multiplier;
        const isDietMode = targetWeight && Number(targetWeight) < Number(weight);
        let targetDailyCalories = isDietMode ? Math.max(tdee * 0.85, bmr) : tdee;
        const finalCalories = Math.round(targetDailyCalories / 10) * 10;

        // PFC 計算
        const refWeight = targetWeight ? Number(targetWeight) : Number(weight);
        const protein = Math.round(refWeight * (isDietMode ? 1.6 : 1.2));   // 体重ベース
        const fat = Math.round((finalCalories * 0.25) / 9);              // カロリーの25%
        const carbs = Math.round((finalCalories - protein * 4 - fat * 9) / 4);

        setTargetCalories(finalCalories);
        setTargetProtein(Math.max(protein, 0));
        setTargetFat(Math.max(fat, 0));
        setTargetCarbs(Math.max(carbs, 0));

        let details = `基礎代謝(BMR): ${Math.round(bmr)}kcal × 活動量係数(${multiplier}) = TDEE: ${Math.round(tdee)}kcal\n`;
        if (isDietMode) {
            details += `【ダイエットモード】 TDEEから15%カット → ${finalCalories}kcal\n`;
        } else {
            details += `【体重維持モード】 → ${finalCalories}kcal\n`;
        }
        details += `P: 目標体重${refWeight}kg × ${isDietMode ? 1.6 : 1.2} = ${protein}g\n`;
        details += `F: ${finalCalories}kcal × 25% ÷ 9 = ${fat}g\n`;
        details += `C: 残りカロリーから算出 = ${carbs}g`;
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
                target_protein: targetProtein === "" ? null : Number(targetProtein),
                target_fat: targetFat === "" ? null : Number(targetFat),
                target_carbs: targetCarbs === "" ? null : Number(targetCarbs),
                tolerance_pct: tolerancePct,
                age: age === "" ? null : Number(age),
                gender: gender === "" ? null : gender,
                height: height === "" ? null : Number(height),
                weight: weight === "" ? null : Number(weight),
                target_weight: targetWeight === "" ? null : Number(targetWeight),
                activity_level: activityLevel === "" ? null : activityLevel,
            };

            const res = await fetch("/api/users/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData),
            });

            if (!res.ok) throw new Error("更新に失敗しました");
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
                <div className={`alert text-sm py-3 ${message.type === "success" ? "bg-sage-50 text-sage-800 border-sage-200" : "bg-red-50 text-red-800 border-red-200"}`}>
                    <span>{message.type === "success" ? "✅" : "❌"} {message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-sage-50/50 p-6 rounded-xl border border-sage-100/50">
                <div className="form-control">
                    <label className="label"><span className="label-text font-semibold text-sage-700">性別</span></label>
                    <select className="select select-bordered bg-white focus:border-sage-400" value={gender} onChange={(e) => setGender(e.target.value as any)}>
                        <option value="">未設定</option>
                        <option value="male">男性</option>
                        <option value="female">女性</option>
                    </select>
                </div>
                <div className="form-control">
                    <label className="label"><span className="label-text font-semibold text-sage-700">年齢</span></label>
                    <div className="flex items-center gap-2">
                        <input type="number" min="0" value={age} onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))} className="input input-bordered bg-white w-full focus:border-sage-400" />
                        <span className="text-sage-500 font-medium">歳</span>
                    </div>
                </div>
                <div className="form-control">
                    <label className="label"><span className="label-text font-semibold text-sage-700">身長</span></label>
                    <div className="flex items-center gap-2">
                        <input type="number" min="0" step="0.1" value={height} onChange={(e) => setHeight(e.target.value === "" ? "" : Number(e.target.value))} className="input input-bordered bg-white w-full focus:border-sage-400" />
                        <span className="text-sage-500 font-medium">cm</span>
                    </div>
                </div>
                <div className="form-control">
                    <label className="label"><span className="label-text font-semibold text-sage-700">現在の体重</span></label>
                    <div className="flex items-center gap-2">
                        <input type="number" min="0" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))} className="input input-bordered bg-white w-full focus:border-sage-400" />
                        <span className="text-sage-500 font-medium">kg</span>
                    </div>
                </div>
                <div className="form-control">
                    <label className="label"><span className="label-text font-semibold text-sage-700">目標体重</span></label>
                    <div className="flex items-center gap-2">
                        <input type="number" min="0" step="0.1" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value === "" ? "" : Number(e.target.value))} className="input input-bordered bg-white w-full focus:border-sage-400" />
                        <span className="text-sage-500 font-medium">kg</span>
                    </div>
                </div>
                <div className="form-control md:col-span-2">
                    <label className="label"><span className="label-text font-semibold text-sage-700">普段の活動量</span></label>
                    <select className="select select-bordered bg-white focus:border-sage-400" value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as any)}>
                        <option value="low">低い (デスクワーク中心、運動習慣なし)</option>
                        <option value="normal">普通 (立ち仕事や、軽い運動習慣あり)</option>
                        <option value="high">高い (肉体労働や、激しいスポーツ習慣あり)</option>
                    </select>
                </div>
            </div>

            {/* ---- 目標設定 ---- */}
            <div className="pt-2">
                <div className="flex items-center justify-between border-t border-sage-100 pt-8 mb-4">
                    <h2 className="text-lg font-bold text-sage-800 flex items-center gap-2">
                        <span>🎯</span> 1日の目標設定
                    </h2>
                    <button
                        type="button"
                        onClick={calculateRecommended}
                        disabled={!age || !gender || !height || !weight || !activityLevel}
                        className="btn btn-sm btn-outline border-sage-300 text-sage-700 hover:bg-sage-50 hover:border-sage-400"
                    >
                        ✨ 身体情報から自動計算
                    </button>
                </div>

                {calculationDetails && (
                    <div className="mb-6 p-4 bg-sage-50/80 rounded-lg text-sm text-sage-700 leading-relaxed border border-sage-200 shadow-sm whitespace-pre-wrap">
                        <div className="font-bold text-sage-800 mb-2 flex items-center gap-2">
                            <span className="text-xl">📊</span> 算出ロジック
                        </div>
                        {calculationDetails}
                    </div>
                )}

                {/* 現在の設定値サマリー */}
                <div className="mb-6 bg-white p-5 rounded-xl border border-sage-200 shadow-sm">
                    <p className="text-sm font-bold text-sage-700 mb-4 border-b border-sage-100 pb-2">現在の目標設定</p>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="text-center flex-1">
                            <div className="text-[11px] text-sage-500 font-medium mb-1">🔥 カロリー</div>
                            <div className="text-2xl font-bold text-sage-900 leading-none">
                                {initialData?.target_calories || "未設定"}
                                {initialData?.target_calories && <span className="text-xs font-normal text-sage-500 ml-1">kcal</span>}
                            </div>
                        </div>
                        <div className="w-px h-10 bg-sage-200 hidden sm:block"></div>
                        <div className="text-center flex-1">
                            <div className="text-[11px] text-sage-500 font-medium mb-1">💪 タンパク質</div>
                            <div className="text-xl font-bold text-sage-900 leading-none">
                                {initialData?.target_protein || "-"}
                                {initialData?.target_protein && <span className="text-xs font-normal text-sage-500 ml-1">g</span>}
                            </div>
                        </div>
                        <div className="text-center flex-1">
                            <div className="text-[11px] text-sage-500 font-medium mb-1">🥑 脂質</div>
                            <div className="text-xl font-bold text-sage-900 leading-none">
                                {initialData?.target_fat || "-"}
                                {initialData?.target_fat && <span className="text-xs font-normal text-sage-500 ml-1">g</span>}
                            </div>
                        </div>
                        <div className="text-center flex-1">
                            <div className="text-[11px] text-sage-500 font-medium mb-1">🌾 炭水化物</div>
                            <div className="text-xl font-bold text-sage-900 leading-none">
                                {initialData?.target_carbs || "-"}
                                {initialData?.target_carbs && <span className="text-xs font-normal text-sage-500 ml-1">g</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* カロリー + PFC グリッド */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* カロリー */}
                    <div className="sm:col-span-2 form-control">
                        <label className="label"><span className="label-text font-semibold text-sage-700">🔥 目標摂取カロリー</span></label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number" min="0" step="10" placeholder="例: 2000"
                                value={targetCalories}
                                onChange={(e) => setTargetCalories(e.target.value === "" ? "" : Number(e.target.value))}
                                className="input input-bordered bg-white w-full max-w-xs focus:border-sage-400 font-bold text-lg text-sage-800"
                            />
                            <span className="text-sage-500 font-medium">kcal / 日</span>
                        </div>
                    </div>

                    {/* タンパク質 */}
                    <div className="form-control">
                        <label className="label"><span className="label-text font-semibold text-sage-700">💪 目標タンパク質</span></label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number" min="0" step="1" placeholder="例: 120"
                                value={targetProtein}
                                onChange={(e) => setTargetProtein(e.target.value === "" ? "" : Number(e.target.value))}
                                className="input input-bordered bg-white w-full focus:border-sage-400 font-bold text-sage-800"
                            />
                            <span className="text-sage-500 font-medium">g / 日</span>
                        </div>
                    </div>

                    {/* 脂質 */}
                    <div className="form-control">
                        <label className="label"><span className="label-text font-semibold text-sage-700">🥑 目標脂質</span></label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number" min="0" step="1" placeholder="例: 55"
                                value={targetFat}
                                onChange={(e) => setTargetFat(e.target.value === "" ? "" : Number(e.target.value))}
                                className="input input-bordered bg-white w-full focus:border-sage-400 font-bold text-sage-800"
                            />
                            <span className="text-sage-500 font-medium">g / 日</span>
                        </div>
                    </div>

                    {/* 炭水化物 */}
                    <div className="form-control sm:col-span-2">
                        <label className="label"><span className="label-text font-semibold text-sage-700">🌾 目標炭水化物</span></label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number" min="0" step="1" placeholder="例: 250"
                                value={targetCarbs}
                                onChange={(e) => setTargetCarbs(e.target.value === "" ? "" : Number(e.target.value))}
                                className="input input-bordered bg-white w-full max-w-xs focus:border-sage-400 font-bold text-sage-800"
                            />
                            <span className="text-sage-500 font-medium">g / 日</span>
                        </div>
                    </div>
                </div>

                {/* 許容幅スライダー */}
                <div className="form-control sm:col-span-2 mt-2 p-4 bg-sage-50/60 rounded-xl border border-sage-100">
                    <label className="label pb-1">
                        <span className="label-text font-semibold text-sage-700">🎯 目標達成の許容幅</span>
                        <span className="label-text-alt text-sage-500 text-xs">目標値の ±{tolerancePct}% 以内を「達成」とみなします</span>
                    </label>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-sage-400 w-8 shrink-0">±5%</span>
                        <input
                            type="range" min="5" max="30" step="5"
                            value={tolerancePct}
                            onChange={e => setTolerancePct(Number(e.target.value))}
                            className="range range-xs range-success flex-1"
                        />
                        <span className="text-xs text-sage-400 w-10 shrink-0">±30%</span>
                    </div>
                    <div className="flex justify-between mt-1 px-8">
                        {[5, 10, 15, 20, 25, 30].map(v => (
                            <span key={v} className={`text-[10px] ${v === tolerancePct ? 'text-sage-700 font-bold' : 'text-sage-300'}`}>±{v}%</span>
                        ))}
                    </div>
                    <p className="text-[11px] text-sage-400 mt-2 leading-relaxed">
                        例：タンパク質目標120g・許容幅±{tolerancePct}% → {Math.round(120 * (1 - tolerancePct / 100))}g〜{Math.round(120 * (1 + tolerancePct / 100))}g が達成範囲
                    </p>
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
