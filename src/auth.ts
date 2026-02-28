import { currentUser } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

/**
 * Clerkの現在のユーザーを取得し、DBのusersテーブルと同期します。
 * 初回であればINSERTし、既存であればIDを返します。
 * 戻り値はPostgresの meal_logsテーブル などで外部キーとして使う integer の id です。
 */
export async function getDbUserId(): Promise<number | null> {
    try {
        const user = await currentUser();
        if (!user) return null;

        const clerkId = user.id;

        // 1. まず clerk_id で検索（最も確実・不変のID）
        const { rows: byClerkId } = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId}`;

        if (byClerkId.length > 0) {
            return byClerkId[0].id;
        }

        // 2. clerk_id が無い場合（初回ログイン or 旧システムからの移行）：
        // そのClerkユーザーが持っている「すべての」認証済みメアドを条件にし、一番古いDBアカウントと結合させる
        const emails = user.emailAddresses.map(e => e.emailAddress);
        if (emails.length > 0) {
            const { rows: matchedUsers } = await sql`
                SELECT id FROM users 
                WHERE email = ANY(${emails as any}::text[]) 
                ORDER BY id ASC LIMIT 1
            `;
            if (matchedUsers.length > 0) {
                const dbId = matchedUsers[0].id;
                // 見つかったら次回以降のために clerk_id を保存してアップデートする
                await sql`UPDATE users SET clerk_id = ${clerkId} WHERE id = ${dbId}`;
                return dbId;
            }
        }

        // 3. 過去のアカウントに一切ヒットしなければ、完全に新規のアカウントとして作成
        const primaryEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress;
        if (!primaryEmail) return null;

        const { rows: insertRows } = await sql`
            INSERT INTO users (name, email, image, clerk_id)
            VALUES (${user.fullName || null}, ${primaryEmail}, ${user.imageUrl || null}, ${clerkId})
            RETURNING id;
        `;
        return insertRows[0]?.id || null;
    } catch (e) {
        console.error("Auth sync DB error:", e);
        return null;
    }
}

/**
 * ログイン中のユーザーのメールアドレスを取得します
 */
export async function getCurrentUserEmail(): Promise<string | null> {
    try {
        const user = await currentUser();
        if (!user) return null;
        return user.emailAddresses[0]?.emailAddress || null;
    } catch {
        return null;
    }
}
