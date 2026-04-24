"use client";

import { Activity as ActivityIcon } from "lucide-react";
import { useState } from "react";

export { ActivityIcon as Activity };

export function MigrateButton() {
    const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
    const [msg, setMsg] = useState("");

    async function runMigration() {
        setStatus("loading");
        try {
            const res = await fetch("/api/admin/migrate-analyze-logs", { method: "POST" });
            const json = await res.json();
            if (res.ok) {
                setStatus("ok");
                setMsg(json.message ?? "完了");
            } else {
                setStatus("error");
                setMsg(json.error ?? "エラー");
            }
        } catch (e: any) {
            setStatus("error");
            setMsg(e.message);
        }
    }

    return (
        <div className="flex items-center gap-3">
            {msg && (
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    status === "ok" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                    {msg}
                </span>
            )}
            <button
                onClick={runMigration}
                disabled={status === "loading" || status === "ok"}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
                {status === "loading" ? "実行中..." : "🗄️ テーブル作成 / 確認"}
            </button>
        </div>
    );
}
