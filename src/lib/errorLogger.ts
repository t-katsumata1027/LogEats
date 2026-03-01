import { sql } from "@vercel/postgres";
import { getDbUserId } from "@/auth";
import { sendLarkNotification } from "./lark";

export async function logErrorAndNotify(
    processName: string,
    error: any,
    additionalContext?: Record<string, any>
) {
    try {
        const dbUserId = await getDbUserId();
        const err = error as { message?: string; name?: string; stack?: string };

        let errorMessage = `${processName}に失敗しました`;
        if (err.message) errorMessage += `: ${err.message}`;

        const context = {
            name: err.name,
            stack: err.stack,
            ...additionalContext,
        };

        // 1. Save to DB
        await sql`
      INSERT INTO error_logs (
        user_id, error_message, context
      ) VALUES (
        ${dbUserId}, 
        ${errorMessage}, 
        ${JSON.stringify(context)}
      )
    `;

        // 2. Send Lark Notification
        await sendLarkNotification(
            process.env.LARK_ERROR_WEBHOOK_URL,
            "❌ システムエラー発生",
            `【${processName}】\nユーザーID: ${dbUserId || "未ログイン"}\nエラー: ${errorMessage}\n\n詳細:\n${err.stack || err.name || "None"}`
        );

    } catch (dbError) {
        console.error("Failed to save error_log to database or send notification:", dbError);
    }
}
