"use client";

const ANONYMOUS_ID_KEY = "logeats_anonymous_id";
const SESSION_ID_KEY = "logeats_session";
const FIRST_TOUCH_KEY = "logeats_first_touch";
const LAST_TOUCH_KEY = "logeats_last_touch";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export type Touchpoint = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landing_path: string;
  captured_at: string;
};

export type ClientAttribution = {
  event_id: string;
  anonymous_id: string;
  session_id: string;
  first_touch: Touchpoint;
  last_touch: Touchpoint;
};

type StoredSession = {
  id: string;
  last_active_at: number;
};

function createId() {
  return crypto.randomUUID();
}

function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ストレージを利用できない環境でも計測処理は継続する
  }
}

function getAnonymousId() {
  try {
    const existing = localStorage.getItem(ANONYMOUS_ID_KEY);
    if (existing) {
      return existing;
    }

    const created = createId();
    localStorage.setItem(ANONYMOUS_ID_KEY, created);
    return created;
  } catch {
    return createId();
  }
}

function getSessionId() {
  const now = Date.now();
  const existing = readJson<StoredSession>(SESSION_ID_KEY);

  if (
    existing?.id &&
    Number.isFinite(existing.last_active_at) &&
    now - existing.last_active_at < SESSION_TIMEOUT_MS
  ) {
    writeJson(SESSION_ID_KEY, { id: existing.id, last_active_at: now });
    return existing.id;
  }

  const id = createId();
  writeJson(SESSION_ID_KEY, { id, last_active_at: now });
  return id;
}

function bounded(value: string | null, maxLength: number) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

function currentTouchpoint(): Touchpoint {
  const params = new URLSearchParams(window.location.search);

  return {
    utm_source: bounded(params.get("utm_source"), 100),
    utm_medium: bounded(params.get("utm_medium"), 100),
    utm_campaign: bounded(params.get("utm_campaign"), 200),
    utm_content: bounded(params.get("utm_content"), 200),
    utm_term: bounded(params.get("utm_term"), 200),
    referrer: bounded(document.referrer, 500),
    landing_path: `${window.location.pathname}${window.location.search}`.slice(
      0,
      500
    ),
    captured_at: new Date().toISOString(),
  };
}

function hasCampaignOrExternalReferrer(touchpoint: Touchpoint) {
  if (
    touchpoint.utm_source ||
    touchpoint.utm_medium ||
    touchpoint.utm_campaign ||
    touchpoint.utm_content ||
    touchpoint.utm_term
  ) {
    return true;
  }

  if (!touchpoint.referrer) {
    return false;
  }

  try {
    return new URL(touchpoint.referrer).host !== window.location.host;
  } catch {
    return false;
  }
}

export function getClientAttribution(): ClientAttribution {
  const current = currentTouchpoint();
  const storedFirst = readJson<Touchpoint>(FIRST_TOUCH_KEY);
  const firstTouch = storedFirst ?? current;

  if (!storedFirst) {
    writeJson(FIRST_TOUCH_KEY, firstTouch);
  }

  const storedLast = readJson<Touchpoint>(LAST_TOUCH_KEY);
  const lastTouch =
    !storedLast || hasCampaignOrExternalReferrer(current) ? current : storedLast;
  writeJson(LAST_TOUCH_KEY, lastTouch);

  return {
    event_id: createId(),
    anonymous_id: getAnonymousId(),
    session_id: getSessionId(),
    first_touch: firstTouch,
    last_touch: lastTouch,
  };
}
