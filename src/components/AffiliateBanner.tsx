"use client";

import React, { useEffect, useState } from 'react';

interface AffiliateBannerProps {
    className?: string;
    variant?: 'simple' | 'card';
}

export function AffiliateBanner({ className = "", variant = 'simple' }: AffiliateBannerProps) {
    const [bannerHtml, setBannerHtml] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // DBからAPI経由でアフィリエイトリストを取得し、ランダムに1つ表示
    useEffect(() => {
        const fetchAndSelectBanner = async () => {
            try {
                const res = await fetch('/api/affiliates');
                if (res.ok) {
                    const data = await res.json();
                    const banners = data.banners || [];
                    
                    if (banners.length > 0) {
                        const randomIndex = Math.floor(Math.random() * banners.length);
                        setBannerHtml(banners[randomIndex].html_content);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch affiliate banners", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndSelectBanner();
    }, []);

    // ロード中、または登録データがない場合は何も表示しない（またはプレースホルダー）
    if (isLoading || !bannerHtml) {
        return <div className={`w-full max-w-[320px] mx-auto min-h-[200px] ${className}`} />; 
    }

    if (variant === 'card') {
        return (
            <div className={`w-full max-w-[320px] mx-auto bg-white border border-sage-100 rounded-2xl shadow-sm overflow-hidden ${className}`}>
                <div className="bg-sage-50 text-sage-500 text-[10px] py-1 px-3 border-b border-sage-100 font-medium tracking-wider flex justify-between items-center">
                    <span>おすすめ情報</span>
                    <span>PR</span>
                </div>
                <div className="flex justify-center p-2">
                    <div 
                        dangerouslySetInnerHTML={{ __html: bannerHtml }} 
                        className="[&>a>img]:w-full [&>a>img]:max-w-[300px] [&>a>img]:h-auto [&>a]:block flex flex-col justify-center text-center text-sm font-medium text-sage-800 break-words [&>a]:hover:underline p-2"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full max-w-[320px] mx-auto relative ${className}`}>
            <span className="absolute -top-4 right-1 text-[10px] text-sage-400 bg-white/80 px-1 rounded">PR</span>
            <div 
                className="flex items-center justify-center overflow-hidden rounded-xl border border-sage-100 shadow-sm bg-white p-3 text-center text-sm font-medium text-sage-800 break-words [&>a]:hover:underline"
                dangerouslySetInnerHTML={{ __html: bannerHtml }} 
            />
        </div>
    );
}
