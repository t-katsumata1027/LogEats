export const dynamic = "force-dynamic";

import { sql } from "@vercel/postgres";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Activity, MigrateButton } from "./AnalyzeLogsClient";
import { unstable_noStore as noStore } from "next/cache";

const STEP_BADGE: Record<string, { label: string; color: string }> = {
    START:                   { label: "開始",         color: "bg-slate-100 text-slate-700 border-slate-200" },
    AI_RECOGNITION_RESULT:   { label: "AI認識",       color: "bg-purple-100 text-purple-700 border-purple-200" },
    LABEL_BYPASS:            { label: "ラベル読取",   color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    DB_LOOKUP_HIT:           { label: "DBヒット",     color: "bg-blue-100 text-blue-700 border-blue-200" },
    DB_LOOKUP_MISS:          { label: "DBミス",       color: "bg-amber-100 text-amber-700 border-amber-200" },
    AI_ESTIMATION_RESULT:    { label: "AI推計",       color: "bg-orange-100 text-orange-700 border-orange-200" },
    WEIGHT_OVERRIDE:         { label: "重量補正",     color: "bg-sky-100 text-sky-700 border-sky-200" },
    FOOD_CALC:               { label: "計算",         color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    SUMMARY:                 { label: "合計",         color: "bg-green-100 text-green-700 border-green-200" },
    SAVED:                   { label: "DB保存",       color: "bg-teal-100 text-teal-700 border-teal-200" },
    ERROR:                   { label: "エラー",       color: "bg-red-100 text-red-700 border-red-200" },
};

const SOURCE_BADGE: Record<string, string> = {
    web:  "bg-violet-500 text-white",
    line: "bg-green-500 text-white",
};

async function fetchRequests(): Promise<{ data: any[]; error: string | null }> {
    noStore();
    try {
        const { rows } = await sql`
            SELECT
                request_id,
                source,
                MIN(created_at)   AS created_at,
                COUNT(*)          AS steps,
                BOOL_OR(step = 'ERROR') AS has_error,
                (MAX(CASE WHEN step = 'SUMMARY' THEN data::text ELSE NULL END))::jsonb AS summary_data
            FROM analyze_logs
            GROUP BY request_id, source
            ORDER BY MIN(created_at) DESC
            LIMIT 100
        `;
        return { data: rows, error: null };
    } catch (e: any) {
        console.error("fetchRequests Error:", e);
        return { data: [], error: e.message };
    }
}

async function fetchStepsForRequest(requestId: string): Promise<{ data: any[]; error: string | null }> {
    noStore();
    try {
        const { rows } = await sql`
            SELECT step, data, created_at
            FROM analyze_logs
            WHERE request_id = ${requestId}
            ORDER BY created_at ASC
        `;
        return { data: rows, error: null };
    } catch (e: any) {
        console.error("fetchSteps Error:", e);
        return { data: [], error: e.message };
    }
}

export default async function AdminAnalyzeLogsPage({
    searchParams,
}: {
    searchParams?: Promise<{ request_id?: string }>;
}) {
    const params = await searchParams;
    const selectedId = params?.request_id ?? null;
    const { data: requests, error: requestsError } = await fetchRequests();
    const { data: detail, error: detailError } = selectedId ? await fetchStepsForRequest(selectedId) : { data: [], error: null };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-2xl font-bold text-sage-800 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-violet-500" />
                    解析パイプライン ログ
                </h2>
                <MigrateButton />
            </div>

            {(requestsError || detailError) && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 text-sm">
                    <p className="font-bold mb-1">⚠️ データベースエラー</p>
                    <p className="font-mono text-xs">{requestsError || detailError}</p>
                </div>
            )}

            {requests.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-sage-100 text-center">
                    <p className="text-sage-500 mb-3">ログがまだありません。</p>
                    <p className="text-xs text-sage-400">
                        食事画像を送信すると、解析の各ステップがここに記録されます。<br />
                        テーブルが未作成の場合は「テーブル作成」ボタンを押してください。
                    </p>
                </div>
            ) : (
                <div className="flex gap-6 flex-col lg:flex-row">
                    {/* Left: request list */}
                    <div className="lg:w-96 flex-shrink-0 space-y-2">
                        <p className="text-xs text-sage-500 font-medium uppercase tracking-wider mb-3">
                            直近{requests.length}件のリクエスト
                        </p>
                        {requests.map((req) => {
                            const summary = req.summary_data;
                            const isSelected = selectedId === req.request_id;
                            return (
                                <a
                                    key={req.request_id}
                                    href={`?request_id=${req.request_id}`}
                                    className={`block rounded-xl border p-4 transition-all cursor-pointer ${
                                        isSelected
                                            ? "border-violet-400 bg-violet-50 shadow-md"
                                            : req.has_error
                                            ? "border-red-200 bg-red-50/40 hover:bg-red-50"
                                            : "border-sage-200 bg-white hover:bg-sage-50"
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SOURCE_BADGE[req.source] || "bg-gray-200 text-gray-700"}`}>
                                            {req.source.toUpperCase()}
                                        </span>
                                        {req.has_error && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">
                                                ERROR
                                            </span>
                                        )}
                                        <span className="ml-auto text-[10px] text-sage-400 font-mono">
                                            {req.steps}ステップ
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-mono text-sage-600 truncate">{req.request_id}</p>
                                    <p className="text-[11px] text-sage-400 mt-1">
                                        {req.created_at ? format(new Date(req.created_at), "MM/dd HH:mm:ss", { locale: ja }) : "-"}
                                    </p>
                                    {summary && (
                                        <div className="mt-2 flex gap-3 text-[11px] font-medium">
                                            <span className="text-orange-600">{summary.totalCalories ?? "-"} kcal</span>
                                            <span className="text-blue-600">P {(summary.totalProtein ?? "-")}g</span>
                                            <span className="text-yellow-600">F {(summary.totalFat ?? "-")}g</span>
                                            <span className="text-green-600">C {(summary.totalCarbs ?? "-")}g</span>
                                        </div>
                                    )}
                                </a>
                            );
                        })}
                    </div>

                    {/* Right: step detail */}
                    <div className="flex-1 min-w-0">
                        {!selectedId ? (
                            <div className="bg-white rounded-2xl border border-sage-100 p-8 text-center text-sage-400">
                                左側のリクエストを選択すると詳細ステップを確認できます
                            </div>
                        ) : detail.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-sage-100 p-8 text-center text-sage-400">
                                {detailError ? "エラーが発生したため表示できません" : "ステップデータが見つかりません"}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-xs text-sage-500 font-medium uppercase tracking-wider">
                                    Request: <span className="font-mono text-sage-700">{selectedId}</span>
                                </p>
                                {detail.map((step: any, i: number) => {
                                    const badge = STEP_BADGE[step.step] ?? { label: step.step, color: "bg-gray-100 text-gray-600 border-gray-200" };
                                    return (
                                        <div key={i} className="bg-white rounded-xl border border-sage-100 overflow-hidden">
                                            <div className="flex items-center gap-3 px-4 py-3 border-b border-sage-50 bg-sage-50/30">
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${badge.color}`}>
                                                    {badge.label}
                                                </span>
                                                <span className="text-xs font-mono text-sage-500">{step.step}</span>
                                                <span className="ml-auto text-[11px] text-sage-400">
                                                    {step.created_at ? format(new Date(step.created_at), "HH:mm:ss.SSS") : "-"}
                                                </span>
                                            </div>
                                            <pre className="p-4 text-[11px] leading-relaxed text-sage-700 overflow-x-auto whitespace-pre-wrap break-all font-mono bg-white">
                                                {JSON.stringify(step.data, null, 2)}
                                            </pre>
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
