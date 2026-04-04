"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ImageUpload } from "@/components/ImageUpload";
import { NutritionResult } from "@/components/NutritionResult";
import { NutritionSkeleton } from "@/components/NutritionSkeleton";
import type { AnalyzedFood, NutritionSummary } from "@/lib/types";

export function AnalyzerClient({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mealType, setMealType] = useState("other");
    const [activeTab, setActiveTab] = useState<"image" | "text">("image");
    const [manualText, setManualText] = useState("");
    const [isManualSubmitting, setIsManualSubmitting] = useState(false);
    const [manualProgress, setManualProgress] = useState(0);
    const [result, setResult] = useState<{
        foods: AnalyzedFood[];
        summary: NutritionSummary;
        savedLogId?: number;
        share_id?: string;
        short_id?: string;
        isAmbiguous?: boolean;
    } | null>(null);

    const handleFileSelect = useCallback((file: File | null, preview: string | null) => {
        setImageFile(file);
        setImagePreview(preview);
        setResult(null);
        setError(null);
    }, []);

    const handleAnalyze = useCallback(async () => {
        if (!imageFile) return;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const formData = new FormData();
            formData.append("image", imageFile);
            if (isLoggedIn) {
                formData.append("meal_type", mealType);
            }
            const res = await fetch("/api/analyze", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "解析に失敗しました");

            setResult({
                foods: data.foods,
                summary: data.summary,
                savedLogId: data.savedLogId,
                share_id: data.share_id,
                short_id: data.short_id,
                isAmbiguous: data.is_ambiguous
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : "エラーが発生しました");
        } finally {
            setLoading(false);
        }
    }, [imageFile, isLoggedIn, mealType]);

    const handleReset = useCallback(() => {
        setImageFile(null);
        setImagePreview(null);
        setResult(null);
        setError(null);
        setManualText("");
    }, []);

    const handleManualLog = async () => {
        if (!manualText.trim()) {
            setError('食事内容を入力してください。');
            return;
        }
        setIsManualSubmitting(true);
        setError(null);
        setResult(null);
        setManualProgress(0);

        const progressInterval = setInterval(() => {
            setManualProgress(prev => {
                if (prev >= 95) return prev;
                return prev + Math.max(0.5, (100 - prev) / 20);
            });
        }, 150);

        try {
            const res = await fetch('/api/logs/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: manualText.trim(),
                    meal_type: mealType,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || '解析に失敗しました');
            }

            setManualProgress(100);
            setResult({
                foods: data.foods,
                summary: {
                    totalCalories: data.totalCalories,
                    totalProtein: data.totalProtein,
                    totalFat: data.totalFat,
                    totalCarbs: data.totalCarbs
                },
                savedLogId: data.savedLogId,
                share_id: data.share_id,
                short_id: data.short_id,
                isAmbiguous: false // Text is explicit, not ambiguous
            });
            // We do not clear manualText here so the user can see what they analyzed
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        } finally {
            clearInterval(progressInterval);
            setIsManualSubmitting(false);
        }
    };

    return (
        <div className="pb-8">
            <div className="flex justify-center mb-6">
                <div className="join bg-sage-50/50 p-1 rounded-xl shadow-sm border border-sage-200">
                    <button
                        className={`join-item btn btn-sm border-none ${activeTab === 'image' ? 'bg-white text-sage-800 shadow-sm' : 'bg-transparent text-sage-500 hover:bg-sage-100/50'}`}
                        onClick={() => setActiveTab('image')}
                    >
                        📸 写真で解析
                    </button>
                    <button
                        className={`join-item btn btn-sm border-none ${activeTab === 'text' ? 'bg-white text-sage-800 shadow-sm' : 'bg-transparent text-sage-500 hover:bg-sage-100/50'}`}
                        onClick={() => setActiveTab('text')}
                    >
                        ✏️ テキストで解析
                    </button>
                </div>
            </div>

            {activeTab === 'image' ? (
                <ImageUpload
                    imagePreview={imagePreview}
                    onFileSelect={handleFileSelect}
                    onAnalyze={handleAnalyze}
                    onReset={handleReset}
                    loading={loading}
                    hasImage={!!imageFile}
                    isAnalyzed={!!result}
                    isLoggedIn={isLoggedIn}
                    mealType={mealType}
                    onMealTypeChange={setMealType}
                />
            ) : (
                <div className="rounded-2xl bg-white border border-sage-200 shadow-sm p-5 space-y-4">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0">✏️</span>
                        <div>
                            <p className="text-sm font-bold text-sage-800 leading-tight">
                                写真がなくても解析可能！
                            </p>
                            <p className="text-xs text-sage-500 mt-0.5">
                                何を食べたか教えてください
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <textarea
                            className="textarea textarea-bordered bg-sage-50/50 text-sm leading-relaxed w-full resize-none focus:bg-white"
                            rows={4}
                            placeholder="例: ざるそば1人前と唐揚げ3個、ご飯半分くらい食べた"
                            value={manualText}
                            onChange={e => setManualText(e.target.value)}
                            disabled={isManualSubmitting || !!result}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleManualLog(); }}
                        />

                        {isLoggedIn && !result && (
                            <div className="w-full">
                                <label className="text-xs font-semibold text-sage-600 mb-1.5 block">
                                    🍽️ 食事の種別
                                </label>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {[
                                        { value: "breakfast", label: "🌅 朝食" },
                                        { value: "lunch", label: "☀️ 昼食" },
                                        { value: "dinner", label: "🌙 夕食" },
                                        { value: "snack", label: "🍪 間食" },
                                        { value: "other", label: "📝 その他" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setMealType(opt.value)}
                                            disabled={isManualSubmitting}
                                            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-medium border transition-all
                                              ${mealType === opt.value
                                                    ? "bg-sage-600 text-white border-sage-600 shadow-sm"
                                                    : "bg-white text-sage-600 border-sage-200 hover:bg-sage-50"
                                                }`}
                                        >
                                            <span className="text-base mb-0.5">{opt.label.split(" ")[0]}</span>
                                            <span>{opt.label.split(" ")[1]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!result ? (
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={handleManualLog}
                                    disabled={isManualSubmitting || !manualText.trim()}
                                    className="btn w-full bg-sage-600 text-white hover:bg-sage-700 border-none shadow-sm disabled:bg-sage-200 disabled:text-sage-400 text-sm font-bold"
                                >
                                    {isManualSubmitting
                                        ? <span className="loading loading-spinner loading-sm" />
                                        : '🤖 AIで解析する'
                                    }
                                </button>
                                {isManualSubmitting && (
                                    <div className="p-3 bg-sage-50 rounded-lg border border-sage-200 flex flex-col items-center gap-2">
                                        <div className="flex items-center gap-2 text-sage-800 font-bold text-sm animate-pulse">
                                            🤖 AIが食事内容を解析・栄養素を推定中...
                                        </div>
                                        <progress className="progress progress-success w-full" value={manualProgress} max="100" />
                                        <p className="text-[10px] text-sage-500">※ 料理の数によって10〜20秒ほどかかる場合があります</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={handleReset}
                                className="btn w-full bg-white hover:bg-sage-50 text-sage-700 border-sage-200 shadow-sm"
                            >
                                別の内容で解析する
                            </button>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <div
                    className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm"
                    role="alert"
                >
                    {error}
                </div>
            )}

            {(loading || isManualSubmitting) && !result && (
                <NutritionSkeleton />
            )}

            {result && (
                <NutritionResult
                    foods={result.foods}
                    summary={result.summary}
                    isAmbiguous={result.isAmbiguous}
                    isLoggedIn={isLoggedIn}
                    share_id={result.share_id}
                    short_id={result.short_id}
                />
            )}

            {result?.savedLogId && (
                <div className="mt-6 flex flex-col sm:flex-row shadow-sm bg-white rounded-box border border-sage-200 p-4 items-center justify-between gap-4">
                    <span className="text-sage-800 font-medium flex items-center gap-2">
                        <span className="text-xl">✅</span> 食事履歴に保存しました
                    </span>
                    <Link
                        href="/dashboard"
                        className="btn btn-sm sm:btn-md bg-sage-50 text-sage-800 border-sage-200 hover:bg-sage-100 shadow-sm"
                    >
                        履歴を確認する →
                    </Link>
                </div>
            )}
        </div>
    );
}
