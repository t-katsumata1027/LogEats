"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { HeaderNav } from "@/components/HeaderNav";
import { CustomUserButton } from "@/components/CustomUserButton";
import { AddToHomeScreen } from "@/components/AddToHomeScreen";
import { ArrowLeft } from "lucide-react";

export function GlobalHeader() {
    const pathname = usePathname();
    const isAdmin = pathname?.startsWith('/admin');

    return (
        <header className="border-b border-sage-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
            <div className={`mx-auto px-4 py-3 flex items-center justify-between gap-4 ${isAdmin ? 'w-full' : 'max-w-2xl'}`}>
                <div className="flex-1">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity w-fit">
                        <Image src="/icon-192x192.png" alt="Log-Eats Logo" width={28} height={28} className="rounded-md" />
                        <span className="text-xl font-bold text-sage-800 tracking-tight leading-none mt-0.5">
                            Log-Eats {isAdmin && <span className="text-sm text-sage-500 font-normal ml-2">Admin</span>}
                        </span>
                    </Link>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    {isAdmin ? (
                        <div className="flex items-center gap-4">
                            <Link href="/" className="btn btn-ghost btn-sm text-sage-600 gap-2">
                                <ArrowLeft className="w-4 h-4 hidden sm:block" />
                                アプリへ戻る
                            </Link>
                            <CustomUserButton />
                        </div>
                    ) : (
                        <>
                            <SignedOut>
                                <AddToHomeScreen />
                                <SignInButton mode="modal">
                                    <button className="btn btn-sm btn-primary bg-sage-600 hover:bg-sage-700 text-white border-none shadow-sm rounded-full px-4">
                                        ログイン / 登録
                                    </button>
                                </SignInButton>
                            </SignedOut>
                            <SignedIn>
                                <HeaderNav />
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <CustomUserButton />
                                </div>
                            </SignedIn>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
