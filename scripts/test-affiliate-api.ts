import assert from "node:assert/strict";
import {
  containsDangerousPattern,
  containsPii,
  isAllowedAffiliateHost,
  isAllowedAffiliateUrl,
} from "../src/lib/affiliateConfig";

function testAffiliateConfigSecurity() {
  console.log("--- セキュリティ & PII & ドメイン検証テスト ---");

  // 1. PII パターン検証
  assert.equal(containsPii("normal_user@example.com"), true, "メールアドレスを検知");
  assert.equal(containsPii("john.doe@sub.domain.co.jp"), true, "サブドメインメールを検知");
  assert.equal(containsPii("4111111111111111"), true, "クレジットカード番号を検知");
  assert.equal(containsPii("090-1234-5678"), true, "電話番号を検知");
  assert.equal(containsPii("placement=card&path=/dashboard"), false, "正常パラメータは未検知");

  // 2. 危険パターン・スキーム検証
  assert.equal(containsDangerousPattern("javascript:alert(1)"), true, "javascript: スキームを拒否");
  assert.equal(containsDangerousPattern("<script>document.cookie</script>"), true, "<script> を拒否");
  assert.equal(containsDangerousPattern("vbscript:msgbox"), true, "vbscript: スキームを拒否");
  assert.equal(containsDangerousPattern("placement=card"), false, "正常文字列は許可");

  // 3. ドメイン・URL境界検証 (サブドメイン偽装拒否)
  assert.equal(isAllowedAffiliateHost("a8.net"), true, "a8.net は許可");
  assert.equal(isAllowedAffiliateHost("px.a8.net"), true, "px.a8.net は許可");
  assert.equal(isAllowedAffiliateHost("a8.net.evil.example"), false, "サブドメイン偽装 a8.net.evil.example は拒否");
  assert.equal(isAllowedAffiliateHost("evil-a8.net"), false, "類似ドメイン evil-a8.net は拒否");

  assert.equal(isAllowedAffiliateUrl("https://px.a8.net/svt/ejp?a8mat=123"), true, "https://px.a8.net は許可");
  assert.equal(isAllowedAffiliateUrl("http://px.a8.net/svt/ejp"), false, "http: プロトコルは拒否");
  assert.equal(isAllowedAffiliateUrl("https://a8.net.evil.com/fake"), false, "偽装URLは拒否");

  console.log("✓ セキュリティ & PII & ドメイン検証テスト成功");
}

async function main() {
  console.log("=== アフィリエイトAPI & セキュリティ自動検証開始 ===");
  testAffiliateConfigSecurity();
  console.log("全アフィリエイトAPIセキュリティテストケース成功");
}

main().catch((err) => {
  console.error("API検証失敗:", err);
  process.exit(1);
});
