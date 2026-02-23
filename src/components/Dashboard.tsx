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
    const [targetCalories, setTargetCalories] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);

    // --- モーダル・詳細編集用のState ---
    const [selectedLog, setSelectedLog] = useState<MealLog | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState({
        total_calories: 0,
        total_protein: 0,
        total_fat: 0,
        total_carbs: 0,
        foods: [] as AnalyzedFood[]
    });
    const [isSaving, setIsSaving] = useState(false);

    // --- AI再計算用のState ---
    const [reanalyzePrompt, setReanalyzePrompt] = useState("");
    const [isReanalyzing, setIsReanalyzing] = useState(false);
    const [reanalyzeProgress, setReanalyzeProgress] = useState(0);

    // AI再計算のプログレスバーアニメーション
    useEffect(() => {
        if (isReanalyzing) {
            setReanalyzeProgress(0);
            const interval = setInterval(() => {
                setReanalyzeProgress(prev => {
                    if (prev >= 95) return prev;
                    return prev + Math.max(0.5, (100 - prev) / 20);
                });
            }, 100);
            return () => clearInterval(interval);
        } else {
            setReanalyzeProgress(0);
        }
    }, [isReanalyzing]);

    const openModal = (log: MealLog) => {
        setSelectedLog(log);
        setIsEditing(false);
        setEditValues({
            total_calories: Math.round(log.total_calories),
            total_protein: Math.round(log.total_protein),
            total_fat: Math.round(log.total_fat),
            total_carbs: Math.round(log.total_carbs),
            foods: log.analyzed_data?.foods ? JSON.parse(JSON.stringify(log.analyzed_data.foods)) : []
        });
        setReanalyzePrompt("");
        const modal = document.getElementById('meal_detail_modal') as HTMLDialogElement;
        if (modal) modal.showModal();
    };

    const closeModal = () => {
        const modal = document.getElementById('meal_detail_modal') as HTMLDialogElement;
        if (modal) modal.close();
        setSelectedLog(null);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("本当にこの記録を削除しますか？")) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/logs/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("削除に失敗しました");
            setLogs(logs.filter(l => l.id !== id));
            closeModal();
        } catch (err) {
            alert(err instanceof Error ? err.message : "エラーが発生しました");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!selectedLog) return;
        setIsSaving(true);
        try {
            const payload = { ...editValues, analyzed_data: { foods: editValues.foods } };
            const res = await fetch(`/api/logs/${selectedLog.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("更新に失敗しました");

            // 画面のStateを更新
            setLogs(logs.map(l => l.id === selectedLog.id ? {
                ...l,
                total_calories: editValues.total_calories,
                total_protein: editValues.total_protein,
                total_fat: editValues.total_fat,
                total_carbs: editValues.total_carbs,
                analyzed_data: { foods: editValues.foods }
            } : l));
            fetchData(); // 目標カロリー等の再取得
            closeModal();
        } catch (err) {
            alert(err instanceof Error ? err.message : "エラーが発生しました");
        } finally {
            setIsSaving(false);
        }
    };

    const handleReanalyze = async () => {
        if (!selectedLog || !reanalyzePrompt.trim()) return;
        setIsReanalyzing(true);
        try {
            const res = await fetch(`/api/logs/${selectedLog.id}/reanalyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instruction: reanalyzePrompt,
                    previous_foods: selectedLog.analyzed_data?.foods || []
                })
            });
            if (!res.ok) throw new Error("AIの再計算に失敗しました");
            const data = await res.json();

            // 成功したら画面を更新
            const newValues = {
                total_calories: data.updatedData.total_calories,
                total_protein: data.updatedData.total_protein,
                total_fat: data.updatedData.total_fat,
                total_carbs: data.updatedData.total_carbs,
                analyzed_data: data.updatedData.analyzed_data
            };

            setLogs(logs.map(l => l.id === selectedLog.id ? { ...l, ...newValues } : l));

            setSelectedLog(prev => prev ? { ...prev, ...newValues } : null);

            // 編集モードの状態も更新する（AIの変更結果をそのまま画面に入力フォームとして反映）
            setEditValues({
                total_calories: Math.round(newValues.total_calories),
                total_protein: Math.round(newValues.total_protein),
                total_fat: Math.round(newValues.total_fat),
                total_carbs: Math.round(newValues.total_carbs),
                foods: newValues.analyzed_data?.foods ? JSON.parse(JSON.stringify(newValues.analyzed_data.foods)) : []
            });

            setReanalyzePrompt("");
            fetchData(); // 最新状態を再取得

        } catch (err) {
            alert(err instanceof Error ? err.message : "エラーが発生しました");
        } finally {
            setIsReanalyzing(false);
        }
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditValues(prev => ({ ...prev, [name]: Number(value) || 0 }));
    };

    const handleFoodEditChange = (index: number, field: keyof AnalyzedFood, value: string | number) => {
        setEditValues(prev => {
            const newFoods = [...prev.foods];
            newFoods[index] = { ...newFoods[index], [field]: value };

            // Recalculate totals
            const totalCals = newFoods.reduce((sum, f) => sum + Number(f.calories || 0), 0);
            const totalPro = newFoods.reduce((sum, f) => sum + Number(f.protein || 0), 0);
            const totalFat = newFoods.reduce((sum, f) => sum + Number(f.fat || 0), 0);
            const totalCarb = newFoods.reduce((sum, f) => sum + Number(f.carbs || 0), 0);

            return {
                ...prev,
                foods: newFoods,
                total_calories: Math.round(totalCals),
                total_protein: Math.round(totalPro),
                total_fat: Math.round(totalFat),
                total_carbs: Math.round(totalCarb)
            };
        });
    };

    const handleRemoveFood = (index: number) => {
        setEditValues(prev => {
            const newFoods = prev.foods.filter((_, i) => i !== index);
            const totalCals = newFoods.reduce((sum, f) => sum + Number(f.calories || 0), 0);
            const totalPro = newFoods.reduce((sum, f) => sum + Number(f.protein || 0), 0);
            const totalFat = newFoods.reduce((sum, f) => sum + Number(f.fat || 0), 0);
            const totalCarb = newFoods.reduce((sum, f) => sum + Number(f.carbs || 0), 0);

            return {
                ...prev,
                foods: newFoods,
                total_calories: Math.round(totalCals),
                total_protein: Math.round(totalPro),
                total_fat: Math.round(totalFat),
                total_carbs: Math.round(totalCarb)
            };
        });
    };

    const fetchData = async () => {
        try {
            const res = await fetch("/api/logs", { cache: "no-store" });
            if (!res.ok) {
                if (res.status === 401) {
                    setLoading(false);
                    return;
                }
                throw new Error("履歴データの取得に失敗しました");
            }
            const data = await res.json();
            setLogs(data.logs || []);
            setTargetCalories(data.targetCalories ?? null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "読込エラー");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
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
    const selectedTotal = filteredLogs.reduce((acc, log) => acc + Number(log.total_calories || 0), 0);
    const selectedProtein = filteredLogs.reduce((acc, log) => acc + Number(log.total_protein || 0), 0);
    const selectedFat = filteredLogs.reduce((acc, log) => acc + Number(log.total_fat || 0), 0);
    const selectedCarbs = filteredLogs.reduce((acc, log) => acc + Number(log.total_carbs || 0), 0);

    // カレンダーで「記録が存在する日」をハイライトするための配列
    const loggedDates = logs.map(log => new Date(log.logged_at));

    // 週表示用の日付生成 (選択された日を含む週の月曜日〜日曜日)
    const getWeekDays = (date: Date) => {
        const current = new Date(date);
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1); // 月曜始まり
        const monday = new Date(current.setDate(diff));

        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return d;
        });
    };
    const weekDays = getWeekDays(selectedDate);

    const macroTotal = selectedProtein + selectedFat + selectedCarbs;
    const proteinPct = macroTotal > 0 ? (selectedProtein / macroTotal) * 100 : 0;
    const fatPct = macroTotal > 0 ? (selectedFat / macroTotal) * 100 : 0;
    const carbsPct = macroTotal > 0 ? (selectedCarbs / macroTotal) * 100 : 0;

    // 残りカロリーの計算と表示用テキスト
    let targetDisplay = null;
    let progressPct = 0;

    if (targetCalories && targetCalories > 0) {
        const remaining = targetCalories - selectedTotal;
        progressPct = Math.min((selectedTotal / targetCalories) * 100, 100);

        targetDisplay = (
            <div className="mt-3 text-sm flex gap-2">
                <span className="text-sage-600 font-medium">目標: {targetCalories}</span>
                {remaining >= 0 ? (
                    <span className="text-sage-600">| 残り <span className="font-bold text-sage-800">{Math.round(remaining)}</span> kcal</span>
                ) : (
                    <span className="text-red-500 font-bold border-l border-sage-200 pl-2"> {Math.round(Math.abs(remaining))} kcal オーバー！</span>
                )}
            </div>
        );
    }

    return (
        <div className="py-2">
            <h2 className="text-xl font-semibold text-sage-800 mb-6 flex items-center gap-2">
                <span>📊</span> あなたの食事記録
            </h2>

            {/* ----- カレンダー ----- */}
            <div className="mb-8 card bg-base-100 border border-sage-100 shadow-sm p-4">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-sm font-bold text-sage-800">
                        {selectedDate.toLocaleDateString([], { year: 'numeric', month: 'short' })}
                    </h3>

                    <div className="bg-sage-100/50 p-1 rounded-lg flex items-center gap-1">
                        <button
                            onClick={() => setIsCalendarExpanded(false)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${!isCalendarExpanded ? 'bg-white text-sage-800 shadow-sm border border-sage-200/50' : 'text-sage-500 hover:text-sage-700 hover:bg-sage-200/50'}`}
                        >
                            週表示
                        </button>
                        <button
                            onClick={() => setIsCalendarExpanded(true)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${isCalendarExpanded ? 'bg-white text-sage-800 shadow-sm border border-sage-200/50' : 'text-sage-500 hover:text-sage-700 hover:bg-sage-200/50'}`}
                        >
                            月表示
                        </button>
                    </div>
                </div>

                {!isCalendarExpanded ? (
                    /* 週表示ストリップ */
                    <div className="flex justify-between items-center px-1 sm:px-4">
                        {weekDays.map((date, i) => {
                            const isSelected = date.toLocaleDateString() === selectedDate.toLocaleDateString();
                            const isToday = date.toLocaleDateString() === new Date().toLocaleDateString();
                            const hasLog = loggedDates.some(ld => ld.toLocaleDateString() === date.toLocaleDateString());
                            const dayNames = ['月', '火', '水', '木', '金', '土', '日'];

                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelectedDate(date)}
                                    className={`flex flex-col items-center justify-center p-2 rounded-xl w-10 sm:w-12 transition-colors ${isSelected
                                        ? 'bg-sage-600 text-white shadow-md'
                                        : isToday
                                            ? 'bg-sage-100 text-sage-900 border border-sage-200'
                                            : 'text-sage-600 hover:bg-sage-50'
                                        }`}
                                >
                                    <span className={`text-[10px] font-medium mb-1 ${isSelected ? 'text-sage-100' : 'text-sage-400'}`}>
                                        {dayNames[i]}
                                    </span>
                                    <span className={`text-base font-bold pb-0.5 ${hasLog && !isSelected ? 'underline decoration-sage-400 decoration-2 underline-offset-4' : ''}`}>
                                        {date.getDate()}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    /* react-day-picker (月表示) */
                    <div className="flex justify-center overflow-x-auto">
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
                )}
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
                                <span className={`text-4xl font-bold tracking-tight ${targetCalories && selectedTotal > targetCalories ? 'text-red-500' : 'text-sage-900'}`}>
                                    {Math.round(selectedTotal).toLocaleString()}
                                </span>
                                <span className="text-sage-500 font-medium">kcal</span>
                            </div>
                            {targetDisplay}

                            {targetCalories && targetCalories > 0 && (
                                <div className="w-full bg-sage-100 rounded-full h-2.5 mt-3 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${selectedTotal > targetCalories ? 'bg-red-400' : 'bg-sage-400'}`}
                                        style={{ width: `${progressPct}%` }}
                                    ></div>
                                </div>
                            )}
                        </div>

                        <div className="w-full md:w-auto flex gap-4 text-sm">
                            <div className="bg-sage-50 px-4 py-3 rounded-box flex-1 md:flex-none text-center">
                                <div className="text-sage-500 mb-0.5 font-medium">Protein</div>
                                <div className="font-bold text-sage-800">
                                    {Math.round(selectedProtein)}g
                                </div>
                            </div>
                            <div className="bg-sage-50 px-4 py-3 rounded-box flex-1 md:flex-none text-center">
                                <div className="text-sage-500 mb-0.5 font-medium">Fat</div>
                                <div className="font-bold text-sage-800">
                                    {Math.round(selectedFat)}g
                                </div>
                            </div>
                            <div className="bg-sage-50 px-4 py-3 rounded-box flex-1 md:flex-none text-center">
                                <div className="text-sage-500 mb-0.5 font-medium">Carbs</div>
                                <div className="font-bold text-sage-800">
                                    {Math.round(selectedCarbs)}g
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
                                        <div
                                            key={log.id}
                                            className="card card-compact bg-base-100 border border-sage-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                            onClick={() => openModal(log)}
                                        >
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
                                                    {log.analyzed_data?.foods?.map((f: any) => f.name).join('、') || '記録なし'}
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

            {/* ----- 詳細・編集モーダル ----- */}
            <dialog id="meal_detail_modal" className="modal modal-bottom sm:modal-middle">
                <div className="modal-box bg-white p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    {selectedLog && (
                        <>
                            {/* ヘッダー画像部分 */}
                            <div className="relative h-48 bg-sage-50 shrink-0">
                                {selectedLog.image_url ? (
                                    <img src={selectedLog.image_url} alt="Meal" className="absolute inset-0 w-full h-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-4xl text-sage-400">🍽️</span>
                                    </div>
                                )}
                                <div className="absolute top-3 right-3 flex gap-2">
                                    {!isEditing && (
                                        <>
                                            <button onClick={() => setIsEditing(true)} className="btn btn-sm btn-circle btn-ghost bg-white/80 backdrop-blur" title="数値を編集">
                                                ✏️
                                            </button>
                                            <button onClick={() => handleDelete(selectedLog.id)} disabled={isSaving} className="btn btn-sm btn-circle btn-ghost bg-white/80 backdrop-blur text-red-500 hover:bg-red-50 hover:text-red-600" title="この記録を削除">
                                                🗑️
                                            </button>
                                        </>
                                    )}
                                    <button onClick={closeModal} className="btn btn-sm btn-circle btn-ghost bg-white/80 backdrop-blur">
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* コンテンツ部分 */}
                            <div className="p-5 overflow-y-auto">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full bg-sage-100 text-sage-800">
                                        🕒 {new Date(selectedLog.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-xs text-sage-500">
                                        {new Date(selectedLog.logged_at).toLocaleDateString()}
                                    </span>
                                </div>

                                {!isEditing ? (
                                    /* --- 閲覧モード --- */
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-sm font-bold text-sage-800 border-b border-sage-100 pb-2 mb-3">AIの検出結果</h4>
                                            <ul className="space-y-2">
                                                {selectedLog.analyzed_data?.foods?.map((food: any, idx: number) => (
                                                    <li key={idx} className="flex justify-between items-start text-sm">
                                                        <span className="text-sage-700">{food.name} <span className="text-sage-400 text-xs ml-1">({food.amount}g)</span></span>
                                                        <span className="text-sage-900 font-medium">{Math.round(food.calories)} <span className="text-xs text-sage-500 font-normal">kcal</span></span>
                                                    </li>
                                                ))}
                                                {(!selectedLog.analyzed_data?.foods || selectedLog.analyzed_data.foods.length === 0) && (
                                                    <li className="text-sage-500 text-sm">内訳データがありません</li>
                                                )}
                                            </ul>
                                        </div>

                                        <div className="bg-sage-50 rounded-xl p-4">
                                            <div className="text-center mb-4">
                                                <div className="text-xs text-sage-500 mb-1">合計カロリー</div>
                                                <div className="text-3xl font-bold text-sage-900">
                                                    {Math.round(selectedLog.total_calories)} <span className="text-base font-medium text-sage-500">kcal</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-center text-sm border-t border-sage-200/60 pt-3">
                                                <div>
                                                    <div className="text-sage-500 text-xs mb-0.5">Protein</div>
                                                    <div className="font-semibold text-sage-800">{Math.round(selectedLog.total_protein)}g</div>
                                                </div>
                                                <div>
                                                    <div className="text-sage-500 text-xs mb-0.5">Fat</div>
                                                    <div className="font-semibold text-sage-800">{Math.round(selectedLog.total_fat)}g</div>
                                                </div>
                                                <div>
                                                    <div className="text-sage-500 text-xs mb-0.5">Carbs</div>
                                                    <div className="font-semibold text-sage-800">{Math.round(selectedLog.total_carbs)}g</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* --- 編集モード --- */
                                    <div className="space-y-4">
                                        <div className="alert bg-orange-50 border-orange-100 text-orange-800 text-sm py-2">
                                            <span>💡 実際の表示と違っていた場合は、テキストでAIに再計算を依頼するか、直接数値を修正できます。</span>
                                        </div>

                                        {/* AI再計算エリア */}
                                        <div className="bg-sage-50 p-4 rounded-xl border border-sage-100">
                                            <label className="text-xs font-bold text-sage-700 mb-2 block">🤖 AIに修正を指示する</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="例: ご飯は少なめだった、カレーではなくハヤシライス等"
                                                    className="input input-bordered input-sm flex-1 bg-white"
                                                    value={reanalyzePrompt}
                                                    onChange={e => setReanalyzePrompt(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleReanalyze(); }}
                                                    disabled={isReanalyzing}
                                                />
                                                <button
                                                    className="btn btn-sm btn-primary bg-sage-600 hover:bg-sage-700 border-none text-white disabled:bg-sage-200 disabled:text-sage-400"
                                                    onClick={handleReanalyze}
                                                    disabled={isReanalyzing || !reanalyzePrompt.trim()}
                                                >
                                                    {isReanalyzing ? <span className="loading loading-spinner loading-xs"></span> : 'AI再計算'}
                                                </button>
                                            </div>

                                            {isReanalyzing && (
                                                <div className="mt-3 p-3 bg-white rounded-lg border border-sage-200 shadow-inner flex flex-col items-center gap-2 animate-fade-in-up">
                                                    <div className="flex items-center gap-2 text-sage-800 font-bold text-sm">
                                                        <span className="animate-pulse">🔄 AIが指示に基づいて再計算しています...</span>
                                                    </div>
                                                    <progress className="progress progress-success w-full" value={reanalyzeProgress} max="100"></progress>
                                                    <p className="text-[10px] text-sage-500">※5秒〜10秒ほどかかる場合があります</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* 個別料理の編集エリア */}
                                        <div>
                                            <h4 className="text-sm font-bold text-sage-800 border-b border-sage-100 pb-2 mb-3 mt-4">構成要素の手動調整</h4>
                                            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                                                {editValues.foods.map((food, idx) => (
                                                    <div key={idx} className="bg-white border border-sage-200 rounded-lg p-2.5 flex flex-col gap-2 relative">
                                                        <button
                                                            onClick={() => handleRemoveFood(idx)}
                                                            className="absolute -top-2 -right-2 btn btn-xs btn-circle bg-red-100 text-red-500 hover:bg-red-500 hover:text-white border-none"
                                                            title="この料理を削除"
                                                        >
                                                            ✕
                                                        </button>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                className="input input-bordered input-xs flex-1 font-bold text-sage-800"
                                                                value={food.name}
                                                                onChange={(e) => handleFoodEditChange(idx, 'name', e.target.value)}
                                                                placeholder="料理名"
                                                            />
                                                            <input
                                                                type="text"
                                                                className="input input-bordered input-xs w-20"
                                                                value={food.amount || ''}
                                                                onChange={(e) => handleFoodEditChange(idx, 'amount', e.target.value)}
                                                                placeholder="量目安"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            <div>
                                                                <span className="text-[10px] text-sage-500 block mb-0.5">kcal</span>
                                                                <input type="number" min="0" className="input input-bordered input-xs w-full" value={food.calories} onChange={(e) => handleFoodEditChange(idx, 'calories', Number(e.target.value) || 0)} />
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] text-sage-500 block mb-0.5">Pro (g)</span>
                                                                <input type="number" min="0" className="input input-bordered input-xs w-full" value={food.protein} onChange={(e) => handleFoodEditChange(idx, 'protein', Number(e.target.value) || 0)} />
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] text-sage-500 block mb-0.5">Fat (g)</span>
                                                                <input type="number" min="0" className="input input-bordered input-xs w-full" value={food.fat} onChange={(e) => handleFoodEditChange(idx, 'fat', Number(e.target.value) || 0)} />
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] text-sage-500 block mb-0.5">Carb (g)</span>
                                                                <input type="number" min="0" className="input input-bordered input-xs w-full" value={food.carbs} onChange={(e) => handleFoodEditChange(idx, 'carbs', Number(e.target.value) || 0)} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {editValues.foods.length === 0 && (
                                                    <div className="text-sm text-sage-500 text-center py-2">料理がありません</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 bg-sage-50 p-3 rounded-lg mt-2">
                                            <div className="form-control">
                                                <label className="label py-1"><span className="label-text font-bold text-sage-700 text-xs">手動合計: カロリー (kcal)</span></label>
                                                <input type="number" min="0" name="total_calories" value={editValues.total_calories} onChange={handleEditChange} className="input input-bordered input-sm bg-white font-bold" />
                                            </div>
                                            <div className="form-control flex flex-col justify-end text-right">
                                                <div className="text-xs text-sage-500">P: {editValues.total_protein}g / F: {editValues.total_fat}g / C: {editValues.total_carbs}g</div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-4 pt-4 border-t border-sage-100">
                                            <button onClick={() => setIsEditing(false)} disabled={isSaving || isReanalyzing} className="btn flex-1 btn-outline border-sage-200 text-sage-700 hover:bg-sage-50 disabled:bg-sage-100 disabled:text-sage-400 disabled:border-transparent">
                                                キャンセル
                                            </button>
                                            <button onClick={handleSaveEdit} disabled={isSaving || isReanalyzing} className="btn flex-1 bg-sage-600 text-white hover:bg-sage-700 border-none shadow-sm disabled:bg-sage-200 disabled:text-sage-400">
                                                {isSaving ? <span className="loading loading-spinner loading-sm"></span> : '保存する'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={closeModal}>close</button>
                    </form>
                </div>
            </dialog>
        </div>
    );
}
