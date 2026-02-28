import { currentUser } from "@clerk/nextjs/server";
import { SignInButton, UserButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Dashboard } from "@/components/Dashboard";

import { HeaderNav } from "@/components/HeaderNav";

export default async function DashboardPage() {
    const user = await currentUser();

    return (
        <main className="min-h-screen">
            <header className="border-b border-sage-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <h1 className="text-xl font-semibold text-sage-800 tracking-tight">
                            食事の履歴
                        </h1>
                        <p className="text-xs sm:text-[13px] text-sage-600 mt-1 leading-snug">
                            日々のカロリー摂取量とPFCバランスの振り返り
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        <HeaderNav />
                        <SignedIn>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <UserButton />
                            </div>
                        </SignedIn>
                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="btn btn-sm btn-primary bg-sage-600 hover:bg-sage-700 text-white border-none shadow-sm rounded-full px-4">ログイン</button>
                            </SignInButton>
                        </SignedOut>
                    </div>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-6">
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
