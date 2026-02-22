"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-sage-200 px-6 py-2 pb-safe z-50 sm:hidden">
            <div className="max-w-md mx-auto flex justify-around items-center h-14">
                <Link
                    href="/"
                    className={`flex flex-col items-center gap-1 min-w-[64px] transition-colors ${pathname === '/' ? 'text-sage-700 font-bold' : 'text-sage-400 hover:text-sage-600'}`}
                >
                    <span className="text-2xl leading-none">📷</span>
                    <span className="text-[10px]">記録</span>
                </Link>

                <Link
                    href="/dashboard"
                    className={`flex flex-col items-center gap-1 min-w-[64px] transition-colors ${pathname === '/dashboard' ? 'text-sage-700 font-bold' : 'text-sage-400 hover:text-sage-600'}`}
                >
                    <span className="text-2xl leading-none">📊</span>
                    <span className="text-[10px]">履歴</span>
                </Link>

                {/* 設定画面（次回実装） */}
                <div
                    className={`flex flex-col items-center gap-1 min-w-[64px] transition-colors ${pathname === '/settings' ? 'text-sage-700 font-bold' : 'text-sage-400 hover:text-sage-600'}`}
                >
                    <span className="text-2xl leading-none opacity-50">⚙️</span>
                    <span className="text-[10px] opacity-50">設定</span>
                </div>
            </div>
        </nav>
    );
}
