# CHANGELOG

## [Unreleased] - 2026-07-23

### 追加 (Added)
- **Google Search Console 所有権確認用メタタグの追加**
  - `src/app/layout.tsx` の `metadata` に `verification` (`google-site-verification`) を追加。
  - 理由 (Why): Google Analytics (GA4) の遅延読み込みによる自動認証失敗を解消し、Google Search Console の所有権認証を HTML メタタグ方式で確実に通過させるため。
- **SEOタスクリストの更新 (docs/marketing/TASK_LIST.md)**
  - `SEO-002` (sitemap.xml送信) および `SEO-005` (Search Console接続・GA4連携) を「完了」に更新。
- **Phase 1プロダクト計測基盤の追加**
  - `product_events`移行、匿名ID、30分セッションID、first/last touch、UTM帰属を追加。
  - 既存の`access_logs`と並行記録し、移行未適用時も従来計測を継続する。
