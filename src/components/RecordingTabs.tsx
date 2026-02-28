"use client";

import { useState } from "react";
import { AnalyzerClient } from "@/components/AnalyzerClient";
import { ChatDashboard } from "@/components/ChatDashboard";

export function RecordingTabs({ isLoggedIn }: { isLoggedIn: boolean }) {
    const [activeTab, setActiveTab] = useState<"chat" | "classic">("chat");

    return (
        <div className="flex flex-col h-full w-full">
            <div className="flex justify-center mb-6">
                <div role="tablist" className="tabs tabs-boxed bg-sage-50/50 p-1 border border-sage-200 shadow-sm">
                    <button
                        role="tab"
                        onClick={() => setActiveTab("chat")}
                        className={`tab tab-sm sm:tab-md font-bold transition-all px-4 sm:px-6 ${activeTab === 'chat' ? 'bg-white text-sage-900 shadow-sm rounded-md border border-sage-200' : 'text-sage-500 hover:text-sage-700'}`}
                    >
                        💬 チャットで記録
                    </button>
                    <button
                        role="tab"
                        onClick={() => setActiveTab("classic")}
                        className={`tab tab-sm sm:tab-md font-bold transition-all px-4 sm:px-6 ${activeTab === 'classic' ? 'bg-white text-sage-900 shadow-sm rounded-md border border-sage-200' : 'text-sage-500 hover:text-sage-700'}`}
                    >
                        📝 登録フォーム
                    </button>
                </div>
            </div>

            <div className="flex-1 w-full">
                {activeTab === "chat" ? (
                    <div className="h-full">
                        <ChatDashboard isLoggedIn={isLoggedIn} />
                    </div>
                ) : (
                    <div>
                        <AnalyzerClient isLoggedIn={isLoggedIn} />
                    </div>
                )}
            </div>
        </div>
    );
}
