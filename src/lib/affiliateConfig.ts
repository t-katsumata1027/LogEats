/**
 * アフィリエイト広告に関する設定・許可リスト・セキュリティバリデーション一式
 * 現時点では A8.net のみに限定し、将来のネットワーク追加時も一元管理可能です。
 */

export const ALLOWED_AFFILIATE_NETWORKS = new Set(["a8"]);

export const ALLOWED_AFFILIATE_DOMAINS = [
  "a8.net",
  "px.a8.net",
  "rpx.a8.net",
  "stat.a8.net",
];

/**
 * ホスト名が許可されたアフィリエイトドメイン（完全一致またはサブドメイン）か判定
 */
export function isAllowedAffiliateHost(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase().trim();
  return ALLOWED_AFFILIATE_DOMAINS.some(
    (allowed) =>
      normalizedHost === allowed || normalizedHost.endsWith(`.${allowed}`)
  );
}

/**
 * URL文字列が許可されたアフィリエイトURL（https: かつ 許可ホスト）か判定
 */
export function isAllowedAffiliateUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== "https:") {
      return false;
    }
    return isAllowedAffiliateHost(url.hostname);
  } catch {
    return false;
  }
}

/**
 * 危険な文字列・スキームが含まれていないか判定
 */
export function containsDangerousPattern(input: string): boolean {
  const lower = input.toLowerCase();
  if (
    lower.includes("javascript:") ||
    lower.includes("vbscript:") ||
    lower.includes("data:") ||
    lower.includes("<script") ||
    lower.includes("onload=") ||
    lower.includes("onerror=")
  ) {
    return true;
  }
  return false;
}

/**
 * 個人情報 (PII: メールアドレス・クレジットカード番号・電話番号) のパターン検知
 * 単なる英数字IDやUUID、タイムスタンプ誤検知を防ぐ厳格な境界条件
 */
const PII_PATTERNS = [
  // メールアドレス (標準的構造)
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
  // クレジットカード番号 (13~19桁の単独数字列)
  /(?:^|[^0-9])\d{13,19}(?:[^0-9]|$)/,
  // 日本の電話番号 (0から始まるハイフン付き10~11桁数字)
  /(?:^|[^0-9])0\d{1,4}-\d{1,4}-\d{3,4}(?:[^0-9]|$)/,
];

export function containsPii(input: string): boolean {
  return PII_PATTERNS.some((pattern) => pattern.test(input));
}
