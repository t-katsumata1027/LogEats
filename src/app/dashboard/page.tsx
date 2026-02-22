import { auth } from "@/auth";
import { SignIn, SignOut } from "@/components/AuthButtons";
import { Dashboard } from "@/components/Dashboard";

export default async function DashboardPage() {
    const session = await auth();

    return (
        <main className="min-h-screen">
            <header className="border-b border-sage-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-sage-800 tracking-tight">
                            食事の履歴
                        </h1>
                        <p className="text-[13px] text-sage-600 mt-0.5">
                            日々のカロリー摂取量とPFCバランスの振り返り
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {session?.user ? (
                            <div className="flex items-center gap-3">
                                {session.user.image && (
                                    <img src={session.user.image} alt="User avatar" className="w-8 h-8 rounded-full border border-sage-200" />
                                )}
                                <SignOut />
                            </div>
                        ) : (
                            <SignIn />
                        )}
                    </div>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-6">
                {!session ? (
                    <div className="p-4 rounded-xl bg-sage-50 border border-sage-200 text-sm text-sage-800 flex items-start gap-3">
                        <span className="text-xl">💡</span>
                        <div>
                            <p className="font-medium mb-1">ログインして始めよう！</p>
                            <p className="text-sage-600">
                                右上の「ログイン」からログインすると、日々の食事を自動で記録して、ここでいつでも振り返ることができるようになります。
                            </p>
                        </div>
                    </div>
                ) : (
                    <Dashboard />
                )}
            </div>
        </main>
    );
}
