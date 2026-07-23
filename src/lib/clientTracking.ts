import {
  getClientAttribution,
  type ClientAttribution,
} from "@/lib/clientAttribution";
import type { AffiliateEventProperties } from "@/types/affiliate";

export type TrackEventInput = {
  event_type: string;
  path: string;
  duration_ms?: number;
  action_detail?: string;
  affiliate_properties?: AffiliateEventProperties;
};

type TrackEventPayload = TrackEventInput & {
  attribution: ClientAttribution;
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
    const gaParams: Record<string, unknown> = {
      page_path: event.path,
      engagement_time_msec: event.duration_ms,
      event_detail: event.action_detail,
    };

    if (event.affiliate_properties) {
      gaParams.banner_id = event.affiliate_properties.banner_id;
      gaParams.placement_id = event.affiliate_properties.placement_id;
      gaParams.affiliate_network = event.affiliate_properties.affiliate_network;
      gaParams.campaign_id = event.affiliate_properties.campaign_id;
    }

    window.gtag("event", event.event_type, gaParams);
  }
}

export function sendTrackEvent(
  event: TrackEventInput,
  options?: { keepalive?: boolean }
) {
  sendAnalyticsEvent(event);

  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  const payload: TrackEventPayload = {
    ...event,
    attribution: getClientAttribution(),
  };

  return fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: options?.keepalive,
  }).catch(() => {
    // 計測失敗はユーザーの操作を妨げない
  });
}
