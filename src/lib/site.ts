const DEFAULT_SITE_URL = "https://www.log-eats.com";

/**
 * canonicalやサイトマップで使用する公開URLを末尾スラッシュなしで返します。
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_APP_URL || DEFAULT_SITE_URL
).replace(/\/+$/, "");

export function absoluteUrl(path = "/"): string {
  return new URL(path, `${siteUrl}/`).toString();
}
