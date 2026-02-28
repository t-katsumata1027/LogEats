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

        const email = user.emailAddresses[0]?.emailAddress;
        if (!email) return null;

        // まず取得を試みる
        const { rows: selectRows } = await sql`SELECT id, name, image FROM users WHERE email = ${email}`;

        if (selectRows.length > 0) {
            // プロフィール画像や名前が変わっている可能性があるが、毎回のUPDATEは重いので
            // ここでは簡易的にIDだけを返す（厳密にする場合は名前/画像に変更があればUPDATEする）
            return selectRows[0].id;
        }

        // 存在しなければINSERT (または競合時にUPDATEして返す)
        const { rows: insertRows } = await sql`
            INSERT INTO users (name, email, image)
            VALUES (${user.fullName || null}, ${email}, ${user.imageUrl || null})
            ON CONFLICT (email) DO UPDATE 
            SET name = EXCLUDED.name, image = EXCLUDED.image
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
