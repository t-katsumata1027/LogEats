'use client';

import React, { useEffect, useState } from 'react';

interface AffiliateBannerProps {
    variant?: 'card' | 'simple';
    className?: string;
}

/**
 * データベースから有効なアフィリエイト広告をランダムに取得して表示するコンポーネント
 * クライアントコンポーネントとして動作し、API経由でデータを取得します
 */
export function AffiliateBanner({ variant = 'card', className = '' }: AffiliateBannerProps) {
    const [html, setHtml] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        
        async function fetchBanner() {
            try {
                const res = await fetch('/api/affiliates/random');
                if (!res.ok) throw new Error('Failed to fetch');
                
                const data = await res.json();
                if (isMounted && data.banner && data.banner.html_content) {
                    // リンクを別タブで開くように HTML を加工
                    // <a> タグに target="_blank" と rel="noopener noreferrer" を付与
                    const modifiedHtml = data.banner.html_content.replace(
                        /<a\s+(?![^>]*target=)/gi, 
                        '<a target="_blank" rel="noopener noreferrer" '
                    );
                    setHtml(modifiedHtml);
                }
            } catch (error) {
                console.error('Failed to fetch affiliate banner:', error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }
        
        fetchBanner();
        
        return () => {
            isMounted = false;
        };
    }, []);

    if (loading || !html) {
        return null;
    }

    const isSimple = variant === 'simple';

    return (
        <div className={`w-full flex flex-col items-center animate-fade-in-up ${isSimple ? 'my-2' : 'my-6'} ${className}`}>
            {!isSimple && (
                <span className="text-[10px] text-sage-400 font-bold mb-1 tracking-widest uppercase">SPONSORED</span>
            )}
            <div 
                className={`w-full flex justify-center overflow-hidden ${isSimple ? '' : 'rounded-xl bg-white/50 border border-sage-100/50 p-2 shadow-sm'}`}
                dangerouslySetInnerHTML={{ __html: html }} 
            />
        </div>
    );
}
