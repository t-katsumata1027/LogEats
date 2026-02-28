import React from 'react';

// 本番でAdSenseアカウントを取得したら、このキーを `.env.local` と Vercel に設定します
const adClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

interface AdBannerProps {
    className?: string;
    adSlot?: string;
}

export function AdBanner({ className = "", adSlot = "1234567890" }: AdBannerProps) {
    // --- 広告IDが設定されていない場合（開発中 or 審査待ち） ---
    if (!adClientId) {
        return (
            <div className={`w-full max-w-[320px] sm:max-w-[728px] mx-auto h-[100px] sm:h-[90px] bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center ${className}`}>
                <div className="text-center text-slate-400">
                    <p className="font-semibold text-sm">SPONSORED</p>
                    <p className="text-xs mt-1">広告枠プレースホルダー</p>
                </div>
            </div>
        );
    }

    // --- 本番環境（広告ID設定済み）の場合 ---
    return (
        <div className={`w-full flex justify-center overflow-hidden ${className}`}>
            <ins
                className="adsbygoogle"
                style={{ display: "block" }}
                data-ad-client={adClientId}
                data-ad-slot={adSlot}
                data-ad-format="auto"
                data-full-width-responsive="true"
            ></ins>
        </div>
    );
}
