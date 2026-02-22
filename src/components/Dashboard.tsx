"use client";

import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
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
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    useEffect(() => {
        async function fetchLogs() {
            try {
                const res = await fetch("/api/logs");
                if (!res.ok) {
                    if (res.status === 401) {
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

    if (logs.length === 0 && !error) {
        return null;
    }

    // 選択された日付のログだけを抽出
    const filterDateStr = selectedDate.toLocaleDateString();
    const filteredLogs = logs.filter(log => new Date(log.logged_at).toLocaleDateString() === filterDateStr);
    const selectedTotal = filteredLogs.reduce((acc, log) => acc + log.total_calories, 0);

    // カレンダーで「記録が存在する日」をハイライトするための配列
    const loggedDates = logs.map(log => new Date(log.logged_at));

    return (
        <div className="py-2">
            <h2 className="text-xl font-semibold text-sage-800 mb-6 flex items-center gap-2">
                <span>📊</span> あなたの食事記録
            </h2>

            {/* ----- カレンダー ----- */}
            <div className="mb-8 flex justify-center card bg-base-100 border border-sage-100 shadow-sm p-4 overflow-x-auto">
                <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    modifiers={{ hasLog: loggedDates }}
                    modifiersClassNames={{
                        hasLog: "font-bold text-sage-800 underline decoration-sage-400 decoration-2 underline-offset-4"
                    }}
                    className="text-sage-800 p-2 mx-auto"
                    style={{
                        "--rdp-accent-color": "#4c5e43", /* sage-600 */
                        "--rdp-accent-background-color": "#e3e8df", /* sage-100 */
                        "--rdp-today-color": "#2d3529", /* sage-900 */
                    } as React.CSSProperties}
                />
            </div>

            {error ? (
                <div className="alert alert-error shadow-sm rounded-box text-sm">
                    {error}
                </div>
            ) : (
                <div className="space-y-8">
                    {/* ----- サマリーパネル ----- */}
                    <div className="card bg-base-100 shadow-sm border border-sage-100 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <p className="text-sage-600 text-sm font-medium mb-1">
                                {filterDateStr === new Date().toLocaleDateString() ? "今日" : selectedDate.toLocaleDateString([], { month: "short", day: "numeric" })}摂取したカロリー
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold tracking-tight text-sage-900">
                                    {Math.round(selectedTotal).toLocaleString()}
                                </span>
                                <span className="text-sage-500 font-medium">kcal</span>
                            </div>
                        </div>

                        <div className="w-full md:w-auto flex gap-4 text-sm">
                            <div className="bg-sage-50 px-4 py-3 rounded-box flex-1 md:flex-none text-center">
                                <div className="text-sage-500 mb-0.5 font-medium">Protein</div>
                                <div className="font-bold text-sage-800">
                                    {Math.round(filteredLogs.reduce((acc, l) => acc + l.total_protein, 0))}g
                                </div>
                            </div>
                            <div className="bg-sage-50 px-4 py-3 rounded-box flex-1 md:flex-none text-center">
                                <div className="text-sage-500 mb-0.5 font-medium">Fat</div>
                                <div className="font-bold text-sage-800">
                                    {Math.round(filteredLogs.reduce((acc, l) => acc + l.total_fat, 0))}g
                                </div>
                            </div>
                            <div className="bg-sage-50 px-4 py-3 rounded-box flex-1 md:flex-none text-center">
                                <div className="text-sage-500 mb-0.5 font-medium">Carbs</div>
                                <div className="font-bold text-sage-800">
                                    {Math.round(filteredLogs.reduce((acc, l) => acc + l.total_carbs, 0))}g
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ----- タイムライン ----- */}
                    <div>
                        <h3 className="text-lg font-medium text-sage-800 mb-4 flex items-center justify-between">
                            <span>{filterDateStr === new Date().toLocaleDateString() ? "今日の食事" : "この日の食事"}</span>
                            <span className="text-sm font-normal text-sage-500">{filteredLogs.length}件の記録</span>
                        </h3>

                        {filteredLogs.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl border border-sage-100 border-dashed">
                                <span className="text-3xl block mb-2 opacity-50">🍽️</span>
                                <p className="text-sage-500 text-sm">この日の食事記録はありません</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {filteredLogs.map((log) => {
                                    const date = new Date(log.logged_at);
                                    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                    return (
                                        <div key={log.id} className="card card-compact bg-base-100 border border-sage-100 shadow-sm">
                                            <figure className="h-32 bg-sage-50 relative w-full">
                                                {log.image_url ? (
                                                    <img src={log.image_url} alt="Meal" className="absolute inset-0 w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-2xl text-sage-400">🍽️</span>
                                                )}
                                            </figure>
                                            <div className="card-body">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full bg-sage-50 border border-sage-200 text-sage-700">
                                                        🕒 {timeStr}
                                                    </span>
                                                    <span className="text-sm font-bold text-sage-900">
                                                        {Math.round(log.total_calories)} kcal
                                                    </span>
                                                </div>
                                                <p className="text-sm text-sage-600 line-clamp-2 leading-relaxed">
                                                    {log.analyzed_data?.foods?.map(f => f.name).join('、') || '記録なし'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
}
