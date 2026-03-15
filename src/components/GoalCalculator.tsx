"use client";

import { useState, useMemo } from "react";

type Gender = "male" | "female";
type Goal = "lose" | "maintain" | "gain";
type ActivityLevel = "1" | "2" | "3" | "4" | "5";

export function GoalCalculator() {
    const [gender, setGender] = useState<Gender>("male");
    const [age, setAge] = useState<string>("30");
    const [height, setHeight] = useState<string>("170");
    const [weight, setWeight] = useState<string>("65");
    const [activityLevel, setActivityLevel] = useState<ActivityLevel>("2");
    const [goal, setGoal] = useState<Goal>("maintain");

    const results = useMemo(() => {
        const h = parseFloat(height);
        const w = parseFloat(weight);
        const a = parseFloat(age);

        if (isNaN(h) || isNaN(w) || isNaN(a)) return null;

        // ハリス・ベネディクト方程式 (改良版)
        let bmr = 0;
        if (gender === "male") {
            bmr = 13.397 * w + 4.799 * h - 5.677 * a + 88.362;
        } else {
            bmr = 9.247 * w + 3.098 * h - 4.33 * a + 447.593;
        }

        const activityMultipliers = {
            "1": 1.2,    // ほぼ運動しない
            "2": 1.375,  // 軽い運動（週1-2回）
            "3": 1.55,   // 中程度の運動（週3-5回）
            "4": 1.725,  // 激しい運動（週6-7回）
            "5": 1.9     // 非常に激しい運動（アスリート等）
        };

        const tdee = bmr * activityMultipliers[activityLevel];

        let targetCalories = tdee;
        if (goal === "lose") targetCalories -= 500;
        if (goal === "gain") targetCalories += 500;

        // PFCバランスの計算 (一般的・標準的なバランス)
        // P: 2g/kg (体重の2倍), F: 25%, C: 残り
        const protein = w * 2;
        const proteinCal = protein * 4;
        const fatCal = targetCalories * 0.25;
        const fat = fatCal / 9;
        const carbsCal = targetCalories - proteinCal - fatCal;
        const carbs = carbsCal / 4;

        return {
            bmr: Math.round(bmr),
            tdee: Math.round(tdee),
            targetCalories: Math.round(targetCalories),
            p: Math.round(protein),
            f: Math.round(fat),
            c: Math.round(carbs)
        };
    }, [gender, age, height, weight, activityLevel, goal]);

    return (
        <div className="bg-white rounded-3xl border border-sage-200 shadow-xl overflow-hidden animate-fade-in-up">
            <div className="p-5 sm:p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-sage-600 block">性別</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setGender("male")}
                                className={`py-2 rounded-xl text-sm font-bold border transition-all ${gender === 'male' ? 'bg-sage-600 text-white border-sage-600' : 'bg-white text-sage-500 border-sage-200 hover:bg-sage-50'}`}
                            >
                                男性
                            </button>
                            <button
                                onClick={() => setGender("female")}
                                className={`py-2 rounded-xl text-sm font-bold border transition-all ${gender === 'female' ? 'bg-sage-600 text-white border-sage-600' : 'bg-white text-sage-500 border-sage-200 hover:bg-sage-50'}`}
                            >
                                女性
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-sage-600 block">年齢</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                className="input input-bordered w-full bg-sage-50/50 focus:bg-white text-sm pr-10"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-sage-400 font-bold">歳</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-sage-600 block">身長</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                className="input input-bordered w-full bg-sage-50/50 focus:bg-white text-sm pr-10"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-sage-400 font-bold">cm</span>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-sage-600 block">体重</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                className="input input-bordered w-full bg-sage-50/50 focus:bg-white text-sm pr-10"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-sage-400 font-bold">kg</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-sage-600 block">活動レベル</label>
                    <select
                        value={activityLevel}
                        onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                        className="select select-bordered w-full bg-sage-50/50 focus:bg-white text-sm"
                    >
                        <option value="1">ほぼ運動しない（デスクワーク等）</option>
                        <option value="2">軽い運動（週1-2回程度の運動）</option>
                        <option value="3">中程度の運動（週3-5回程度の運動）</option>
                        <option value="4">激しい運動（週6-7回程度の運動）</option>
                        <option value="5">非常に激しい運動（アスリート等）</option>
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-sage-600 block">目標</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: "lose", label: "減量" },
                            { id: "maintain", label: "維持" },
                            { id: "gain", label: "増量" }
                        ].map((o) => (
                            <button
                                key={o.id}
                                onClick={() => setGoal(o.id as Goal)}
                                className={`py-2 rounded-xl text-xs font-bold border transition-all ${goal === o.id ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm' : 'bg-white text-sage-500 border-sage-200 hover:bg-sage-50'}`}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                </div>

                {results && (
                    <div className="bg-sage-50 p-5 rounded-2xl border border-sage-100 text-center animate-fade-in-up">
                        <div className="text-xs text-sage-600 font-bold mb-1">🔥 推奨摂取カロリー</div>
                        <div className="text-3xl font-extrabold text-sage-800 tracking-tight">
                            {results.targetCalories.toLocaleString()} <span className="text-sm font-normal text-sage-500">kcal / 日</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            <div className="bg-white p-2 rounded-xl border border-sage-100 shadow-sm">
                                <div className="text-[10px] text-blue-500 font-bold mb-0.5">Protein</div>
                                <div className="text-sm font-bold text-sage-800">{results.p}g</div>
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-sage-100 shadow-sm">
                                <div className="text-[10px] text-purple-500 font-bold mb-0.5">Fat</div>
                                <div className="text-sm font-bold text-sage-800">{results.f}g</div>
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-sage-100 shadow-sm">
                                <div className="text-[10px] text-green-600 font-bold mb-0.5">Carbs</div>
                                <div className="text-sm font-bold text-sage-800">{results.c}g</div>
                            </div>
                        </div>
                        <p className="mt-4 text-[10px] text-sage-400 font-medium">※計算結果は目安です。体調に合わせて調整してください。</p>
                    </div>
                )}
            </div>
        </div>
    );
}
