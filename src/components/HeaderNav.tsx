"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function HeaderNav() {
    const pathname = usePathname();

    return (
        <div role="tablist" className="hidden sm:flex tabs tabs-boxed bg-transparent mr-4 flex-nowrap shrink-0">
            <Link
                href="/"
                role="tab"
                className={`tab tab-sm sm:tab-md whitespace-nowrap px-3 ${pathname === '/' ? 'tab-active bg-sage-100 text-sage-900 font-bold' : 'text-sage-600 hover:text-sage-800'}`}
            >
                記録
            </Link>
            <Link
                href="/dashboard"
                role="tab"
                className={`tab tab-sm sm:tab-md whitespace-nowrap px-3 ${pathname === '/dashboard' ? 'tab-active bg-sage-100 text-sage-900 font-bold' : 'text-sage-600 hover:text-sage-800'}`}
            >
                履歴
            </Link>
            <Link
                href="/settings"
                role="tab"
                className={`tab tab-sm sm:tab-md whitespace-nowrap px-3 ${pathname === '/settings' ? 'tab-active bg-sage-100 text-sage-900 font-bold' : 'text-sage-600 hover:text-sage-800'}`}
            >
                設定
            </Link>
        </div>
    );
}
