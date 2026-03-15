"use client";

import { useState } from "react";
import { AnalyzerClient } from "@/components/AnalyzerClient";
import { ChatDashboard } from "@/components/ChatDashboard";

export function RecordingTabs({ isLoggedIn }: { isLoggedIn: boolean }) {
    const [activeTab, setActiveTab] = useState<"chat" | "classic">("chat");

    return (
        <div className="flex flex-col h-full w-full flex-1">
            <div className="flex justify-center mb-0 shrink-0 border-b border-sage-200 bg-white">
                <div role="tablist" className="tabs w-full max-w-2xl mx-auto px-2">
                    <button
                        role="tab"
                        onClick={() => setActiveTab("chat")}
                        className={`tab tab-md sm:tab-lg flex-1 font-bold transition-all h-12 border-b-2 ${activeTab === 'chat' ? 'border-sage-600 text-sage-900' : 'border-transparent text-sage-400 hover:text-sage-600'}`}
                    >
                        💬 チャットで記録
                    </button>
                    <button
                        role="tab"
                        onClick={() => setActiveTab("classic")}
                        className={`tab tab-md sm:tab-lg flex-1 font-bold transition-all h-12 border-b-2 ${activeTab === 'classic' ? 'border-sage-600 text-sage-900' : 'border-transparent text-sage-400 hover:text-sage-600'}`}
                    >
                        📝 登録フォーム
                    </button>
                </div>
            </div>

            <div className="flex-1 w-full flex flex-col min-h-0">
                {activeTab === "chat" ? (
                    <div className="flex-1 flex flex-col min-h-0">
                        <ChatDashboard isLoggedIn={isLoggedIn} />
                    </div>
                ) : (
                    <div className="flex-1">
                        <AnalyzerClient isLoggedIn={isLoggedIn} />
                    </div>
                )}
            </div>
        </div>
    );
}
