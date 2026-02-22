"use client";

import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
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
            <div className="mb-8 flex justify-center bg-white p-4 rounded-2xl border border-sage-100 shadow-sm overflow-x-auto">
                <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    modifiers={{ hasLog: loggedDates }}
                    modifiersClassNames={{
                        hasLog: "font-bold text-sage-800 underline decoration-sage-400 decoration-2 underline-offset-4"
                    }}
                    className="text-sage-800"
                    classNames={{
                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                        month: "space-y-4 flex flex-col items-center",
                        caption: "flex justify-center pt-1 relative items-center w-full mb-2",
                        caption_label: "text-lg font-bold text-sage-900 tracking-tight",
                        nav: "space-x-1 flex items-center absolute inset-y-0 right-0",
                        nav_button: "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-sage-50 rounded-lg flex justify-center items-center text-sage-700 transition-all",
                        table: "w-full border-collapse space-y-1 block",
                        head_row: "flex w-full justify-between mb-2",
                        head_cell: "text-sage-500 rounded-md w-10 font-medium text-xs text-center uppercase tracking-wider",
                        row: "flex w-full mt-2 justify-between gap-1",
                        cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-sage-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                        day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-sage-100 rounded-full transition-colors",
                        day_selected: "bg-sage-600 text-white hover:bg-sage-600 hover:text-white focus:bg-sage-600 focus:text-white font-bold",
                        day_today: "text-sage-900 font-bold bg-sage-50",
                        day_outside: "text-sage-300 opacity-50",
                        day_disabled: "text-sage-300 opacity-50",
                        day_hidden: "invisible",
                    }}
                />
            </div>

            {error ? (
                <div className="p-4 rounded-xl bg-red-50 text-red-800 text-sm">
                    {error}
                </div>
            ) : (
                <div className="space-y-8">
                    {/* ----- サマリーパネル ----- */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 flex flex-col md:flex-row items-center justify-between gap-6">
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
                            <div className="bg-sage-50 px-4 py-3 rounded-xl flex-1 md:flex-none text-center">
                                <div className="text-sage-500 mb-0.5 font-medium">Protein</div>
                                <div className="font-bold text-sage-800">
                                    {Math.round(filteredLogs.reduce((acc, l) => acc + l.total_protein, 0))}g
                                </div>
                            </div>
                            <div className="bg-sage-50 px-4 py-3 rounded-xl flex-1 md:flex-none text-center">
                                <div className="text-sage-500 mb-0.5 font-medium">Fat</div>
                                <div className="font-bold text-sage-800">
                                    {Math.round(filteredLogs.reduce((acc, l) => acc + l.total_fat, 0))}g
                                </div>
                            </div>
                            <div className="bg-sage-50 px-4 py-3 rounded-xl flex-1 md:flex-none text-center">
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
