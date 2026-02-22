"use client";

import { useState, useCallback } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { NutritionResult } from "@/components/NutritionResult";
import { Dashboard } from "@/components/Dashboard";
import type { AnalyzedFood, NutritionSummary } from "@/lib/types";

export function AnalyzerClient() {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{
        foods: AnalyzedFood[];
        summary: NutritionSummary;
    } | null>(null);

    const [refreshKey, setRefreshKey] = useState(0);

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

            setResult({ foods: data.foods, summary: data.summary });

            // 解析完了（＝DBへの保存も完了）したらダッシュボードを再読込させる
            if (data.savedLogId) {
                setRefreshKey(prev => prev + 1);
            }
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
        <>
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
                />
            )}

            <Dashboard key={refreshKey} />
        </>
    );
}
