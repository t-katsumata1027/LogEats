'use client';

import React, { useEffect, useRef, useState } from 'react';
import { sendTrackEvent } from '@/lib/clientTracking';
import type { PublicAffiliateBanner } from '@/types/affiliate';
import { isAllowedAffiliateHost } from '@/lib/affiliateConfig';

interface AffiliateBannerProps {
    variant?: 'card' | 'simple';
    className?: string;
}

/**
 * 重複排除単位: 「ページビュー (URL path) × banner_id × placement_id」
 * 単一のコンポーネント表示生命周期（ページ表示中）において、同一バナー・掲載位置の表示・クリックを各1回のみ計測します。
 */

function sanitizeAffiliateHtml(html: string): string {
    if (typeof window === 'undefined') return html;

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

    document.body.querySelectorAll('*').forEach((element) => {
        if (!allowedTags.has(element.tagName)) {
            element.remove();
            return;
        }

        Array.from(element.attributes).forEach((attribute) => {
            const name = attribute.name.toLowerCase();
            const isLinkAttribute = element.tagName === 'A' && name === 'href';
            const isImageAttribute = element.tagName === 'IMG' && name === 'src';

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
                const url = new URL(element.href, window.location.origin);
                if (url.protocol !== 'https:' || !isAllowedAffiliateHost(url.hostname)) {
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
                const url = new URL(element.src, window.location.origin);
                if (url.protocol !== 'https:' || !isAllowedAffiliateHost(url.hostname)) {
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

export function AffiliateBanner({ variant = 'card', className = '' }: AffiliateBannerProps) {
    const [banner, setBanner] = useState<PublicAffiliateBanner | null>(null);
    const [sanitizedHtml, setSanitizedHtml] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const containerRef = useRef<HTMLDivElement>(null);
    const hasTrackedImpressionRef = useRef(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isIntersectingRef = useRef(false);
    const lastClickTimeRef = useRef<number>(0);

    useEffect(() => {
        let isMounted = true;
        
        async function fetchBanner() {
            try {
                const res = await fetch('/api/affiliates/random');
                if (!res.ok) throw new Error('Failed to fetch');
                
                const data = await res.json();
                if (isMounted && data.banner && data.banner.html_content) {
                    const cleanHtml = sanitizeAffiliateHtml(data.banner.html_content);
                    if (cleanHtml) {
                        setBanner(data.banner);
                        setSanitizedHtml(cleanHtml);
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
    }, []);

    // 1秒露出判定による Impression 送信
    // 50%未満化、タブ非表示、アンマウント時にタイマーをキャンセル。
    // タブ復帰時には現在ビューポート内か再チェックしてタイマーを再開。
    useEffect(() => {
        if (!banner || !containerRef.current || hasTrackedImpressionRef.current) {
            return;
        }

        const currentContainer = containerRef.current;

        const clearTimer = () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };

        const startTimerIfVisible = () => {
            if (hasTrackedImpressionRef.current || timerRef.current) return;

            // 要素が現在露出状態にあるか判定
            const rect = currentContainer.getBoundingClientRect();
            const windowHeight = window.innerHeight || document.documentElement.clientHeight;
            const windowWidth = window.innerWidth || document.documentElement.clientWidth;
            const visibleWidth = Math.max(
                0,
                Math.min(rect.right, windowWidth) - Math.max(rect.left, 0)
            );
            const visibleHeight = Math.max(
                0,
                Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0)
            );
            const elementArea = rect.width * rect.height;
            const isVisibleNow =
                elementArea > 0 &&
                (visibleWidth * visibleHeight) / elementArea >= 0.5;

            if (isIntersectingRef.current || isVisibleNow) {
                timerRef.current = setTimeout(() => {
                    if (!hasTrackedImpressionRef.current && document.visibilityState === 'visible') {
                        hasTrackedImpressionRef.current = true;
                        void sendTrackEvent({
                            event_type: 'affiliate_impression',
                            path: window.location.pathname,
                            action_detail: `placement=${variant}`,
                            affiliate_properties: {
                                banner_id: banner.id,
                                placement_id: variant,
                                page_path: window.location.pathname,
                            },
                        });
                    }
                    timerRef.current = null;
                }, 1000);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                clearTimer();
            } else if (document.visibilityState === 'visible') {
                startTimerIfVisible();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                isIntersectingRef.current = entry.isIntersecting && entry.intersectionRatio >= 0.5;

                if (isIntersectingRef.current && document.visibilityState === 'visible') {
                    startTimerIfVisible();
                } else {
                    clearTimer();
                }
            },
            { threshold: [0.5] }
        );

        observer.observe(currentContainer);

        return () => {
            clearTimer();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            observer.unobserve(currentContainer);
        };
    }, [banner, variant]);

    // 実リンク (<a> タグ) の click イベントのみを計測対象にする
    const handleClick = (e: React.MouseEvent) => {
        const targetAnchor = (e.target as HTMLElement).closest('a');
        if (!targetAnchor || !banner) return;

        const now = Date.now();
        if (now - lastClickTimeRef.current < 500) {
            return;
        }
        lastClickTimeRef.current = now;

        void sendTrackEvent(
            {
                event_type: 'affiliate_click',
                path: window.location.pathname,
                action_detail: `placement=${variant}`,
                affiliate_properties: {
                    banner_id: banner.id,
                    placement_id: variant,
                    page_path: window.location.pathname,
                },
            },
            { keepalive: true }
        );
    };

    if (loading || !sanitizedHtml || !banner) {
        return null;
    }

    const isSimple = variant === 'simple';

    return (
        <div
            ref={containerRef}
            className={`w-full flex flex-col items-center animate-fade-in-up ${isSimple ? 'my-2' : 'my-6'} ${className}`}
        >
            {!isSimple && (
                <span className="text-[10px] text-sage-400 font-bold mb-1 tracking-widest uppercase">SPONSORED</span>
            )}
            <div
                className={`w-full flex justify-center overflow-hidden ${isSimple ? '' : 'rounded-xl bg-white/50 border border-sage-100/50 p-2 shadow-sm'}`}
                onClick={handleClick}
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
        </div>
    );
}
