const DEFAULT_SITE_URL = "https://www.log-eats.com";

function getValidSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    try {
      const normalized = envUrl.startsWith("http://") || envUrl.startsWith("https://")
        ? envUrl
        : `https://${envUrl}`;
      const parsed = new URL(normalized);
      return parsed.origin;
    } catch {
      // 不正なURL文字列の場合はデフォルトにフォールバック
    }
  }
  return DEFAULT_SITE_URL;
}

/**
 * canonicalやサイトマップで使用する公開URLを末尾スラッシュなしで返します。
 */
export const siteUrl = getValidSiteUrl().replace(/\/+$/, "");

export function absoluteUrl(path = "/"): string {
  return new URL(path, `${siteUrl}/`).toString();
}
