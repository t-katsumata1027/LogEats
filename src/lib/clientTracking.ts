export type TrackEventInput = {
  event_type: string;
  path: string;
  duration_ms?: number;
  action_detail?: string;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_EVENT_TYPES = new Set([
  "analysis_start",
  "analysis_success",
  "analysis_error",
  "affiliate_impression",
  "affiliate_click",
  "share_created",
  "share_click",
]);

export function sendAnalyticsEvent(event: TrackEventInput) {
  if (
    typeof window !== "undefined" &&
    window.gtag &&
    GA_EVENT_TYPES.has(event.event_type)
  ) {
    window.gtag("event", event.event_type, {
      page_path: event.path,
      engagement_time_msec: event.duration_ms,
      event_detail: event.action_detail,
    });
  }
}

export function sendTrackEvent(
  event: TrackEventInput,
  options?: { keepalive?: boolean }
) {
  sendAnalyticsEvent(event);

  return fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    keepalive: options?.keepalive,
  }).catch(() => {
    // 計測失敗はユーザーの操作を妨げない
  });
}
