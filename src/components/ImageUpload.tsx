"use client";

import { useRef, useCallback, useState, useEffect } from "react";

interface ImageUploadProps {
  imagePreview: string | null;
  onFileSelect: (file: File | null, preview: string | null) => void;
  onAnalyze: () => void;
  onReset: () => void;
  loading: boolean;
  hasImage: boolean;
  isAnalyzed?: boolean;
}

export function ImageUpload({
  imagePreview,
  onFileSelect,
  onAnalyze,
  onReset,
  loading,
  hasImage,
  isAnalyzed,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  useEffect(() => {
    if (loading && !isCompressing) {
      setAnalysisProgress(0);
      const interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.max(0.2, (100 - prev) / 40);
        });
      }, 100);
      return () => clearInterval(interval);
    } else {
      setAnalysisProgress(0);
    }
  }, [loading, isCompressing]);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        onFileSelect(null, null);
        return;
      }
      if (!file.type.startsWith("image/")) {
        onFileSelect(null, null);
        return;
      }

      try {
        setIsCompressing(true);
        const { default: imageCompression } = await import("browser-image-compression");
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);

        const reader = new FileReader();
        reader.onload = () => onFileSelect(compressedFile, reader.result as string);
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Image compression error:", error);
        // Fallback to original file if compression fails
        const reader = new FileReader();
        reader.onload = () => onFileSelect(file, reader.result as string);
        reader.readAsDataURL(file);
      } finally {
        setIsCompressing(false);
      }
    },
    [onFileSelect]
  );

  return (
    <section className="space-y-4">
      <div
        className={`
          relative rounded-2xl border-2 border-dashed transition-colors
          ${imagePreview ? "border-sage-300 bg-sage-50/50" : "border-sage-200 bg-white hover:border-sage-300"}
        `}
      >
        {imagePreview ? (
          <div className="p-6 flex flex-col items-center justify-center gap-6 relative z-10">
            <label className="cursor-pointer block shrink-0">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleChange}
                className="sr-only"
                aria-label="食事の写真を変更"
              />
              <img
                src={imagePreview}
                alt="アップロードした食事"
                className="w-full sm:max-w-md h-auto max-h-[60vh] object-contain rounded-xl border border-sage-200 shadow-sm"
              />
            </label>
            <div className="flex flex-col items-center gap-4 w-full">
              {!isAnalyzed && (
                <p className="text-sm text-sage-600 font-medium">
                  写真を選択しました。解析を実行してください。
                </p>
              )}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {!isAnalyzed && (
                  <button
                    type="button"
                    onClick={onAnalyze}
                    disabled={loading || isCompressing}
                    className="btn bg-sage-600 hover:bg-sage-700 text-white border-none shadow-sm disabled:bg-sage-200 disabled:text-sage-400"
                  >
                    {isCompressing ? "画像を最適化中…" : loading ? (
                      <><span className="loading loading-spinner loading-sm"></span>解析中…</>
                    ) : "カロリーを解析"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onReset();
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  disabled={loading || isCompressing}
                  className="btn bg-white hover:bg-sage-50 text-sage-700 border-sage-200 shadow-sm disabled:bg-sage-100 disabled:text-sage-400 disabled:border-transparent"
                >
                  別の写真を選ぶ
                </button>
              </div>

              {loading && !isCompressing && (
                <div className="w-full mt-2 p-4 bg-sage-50 rounded-xl border border-sage-200 shadow-sm flex flex-col items-center gap-3 text-center animate-fade-in-up">
                  <div className="flex items-center gap-2 text-sage-800 font-bold">
                    <span className="animate-pulse">🤖 AIが食品とカロリーを解析中...</span>
                  </div>
                  <progress className="progress progress-success w-full lg:w-3/4" value={analysisProgress} max="100"></progress>
                  <p className="text-xs text-sage-500">※写真の解像度や内容によって、10〜20秒ほどかかる場合があります</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="食事の写真を選択"
            />
            <div className="p-10 text-center pointer-events-none">
              <p className="text-sage-600 font-medium">
                {isCompressing ? "画像の最適化中..." : "クリックして食事の写真を選択"}
              </p>
              <p className="text-sage-500 text-sm mt-1">JPG / PNG など</p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
