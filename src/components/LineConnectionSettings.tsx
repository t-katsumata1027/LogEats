"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";

export function LineConnectionSettings() {
    const { user, isLoaded } = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    if (!isLoaded || !user) return null;

    // 既にLINE連携済みかどうか判定
    const isLineConnected = user.externalAccounts.some(
        account => account.provider === ("oauth_line" as any)
    );

    const handleConnectLine = async () => {
        setIsLoading(true);
        setErrorMsg("");
        try {
            // Clerkの機能でLINE連携を追加
            const res = await user.createExternalAccount({
                strategy: "oauth_line",
                redirectUrl: "/sso-callback",
            });
            // 連携フローへのリダイレクトなどの処理は不要な場合もありますが、
            // 追加の認証が必要な場合はredirectされます。
            // Clerk側で必要な処理が行われます
            console.log(res);
        } catch (error: any) {
            console.error(error);
            setErrorMsg(error.errors?.[0]?.longMessage || "LINE連携に失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-sage-100 shadow-sm mt-8">
            <h3 className="text-lg font-bold text-sage-800 mb-4 flex items-center gap-2">
                <span>🔌</span> 外部サービス連携 (LINE)
            </h3>
            
            <p className="text-sm text-sage-600 mb-6 leading-relaxed">
                LINEと連携すると、LogEatsの公式LINEアカウントから食事の写真を送るだけで、簡単にカロリーとPFCバランスを記録できるようになります。
            </p>

            {errorMsg && (
                <div className="alert alert-error text-sm text-red-800 bg-red-50 border-red-200 mb-4 py-2">
                    <span>❌ {errorMsg}</span>
                </div>
            )}

            {isLineConnected ? (
                <div className="flex flex-col sm:flex-row items-center justify-between bg-emerald-50 p-4 rounded-xl border border-emerald-100 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#06C755] text-white p-2 rounded-full">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 3.9 8.847 9.284 9.546.362.078.853.238.977.544.112.277.072.712.034.99l-.26 1.564c-.05.297-.241.947.838.492 1.078-.455 5.823-3.419 8.016-5.91 2.053-2.316 3.111-4.697 3.111-7.227zm-14.453 3.012h-2.585c-.27 0-.486-.216-.486-.486v-5.17c0-.27.216-.486.486-.486h2.585c.27 0 .486.216.486.486s-.216.486-.486.486h-2.1v1.658h2.1c.27 0 .486.216.486.486s-.216.486-.486.486h-2.1v1.658h2.1c.27 0 .486.216.486.486s-.216.486-.486.486zm3.328 0h-.972c-.27 0-.486-.216-.486-.486v-5.17c0-.27.216-.486.486-.486h.972c.27 0 .486.216.486.486v5.17c0 .27-.216.486-.486.486zm5.83-3.493l-2.001-2.029c-.198-.2-.524-.204-.724-.007s-.205.524-.007.724l1.134 1.15H14.15c-.27 0-.486.216-.486.486v3.295c0 .27.216.486.486.486h.842c.27 0 .486-.216.486-.486v-2.809h1.127l-1.135 1.15c-.198.2-.193.526.007.724.099.098.229.147.359.147.135 0 .27-.052.371-.155l2.001-2.029c.2-.203.2-.533 0-.736z"/>
                            </svg>
                        </div>
                        <div>
                            <p className="font-bold text-emerald-800">LINE連携済みです</p>
                            <p className="text-xs text-emerald-600">すぐにLINEから食事記録が可能です</p>
                        </div>
                    </div>
                    {/* Bot登録用リンク */}
                    <a 
                        href={process.env.NEXT_PUBLIC_LINE_FRIEND_URL || "https://lin.ee/placeholder"}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-sm bg-[#06C755] hover:bg-[#05b34c] text-white border-none rounded-lg"
                    >
                        公式LINEを追加する
                    </a>
                </div>
            ) : (
                <div className="flex flex-col items-center sm:items-start gap-4">
                    <button 
                        onClick={handleConnectLine}
                        disabled={isLoading}
                        className="btn bg-[#06C755] hover:bg-[#05b34c] text-white border-none rounded-xl font-bold px-6 w-full sm:w-auto flex items-center gap-2"
                    >
                        {isLoading ? (
                            <span className="loading loading-spinner text-white loading-sm"></span>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 3.9 8.847 9.284 9.546.362.078.853.238.977.544.112.277.072.712.034.99l-.26 1.564c-.05.297-.241.947.838.492 1.078-.455 5.823-3.419 8.016-5.91 2.053-2.316 3.111-4.697 3.111-7.227zm-14.453 3.012h-2.585c-.27 0-.486-.216-.486-.486v-5.17c0-.27.216-.486.486-.486h2.585c.27 0 .486.216.486.486s-.216.486-.486.486h-2.1v1.658h2.1c.27 0 .486.216.486.486s-.216.486-.486.486h-2.1v1.658h2.1c.27 0 .486.216.486.486s-.216.486-.486.486zm3.328 0h-.972c-.27 0-.486-.216-.486-.486v-5.17c0-.27.216-.486.486-.486h.972c.27 0 .486.216.486.486v5.17c0 .27-.216.486-.486.486zm5.83-3.493l-2.001-2.029c-.198-.2-.524-.204-.724-.007s-.205.524-.007.724l1.134 1.15H14.15c-.27 0-.486.216-.486.486v3.295c0 .27.216.486.486.486h.842c.27 0 .486-.216.486-.486v-2.809h1.127l-1.135 1.15c-.198.2-.193.526.007.724.099.098.229.147.359.147.135 0 .27-.052.371-.155l2.001-2.029c.2-.203.2-.533 0-.736z"/>
                                </svg>
                                LINE連携する
                            </>
                        )}
                    </button>
                    <p className="text-xs text-sage-500">
                        ※連携後、公式LINEアカウントを友だち追加するボタンが表示されます
                    </p>
                </div>
            )}
        </div>
    );
}
