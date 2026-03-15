"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="btm-nav sm:hidden border-t border-sage-200 z-50 pb-safe bg-white shadow-lg h-14">
            <Link
                href="/"
                className={pathname === '/' ? 'active text-sage-800 bg-sage-50 border-t-2 border-sage-600' : 'text-sage-400 hover:text-sage-600 hover:bg-sage-50/50'}
            >
                <span className="text-lg leading-none">📷</span>
                <span className="btm-nav-label text-[9px] mt-0.5">記録</span>
            </Link>

            <Link
                href="/dashboard"
                className={pathname === '/dashboard' ? 'active text-sage-800 bg-sage-50 border-t-2 border-sage-600' : 'text-sage-400 hover:text-sage-600 hover:bg-sage-50/50'}
            >
                <span className="text-lg leading-none">📊</span>
                <span className="btm-nav-label text-[9px] mt-0.5">履歴</span>
            </Link>
        </nav>
    );
}
