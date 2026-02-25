"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ImageUpload } from "@/components/ImageUpload";
import { NutritionResult } from "@/components/NutritionResult";
import type { AnalyzedFood, NutritionSummary } from "@/lib/types";

export function AnalyzerClient({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{
        foods: AnalyzedFood[];
        summary: NutritionSummary;
        savedLogId?: number;
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
                isAmbiguous: data.is_ambiguous
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : "エラーが発生しました");
        } finally {
            setLoading(false);
        }
    }, [imageFile]);

    const handleReset = useCallback(() => {
        setImageFile(null);
        setImagePreview(null);
        setResult(null);
        setError(null);
    }, []);

    return (
        <div className="pb-8">
            <ImageUpload
                imagePreview={imagePreview}
                onFileSelect={handleFileSelect}
                onAnalyze={handleAnalyze}
                onReset={handleReset}
                loading={loading}
                hasImage={!!imageFile}
                isAnalyzed={!!result}
            />

            {error && (
                <div
                    className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm"
                    role="alert"
                >
                    {error}
                </div>
            )}

            {result && (
                <NutritionResult
                    foods={result.foods}
                    summary={result.summary}
                    isAmbiguous={result.isAmbiguous}
                    isLoggedIn={isLoggedIn}
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
