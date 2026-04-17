"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";
import { WeeklyChart } from "@/components/WeeklyChart";
import { AdBanner } from "@/components/AdBanner";
import { AffiliateBanner } from "@/components/AffiliateBanner";
import type { AnalyzedFood, NutritionSummary } from "@/lib/types";

type MealLog = {
    id: number;
    share_id?: string;
    short_id?: string;
    image_url: string;
    meal_type: string;
    total_calories: number;
    total_protein: number;
    total_fat: number;
    total_carbs: number;
    analyzed_data: { foods: AnalyzedFood[] };
    logged_at: string;
};

const MEAL_TYPE_OPTIONS = [
    { value: "breakfast", label: "🌅 朝食" },
    { value: "lunch", label: "☀️ 昼食" },
    { value: "dinner", label: "🌙 夕食" },
    { value: "snack", label: "🍪 間食" },
    { value: "other", label: "📝 その他" },
];

const MEAL_TYPE_LABELS: Record<string, string> = {
    breakfast: "🌅 朝食",
    lunch: "☀️ 昼食",
    dinner: "🌙 夕食",
    snack: "🍪 間食",
    other: "📝 その他",
};

export function Dashboard({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
    const [logs, setLogs] = useState<MealLog[]>([]);
    const [targetCalories, setTargetCalories] = useState<number | null>(null);
    const [targetProtein, setTargetProtein] = useState<number | null>(null);
    const [targetFat, setTargetFat] = useState<number | null>(null);
    const [targetCarbs, setTargetCarbs] = useState<number | null>(null);
    const [tolerancePct, setTolerancePct] = useState<number>(10);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);

    // --- モーダル・詳細編集用のState ---
    const [selectedLog, setSelectedLog] = useState<MealLog | null>(null);
    const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState({
        total_calories: 0,
        total_protein: 0,
        total_fat: 0,
        total_carbs: 0,
        meal_type: "other",
        foods: [] as AnalyzedFood[]
    });
    const [isSaving, setIsSaving] = useState(false);

    // --- AI再計算用のState ---
    const [reanalyzePrompt, setReanalyzePrompt] = useState("");
    const [isReanalyzing, setIsReanalyzing] = useState(false);
    const [reanalyzeProgress, setReanalyzeProgress] = useState(0);

    // --- 手動追記モーダル用のState ---
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualText, setManualText] = useState("");
    const [manualMealType, setManualMealType] = useState("other");
    const [manualDate, setManualDate] = useState("");
    const [manualTime, setManualTime] = useState("");
    const [isManualSubmitting, setIsManualSubmitting] = useState(false);
    const [manualProgress, setManualProgress] = useState(0);
    const [manualError, setManualError] = useState<string | null>(null);

    // --- Deep Link 対応 ---
    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const dateStr = params.get("date");
            if (dateStr) {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    setSelectedDate(d);
                }
            }
        }
    }, []);

    useEffect(() => {
        if (logs.length > 0 && typeof window !== "undefined" && !selectedLog) {
            const params = new URLSearchParams(window.location.search);
            const logId = params.get("logId");
            if (logId) {
                const log = logs.find(l => l.id.toString() === logId);
                if (log) {
                    openModal(log);
                    // Open回数を1回に制限するためURLから消す
                    window.history.replaceState(null, '', '/dashboard');
                }
            }
        }
    }, [logs, selectedLog]);

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
            meal_type: log.meal_type || "other",
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
            const payload = {
                ...editValues,
                analyzed_data: { foods: editValues.foods },
                meal_type: editValues.meal_type,
            };
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
                meal_type: editValues.meal_type,
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
                meal_type: selectedLog?.meal_type || "other",
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

    const handleShareModal = (shareId: string | undefined, shortId?: string | null) => {
        if (!shareId) return;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://log-eats.com';
        const shareUrl = shortId
            ? `${baseUrl}/s/${shortId}`
            : `${baseUrl}/share/${shareId}`;

        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopiedShareId(shareId);
            setTimeout(() => setCopiedShareId(null), 2000);
        });
    };

    const handleShareX = (log: MealLog) => {
        if (!log.share_id) return;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://log-eats.com';
        const shareUrl = log.short_id
            ? `${baseUrl}/s/${log.short_id}`
            : `${baseUrl}/share/${log.share_id}`;
        
        const shareText = `今日の食事解析結果 🔥\n${Math.round(log.total_calories)}kcal (P:${Math.round(log.total_protein)}g F:${Math.round(log.total_fat)}g C:${Math.round(log.total_carbs)}g)\n#AI食事解析 #LogEats #食事記録 @EatsLog88161`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, "_blank");
    };

    const handleShareDailyX = async () => {
        // ポップアップブロック回避のため、まずウィンドウを開く
        const win = window.open('about:blank', '_blank');
        if (!win) {
            alert("ポップアップがブロックされました。ブラウザの設定を確認してください。");
            return;
        }

        try {
            // タイムゾーンによる日付のずれを防ぐため、formatを使用
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const res = await fetch('/api/shares/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dateStr })
            });

            if (!res.ok) throw new Error("API request failed");

            const { share_id, short_id } = await res.json();
            
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://log-eats.com';
            const shareUrl = `${baseUrl}/s/${short_id}`;
            const dateText = selectedDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
            const shareText = `${dateText} の食事まとめ 🔥\n合計: ${Math.round(selectedTotal)}kcal (P:${Math.round(selectedProtein)}g F:${Math.round(selectedFat)}g C:${Math.round(selectedCarbs)}g)\n#AI食事解析 #LogEats #食事記録 @EatsLog88161`;
            
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
            
            // 開いておいたウィンドウのURLを更新
            win.location.href = twitterUrl;
        } catch (err) {
            console.error("Daily share failed:", err);
            win.close(); // 失敗した場合は開いたウィンドウを閉じる
            alert("シェアに失敗しました");
        }
    };

    // 手動追記モーダルを開く（選択中の日付をデフォルトに設定）
    const openManualModal = () => {
        const now = new Date();
        // selectedDate が今日の場合は現在時刻、それ以外はその日の12:00をデフォルトに
        const base = new Date(selectedDate);
        const isToday = base.toLocaleDateString() === now.toLocaleDateString();
        const defaultTime = isToday
            ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
            : '12:00';
        const y = base.getFullYear();
        const m = String(base.getMonth() + 1).padStart(2, '0');
        const d = String(base.getDate()).padStart(2, '0');
        setManualDate(`${y}-${m}-${d}`);
        setManualTime(defaultTime);
        setManualMealType('other');
        setManualText('');
        setManualError(null);
        setIsManualModalOpen(true);
    };

    const closeManualModal = () => {
        setIsManualModalOpen(false);
    };

    const handleManualLog = async () => {
        if (!manualText.trim()) {
            setManualError('食事内容を入力してください。');
            return;
        }
        setIsManualSubmitting(true);
        setManualError(null);
        setManualProgress(0);

        // プログレスアニメーション
        const progressInterval = setInterval(() => {
            setManualProgress(prev => {
                if (prev >= 95) return prev;
                return prev + Math.max(0.5, (100 - prev) / 20);
            });
        }, 150);

        try {
            const loggedAt = manualDate && manualTime
                ? new Date(`${manualDate}T${manualTime}:00`).toISOString()
                : undefined;

            const res = await fetch('/api/logs/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: manualText.trim(),
                    meal_type: manualMealType,
                    logged_at: loggedAt,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || '保存に失敗しました');
            }

            setManualProgress(100);
            await fetchData(); // ログ一覧を再取得

            // 追記日付に自動でカレンダーを移動
            if (manualDate) {
                setSelectedDate(new Date(`${manualDate}T${manualTime || '12:00'}:00`));
            }

            setManualText(''); // テキストボックスをクリア
            closeManualModal();
        } catch (err) {
            setManualError(err instanceof Error ? err.message : 'エラーが発生しました');
        } finally {
            clearInterval(progressInterval);
            setIsManualSubmitting(false);
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
            setTargetProtein(data.targetProtein ?? null);
            setTargetFat(data.targetFat ?? null);
            setTargetCarbs(data.targetCarbs ?? null);
            setTolerancePct(data.tolerancePct ?? 10);
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

    // 空の場合でもカレンダーや手動入力フォームは表示させたいので、nullは返さない

    // 選択された日付のログだけを抽出
    const filterDateStr = selectedDate.toLocaleDateString();
    const filteredLogs = logs.filter(log => new Date(log.logged_at).toLocaleDateString() === filterDateStr);
    const selectedTotal = filteredLogs.reduce((acc, log) => acc + Number(log.total_calories || 0), 0);
    const selectedProtein = filteredLogs.reduce((acc, log) => acc + Number(log.total_protein || 0), 0);
    const selectedFat = filteredLogs.reduce((acc, log) => acc + Number(log.total_fat || 0), 0);
    const selectedCarbs = filteredLogs.reduce((acc, log) => acc + Number(log.total_carbs || 0), 0);

    // カレンダーで「記録が存在する日」をハイライトするための配列
    const loggedDates = logs.map(log => new Date(log.logged_at));

    // 目標カロリーを許容幅内で達成した日（食べすぎず、かつある程度食べた日）に⭐を表示
    const dailyCalMap: Record<string, number> = {};
    logs.forEach(log => {
        const key = new Date(log.logged_at).toLocaleDateString();
        dailyCalMap[key] = (dailyCalMap[key] || 0) + Number(log.total_calories);
    });
    const tol = tolerancePct / 100;
    const starDates = Object.entries(dailyCalMap)
        .filter(([, cal]) => {
            if (!targetCalories || targetCalories <= 0 || cal <= 0) return false;
            const lower = targetCalories * (1 - tol);
            return cal >= lower && cal <= targetCalories;
        })
        .map(([d]) => { const dt = new Date(d); dt.setHours(0, 0, 0, 0); return dt; });

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
        <div className="py-2 w-full">
            <h2 className="text-xl font-semibold text-sage-800 mb-6 flex items-center gap-2">
                <span>📊</span> あなたの食事記録
            </h2>

            {/* ----- 週次グラフ ----- */}
            <div className="mb-8 w-full">
                <WeeklyChart
                    logs={logs}
                    baseDate={selectedDate}
                    targetCalories={targetCalories}
                    targetProtein={targetProtein}
                    targetFat={targetFat}
                    targetCarbs={targetCarbs}
                />
            </div>

            {/* ----- カレンダー ----- */}
            <div className="mb-8 card w-full bg-base-100 border border-sage-100 shadow-sm p-4">
                <div className="flex justify-between items-center mb-4 px-2">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-sage-800">
                            {selectedDate.toLocaleDateString([], { year: 'numeric', month: 'short' })}
                        </h3>
                        <button
                            onClick={() => setSelectedDate(new Date())}
                            className="bg-sage-100/50 hover:bg-sage-200/50 text-sage-600 px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors border border-sage-200/50"
                        >
                            今日
                        </button>
                    </div>

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
                    <div className="w-full flex items-center gap-1 sm:gap-2 px-1">
                        <button
                            onClick={() => {
                                const d = new Date(selectedDate);
                                d.setDate(d.getDate() - 7);
                                setSelectedDate(d);
                            }}
                            className="p-1 sm:p-2 rounded-full hover:bg-sage-100 text-sage-400 hover:text-sage-700 transition-colors shrink-0"
                            aria-label="前週"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="flex-1 grid grid-cols-7 gap-1 items-center">
                            {weekDays.map((date, i) => {
                                const isSelected = date.toLocaleDateString() === selectedDate.toLocaleDateString();
                                const isToday = date.toLocaleDateString() === new Date().toLocaleDateString();
                                const hasLog = loggedDates.some(ld => ld.toLocaleDateString() === date.toLocaleDateString());
                                const isStar = starDates.some(sd => sd.toLocaleDateString() === date.toLocaleDateString());
                                const dayNames = ['月', '火', '水', '木', '金', '土', '日'];

                                return (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedDate(date)}
                                        className={`relative flex flex-col items-center justify-center p-2 rounded-xl w-full transition-colors ${isSelected
                                            ? 'bg-sage-600 text-white shadow-md'
                                            : isToday
                                                ? 'bg-sage-100 text-sage-900 border border-sage-200'
                                                : 'text-sage-600 hover:bg-sage-50'
                                            }`}
                                    >
                                        {isStar && (
                                            <span className="absolute -top-1 -right-1 text-[10px] leading-none pointer-events-none">⭐</span>
                                        )}
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

                        <button
                            onClick={() => {
                                const d = new Date(selectedDate);
                                d.setDate(d.getDate() + 7);
                                setSelectedDate(d);
                            }}
                            className="p-1 sm:p-2 rounded-full hover:bg-sage-100 text-sage-400 hover:text-sage-700 transition-colors shrink-0"
                            aria-label="次週"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                ) : (
                    /* react-day-picker (月表示) */
                    <div className="flex justify-center overflow-x-auto">
                        <DayPicker
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && setSelectedDate(date)}
                            modifiers={{ hasLog: loggedDates, starDay: starDates }}
                            modifiersClassNames={{
                                hasLog: "font-bold text-sage-800 underline decoration-sage-400 decoration-2 underline-offset-4",
                                starDay: "!relative"
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
                <div className="space-y-8 w-full">
                    {/* ----- サマリーパネル ----- */}
                    <div className="card w-full bg-base-100 shadow-sm border border-sage-100 p-6 space-y-5">
                        {/* カロリー行 */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-sage-600 text-sm font-medium">
                                    {filterDateStr === new Date().toLocaleDateString() ? "今日" : selectedDate.toLocaleDateString([], { month: "short", day: "numeric" })}摂取したカロリー
                                </p>
                                <button
                                    onClick={handleShareDailyX}
                                    className="btn btn-xs h-7 min-h-0 px-3 rounded-full flex items-center gap-1.5 transition-all bg-black text-white hover:bg-gray-800 border-none shadow-sm"
                                    title="1日のまとめをXでシェア"
                                >
                                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-2.5 w-2.5 fill-current">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                                    </svg>
                                    <span className="text-[9px] font-bold">1日のまとめをXでシェア</span>
                                </button>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-4xl font-bold tracking-tight ${targetCalories && selectedTotal > targetCalories ? 'text-red-500' : 'text-sage-900'}`}>
                                    {Math.round(selectedTotal).toLocaleString()}
                                </span>
                                <span className="text-sage-500 font-medium">
                                    kcal{targetCalories && targetCalories > 0 ? ` / ${targetCalories}` : ""}
                                </span>
                                {targetCalories && targetCalories > 0 && selectedTotal > 0 && (() => {
                                    const lower = targetCalories * (1 - tol);
                                    const isAchieved = selectedTotal >= lower && selectedTotal <= targetCalories;
                                    const isOver = selectedTotal > targetCalories;
                                    if (isAchieved) return (
                                        <span className="ml-auto text-sm font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                            ⭐ 達成！（±{tolerancePct}%範囲内）
                                        </span>
                                    );
                                    if (isOver) return (
                                        <span className="ml-auto text-sm font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                                            {Math.round(selectedTotal - targetCalories)} kcal オーバー
                                        </span>
                                    );
                                    return (
                                        <span className="ml-auto text-sm font-bold px-2 py-0.5 rounded-full bg-sage-50 text-sage-600">
                                            残り {Math.round(targetCalories - selectedTotal)} kcal
                                        </span>
                                    );
                                })()}
                            </div>
                            {targetCalories && targetCalories > 0 && (
                                <div className="w-full bg-sage-100 rounded-full h-2 mt-2 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${selectedTotal > targetCalories ? 'bg-red-400' : selectedTotal >= targetCalories * (1 - tol) ? 'bg-emerald-400' : 'bg-sage-400'}`}
                                        style={{ width: `${Math.min((selectedTotal / targetCalories) * 100, 100)}%` }}
                                    />
                                </div>
                            )}
                            {targetCalories && targetCalories > 0 && (
                                <p className="text-[10px] text-sage-400 mt-1">
                                    達成範囲: {Math.round(targetCalories * (1 - tol))}〜{targetCalories} kcal（±{tolerancePct}%）
                                </p>
                            )}
                        </div>

                        {/* PFC プログレスカード */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: "タンパク質", emoji: "💪", value: selectedProtein, target: targetProtein, color: "blue" },
                                { label: "脂質", emoji: "🥑", value: selectedFat, target: targetFat, color: "purple" },
                                { label: "炭水化物", emoji: "🌾", value: selectedCarbs, target: targetCarbs, color: "green" },
                            ].map(({ label, emoji, value, target, color }) => {
                                const rounded = Math.round(value);
                                const pct = target && target > 0 ? Math.min((value / target) * 100, 100) : 0;
                                const lower = target ? target * (1 - tol) : 0;
                                const upper = target ? target * (1 + tol) : 0;
                                const isAchieved = target && target > 0 && value >= lower && value <= upper;
                                const over = target && value > upper;
                                const barColor = over
                                    ? "bg-red-400"
                                    : isAchieved
                                        ? "bg-emerald-400"
                                        : color === "blue" ? "bg-blue-400"
                                            : color === "purple" ? "bg-purple-400"
                                                : "bg-green-400";

                                return (
                                    <div key={label} className={`rounded-xl p-3 border text-center transition-colors ${isAchieved ? 'bg-emerald-50 border-emerald-200' :
                                        over ? 'bg-red-50 border-red-200' :
                                            'bg-sage-50 border-sage-100'
                                        }`}>
                                        <div className="text-[11px] text-sage-500 font-medium mb-0.5">{emoji} {label}</div>
                                        <div className={`text-lg font-bold leading-tight ${over ? 'text-red-500' : 'text-sage-900'}`}>
                                            {rounded}<span className="text-xs font-normal text-sage-400">g</span>
                                        </div>
                                        {target && target > 0 ? (
                                            <>
                                                <div className="w-full bg-white rounded-full h-1.5 mt-1.5 overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                                                </div>
                                                <div className={`text-[10px] mt-1 font-medium ${over ? 'text-red-400' : isAchieved ? 'text-emerald-500' : 'text-sage-400'}`}>
                                                    {over
                                                        ? `+${Math.round(value - upper)}g オーバー`
                                                        : isAchieved
                                                            ? '✅ 達成！'
                                                            : `/ ${target}g (${Math.round(pct)}%)`
                                                    }
                                                </div>
                                                <div className="text-[9px] text-sage-300 mt-0.5">
                                                    {Math.round(lower)}〜{Math.round(upper)}g
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-[10px] mt-1 text-sage-300">目標未設定</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>



                    {/* ----- 広告枠（履歴の間） ----- */}
                    <div className="py-4 my-2">
                        <AffiliateBanner variant="card" />
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

            {/* ----- 手動追記モーダル ----- */}
            {isManualModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) closeManualModal(); }}
                >
                    <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto">
                        {/* ヘッダー */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-sage-900">✏️ テキストで食事を追記</h3>
                            <button
                                onClick={closeManualModal}
                                className="btn btn-sm btn-circle btn-ghost bg-sage-50 text-sage-700 hover:bg-sage-100"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-xs text-sage-500 -mt-2">
                            写真を撮り忘れた食事を、テキストで入力してAIが栄養素を自動推定します。
                        </p>

                        {/* 日時 */}
                        <div className="flex gap-3">
                            <div className="flex-1 form-control">
                                <label className="label py-1"><span className="label-text font-bold text-sage-700 text-xs">📅 日付</span></label>
                                <input
                                    type="date"
                                    className="input input-bordered input-sm bg-white"
                                    value={manualDate}
                                    onChange={e => setManualDate(e.target.value)}
                                    disabled={isManualSubmitting}
                                />
                            </div>
                            <div className="flex-1 form-control">
                                <label className="label py-1"><span className="label-text font-bold text-sage-700 text-xs">🕒 時刻</span></label>
                                <input
                                    type="time"
                                    className="input input-bordered input-sm bg-white"
                                    value={manualTime}
                                    onChange={e => setManualTime(e.target.value)}
                                    disabled={isManualSubmitting}
                                />
                            </div>
                        </div>

                        {/* 食事タイプ */}
                        <div className="form-control">
                            <label className="label py-1"><span className="label-text font-bold text-sage-700 text-xs">🍽️ 食事タイプ（AIが推定・変更可）</span></label>
                            <select
                                className="select select-bordered select-sm bg-white"
                                value={manualMealType}
                                onChange={e => setManualMealType(e.target.value)}
                                disabled={isManualSubmitting}
                            >
                                {MEAL_TYPE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* テキスト入力 */}
                        <div className="form-control">
                            <label className="label py-1"><span className="label-text font-bold text-sage-700 text-xs">🗒️ 食事内容（自然言語で入力）</span></label>
                            <textarea
                                className="textarea textarea-bordered bg-white text-sm leading-relaxed"
                                rows={4}
                                placeholder="例: ざるそば1人前と唐揚げ3個、ご飯半分くらい食べた"
                                value={manualText}
                                onChange={e => setManualText(e.target.value)}
                                disabled={isManualSubmitting}
                                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleManualLog(); }}
                            />
                            <label className="label py-0.5"><span className="label-text-alt text-sage-400">Cmd+Enter で送信</span></label>
                        </div>

                        {/* エラー表示 */}
                        {manualError && (
                            <div className="alert alert-error text-sm py-2">{manualError}</div>
                        )}

                        {/* プログレスバー */}
                        {isManualSubmitting && (
                            <div className="p-3 bg-sage-50 rounded-lg border border-sage-200 flex flex-col items-center gap-2">
                                <div className="flex items-center gap-2 text-sage-800 font-bold text-sm animate-pulse">
                                    🤖 AIが食事内容を解析・栄養素を推定中...
                                </div>
                                <progress className="progress progress-success w-full" value={manualProgress} max="100" />
                                <p className="text-[10px] text-sage-500">※ 料理の数によって10〜20秒ほどかかる場合があります</p>
                            </div>
                        )}

                        {/* ボタン */}
                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={closeManualModal}
                                disabled={isManualSubmitting}
                                className="btn flex-1 btn-outline border-sage-200 text-sage-700 hover:bg-sage-50"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleManualLog}
                                disabled={isManualSubmitting || !manualText.trim()}
                                className="btn flex-1 bg-sage-600 text-white hover:bg-sage-700 border-none shadow-sm disabled:bg-sage-200 disabled:text-sage-400"
                            >
                                {isManualSubmitting
                                    ? <span className="loading loading-spinner loading-sm" />
                                    : '🤖 AIで解析して追加'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ----- 詳細・編集モーダル ----- */}
            <dialog id="meal_detail_modal" className="modal modal-bottom sm:modal-middle">
                <div className="modal-box bg-white p-0 overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[90vh]">
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

                            </div>

                            {/* コンテンツ部分 */}
                            <div className="p-5 overflow-y-auto">
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-sage-100 pb-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex items-center gap-1.5 bg-sage-100 text-sage-800 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                                            <span>🕒</span>
                                            {new Date(selectedLog.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-[10px] text-sage-500 font-medium px-1">
                                            {new Date(selectedLog.logged_at).toLocaleDateString()}
                                        </div>
                                        <div className="bg-sage-50 border border-sage-200 text-sage-700 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap">
                                            {MEAL_TYPE_LABELS[selectedLog.meal_type] || "📝 その他"}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!isEditing && selectedLog.share_id && (
                                            <div className="flex items-center gap-1.5 bg-sage-50/50 p-1 rounded-full border border-sage-100">
                                                <button
                                                    onClick={() => handleShareX(selectedLog)}
                                                    className="btn btn-xs h-7 min-h-0 px-2.5 rounded-full flex items-center gap-1 transition-all bg-black text-white hover:bg-gray-800 border-none"
                                                    title="Xでシェア"
                                                >
                                                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-2.5 w-2.5 fill-current">
                                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                                                    </svg>
                                                    <span className="text-[9px] font-bold">Xシェア</span>
                                                </button>
                                                <button
                                                    onClick={() => handleShareModal(selectedLog.share_id, selectedLog.short_id)}
                                                    className={`btn btn-xs h-7 min-h-0 px-2.5 rounded-full flex items-center gap-1 transition-all border-none ${copiedShareId === selectedLog.share_id
                                                        ? 'bg-green-500 text-white hover:bg-green-600'
                                                        : 'bg-white text-sage-600 hover:bg-sage-50 border-sage-200 shadow-sm'
                                                        }`}
                                                >
                                                    {copiedShareId === selectedLog.share_id ? (
                                                        <><Check size={10} strokeWidth={3} /> <span className="text-[9px] font-bold">完了</span></>
                                                    ) : (
                                                        <><Copy size={10} /> <span className="text-[9px] font-bold">コピー</span></>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                        {!isEditing && (
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setIsEditing(true)} className="btn btn-xs btn-circle bg-white text-sage-600 border-sage-200 hover:bg-sage-50 shadow-sm" title="数値を編集">
                                                    ✏️
                                                </button>
                                                <button onClick={() => handleDelete(selectedLog.id)} disabled={isSaving} className="btn btn-xs btn-circle bg-white text-red-500 border-red-100 hover:bg-red-50 shadow-sm" title="この記録を削除">
                                                    🗑️
                                                </button>
                                            </div>
                                        )}
                                        <button type="button" onClick={closeModal} className="btn btn-xs btn-circle bg-sage-100 text-sage-600 hover:bg-sage-200 border-none ml-1">
                                            ✕
                                        </button>
                                    </div>
                                </div>

                                {!isEditing ? (
                                    /* --- 閲覧モード --- */
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-sm font-bold text-sage-800 border-b border-sage-100 pb-2 mb-3">AIの検出結果</h4>
                                            <div className="space-y-3">
                                                {selectedLog.analyzed_data?.foods?.map((food: any, idx: number) => (
                                                    <div key={idx} className="bg-white border border-sage-200 rounded-xl p-3 shadow-sm flex flex-col gap-2">
                                                        <div className="flex justify-between items-start">
                                                            <div className="font-bold text-sage-800 text-sm">{food.name} <span className="text-sage-500 text-xs font-normal ml-1">({food.amount})</span></div>
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-2 bg-sage-50 rounded-lg p-2 text-center text-xs border border-sage-100/50">
                                                            <div>
                                                                <span className="block text-[10px] text-sage-400 mb-0.5">kcal</span>
                                                                <span className="font-bold text-sage-700">{Math.round(food.calories)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="block text-[10px] text-sage-400 mb-0.5">Pro(g)</span>
                                                                <span className="font-semibold text-sage-600">{Math.round(food.protein)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="block text-[10px] text-sage-400 mb-0.5">Fat(g)</span>
                                                                <span className="font-semibold text-sage-600">{Math.round(food.fat)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="block text-[10px] text-sage-400 mb-0.5">Carb(g)</span>
                                                                <span className="font-semibold text-sage-600">{Math.round(food.carbs)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!selectedLog.analyzed_data?.foods || selectedLog.analyzed_data.foods.length === 0) && (
                                                    <div className="text-sage-500 text-sm py-2">内訳データがありません</div>
                                                )}
                                            </div>
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
                                        
                                        {/* アフィリエイト広告 (目立たないように配置) */}
                                        <div className="mt-8 mb-2">
                                            <AffiliateBanner variant="simple" />
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
                                            <div className="form-control mb-3">
                                                <label className="label py-1"><span className="label-text font-bold text-sage-700 text-xs">食事タイプ</span></label>
                                                <select
                                                    name="meal_type"
                                                    value={editValues.meal_type}
                                                    onChange={(e) => setEditValues(prev => ({ ...prev, meal_type: e.target.value }))}
                                                    className="select select-bordered select-sm bg-white"
                                                >
                                                    {Object.entries(MEAL_TYPE_LABELS).map(([key, value]) => (
                                                        <option key={key} value={key}>{value}</option>
                                                    ))}
                                                </select>
                                            </div>
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
