"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function HeaderNav() {
    const pathname = usePathname();

    return (
        <nav className="hidden sm:flex items-center gap-6 mr-4 text-sm font-medium">
            <Link
                href="/"
                className={`transition-colors py-1 border-b-2 ${pathname === '/' ? 'border-sage-600 text-sage-900' : 'border-transparent text-sage-500 hover:text-sage-700'}`}
            >
                記録
            </Link>
            <Link
                href="/dashboard"
                className={`transition-colors py-1 border-b-2 ${pathname === '/dashboard' ? 'border-sage-600 text-sage-900' : 'border-transparent text-sage-500 hover:text-sage-700'}`}
            >
                履歴
            </Link>
            <Link
                href="/settings"
                className={`transition-colors py-1 border-b-2 ${pathname === '/settings' ? 'border-sage-600 text-sage-900' : 'border-transparent text-sage-500 hover:text-sage-700'}`}
            >
                設定
            </Link>
        </nav>
    );
}
