import { currentUser } from "@clerk/nextjs/server";
import { SignInButton, UserButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { DashboardTabs } from "@/components/DashboardTabs";

import { HeaderNav } from "@/components/HeaderNav";

export default async function DashboardPage() {
    const user = await currentUser();

    return (
        <main className="min-h-screen flex flex-col">
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
                                <UserButton>
                                    <UserButton.MenuItems>
                                        <UserButton.Link
                                            label="設定"
                                            labelIcon={
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            }
                                            href="/settings"
                                        />
                                    </UserButton.MenuItems>
                                </UserButton>
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

            <div className="max-w-2xl mx-auto px-4 w-full flex-1 py-4 flex flex-col">
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
                    <DashboardTabs isLoggedIn={!!user} />
                )}
            </div>
        </main>
    );
}
