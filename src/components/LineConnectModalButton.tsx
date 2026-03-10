"use client";

import { useState } from "react";
import { SignInButton, useSignIn } from "@clerk/nextjs";

export function LineConnectModalButton() {
    const [isOpen, setIsOpen] = useState(false);
    const { signIn, isLoaded } = useSignIn();

    const handleLineLogin = async () => {
        if (!isLoaded) return;
        try {
            await signIn.authenticateWithRedirect({
                strategy: "oauth_line",
                redirectUrl: "/sso-callback",
                redirectUrlComplete: "/dashboard",
            });
        } catch (err) {
            console.error("LINE Login Error:", err);
        }
    };

    return (
        <>
            <button 
                onClick={() => setIsOpen(true)}
                className="btn btn-primary bg-[#06C755] hover:bg-[#05b34c] text-white border-none shadow-[0_4px_14px_0_rgba(6,199,85,0.39)] hover:shadow-[0_6px_20px_rgba(6,199,85,0.23)] rounded-full px-8 font-bold text-lg animate-bounce-subtle flex items-center justify-center gap-2"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 3.9 8.847 9.284 9.546.362.078.853.238.977.544.112.277.072.712.034.99l-.26 1.564c-.05.297-.241.947.838.492 1.078-.455 5.823-3.419 8.016-5.91 2.053-2.316 3.111-4.697 3.111-7.227zm-14.453 3.012h-2.585c-.27 0-.486-.216-.486-.486v-5.17c0-.27.216-.486.486-.486h2.585c.27 0 .486.216.486.486s-.216.486-.486.486h-2.1v1.658h2.1c.27 0 .486.216.486.486s-.216.486-.486.486h-2.1v1.658h2.1c.27 0 .486.216.486.486s-.216.486-.486.486z"/>
                </svg>
                LINEで始める / 連携する
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setIsOpen(false)}>
                    <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-sage-400 hover:text-sage-600 font-bold text-xl">
                            ✕
                        </button>
                        <h3 className="text-xl font-bold text-sage-800 mb-4 text-center">すでにアカウントをお持ちですか？</h3>
                        <p className="text-sage-600 text-sm mb-6 text-center leading-relaxed">
                            Googleやメール等で既にLogEatsをご利用中の場合、ここで新しくLINEで登録すると過去のデータが引き継がれません。<br />
                            <span className="font-bold text-red-500 mt-2 block">すでにアカウントをお持ちの方は「すでにアカウントをお持ちの方」からログインし、設定画面から連携を行なってください。</span>
                        </p>
                        <div className="flex flex-col gap-4">
                            <button 
                                onClick={handleLineLogin}
                                className="btn btn-primary bg-[#06C755] hover:bg-[#05b34c] text-white border-none rounded-xl font-bold"
                            >
                                いいえ、はじめてです（LINEで登録）
                            </button>
                            
                            <div className="divider text-xs text-sage-400 m-0">または</div>
                            
                            <SignInButton mode="modal">
                                <button onClick={() => setIsOpen(false)} className="btn btn-outline border-sage-300 text-sage-700 hover:bg-sage-50 hover:border-sage-400 rounded-xl font-bold">
                                    はい、すでにアカウントをお持ちの方
                                </button>
                            </SignInButton>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
