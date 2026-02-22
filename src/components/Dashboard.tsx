"use client";

import { useEffect, useState } from "react";
import type { AnalyzedFood, NutritionSummary } from "@/lib/types";

type MealLog = {
    id: number;
    image_url: string;
    meal_type: string;
    total_calories: number;
    total_protein: number;
    total_fat: number;
    total_carbs: number;
    analyzed_data: { foods: AnalyzedFood[] };
    logged_at: string;
};

export function Dashboard() {
    const [logs, setLogs] = useState<MealLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchLogs() {
            try {
                const res = await fetch("/api/logs");
                if (!res.ok) {
                    if (res.status === 401) {
                        // 未ログイン時などは何も表示しない
                        setLoading(false);
                        return;
                    }
                    throw new Error("履歴データの取得に失敗しました");
                }
                const data = await res.json();
                setLogs(data.logs || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : "読込エラー");
            } finally {
                setLoading(false);
            }
        }
        fetchLogs();
    }, []);

    if (loading) {
        return (
            <div className="mt-12 text-center text-sage-600">
                <div className="inline-block w-6 h-6 border-2 border-sage-300 border-t-sage-600 rounded-full animate-spin mb-2"></div>
                <p className="text-sm">記録を読み込み中...</p>
            </div>
        );
    }

    // ログが1件もない場合はダッシュボード自体を隠す
    if (logs.length === 0 && !error) {
        return null;
    }

    // 今日の分だけのサマリーを計算（サーバー側で計算しても良いが、今回はクライアントで簡易計算）
    const todayStr = new Date().toLocaleDateString();
    const todaysLogs = logs.filter(log => new Date(log.logged_at).toLocaleDateString() === todayStr);
    const todayTotal = todaysLogs.reduce((acc, log) => acc + log.total_calories, 0);

    return (
        <div className="py-2">
            <h2 className="text-xl font-semibold text-sage-800 mb-6 flex items-center gap-2">
                <span>📊</span> あなたの食事記録
            </h2>

            {error ? (
                <div className="p-4 rounded-xl bg-red-50 text-red-800 text-sm">
                    {error}
                </div>
            ) : (
                <div className="space-y-8">
                    {/* ----- サマリーパネル ----- */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <p className="text-sage-600 text-sm font-medium mb-1">今日摂取したカロリー</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold tracking-tight text-sage-900">
                                    {Math.round(todayTotal).toLocaleString()}
                                </span>
                                <span className="text-sage-500 font-medium">kcal</span>
                            </div>
                        </div>

                        <div className="w-full md:w-auto flex gap-4 text-sm">
                            <div className="bg-sage-50 px-4 py-3 rounded-xl flex-1 md:flex-none text-center">
                                <div className="text-sage-500 mb-0.5 font-medium">Protein</div>
                                <div className="font-bold text-sage-800">
                                    {Math.round(todaysLogs.reduce((acc, l) => acc + l.total_protein, 0))}g
                                </div>
                            </div>
                            <div className="bg-sage-50 px-4 py-3 rounded-xl flex-1 md:flex-none text-center">
                                <div className="text-sage-500 mb-0.5 font-medium">Fat</div>
                                <div className="font-bold text-sage-800">
                                    {Math.round(todaysLogs.reduce((acc, l) => acc + l.total_fat, 0))}g
                                </div>
                            </div>
                            <div className="bg-sage-50 px-4 py-3 rounded-xl flex-1 md:flex-none text-center">
                                <div className="text-sage-500 mb-0.5 font-medium">Carbs</div>
                                <div className="font-bold text-sage-800">
                                    {Math.round(todaysLogs.reduce((acc, l) => acc + l.total_carbs, 0))}g
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ----- タイムライン ----- */}
                    <div>
                        <h3 className="text-lg font-medium text-sage-800 mb-4">最近の食事</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {logs.slice(0, 6).map((log) => {
                                const date = new Date(log.logged_at);
                                const isToday = date.toLocaleDateString() === todayStr;
                                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const dateStr = date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });

                                return (
                                    <div key={log.id} className="bg-white rounded-xl overflow-hidden border border-sage-100 shadow-sm flex flex-col">
                                        {log.image_url ? (
                                            <div className="h-32 bg-sage-100 relative">
                                                <img src={log.image_url} alt="Meal" className="absolute inset-0 w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="h-32 bg-sage-50 flex items-center justify-center text-sage-400">
                                                <span className="text-2xl">🍽️</span>
                                            </div>
                                        )}
                                        <div className="p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sage-100 text-sage-700">
                                                    {isToday ? `今日 ${timeStr}` : `${dateStr} ${timeStr}`}
                                                </span>
                                                <span className="text-sm font-bold text-sage-900">
                                                    {Math.round(log.total_calories)} kcal
                                                </span>
                                            </div>
                                            <p className="text-sm text-sage-600 line-clamp-2">
                                                {log.analyzed_data?.foods?.map(f => f.name).join('、') || '記録なし'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
