"use client";

import { useState, useCallback } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { NutritionResult } from "@/components/NutritionResult";
import type { AnalyzedFood, NutritionSummary } from "@/lib/types";

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    foods: AnalyzedFood[];
    summary: NutritionSummary;
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
      setResult({ foods: data.foods, summary: data.summary });
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
    <main className="min-h-screen">
      <header className="border-b border-sage-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <h1 className="text-xl font-semibold text-sage-800 tracking-tight">
            食事カロリー推定
          </h1>
          <p className="text-sm text-sage-600 mt-0.5">
            写真をアップロードすると、概算のカロリーと栄養素を表示します
          </p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
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
      </div>
    </main>
  );
}
