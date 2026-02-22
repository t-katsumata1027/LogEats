import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { sql } from "@vercel/postgres"

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [Google],
    callbacks: {
        async signIn({ user }) {
            if (user.email) {
                try {
                    // Googleアカウントのメールを主キーとして、無ければ新規登録、あれば名前/画像を更新
                    await sql`
            INSERT INTO users (name, email, image)
            VALUES (${user.name || null}, ${user.email}, ${user.image || null})
            ON CONFLICT (email) DO UPDATE 
            SET name = EXCLUDED.name, image = EXCLUDED.image;
          `;
                } catch (error) {
                    console.error("Failed to sync user to database:", error);
                    // 致命的なDBエラーでなければログイン自体は続行させる
                }
            }
            return true;
        },
        async session({ session }) {
            if (session.user?.email) {
                try {
                    // DBで自動採番された id をセッションに持たせ、あとで meal_logs に紐付けやすくする
                    const { rows } = await sql`SELECT id FROM users WHERE email = ${session.user.email} LIMIT 1`;
                    if (rows.length > 0) {
                        session.user.id = rows[0].id.toString();
                    }
                } catch (error) {
                    console.error("Failed to fetch user ID:", error);
                }
            }
            return session;
        }
    }
})
