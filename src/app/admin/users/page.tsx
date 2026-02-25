export const dynamic = "force-dynamic";
import { sql } from "@vercel/postgres";
import { format } from "date-fns";

export default async function AdminUsersPage() {
    const { rows: users } = await sql`
    SELECT id, name, email, image, target_calories, created_at 
    FROM users 
    ORDER BY created_at DESC 
    LIMIT 100
  `;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-sage-800">ユーザー管理</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-sage-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead className="bg-sage-50 text-sage-700">
                            <tr>
                                <th>ID</th>
                                <th>名前 / Email</th>
                                <th>目標カロリー</th>
                                <th>登録日</th>
                                <th>アクション</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-sage-50/50">
                                    <td className="text-xs text-sage-500 font-mono">{user.id}</td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            {user.image && (
                                                <div className="avatar">
                                                    <div className="w-8 h-8 rounded-full">
                                                        <img src={user.image} alt={user.name || "User"} />
                                                    </div>
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-bold text-sage-900">{user.name || "未設定"}</div>
                                                <div className="text-sm opacity-50">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{user.target_calories ? `${user.target_calories} kcal` : "-"}</td>
                                    <td className="text-sm">
                                        {user.created_at ? format(new Date(user.created_at), "yyyy/MM/dd HH:mm") : "-"}
                                    </td>
                                    <td>
                                        <a href={`/admin/users/${user.id}`} className="btn btn-sm btn-ghost text-sage-600 hover:bg-sage-100">
                                            詳細を見る
                                        </a>
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
