"use client";

import { useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { ChatDashboard } from "@/components/ChatDashboard";

export function DashboardTabs({ isLoggedIn }: { isLoggedIn: boolean }) {
    const [activeTab, setActiveTab] = useState<"chat" | "calendar">("chat");

    return (
        <div className="flex flex-col h-full w-full">
            <div className="flex justify-center mb-4">
                <div role="tablist" className="tabs tabs-boxed bg-sage-100 p-1">
                    <button
                        role="tab"
                        onClick={() => setActiveTab("chat")}
                        className={`tab tab-sm sm:tab-md font-bold transition-all px-6 ${activeTab === 'chat' ? 'bg-white text-sage-900 shadow-sm rounded-md' : 'text-sage-500 hover:text-sage-700'}`}
                    >
                        💬 チャット (記録)
                    </button>
                    <button
                        role="tab"
                        onClick={() => setActiveTab("calendar")}
                        className={`tab tab-sm sm:tab-md font-bold transition-all px-6 ${activeTab === 'calendar' ? 'bg-white text-sage-900 shadow-sm rounded-md' : 'text-sage-500 hover:text-sage-700'}`}
                    >
                        📊 カレンダー・統計
                    </button>
                </div>
            </div>

            <div className="flex-1 w-full">
                {activeTab === "chat" ? (
                    <div className="h-full">
                        <ChatDashboard isLoggedIn={isLoggedIn} />
                    </div>
                ) : (
                    <div className="max-w-xl mx-auto">
                        <Dashboard isLoggedIn={isLoggedIn} />
                    </div>
                )}
            </div>
        </div>
    );
}
