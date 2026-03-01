import { currentUser } from "@clerk/nextjs/server";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Dashboard } from "@/components/Dashboard";



export default async function DashboardPage() {
    const user = await currentUser();

    return (
        <main className="min-h-screen flex flex-col">
            <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-sage-800 tracking-tight">
                        食事の履歴
                    </h1>
                    <p className="text-sm text-sage-600 mt-1">
                        日々のカロリー摂取量とPFCバランスの振り返り
                    </p>
                </div>

                {!user ? (
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
                    <Dashboard isLoggedIn={!!user} />
                )}
            </div>
        </main>
    );
}
