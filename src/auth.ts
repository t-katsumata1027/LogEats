import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [Google],
    // ログインページなどをカスタマイズする場合はここで設定しますが、
    // 今回はまずデフォルトのGoogleログインを利用します。
})
