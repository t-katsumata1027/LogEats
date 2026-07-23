import { NextRequest, NextResponse } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

const globalRateLimit = globalThis as typeof globalThis & {
  __logEatsRateLimit?: RateLimitStore;
};

const rateLimitStore =
  globalRateLimit.__logEatsRateLimit ??
  (globalRateLimit.__logEatsRateLimit = new Map());

export type RateLimitOptions = {
  scope: string;
  limit: number;
  windowMs: number;
};

function getClientIdentifier(request: NextRequest): string {
  const forwardedFor =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim();

  return ip || request.headers.get("x-real-ip") || "unknown";
}

/**
 * ウォームインスタンス内で動作する簡易レート制限です。
 * 本番ではVercel Firewallの分散レート制限も併用します。
 */
export function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const key = `${options.scope}:${getClientIdentifier(request)}`;
  const current = rateLimitStore.get(key);

  if (rateLimitStore.size > 10_000) {
    for (const [storedKey, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(storedKey);
      }
    }
  }

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return {
      allowed: true,
      remaining: options.limit - 1,
      retryAfterSeconds: Math.ceil(options.windowMs / 1000),
    };
  }

  if (current.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000)
      ),
    };
  }

  current.count += 1;
  rateLimitStore.set(key, current);

  return {
    allowed: true,
    remaining: options.limit - current.count,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((current.resetAt - now) / 1000)
    ),
  };
}

export function rateLimitExceededResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error:
        "短時間に多くのリクエストが送信されました。時間をおいて再度お試しください。",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    }
  );
}

export function exceedsContentLength(
  request: NextRequest,
  maxBytes: number
): boolean {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return false;

  const parsed = Number(contentLength);
  return Number.isFinite(parsed) && parsed > maxBytes;
}
