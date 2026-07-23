"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { sendTrackEvent } from "@/lib/clientTracking";

export function EventTracker() {
    const pathname = usePathname();
    const startTimeStamp = useRef<number>(Date.now());
    const trackedPageView = useRef<string | null>(null);

    useEffect(() => {
        // Reset start time and tracking flag when pathname changes
        startTimeStamp.current = Date.now();

        // Pathname毎のPV記録（重複防止）
        if (trackedPageView.current !== pathname) {
            trackedPageView.current = pathname;
            void sendTrackEvent({ event_type: "page_view", path: pathname });
        }

        // ページ離脱時（アンマウント）に滞在時間を送信
        return () => {
            const duration = Date.now() - startTimeStamp.current;
            // FetchAPIはunmount時にはキャンセルされる可能性があるためkeepaliveを使用
            void sendTrackEvent(
                {
                    event_type: "page_leave",
                    path: pathname,
                    duration_ms: duration
                },
                { keepalive: true }
            );
        };
    }, [pathname]);

    useEffect(() => {
        // クリックイベントのデリゲーション
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // data-track属性を持つ要素を探す（自身を含む上位要素）
            const trackableEl = target.closest('[data-track]');

            if (trackableEl) {
                const actionDetail = trackableEl.getAttribute('data-track');
                void sendTrackEvent({
                    event_type: "click",
                    path: pathname,
                    action_detail: actionDetail || undefined
                });
            }
        };

        document.addEventListener('click', handleClick);
        return () => {
            document.removeEventListener('click', handleClick);
        };
    }, [pathname]);

    return null;
}
