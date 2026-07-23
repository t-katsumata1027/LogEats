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
- **Discord日次朝報Cron APIおよびデータ集計基盤の実装と修正**
  - `vercel.json`（毎朝7:00 JST Cronスケジュール）、`src/app/api/cron/daily-report/route.ts`、`src/lib/daily-report-handler.ts`、Google API・Discord連携処理を追加。
  - `AnalyzerClient.tsx` の解析成功イベント (`analysis_success`) を `/api/track` へ送信するように修正。
  - `cron_report_executions.report_date`の主キーと`ON CONFLICT DO NOTHING`により、同一対象日の通常朝報を最大1回の送信試行に制限。
  - 送信前失敗を`pre_send_fail`、送信結果不明を`unknown_fail`、送信完了を`sent`として記録し、結果不明時の自動再送を停止。
  - `meal_logs` の `logged_at` カラム参照および初回食事記録の厳密判定クエリの実装。
  - Google API 取得失敗時の朝報中断＆Discord警告通知機能。
  - 本番DB・実Discordに接続せず、Cronハンドラー全体の認証、並行起動、状態遷移を検証する統合テストを追加。
  - 理由 (Why): GA4, Search Console, プロダクト利用指標を安全かつ正確に自動集計し、毎朝7時にDiscordへ確実に配信するため。
