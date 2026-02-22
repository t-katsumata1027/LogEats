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

    // --- モーダル・詳細編集用のState ---
    const [selectedLog, setSelectedLog] = useState<MealLog | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState({
        total_calories: 0,
        total_protein: 0,
        total_fat: 0,
        total_carbs: 0
    });
    const [isSaving, setIsSaving] = useState(false);

    const openModal = (log: MealLog) => {
        setSelectedLog(log);
        setIsEditing(false);
        setEditValues({
            total_calories: Math.round(log.total_calories),
            total_protein: Math.round(log.total_protein),
            total_fat: Math.round(log.total_fat),
            total_carbs: Math.round(log.total_carbs)
        });
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
            const res = await fetch(`/api/logs/${selectedLog.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editValues)
            });
            if (!res.ok) throw new Error("更新に失敗しました");

            // 画面のStateを更新
            setLogs(logs.map(l => l.id === selectedLog.id ? {
                ...l,
                total_calories: editValues.total_calories,
                total_protein: editValues.total_protein,
                total_fat: editValues.total_fat,
                total_carbs: editValues.total_carbs
            } : l));
            closeModal();
        } catch (err) {
            alert(err instanceof Error ? err.message : "エラーが発生しました");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditValues(prev => ({ ...prev, [name]: Number(value) || 0 }));
    };

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
                                            <span>💡 実際の分量と違った場合など、栄養素を手動で修正できます。</span>
                                        </div>

                                        <div className="form-control">
                                            <label className="label py-1"><span className="label-text font-bold text-sage-700">合計カロリー (kcal)</span></label>
                                            <input type="number" min="0" name="total_calories" value={editValues.total_calories} onChange={handleEditChange} className="input input-bordered input-sm bg-white" />
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="form-control">
                                                <label className="label py-1"><span className="label-text text-xs text-sage-600">タンパク質 (g)</span></label>
                                                <input type="number" min="0" name="total_protein" value={editValues.total_protein} onChange={handleEditChange} className="input input-bordered input-sm bg-white w-full" />
                                            </div>
                                            <div className="form-control">
                                                <label className="label py-1"><span className="label-text text-xs text-sage-600">脂質 (g)</span></label>
                                                <input type="number" min="0" name="total_fat" value={editValues.total_fat} onChange={handleEditChange} className="input input-bordered input-sm bg-white w-full" />
                                            </div>
                                            <div className="form-control">
                                                <label className="label py-1"><span className="label-text text-xs text-sage-600">炭水化物 (g)</span></label>
                                                <input type="number" min="0" name="total_carbs" value={editValues.total_carbs} onChange={handleEditChange} className="input input-bordered input-sm bg-white w-full" />
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-6 pt-4 border-t border-sage-100">
                                            <button onClick={() => setIsEditing(false)} disabled={isSaving} className="btn flex-1 btn-outline border-sage-200 text-sage-700 hover:bg-sage-50">
                                                キャンセル
                                            </button>
                                            <button onClick={handleSaveEdit} disabled={isSaving} className="btn flex-1 bg-sage-600 text-white hover:bg-sage-700 border-none shadow-sm">
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
