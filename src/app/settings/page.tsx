import { auth } from "@/auth";
import { SignIn, SignOut } from "@/components/AuthButtons";

export default async function SettingsPage() {
    const session = await auth();

    return (
        <main className="min-h-screen">
            <header className="border-b border-sage-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-sage-800 tracking-tight">
                        設定
                    </h1>
                    {session?.user ? (
                        <div className="flex items-center gap-3">
                            {session.user.image && (
                                <img src={session.user.image} alt="Profile" className="w-8 h-8 rounded-full border border-sage-200" />
                            )}
                            <SignOut />
                        </div>
                    ) : (
                        <SignIn />
                    )}
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-8">
                <div className="bg-white rounded-2xl p-8 border border-sage-100 shadow-sm text-center">
                    <span className="text-4xl mb-4 block">🚧</span>
                    <h2 className="text-lg font-bold text-sage-800 mb-2">準備中</h2>
                    <p className="text-sage-600 text-sm">
                        プロフィール編集や1日の目標カロリー設定機能は、現在開発中です。<br />
                        もう少々お待ちください！
                    </p>
                </div>
            </div>
        </main>
    );
}
