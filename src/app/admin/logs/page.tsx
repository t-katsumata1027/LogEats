export const dynamic = "force-dynamic";
import { sql } from "@vercel/postgres";
import { format } from "date-fns";

export default async function AdminLogsPage() {
    const { rows: logs } = await sql`
    SELECT ml.id, ml.user_id, ml.meal_type, cast(ml.total_calories as numeric) as total_calories, ml.logged_at, u.name as user_name
    FROM meal_logs ml
    LEFT JOIN users u ON ml.user_id = u.id
    ORDER BY ml.logged_at DESC 
    LIMIT 200
  `;

    const mealTypeLabels: Record<string, string> = {
        breakfast: "朝食",
        lunch: "昼食",
        dinner: "夕食",
        snack: "間食",
        other: "その他",
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-sage-800">食事記録</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-sage-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead className="bg-sage-50 text-sage-700">
                            <tr>
                                <th>ID</th>
                                <th>ユーザー</th>
                                <th>種別</th>
                                <th>カロリー</th>
                                <th>記録日時</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-sage-50/50">
                                    <td className="text-xs text-sage-500 font-mono">{log.id}</td>
                                    <td>{log.user_name || `User ${log.user_id}`}</td>
                                    <td>
                                        <span className="badge badge-outline">{mealTypeLabels[log.meal_type] || log.meal_type}</span>
                                    </td>
                                    <td className="font-medium">{Math.round(Number(log.total_calories))} kcal</td>
                                    <td className="text-sm">
                                        {log.logged_at ? format(new Date(log.logged_at), "yyyy/MM/dd HH:mm") : "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
