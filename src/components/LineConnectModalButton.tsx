"use client";

import { useState } from "react";

export function LineConnectModalButton() {
    const [isOpen, setIsOpen] = useState(false);

    const lineConnectUrl =
        process.env.NEXT_PUBLIC_LINE_CONNECT_URL ||
        process.env.NEXT_PUBLIC_LINE_FRIEND_URL ||
        "";

    const handleConnectClick = () => {
        if (lineConnectUrl) {
            window.open(lineConnectUrl, "_blank", "noopener,noreferrer");
        } else {
            setIsOpen(true);
        }
    };

    return (
        <>
            <button 
                onClick={handleConnectClick}
                className="btn btn-primary bg-[#06C755] hover:bg-[#05b34c] text-white border-none shadow-[0_4px_14px_0_rgba(6,199,85,0.39)] hover:shadow-[0_6px_20px_rgba(6,199,85,0.23)] rounded-full px-8 font-bold text-lg animate-bounce-subtle flex items-center justify-center gap-2"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 3.9 8.847 9.284 9.546.362.078.853.238.977.544.112.277.072.712.034.99l-.26 1.564c-.05.297-.241.947.838.492 1.078-.455 5.823-3.419 8.016-5.91 2.053-2.316 3.111-4.697 3.111-7.227zm-14.453 3.012h-2.585c-.27 0-.486-.216-.486-.486v-5.17c0-.27.216-.486.486-.486h2.585c.27 0 .486.216.486.486s-.216.486-.486.486h-2.1v1.658h2.1c.27 0 .486.216.486.486s-.216.486-.486.486h-2.1v1.658h2.1c.27 0 .486.216.486.486s-.216.486-.486.486zm3.328 0h-.972c-.27 0-.486-.216-.486-.486v-5.17c0-.27.216-.486.486-.486h.972c.27 0 .486.216.486.486v5.17c0 .27-.216.486-.486.486zm5.83-3.493l-2.001-2.029c-.198-.2-.524-.204-.724-.007s-.205.524-.007.724l1.134 1.15H14.15c-.27 0-.486.216-.486.486v3.295c0 .27.216.486.486.486h.842c.27 0 .486-.216.486-.486v-2.809h1.127l-1.135 1.15c-.198.2-.193.526.007.724.099.098.229.147.359.147.135 0 .27-.052.371-.155l2.001-2.029c.2-.203.2-.533 0-.736z"/>
                </svg>
                LINEから食事を記録する
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setIsOpen(false)}>
                    <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-sage-400 hover:text-sage-600 font-bold text-xl">
                            ✕
                        </button>
                        <h3 className="text-xl font-bold text-sage-800 mb-4">💬 LINE連携の手順</h3>
                        <p className="text-sage-600 text-sm mb-6 leading-relaxed">
                            LINE公式アカウントを開き、メッセージで<span className="font-bold text-emerald-600">「連携」</span>と送信してください。返信されたボタンから連携を行えます。
                        </p>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="btn btn-primary bg-sage-600 hover:bg-sage-700 text-white border-none rounded-xl font-bold w-full"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
