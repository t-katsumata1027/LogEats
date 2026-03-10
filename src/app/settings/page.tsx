import { sql } from "@vercel/postgres";
import { currentUser } from "@clerk/nextjs/server";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { getDbUserId } from "@/auth";
import { SettingsForm } from "@/components/SettingsForm";
import { LineConnectionSettings } from "@/components/LineConnectionSettings";
import Link from "next/link";

export default async function SettingsPage() {
    const user = await currentUser();
    const dbUserId = await getDbUserId();

    let userData = null;
    if (dbUserId) {
        try {
            const { rows } = await sql`
                SELECT target_calories, age, gender, height, weight, activity_level, target_weight, target_protein, target_fat, target_carbs, tolerance_pct
                FROM users 
                WHERE id = ${dbUserId} 
                LIMIT 1
            `;
            if (rows.length > 0) {
                userData = rows[0];
            }
        } catch (error) {
            console.error("Failed to fetch user data:", error);
        }
    }

    return (
        <main className="min-h-screen">
            <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
                <div className="mb-2">
                    <h1 className="text-2xl font-bold text-sage-800 tracking-tight">
                        設定
                    </h1>
                </div>
                {user ? (
                    <>
                        {/* プロフィール情報表示とログアウト */}
                        <div className="bg-white rounded-2xl p-6 border border-sage-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {user.imageUrl ? (
                                    <img src={user.imageUrl} alt="Profile" className="w-16 h-16 rounded-full ring-2 ring-sage-100" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center text-2xl">👤</div>
                                )}
                                <div>
                                    <h2 className="font-bold text-sage-800 text-lg">{user.fullName}</h2>
                                    <p className="text-sm text-sage-500">{user.primaryEmailAddress?.emailAddress}</p>
                                </div>
                            </div>
                            {/* UserButton handles signout naturally, but keeping layout spacing */}
                        </div>

                        {/* 各種設定フォーム */}
                        <SettingsForm initialData={userData} />

                        {/* LINE連携 */}
                        <LineConnectionSettings />

                        {/* お問い合わせセクション */}
                        <div className="bg-sage-50 rounded-2xl p-6 border border-sage-100 shadow-sm mt-8">
                            <h3 className="text-lg font-bold text-sage-800 mb-2 flex items-center gap-2">
                                <span>💬</span> サポート・お問い合わせ
                            </h3>
                            <p className="text-sm text-sage-600 mb-4">
                                アプリの不具合、機能のご要望、その他に関するお問い合わせはこちらからお送りください。
                            </p>
                            <a
                                href="mailto:support@log-eats.com"
                                className="btn btn-primary bg-sage-600 hover:bg-sage-700 text-white border-none shadow-sm rounded-xl w-full sm:w-auto"
                            >
                                メールでお問い合わせ
                            </a>
                        </div>

                        {/* 法的情報 */}
                        <div className="bg-white rounded-2xl p-6 border border-sage-100 shadow-sm mt-4">
                            <h3 className="text-lg font-bold text-sage-800 mb-4 flex items-center gap-2">
                                <span>📄</span> ご利用案内
                            </h3>
                            <div className="flex flex-col gap-2">
                                <Link href="/terms" className="flex items-center justify-between p-3 rounded-xl hover:bg-sage-50 transition-colors text-sage-700 font-medium border border-transparent hover:border-sage-100">
                                    <span>利用規約</span>
                                    <span className="text-sage-400">＞</span>
                                </Link>
                                <Link href="/privacy" className="flex items-center justify-between p-3 rounded-xl hover:bg-sage-50 transition-colors text-sage-700 font-medium border border-transparent hover:border-sage-100">
                                    <span>プライバシーポリシー</span>
                                    <span className="text-sage-400">＞</span>
                                </Link>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-white rounded-2xl p-8 border border-sage-100 shadow-sm text-center">
                        <span className="text-4xl mb-4 block">🔒</span>
                        <h2 className="text-lg font-bold text-sage-800 mb-2">ログインが必要です</h2>
                        <p className="text-sage-600 text-sm mb-6">
                            目標カロリーを設定するには、ログインしてプロフイールを作成してください。
                        </p>
                        <SignInButton mode="modal">
                            <button className="btn btn-primary bg-sage-600 hover:bg-sage-700 text-white border-none rounded-full px-8 font-bold">ログイン / 登録</button>
                        </SignInButton>
                    </div>
                )}
            </div>
        </main>
    );
}
