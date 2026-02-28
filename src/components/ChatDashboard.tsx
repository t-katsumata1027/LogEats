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
    analyzed_data: { foods: AnalyzedFood[] };
    logged_at: string;
};

type ChatMessage = {
    id: string; // unique string (can be log id or temp id for user input)
    role: "user" | "bot";
    type: "text" | "image" | "log";
    content?: string;
    imageUrl?: string;
    logData?: MealLog;
    timestamp: Date;
    isSending?: boolean;
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

            // Convert logs to chat messages
            const chatLogMessages: ChatMessage[] = logs.map(log => ({
                id: `log-${log.id}`,
                role: "bot",
                type: "log",
                logData: log,
                timestamp: new Date(log.logged_at)
            }));

            // Sort ascending (oldest first, newest at the bottom)
            chatLogMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

            setMessages([
                {
                    id: "greeting",
                    role: "bot",
                    type: "text",
                    content: "今日も1日頑張りましょう！食事の写真を送るかテキストで教えてください😊",
                    timestamp: new Date(Date.now() - 10000000)
                },
                ...chatLogMessages
            ]);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
        const loadingMsgId = `loading-${Date.now()}`;
        const loadingMsg: ChatMessage = {
            id: loadingMsgId,
            role: "bot",
            type: "text",
            content: "記録中…🔍 カロリーを計算しています！",
            timestamp: new Date(),
            isSending: true
        };

        setMessages(prev => [...prev, userMsg, loadingMsg]);

        try {
            const res = await fetch('/api/logs/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: textToSubmit,
                    meal_type: "other",
                }),
            });

            if (!res.ok) throw new Error("Failed to save");
            await fetchLogs(); // 成功したら取り直して画面更新
        } catch (error) {
            console.error(error);
            setMessages(prev => prev.map(msg =>
                msg.id === loadingMsgId
                    ? { ...msg, content: "エラーが発生しました😢 もう一度試してください。", isSending: false }
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

        const loadingMsgId = `loading-${Date.now()}`;
        const loadingMsg: ChatMessage = {
            id: loadingMsgId,
            role: "bot",
            type: "text",
            content: "写真を解析中…しばらくお待ちください🍽️",
            timestamp: new Date(),
            isSending: true
        };

        setMessages(prev => [...prev, userMsg, loadingMsg]);

        try {
            // Compress Image
            const { default: imageCompression } = await import("browser-image-compression");
            const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1024 });

            // Read as base64
            const reader = new FileReader();
            reader.readAsDataURL(compressedFile);
            const base64Image = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
            });

            // 1. Analyze
            const analyzeRes = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: base64Image }),
            });
            if (!analyzeRes.ok) throw new Error("Failed to analyze image");
            const analyzeData = await analyzeRes.json();

            // 2. Track / Save Log
            const trackRes = await fetch("/api/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    foods: analyzeData.foods,
                    image: base64Image,
                    mealType: "other"
                }),
            });
            if (!trackRes.ok) throw new Error("Failed to save log");

            await fetchLogs(); // Refresh logs to get the newly created log from DB
        } catch (error) {
            console.error(error);
            setMessages(prev => prev.map(msg =>
                msg.id === loadingMsgId
                    ? { ...msg, content: "画像の解析に失敗しました😢", isSending: false }
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
        <div className="flex flex-col h-[calc(100vh-160px)] sm:h-[calc(100vh-180px)] bg-[#F5F7F4] rounded-2xl border border-sage-200 shadow-inner overflow-hidden relative">

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => {
                    // Date break logic
                    const isNewDay = index === 0 || messages[index - 1].timestamp.toDateString() !== msg.timestamp.toDateString();

                    return (
                        <div key={msg.id}>
                            {isNewDay && (
                                <div className="text-center my-6">
                                    <span className="bg-sage-200/50 text-sage-600 text-[11px] font-bold px-3 py-1 rounded-full">
                                        {formatDateBreak(msg.timestamp)}
                                    </span>
                                </div>
                            )}

                            {msg.role === "user" ? (
                                <div className="chat chat-end animate-fade-in-up">
                                    <div className="chat-header text-[10px] text-sage-400 opacity-80 mb-1 mr-1">
                                        {formatTime(msg.timestamp)}
                                    </div>
                                    <div className={`chat-bubble shadow-sm ${msg.type === "image" ? "bg-transparent p-0 shadow-none" : "bg-sage-600 text-white text-sm"}`}>
                                        {msg.type === "text" && msg.content}
                                        {msg.type === "image" && (
                                            <img src={msg.imageUrl} className="max-w-[200px] h-auto rounded-2xl border-2 border-sage-200 object-cover" alt="Uploaded" />
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="chat chat-start animate-fade-in-up">
                                    <div className="chat-image avatar">
                                        <div className="w-8 h-8 rounded-full bg-sage-200 border border-sage-300 flex items-center justify-center text-lg shadow-sm">
                                            🤖
                                        </div>
                                    </div>
                                    <div className="chat-header text-[10px] text-sage-400 opacity-80 mb-1 ml-1">
                                        AI アシスタント
                                        <time className="ml-1 text-[10px] opacity-50">{formatTime(msg.timestamp)}</time>
                                    </div>

                                    {msg.type === "text" && (
                                        <div className={`chat-bubble bg-white text-sage-800 border border-sage-200 text-sm shadow-sm ${msg.isSending ? 'opacity-70 animate-pulse' : ''}`}>
                                            {msg.content}
                                        </div>
                                    )}

                                    {msg.type === "log" && msg.logData && (
                                        <div className="chat-bubble bg-white text-sage-800 border-2 border-sage-200 text-sm shadow-sm p-0 overflow-hidden w-[240px] sm:w-[280px]">
                                            {msg.logData.image_url && (
                                                <figure className="h-32 bg-sage-100 relative w-full border-b border-sage-200">
                                                    <img src={msg.logData.image_url} alt="Meal" className="absolute inset-0 w-full h-full object-cover" />
                                                </figure>
                                            )}
                                            <div className="p-3">
                                                <div className="flex items-baseline gap-2 mb-2">
                                                    <span className="text-xl font-bold text-sage-900">{Math.round(msg.logData.total_calories)}</span>
                                                    <span className="text-xs text-sage-500 font-bold">kcal 記録しました！</span>
                                                </div>
                                                <p className="text-xs text-sage-600 line-clamp-2 leading-relaxed mb-3">
                                                    {msg.logData.analyzed_data?.foods?.map((f: any) => f.name).join('、') || '食事記録'}
                                                </p>
                                                <div className="flex justify-between gap-1 text-[10px] font-bold">
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
