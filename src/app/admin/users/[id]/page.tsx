export const dynamic = "force-dynamic";

import { sql } from "@vercel/postgres";
import { format } from "date-fns";
import { ArrowLeft, User as UserIcon, Calendar, Image as ImageIcon, Clock, MousePointerClick, Eye } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AdminUserDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const userId = params.id;

    // 1. ユーザー情報の取得
    const { rows: userRows } = await sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`;
    if (userRows.length === 0) {
        notFound();
    }
    const user = userRows[0];

    // 2. ユーザーの食事記録（meal_logs）を取得
    const { rows: logs } = await sql`
    SELECT id, image_url, meal_type, total_calories, total_protein, total_fat, total_carbs, analyzed_data, logged_at
    FROM meal_logs
    WHERE user_id = ${userId}
    ORDER BY logged_at DESC
  `;

    // 3. アクセスログに基づく統計情報の取得
    const { rows: accessStats } = await sql`
    SELECT
      COUNT(case when event_type = 'page_view' then 1 end) as total_pv,
      COUNT(case when event_type = 'click' then 1 end) as total_clicks,
      AVG(duration_ms) FILTER (WHERE event_type = 'page_leave') as avg_duration_ms
    FROM access_logs
    WHERE user_id = ${userId}
  `;
    const stats = accessStats[0];

    const mealTypeLabels: Record<string, string> = {
        breakfast: "朝食",
        lunch: "昼食",
        dinner: "夕食",
        snack: "間食",
        other: "その他",
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/users" className="btn btn-circle btn-ghost btn-sm text-sage-500">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h2 className="text-2xl font-bold text-sage-800">ユーザー詳細</h2>
            </div>

            {/* User Profile Card & Stats */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-100 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
                <div className="flex items-center gap-6">
                    <div className="avatar">
                        <div className="w-20 h-20 rounded-full bg-sage-100 flex items-center justify-center text-sage-400">
                            {user.image ? (
                                <img src={user.image} alt={user.name || "User"} />
                            ) : (
                                <UserIcon className="w-10 h-10" />
                            )}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-sage-900">{user.name || "未設定"}</h3>
                        <p className="text-sage-500">{user.email}</p>
                        <div className="mt-2 text-sm text-sage-600">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4 inline" />
                                登録日: {user.created_at ? format(new Date(user.created_at), "yyyy/MM/dd") : "-"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tracking Stats */}
                <div className="grid grid-cols-3 gap-4 w-full md:w-auto mt-4 md:mt-0 bg-sage-50 p-4 rounded-xl border border-sage-100">
                    <div className="text-center">
                        <Eye className="w-5 h-5 mx-auto text-sage-500 mb-1" />
                        <p className="text-[10px] text-sage-500 font-bold uppercase">総アクセス数</p>
                        <p className="font-bold text-sage-800 text-lg">{stats.total_pv || 0}</p>
                    </div>
                    <div className="text-center border-l bg-sage-200/50 border-sage-200">
                        <MousePointerClick className="w-5 h-5 mx-auto text-sage-500 mb-1" />
                        <p className="text-[10px] text-sage-500 font-bold uppercase">ボタン操作数</p>
                        <p className="font-bold text-sage-800 text-lg">{stats.total_clicks || 0}</p>
                    </div>
                    <div className="text-center border-l border-sage-200">
                        <Clock className="w-5 h-5 mx-auto text-sage-500 mb-1" />
                        <p className="text-[10px] text-sage-500 font-bold uppercase">平均滞在時間</p>
                        <p className="font-bold text-sage-800 text-lg">
                            {stats.avg_duration_ms ? `${Math.round(stats.avg_duration_ms / 1000)}秒` : "-"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Meal Logs Stream (Timeline Accordion) */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-sage-800 border-b border-sage-200 pb-2">食事記録タイムライン ({logs.length}件)</h3>

                {logs.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl text-center text-sage-500 border border-sage-100">
                        まだ食事記録がありません。
                    </div>
                ) : (
                    <div className="space-y-3">
                        {logs.map((log) => (
                            <details key={log.id} className="group bg-white rounded-2xl shadow-sm border border-sage-100 overflow-hidden marker:content-['']">
                                {/* Summary (Collapsed Text View) */}
                                <summary className="p-4 cursor-pointer flex items-center justify-between hover:bg-sage-50 transition-colors">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <span className="text-sage-400 group-open:rotate-90 transition-transform">▶</span>
                                        <span className="text-sm text-sage-500 font-mono w-24 md:w-32 border-r border-sage-200">
                                            {log.logged_at ? format(new Date(log.logged_at), "MM/dd HH:mm") : "-"}
                                        </span>
                                        <span className="badge badge-neutral shadow-sm text-xs px-2 py-1">
                                            {mealTypeLabels[log.meal_type] || log.meal_type}
                                        </span>
                                        <span className="font-bold tracking-tight text-sage-800 text-sm md:text-base">
                                            {Math.round(log.total_calories)} kcal
                                        </span>
                                    </div>
                                    <span className="text-xs text-sage-400 hidden sm:inline">クリックで詳細を開く</span>
                                </summary>

                                {/* Expanded Content (Images, Macros, JSON) */}
                                <div className="p-4 md:p-5 border-t border-sage-100 bg-sage-50/30 flex flex-col md:flex-row gap-6">
                                    {/* Image Section */}
                                    <div className="w-full md:w-64 h-48 bg-white border border-sage-100 rounded-xl overflow-hidden flex-shrink-0 relative shadow-sm">
                                        {log.image_url ? (
                                            <img src={log.image_url} alt="Meal" className="w-full h-full object-cover relative z-10" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col justify-center items-center text-sage-400">
                                                <ImageIcon className="w-8 h-8 mb-2 opacity-30" />
                                                <span className="text-xs">画像なし</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Data Section */}
                                    <div className="flex-1 flex flex-col justify-between space-y-4">
                                        <div className="grid grid-cols-3 gap-3 text-center">
                                            <div className="bg-blue-100 text-blue-700 rounded-xl p-3 shadow-sm border border-blue-200/50">
                                                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Protein</p>
                                                <p className="font-extrabold text-base md:text-lg">{Math.round(log.total_protein)}<span className="text-xs font-normal">g</span></p>
                                            </div>
                                            <div className="bg-amber-100 text-amber-700 rounded-xl p-3 shadow-sm border border-amber-200/50">
                                                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Fat</p>
                                                <p className="font-extrabold text-base md:text-lg">{Math.round(log.total_fat)}<span className="text-xs font-normal">g</span></p>
                                            </div>
                                            <div className="bg-orange-100 text-orange-700 rounded-xl p-3 shadow-sm border border-orange-200/50">
                                                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Carbs</p>
                                                <p className="font-extrabold text-base md:text-lg">{Math.round(log.total_carbs)}<span className="text-xs font-normal">g</span></p>
                                            </div>
                                        </div>

                                        {/* LLM Raw Data */}
                                        <div className="bg-slate-800 text-slate-300 p-4 rounded-xl overflow-x-auto text-[10px] md:text-xs font-mono shadow-inner max-h-48 overflow-y-auto w-full">
                                            <h5 className="text-slate-500 font-bold mb-2 uppercase text-[10px] flex items-center gap-2">
                                                <span>AI 解析生データ (JSON)</span>
                                            </h5>
                                            <pre className="whitespace-pre-wrap word-break-all">{JSON.stringify(log.analyzed_data, null, 2)}</pre>
                                        </div>
                                    </div>
                                </div>
                            </details>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
