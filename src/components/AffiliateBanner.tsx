'use client';

import React, { useEffect, useState } from 'react';
import { sendTrackEvent } from '@/lib/clientTracking';

interface AffiliateBannerProps {
    variant?: 'card' | 'simple';
    className?: string;
}

function sanitizeAffiliateHtml(html: string): string {
    const parser = new DOMParser();
    const document = parser.parseFromString(html, 'text/html');
    const allowedTags = new Set(['A', 'IMG', 'DIV', 'SPAN', 'P', 'BR']);
    const globalAllowedAttributes = new Set([
        'class',
        'title',
        'aria-label',
        'width',
        'height',
        'alt',
    ]);
    const isAllowedAffiliateUrl = (value: string) => {
        const url = new URL(value, window.location.origin);
        return (
            url.protocol === 'https:' &&
            (url.hostname === 'a8.net' || url.hostname.endsWith('.a8.net'))
        );
    };

    document.body.querySelectorAll('*').forEach((element) => {
        if (!allowedTags.has(element.tagName)) {
            element.remove();
            return;
        }

        Array.from(element.attributes).forEach((attribute) => {
            const name = attribute.name.toLowerCase();
            const isLinkAttribute =
                element.tagName === 'A' && name === 'href';
            const isImageAttribute =
                element.tagName === 'IMG' && name === 'src';

            if (
                name.startsWith('on') ||
                (!globalAllowedAttributes.has(name) &&
                    !isLinkAttribute &&
                    !isImageAttribute)
            ) {
                element.removeAttribute(attribute.name);
            }
        });

        if (element instanceof HTMLAnchorElement) {
            try {
                if (!isAllowedAffiliateUrl(element.href)) {
                    element.removeAttribute('href');
                }
            } catch {
                element.removeAttribute('href');
            }
            element.target = '_blank';
            element.rel = 'sponsored noopener noreferrer';
        }

        if (element instanceof HTMLImageElement) {
            try {
                if (!isAllowedAffiliateUrl(element.src)) {
                    element.removeAttribute('src');
                }
            } catch {
                element.removeAttribute('src');
            }
            element.loading = 'lazy';
            element.decoding = 'async';
        }
    });

    return document.body.innerHTML;
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
                    const sanitizedHtml = sanitizeAffiliateHtml(
                        data.banner.html_content
                    );
                    if (sanitizedHtml) {
                        setHtml(sanitizedHtml);
                        void sendTrackEvent({
                            event_type: 'affiliate_impression',
                            path: window.location.pathname,
                            action_detail: `placement=${variant}`,
                        });
                    }
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
    }, [variant]);

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
                onClickCapture={() => {
                    void sendTrackEvent({
                        event_type: 'affiliate_click',
                        path: window.location.pathname,
                        action_detail: `placement=${variant}`,
                    });
                }}
                dangerouslySetInnerHTML={{ __html: html }} 
            />
        </div>
    );
}
