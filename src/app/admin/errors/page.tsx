export const dynamic = "force-dynamic";
import { sql } from "@vercel/postgres";
import { format } from "date-fns";
import { ExplainButton } from "./ExplainButton";
import { AlertCircle } from "lucide-react";

export default async function AdminErrorsPage() {
    const { rows: errors } = await sql`
    SELECT el.id, el.user_id, el.error_message, el.context, el.created_at, u.name as user_name
    FROM error_logs el
    LEFT JOIN users u ON el.user_id = u.id
    ORDER BY el.created_at DESC 
    LIMIT 100
  `;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-sage-800 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-500" />
                エラーログ
            </h2>

            {errors.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-sage-100 text-center text-sage-500">
                    記録されたエラーはありません。
                </div>
            ) : (
                <div className="space-y-4">
                    {errors.map((error) => (
                        <div key={error.id} className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                            <div className="p-5 border-b border-sage-50 flex justify-between items-start bg-red-50/30">
                                <div>
                                    <h3 className="font-bold text-red-700 text-sm mb-1">
                                        {error.error_message.length > 100 ? error.error_message.substring(0, 100) + "..." : error.error_message}
                                    </h3>
                                    <div className="flex gap-4 text-xs text-sage-500 font-medium">
                                        <span>発生日時: {error.created_at ? format(new Date(error.created_at), "yyyy/MM/dd HH:mm:ss") : "-"}</span>
                                        <span>ユーザー: {error.user_name || `ID:${error.user_id || '不明'}`}</span>
                                    </div>
                                </div>
                                <span className="text-xs text-sage-400 font-mono bg-white px-2 py-1 rounded-md border border-sage-200">ID: {error.id}</span>
                            </div>

                            <div className="p-5 bg-white">
                                <div className="mb-4">
                                    <p className="text-xs font-bold text-sage-500 mb-1 uppercase tracking-wider">Error Details</p>
                                    <pre className="bg-sage-50 p-3 rounded-lg text-xs text-sage-700 overflow-x-auto border border-sage-100 whitespace-pre-wrap break-all">
                                        {error.error_message}
                                    </pre>
                                </div>

                                {error.context && (
                                    <div>
                                        <p className="text-xs font-bold text-sage-500 mb-1 uppercase tracking-wider">Context</p>
                                        <pre className="bg-sage-50 p-3 rounded-lg text-xs text-sage-700 overflow-x-auto border border-sage-100">
                                            {JSON.stringify(error.context, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                <ExplainButton errorMessage={error.error_message} context={error.context} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
