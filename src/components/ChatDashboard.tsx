"use client";

import { useEffect, useState, useRef } from "react";
import type { AnalyzedFood } from "@/lib/types";

type MealLog = {
    id: number;
    image_url: string;
    meal_type: string;
    total_calories: number;
    total_protein: number;
    total_fat: number;
    total_carbs: number;
    analyzed_data: { foods: AnalyzedFood[]; original_text?: string };
    logged_at: string;
};

type ChatMessage = {
    id: string; // unique string (can be log id or temp id for user input)
    role: "user" | "bot" | "system";
    type: "text" | "image" | "log" | "system_link";
    content?: string;
    imageUrl?: string;
    logData?: MealLog;
    timestamp: Date;
    isSending?: boolean;
};

const getResultPhrase = (log: any, timestamp: Date) => {
    const totalKcal = Math.round(log.total_calories || 0);
    const foodNames = log.analyzed_data?.foods ? log.analyzed_data.foods.map((f: any) => f.name).slice(0, 2).join('と') : '';
    const foodSuffix = log.analyzed_data?.foods?.length > 2 ? 'など' : '';
    const foodStr = foodNames ? `「${foodNames}${foodSuffix}」ですね！` : '';

    const h = timestamp.getHours();
    let greeting = "";
    if (h >= 5 && h < 11) greeting = "おはようございます！朝食の記録ですね☀️\n";
    else if (h >= 11 && h < 16) greeting = "お昼の記録ですね。午後も頑張りましょう🍽️\n";
    else if (h >= 16 && h < 21) greeting = "今日もお疲れ様です！夕食を記録しました✨\n";
    else greeting = "夜遅くまでお疲れ様です！しっかり記録しました🌙\n";

    return `${foodStr}${greeting}約${totalKcal}kcalとして計算しておきました😊`;
};

export function ChatDashboard({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [inputText, setInputText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial fetch of logs
    const fetchLogs = async () => {
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
            const logs: MealLog[] = data.logs || [];

            const now = new Date();
            const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

            const recentLogs = logs.filter(log => new Date(log.logged_at) >= yesterdayStart);
            const olderLogs = logs.filter(log => new Date(log.logged_at) < yesterdayStart);

            const chatMessages: ChatMessage[] = [];

            // Add system link if there are older logs
            if (olderLogs.length > 0) {
                chatMessages.push({
                    id: "history_link",
                    role: "system",
                    type: "system_link",
                    timestamp: new Date(yesterdayStart.getTime() - 1000)
                });
            }

            // Convert recent logs to chat messages (user input + bot response)
            recentLogs.forEach(log => {
                const logTime = new Date(log.logged_at);
                // User message (what they sent)
                chatMessages.push({
                    id: `user-${log.id}`,
                    role: "user",
                    type: log.image_url ? "image" : "text",
                    content: log.image_url ? undefined : (log.analyzed_data?.original_text || "食事を記録しました"),
                    imageUrl: log.image_url,
                    timestamp: new Date(logTime.getTime() - 1000) // 1 second before bot
                });

                // Bot message (the conversational text)
                chatMessages.push({
                    id: `bot-text-${log.id}`,
                    role: "bot",
                    type: "text",
                    content: getResultPhrase(log, logTime),
                    timestamp: new Date(logTime.getTime() - 500) // 0.5s before card
                });

                // Bot message (the result card)
                chatMessages.push({
                    id: `bot-${log.id}`,
                    role: "bot",
                    type: "log",
                    logData: log,
                    timestamp: logTime
                });
            });

            // Sort ascending (oldest first, newest at the bottom)
            chatMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

            // Add today's greeting
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const GREETINGS = [
                "今日も1日頑張りましょう！食事の写真を送るかテキストで教えてください😊",
                "今日の食事も記録して健康管理を続けましょう🍽️",
                "食べたものを教えてくださいね。私がカロリーを計算します✨",
                "お疲れ様です！食事の記録を忘れずに。写真でもテキストでもOKです📸",
                "今日も健康的な1日にしましょう！何を食べたか教えてください🍎"
            ];
            // Use the date to pick a consistent greeting for the day
            const greetingIndex = Math.floor(todayStart.getTime() / (1000 * 60 * 60 * 24)) % GREETINGS.length;

            chatMessages.push({
                id: "greeting",
                role: "bot",
                type: "text",
                content: GREETINGS[greetingIndex],
                timestamp: new Date(todayStart.getTime() + 1000) // 1 second after start of today
            });

            // Resort because we added a new message
            chatMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

            setMessages(chatMessages);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    // Auto-scroll to bottom using container scrollTop to avoid page jumping
    const isInitialLoad = useRef(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!scrollContainerRef.current) return;

        if (isInitialLoad.current) {
            // first load
            if (messages.length > 0) {
                // Instantly scroll to bottom without smooth animation
                scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                isInitialLoad.current = false;
            }
            return;
        }

        // Scroll smoothly for new messages
        scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: "smooth"
        });
    }, [messages]);

    const handleSendText = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const textToSubmit = inputText.trim();
        if (!textToSubmit || isSubmitting) return;

        setInputText("");
        setIsSubmitting(true);

        const tempId = `temp-${Date.now()}`;

        // Add user message
        const userMsg: ChatMessage = {
            id: tempId,
            role: "user",
            type: "text",
            content: textToSubmit,
            timestamp: new Date(),
        };

        // Add uncompleted bot message
        const ackMsgId = `ack-${Date.now()}`;
        const ackMsg: ChatMessage = {
            id: ackMsgId,
            role: "bot",
            type: "text",
            content: "ありがとうございます！内容を確認してカロリーを計算しています…少々お待ちくださいね🔍",
            timestamp: new Date()
        };

        const loadingMsgId = `loading-${Date.now()}`;
        const loadingMsg: ChatMessage = {
            id: loadingMsgId,
            role: "bot",
            type: "text",
            content: "...", // Simulating typing
            timestamp: new Date(Date.now() + 100),
            isSending: true
        };

        // Artificial delay for "human-like" feel
        await new Promise(resolve => setTimeout(resolve, 800));
        setMessages(prev => [...prev, userMsg, ackMsg, loadingMsg]);

        try {
            const res = await fetch('/api/logs/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: textToSubmit,
                    meal_type: "other",
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to save");
            }

            const data = await res.json();

            const newLogData = {
                id: data.savedLogId,
                image_url: "",
                meal_type: data.meal_type,
                total_calories: data.totalCalories,
                total_protein: data.totalProtein,
                total_fat: data.totalFat,
                total_carbs: data.totalCarbs,
                analyzed_data: { foods: data.foods, original_text: textToSubmit },
                logged_at: new Date().toISOString()
            };

            // 人間らしさのための遅延
            await new Promise(resolve => setTimeout(resolve, 600));

            // Remove loading msg and add the conversational text + result log msg
            setMessages(prev => {
                const withoutLoading = prev.filter(m => m.id !== loadingMsgId);
                const nowTime = new Date();
                return [
                    ...withoutLoading,
                    {
                        id: `bot-text-${data.savedLogId || Date.now()}`,
                        role: "bot",
                        type: "text",
                        content: getResultPhrase(newLogData, nowTime),
                        timestamp: new Date(nowTime.getTime() + 100)
                    },
                    {
                        id: `bot-log-${data.savedLogId || Date.now()}`,
                        role: "bot",
                        type: "log",
                        logData: newLogData,
                        timestamp: new Date(nowTime.getTime() + 200)
                    }
                ];
            });

        } catch (error: any) {
            console.error(error);
            setMessages(prev => prev.map(msg =>
                msg.id === loadingMsgId
                    ? { ...msg, type: "text", content: error.message || "エラーが発生しました😢 もう一度試してください。", isSending: false }
                    : msg
            ));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsSubmitting(true);
        const tempId = `img-temp-${Date.now()}`;
        const imageUrl = URL.createObjectURL(file);

        const userMsg: ChatMessage = {
            id: tempId,
            role: "user",
            type: "image",
            imageUrl: imageUrl,
            timestamp: new Date(),
        };

        const ackMsgId = `ack-img-${Date.now()}`;
        const ackMsg: ChatMessage = {
            id: ackMsgId,
            role: "bot",
            type: "text",
            content: "写真ありがとうございます！美味しそうですね✨ いま画像から食事内容を解析しています…📸",
            timestamp: new Date()
        };

        const loadingMsgId = `loading-${Date.now()}`;
        const loadingMsg: ChatMessage = {
            id: loadingMsgId,
            role: "bot",
            type: "text",
            content: "...", // Simulating typing
            timestamp: new Date(Date.now() + 100),
            isSending: true
        };

        // Artificial delay for "human-like" feel
        await new Promise(resolve => setTimeout(resolve, 800));
        setMessages(prev => [...prev, userMsg, ackMsg, loadingMsg]);

        try {
            // Compress Image
            const { default: imageCompression } = await import("browser-image-compression");
            const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1024 });

            // Read as FormData instead of base64
            const formData = new FormData();
            formData.append("image", compressedFile, file.name);
            formData.append("meal_type", "other");

            // 1. Analyze & Track (Analyze API automatically saves for logged-in users)
            const analyzeRes = await fetch("/api/analyze", {
                method: "POST",
                body: formData,
            });
            const analyzeData = await analyzeRes.json().catch(() => ({}));
            if (!analyzeRes.ok) throw new Error(analyzeData.error || "画像の解析に失敗しました");

            const savedLog = {
                id: analyzeData.savedLogId,
                image_url: imageUrl, // Use local blob url for immediate display
                meal_type: "other",
                total_calories: analyzeData.summary.totalCalories,
                total_protein: analyzeData.summary.totalProtein,
                total_fat: analyzeData.summary.totalFat,
                total_carbs: analyzeData.summary.totalCarbs,
                analyzed_data: { foods: analyzeData.foods, original_text: "" },
                logged_at: new Date().toISOString()
            };

            // 人間らしさのための遅延
            await new Promise(resolve => setTimeout(resolve, 600));

            // Remove loading msg and add the conversational text + result log msg
            setMessages(prev => {
                const withoutLoading = prev.filter(m => m.id !== loadingMsgId);
                const nowTime = new Date();
                return [
                    ...withoutLoading,
                    {
                        id: `bot-text-${savedLog?.id || Date.now()}`,
                        role: "bot",
                        type: "text",
                        content: getResultPhrase(savedLog, nowTime),
                        timestamp: new Date(nowTime.getTime() + 100)
                    },
                    {
                        id: `bot-log-${savedLog?.id || Date.now()}`,
                        role: "bot",
                        type: "log",
                        logData: savedLog,
                        timestamp: new Date(nowTime.getTime() + 200)
                    }
                ];
            });
        } catch (error: any) {
            console.error(error);
            setMessages(prev => prev.map(msg =>
                msg.id === loadingMsgId
                    ? { ...msg, type: "text", content: error.message || "画像の解析に失敗しました😢", isSending: false }
                    : msg
            ));
        } finally {
            setIsSubmitting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateBreak = (date: Date) => {
        return date.toLocaleDateString([], { month: 'long', day: 'numeric', weekday: 'short' });
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[50vh] text-sage-600">
                <span className="loading loading-spinner loading-lg"></span>
                <p className="mt-4 text-sm font-medium">チャット履歴を読み込み中...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100dvh-220px)] sm:h-[600px] max-h-[800px] w-full bg-[#F5F7F4] rounded-2xl border border-sage-200 shadow-inner overflow-hidden relative">

            {/* Messages Area */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 flex flex-col">
                {messages.map((msg, index) => {
                    // Date break logic
                    const isNewDay = index === 0 || messages[index - 1].timestamp.toDateString() !== msg.timestamp.toDateString();
                    // Check if consecutive from bot to hide avatar/tail
                    const isConsecutiveBot = index > 0 && !isNewDay && messages[index - 1].role === msg.role && msg.role === "bot";

                    let mtClass = index === 0 ? "" : "mt-4";
                    if (isConsecutiveBot) {
                        mtClass = "mt-1";
                    }

                    return (
                        <div key={msg.id} className={mtClass}>
                            {isNewDay && (
                                <div className="text-center mb-6 mt-2">
                                    <span className="bg-sage-200/50 text-sage-600 text-[11px] font-bold px-3 py-1 rounded-full">
                                        {formatDateBreak(msg.timestamp)}
                                    </span>
                                </div>
                            )}

                            {msg.role === "system" ? (
                                <div className="flex justify-center my-4 animate-fade-in-up">
                                    <a href="/dashboard" className="bg-white border-2 border-sage-200 text-sage-600 text-xs font-bold px-4 py-2 rounded-full shadow-sm hover:bg-sage-50 transition-colors flex items-center gap-2">
                                        📅 これ以前の履歴は履歴画面で確認できます ＞
                                    </a>
                                </div>
                            ) : msg.role === "user" ? (
                                <div className="chat chat-end animate-fade-in-up">
                                    <div className="chat-header text-[10px] text-sage-400 opacity-80 mb-1 mr-1">
                                        {formatTime(msg.timestamp)}
                                    </div>
                                    <div className={`chat-bubble shadow-sm bg-sage-600 text-white ${msg.type === "image" ? "p-1.5" : "text-sm"}`}>
                                        {msg.type === "text" && msg.content}
                                        {msg.type === "image" && (
                                            <img src={msg.imageUrl} className="max-w-[200px] sm:max-w-[240px] h-auto rounded-xl object-cover block" alt="Uploaded" />
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className={`chat chat-start animate-fade-in-up`}>
                                    <div className={`chat-image avatar row-start-2 place-self-start mt-0.5 ${isConsecutiveBot ? 'invisible' : ''}`}>
                                        <div className="w-10 h-10 rounded-full border border-sage-200 shadow-sm overflow-hidden bg-white">
                                            <img src="/ai-bot.png" alt="AI Agent" className="w-full h-full object-cover scale-110" />
                                        </div>
                                    </div>

                                    {!isConsecutiveBot && (
                                        <div className="chat-header text-[10px] text-sage-400 opacity-80 mb-1 ml-1">
                                            AI アシスタント
                                            <time className="ml-1 text-[10px] opacity-50">{formatTime(msg.timestamp)}</time>
                                        </div>
                                    )}

                                    {msg.type === "text" && (
                                        <div className={`chat-bubble bg-white text-sage-800 border border-sage-200 text-sm shadow-sm whitespace-pre-wrap leading-relaxed ${msg.isSending ? 'opacity-70 animate-pulse' : ''} ${isConsecutiveBot ? 'before:hidden' : ''}`}>
                                            {msg.content}
                                        </div>
                                    )}

                                    {msg.type === "log" && msg.logData && (
                                        <div className={`chat-bubble bg-white text-sage-800 border-2 border-sage-200 text-sm shadow-sm p-0 overflow-hidden w-[240px] sm:w-[280px] ${isConsecutiveBot ? 'before:hidden' : ''}`}>
                                            <div className="p-3">
                                                <div className="flex items-baseline gap-2 mb-2">
                                                    <span className="text-xl font-bold text-sage-900">{Math.round(msg.logData.total_calories)}</span>
                                                    <span className="text-xs text-sage-500 font-bold">kcal 記録しました！</span>
                                                </div>
                                                <div className="text-xs text-sage-700 leading-relaxed mb-3">
                                                    {msg.logData.analyzed_data?.foods?.length > 0 ? (
                                                        <ul className="list-disc list-inside space-y-1">
                                                            {msg.logData.analyzed_data.foods.map((f: any, i: number) => (
                                                                <li key={i}>{f.name} {f.amount ? `(${f.amount})` : ''}</li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p>食事記録</p>
                                                    )}
                                                </div>
                                                <div className="flex justify-between gap-1 text-[10px] font-bold mb-3">
                                                    <div className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md flex-1 text-center border border-blue-100">
                                                        P: {Math.round(msg.logData.total_protein)}g
                                                    </div>
                                                    <div className="bg-purple-50 text-purple-600 px-2 py-1 rounded-md flex-1 text-center border border-purple-100">
                                                        F: {Math.round(msg.logData.total_fat)}g
                                                    </div>
                                                    <div className="bg-green-50 text-green-600 px-2 py-1 rounded-md flex-1 text-center border border-green-100">
                                                        C: {Math.round(msg.logData.total_carbs)}g
                                                    </div>
                                                </div>
                                                <a href={`/dashboard?date=${new Date(msg.logData.logged_at).toISOString().split('T')[0]}&logId=${msg.logData.id}`} className="btn btn-sm btn-outline text-sage-600 border-sage-300 hover:bg-sage-600 hover:text-white w-full rounded-md font-bold transition-colors text-xs sm:text-sm">
                                                    詳細や修正はコチラ ＞
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-sage-200 p-3 flex gap-2 items-end">
                <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleImageUpload}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="btn btn-circle btn-ghost bg-sage-100 text-sage-700 hover:bg-sage-200 disabled:bg-sage-50"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                </button>

                <form onSubmit={handleSendText} className="flex-1 flex gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="例: おにぎり1個、サラダ"
                        className="input input-bordered flex-1 focus:outline-none focus:border-sage-400 bg-sage-50/50 text-sm"
                        disabled={isSubmitting}
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim() || isSubmitting}
                        className="btn btn-circle bg-sage-600 text-white hover:bg-sage-700 border-none disabled:bg-sage-200 disabled:text-sage-400 shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
