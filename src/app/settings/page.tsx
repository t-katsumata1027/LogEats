import { sql } from "@vercel/postgres";
import { auth } from "@/auth";
import { SignIn, SignOut } from "@/components/AuthButtons";
import { HeaderNav } from "@/components/HeaderNav";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
    const session = await auth();

    let userData = null;
    if (session?.user?.id) {
        try {
            const { rows } = await sql`
                SELECT target_calories, age, gender, height, weight, activity_level, target_weight
                FROM users 
                WHERE id = ${session.user.id} 
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
            <header className="border-b border-sage-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-sage-800 tracking-tight">
                        設定
                    </h1>
                    <div className="flex items-center gap-4">
                        <HeaderNav />
                        {session?.user ? (
                            <div className="flex items-center gap-3">
                                {session.user.image && (
                                    <img src={session.user.image} alt="Profile" className="w-8 h-8 rounded-full border border-sage-200" />
                                )}
                            </div>
                        ) : (
                            <SignIn />
                        )}
                    </div>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
                {session?.user ? (
                    <>
                        {/* プロフィール情報表示とログアウト */}
                        <div className="bg-white rounded-2xl p-6 border border-sage-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {session.user.image ? (
                                    <img src={session.user.image} alt="Profile" className="w-16 h-16 rounded-full ring-2 ring-sage-100" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center text-2xl">👤</div>
                                )}
                                <div>
                                    <h2 className="font-bold text-sage-800 text-lg">{session.user.name}</h2>
                                    <p className="text-sm text-sage-500">{session.user.email}</p>
                                </div>
                            </div>
                            <SignOut />
                        </div>

                        {/* 各種設定フォーム */}
                        <SettingsForm initialData={userData} />
                    </>
                ) : (
                    <div className="bg-white rounded-2xl p-8 border border-sage-100 shadow-sm text-center">
                        <span className="text-4xl mb-4 block">🔒</span>
                        <h2 className="text-lg font-bold text-sage-800 mb-2">ログインが必要です</h2>
                        <p className="text-sage-600 text-sm mb-6">
                            目標カロリーを設定するには、ログインしてプロフイールを作成してください。
                        </p>
                        <SignIn />
                    </div>
                )}
            </div>
        </main>
    );
}
