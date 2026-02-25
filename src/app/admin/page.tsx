export const dynamic = "force-dynamic";

import { sql } from "@vercel/postgres";
import { Users, FileText, Activity, BarChart2, Eye } from "lucide-react";

async function getStats() {
    const usersResult = await sql`SELECT count(*) FROM users`;
    const totalUsers = parseInt(usersResult.rows[0].count);

    const logsResult = await sql`SELECT count(*) FROM meal_logs`;
    const totalLogs = parseInt(logsResult.rows[0].count);

    // 当日食事記録を追加したユーザーを簡易DAUとみなす
    const dauResult = await sql`
    SELECT count(DISTINCT user_id) 
    FROM meal_logs 
    WHERE logged_at >= CURRENT_DATE
  `;
    const dau = parseInt(dauResult.rows[0].count);

    // PVと未ログイン利用数
    const pvResult = await sql`SELECT count(*) FROM access_logs WHERE event_type = 'page_view'`;
    const totalPv = parseInt(pvResult.rows[0].count);

    const anonymousResult = await sql`SELECT count(*) FROM access_logs WHERE event_type = 'anonymous_upload'`;
    const totalAnonymous = parseInt(anonymousResult.rows[0].count);

    return { totalUsers, totalLogs, dau, totalPv, totalAnonymous };
}

export default async function AdminDashboardPage() {
    const stats = await getStats();

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-sage-800">ヘルススコア</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Row 1: Users & Logs */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-100 flex items-center gap-4">
                    <div className="p-4 bg-sage-100 text-sage-600 rounded-xl">
                        <Users className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-sage-500 font-medium">総ユーザー数</p>
                        <p className="text-3xl font-bold text-sage-900">{stats.totalUsers}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-100 flex items-center gap-4">
                    <div className="p-4 bg-clay/20 text-clay rounded-xl">
                        <Activity className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-sage-500 font-medium">DAU (本日記録したユーザー)</p>
                        <p className="text-3xl font-bold text-sage-900">{stats.dau}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-100 flex items-center gap-4">
                    <div className="p-4 bg-mocha/20 text-mocha rounded-xl">
                        <FileText className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-sage-500 font-medium">総食事記録数</p>
                        <p className="text-3xl font-bold text-sage-900">{stats.totalLogs}</p>
                    </div>
                </div>

                {/* Row 2: Access & Anonymous Usage */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-100 flex items-center gap-4">
                    <div className="p-4 bg-blue-100 text-blue-600 rounded-xl">
                        <Eye className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-sage-500 font-medium">トップPV数 (未ログイン)</p>
                        <p className="text-3xl font-bold text-sage-900">{stats.totalPv}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-sage-100 flex items-center gap-4">
                    <div className="p-4 bg-amber-100 text-amber-600 rounded-xl">
                        <BarChart2 className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-sage-500 font-medium">ゲスト利用回数 (画像解析)</p>
                        <p className="text-3xl font-bold text-sage-900">{stats.totalAnonymous}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
