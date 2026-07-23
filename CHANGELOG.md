# CHANGELOG

## [Unreleased] - 2026-07-23

### 追加 (Added)
- **Google Search Console 所有権確認用メタタグの追加**
  - `src/app/layout.tsx` の `metadata` に `verification` (`google-site-verification`) を追加。
  - 理由 (Why): Google Analytics (GA4) の遅延読み込みによる自動認証失敗を解消し、Google Search Console の所有権認証を HTML メタタグ方式で確実に通過させるため。
