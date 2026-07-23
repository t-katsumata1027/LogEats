# CHANGELOG

## [Unreleased] - 2026-07-23

### 追加 (Added)
- **LINE Messaging API アカウント連携（自己解決型移行）**
  - **DBマイグレーション**: `line_account_link_requests` テーブル追加（`nonce_hash` SHA-256保持、`target_user_id`, `previous_user_id`, `status`, `expires_at` 10分期限, `completed_at`） (`scripts/migrations/20260723_line_account_link_requests.sql` / `scripts/migrate-line-account-link-requests.mjs`)。
  - **ドメイン処理 (`src/lib/lineAccountLink.ts`)**: linkToken発行、nonce生成＆ハッシュ化、PostgreSQLアドバイザリロック（`pg_advisory_xact_lock`）による同一LINE ID並行処理の直列化、安全なアカウント付け替え（移管）、10分期限切れ＆二重更新防止処理。
  - **公開確認ページ (`GET /line/link`)**: `Referrer-Policy: no-referrer` 設定。未ログイン時の説明＆Clerkログイン復帰（`linkToken`保存なし）、ログイン済みのアカウント確認・食事記録保持の注意事項表示、LINE公式URLへの誘導。
  - **API Route**:
    - `POST /api/line/account-link/start`: 認証チェック、linkToken長検証、nonce生成＆account-linking URL返却。
    - `DELETE /api/line/account-link`: 認証中ユーザー自身の `line_user_id` 解除（行ロック適用）。他ユーザー不可。
  - **LINE Webhook (`src/app/api/webhooks/line/route.ts`)**:
    - `accountLink` イベント処理追加（トランザクション内処理、Reply APIでの完了/移管メッセージ返信）。
    - 未連携ユーザーの画像投稿時、同一 Reply API リクエストでの「受付」＋「LINE連携ボタン」送信（Push API非使用、コスト増加ゼロ）。
    - 「連携」テキスト受信用応答（未連携時: ボタン付き案内返信、連携済み時: 設定画面案内）。
  - **構造化ログ (`src/lib/lineAccountLinkLogger.ts`)**: LINE user ID, raw nonce, nonce_hash, linkToken, email, 氏名を一切含めない安全な構造化ログ出力。
  - **テスト**: 8項目の通常クリーン統合テスト (`scripts/test-line-account-link.ts`)、および実PostgreSQLでの制約・並行処理・移管・競合テストモジュール (`scripts/test-line-account-link-isolated-db.ts`)。
  - **隔離DBテスト検証成功**: ローカルDocker環境 (`logeats-test-pg`) 上の独立DB (`logeats_test_line_link_verify`) に対し、`ALLOW_ISOLATED_DB_TESTS=1` `REQUIRE_ISOLATED_DB_TESTS=1` で隔離DBテストを実行。Exit code 0 および全制約・並行タスク直列化テストの完全通過を確認完了。
  - **基底スキーマ補正 (`scripts/migrations/20260723_core_schema.sql`)**: 隔離DB初期化時に参照される基底テーブルに `users.line_user_id` および `meal_logs` テーブル定義を追加。


### 変更 (Changed)
- **Clerk Webhook整理 (`src/app/api/webhooks/clerk/route.ts`)**
  - `user.created` / `user.updated` から `line_user_id` の自動設定・削除処理を完全に除去。Clerk外部アカウント競合からLINE Bot連携を切り離し。
- **設定画面改修 (`LineConnectionSettings.tsx` / `settings/page.tsx`)**
  - DB `users.line_user_id` を連携状態の正とする方式に変更。Clerk `createExternalAccount` 削除。未設定時の無効化、トーク画面誘導、解除確認ダイアログの導入。
- **「LINEで始める」導線の更新 (`LineConnectModalButton.tsx`)**
  - `oauth_line` 経由のログイン導線を撤去し、「LINEから食事を記録する」ボタンへ更新。トーク画面での「連携」送信を促す UI に置換。
- **middleware更新 (`src/middleware.ts`)**
  - `/line/link(.*)` を公開ルートに追加。
- **理由 (Why)**: ClerkのLINE OAuth競合によりLINE Bot機能が正常に紐付かない課題を解決し、ユーザー自身で安全にLINE連携を付け替え（移管）できるようにするため。食事記録データを損なわず、新しい送信課金を発生させないLINE Messaging API公式アカウント連携の実装を追加。
### 追加 (Added)
- **Phase 1.1 アフィリエイト収益計測基盤・Discord朝報拡張 (AFF-010)**
  - **DBマイグレーション**: `affiliate_banners` テーブルに `affiliate_network`, `campaign_id`, `creative_id`, `target_domain`, `metadata` カラムおよびインデックスを追加 (`scripts/migrations/20260723_affiliate_banners_phase1_1.sql` / `scripts/migrate-affiliate-banners.mjs`)。
  - **広告取得API拡張**: `/api/affiliates/random` で広告の各種識別ID・属性情報をクライアントへ安全に返却するように変更。
  - **構造化イベント・バリデーション**: `/api/track` に構造化された `affiliate_properties` の型検証、サイズ制限、安全なスキーム検証を導入し `product_events.properties` に保存。
  - **精度向上クライアント計測**: `src/components/AffiliateBanner.tsx` で `IntersectionObserver` によりバナーの 50% 露出・1秒以上維持で Impression を 1 回計測。余白クリックを除外し `<a>` タグ限定のクリック計測・キーボード対応を実装。
  - **Discord朝報拡張**: `src/lib/daily-report-handler.ts` および `src/lib/discord.ts` にアフィリエイト前日JST指標（表示数、クリック数、CTR、ユニークセッション数、広告別/位置別 breakdown、欠損数、自動データ品質診断）を追加。
  - **last_touch 構造化保存**: `/api/track` の `product_events.properties` に `first_touch` と同形式で `last_touch`（utm_source/medium/campaign/content/term、referrer、landing_path、captured_at）を構造化保存。既存トップレベル UTM 列への保存も維持。
  - 理由 (Why): LogEatsの早期収益化に向け、広告表示・クリック・掲載位置・流入元帰属（初回接触＋最終接触）・CTRを正確に計測し、異常検知とともに毎朝のDiscord朝報でデータに基づく意思決定を可能にするため。AFF-010 完了。

### 変更 (Changed)
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
