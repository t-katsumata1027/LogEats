"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

export function ExplainButton({ errorMessage, context }: { errorMessage: string, context: any }) {
    const [explanation, setExplanation] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleExplain = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/errors/explain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ errorMessage, context })
            });
            const data = await res.json();
            if (data.explanation) {
                setExplanation(data.explanation);
            } else {
                setExplanation("解説の取得に失敗しました。");
            }
        } catch (e) {
            setExplanation("通信エラーが発生しました。");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-3">
            {!explanation && !loading && (
                <button onClick={handleExplain} className="btn btn-sm btn-outline text-sage-600 hover:bg-sage-100 hover:text-sage-800 gap-2 text-xs">
                    <Sparkles className="w-3 h-3" />
                    AIに原因を解説してもらう
                </button>
            )}
            {loading && <span className="loading loading-spinner text-sage-400"></span>}
            {explanation && (
                <div className="p-4 bg-sage-100 rounded-xl text-sage-800 text-sm leading-relaxed whitespace-pre-wrap shadow-inner border border-sage-200">
                    <p className="font-bold flex items-center gap-2 mb-2 text-sage-900 border-b border-sage-300 pb-1">
                        <Sparkles className="w-4 h-4 text-orange-500" /> AI解説
                    </p>
                    {explanation}
                </div>
            )}
        </div>
    );
}
