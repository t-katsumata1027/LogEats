"use client";

import { useRef, useCallback, useState } from "react";

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
                    className="px-6 py-2.5 rounded-xl bg-sage-600 text-white text-sm font-medium hover:bg-sage-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {isCompressing ? "画像を最適化中…" : loading ? "解析中…" : "カロリーを解析"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onReset();
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  disabled={loading || isCompressing}
                  className="px-6 py-2.5 rounded-xl border border-sage-300 bg-white text-sage-700 text-sm font-medium hover:bg-sage-50 disabled:opacity-60 transition-colors shadow-sm"
                >
                  別の写真を選ぶ
                </button>
              </div>
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
