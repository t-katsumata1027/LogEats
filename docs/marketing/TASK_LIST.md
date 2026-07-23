# Log-Eats SEO・マーケティング実行タスクリスト

更新日: 2026年7月23日

状態は`未着手`、`進行中`、`承認待ち`、`完了`、`保留`のいずれかを使用する。

## P0: 直ちに実施

| ID | タスク | 主な対象 | 担当 | 状態 | 完了条件 |
|---|---|---|---|---|---|
| SEO-001 | robots.txtを公開する | `src/middleware.ts`、`src/app/robots.ts` | Codex | 未着手 | 本番200、UTF-8、正しいSitemap行 |
| SEO-002 | sitemap.xmlを公開する | `src/middleware.ts`、`src/app/sitemap.ts` | Codex | 未着手 | 本番200、wwwの絶対URL、GSC送信 |
| ADS-001 | ads.txtを公開する | `src/middleware.ts`、`public/ads.txt` | Codex | 未着手 | 本番200、AdSense管理画面で認識 |
| SEO-003 | canonical継承を修正する | `src/app/layout.tsx`、公開各ページ | Codex | 未着手 | index対象ページが自己canonical |
| SEO-004 | title二重化と固有OGを修正する | ニュース、記事、規約、privacy | Codex | 未着手 | `Log-Eats | Log-Eats`が0件 |
| SEO-005 | Search Consoleを接続する | Google Search Console | 人間 | 未着手 | DNSまたはHTML確認、sitemap送信 |
| DATA-001 | `/api/track`を安全に公開する | middleware、track API | Codex | 未着手 | 匿名計測成功、allowlist、長さ制限、rate limit |
| DATA-002 | 画像匿名イベントの到達不能を修正する | analyze API | Codex | 未着手 | 成功・失敗ログの統合テスト |
| DATA-003 | 解析3イベントをGA4へ送る | AnalyzerClient、各API | Codex | 未着手 | DebugViewで画像・テキスト・匿名・ログインを確認 |
| PRIV-001 | 匿名解析画像の自動公開を停止する | analyze/manual API、Blob | Codex＋人間 | 未着手 | 匿名解析だけでは公開URLを作らない |
| PRIV-002 | 共有をopt-in、noindex、失効可能にする | share routes | Codex＋人間 | 未着手 | noindex、失効、削除、期限のテスト |
| API-001 | 公開AI APIを防御する | analyze/manual API | Codex | 未着手 | MIME、容量、文字数、rate limit、quota |
| LEGAL-001 | プライバシー説明を実装と一致させる | privacy、GA4、広告、AI | 人間＋専門家 | 未着手 | GA4、Vercel、AI、Blob、広告、保存・削除を記載 |
| SEC-001 | 広告HTMLをsanitizeする | AffiliateBanner、広告DB | Codex | 未着手 | script禁止、許可ドメイン、sponsored属性 |

## P1: 10日以内

| ID | タスク | 主な対象 | 担当 | 状態 | 完了条件 |
|---|---|---|---|---|---|
| DATA-010 | `product_events`スキーマを作る | DB migration | Codex | 未着手 | event_id、匿名/登録ID、UTM、properties |
| DATA-011 | 匿名IDとセッションIDを導入する | ブラウザ、API | Codex | 未着手 | 匿名解析から登録へ紐付け可能 |
| DATA-012 | 登録・ログインイベントを実装する | Clerk webhook/callback | Codex | 未着手 | `sign_up`、`login`を流入元付きで取得 |
| DATA-013 | 初回記録と継続を定義する | meal_logs集計 | Codex | 未着手 | first_log、D1、D7、D28を再現可能 |
| DATA-014 | 共有イベントを実装する | NutritionResult、Dashboard | Codex | 未着手 | 作成、X、コピー、共有流入を取得 |
| AFF-010 | バナーID・案件ID・配置を返す | affiliate API/DB | Codex | 未着手 | impression/clickを案件と配置へ帰属 |
| AFF-011 | A8成果取込方式を決める | CSVまたはAPI | 人間＋Codex | 未着手 | 日次で発生・承認・確定を結合 |
| REPORT-001 | 毎朝Discordレポートを実装する | scheduler、Discord webhook | Codex＋人間 | 未着手 | 毎日7時、再送、重複防止、失敗通知 |
| PERF-001 | 公開と認証layoutを分離する | App Router | Codex | 未着手 | 公開ページが静的/ISR、認証UI維持 |
| PERF-002 | フォントpreloadを削減する | layout、font設定 | Codex | 未着手 | 不要なwoff2 preload削減、表示崩れなし |
| UX-001 | 主CTAを無料解析へ統一する | トップ | 人間＋Codex | 未着手 | A/B仮説と成功条件を定義 |
| UX-002 | PWA訴求の重複を解消する | AddToHomeScreen | Codex | 未着手 | 初回解析を覆わず、文字化け0件 |
| TRUST-001 | 計算方法・出典・限界ページを作る | 新規公開ページ | 人間＋Codex | 未着手 | 一次資料、更新日、推定注意を表示 |
| TRUST-002 | 運営者・執筆者情報を整備する | 記事テンプレート | 人間 | 未着手 | Who/How/Why、問い合わせ先 |

## P1: AI広報とSNS開始前

| ID | タスク | 主な対象 | 担当 | 状態 | 完了条件 |
|---|---|---|---|---|---|
| PR-001 | 人物型AI広報の名称を決定する | ブランド | 人間 | 承認待ち | 商標・SNSハンドル確認 |
| PR-002 | プロフィールでAIと明示する | X、Instagram | 人間 | 未着手 | 表示名、bio、固定投稿の3箇所で明示 |
| PR-003 | 栄養士資格を誤認させない | bio、投稿、画像 | 人間＋AI審査 | 未着手 | 資格・監修の虚偽0件 |
| PR-004 | キャラクター画像を選定する | `public/marketing/` | 人間 | 承認待ち | 人物案採用、補助マスコット採否 |
| PR-005 | 許可主張台帳を作る | claims registry | Codex＋人間 | 未着手 | 根拠、期限、注意書き、禁止表現 |
| SNS-001 | X投稿12本を準備する | 投稿台帳 | AI＋人間 | 未着手 | 品質ゲート合格、人間承認 |
| SNS-002 | 実画面デモ6本を制作する | X/Reels | 人間＋AI | 未着手 | 機能と一致、推定値明示、権利確認 |
| SNS-003 | UTMとcreative_idを導入する | 全SNSリンク | Codex | 未着手 | 投稿単位で解析成功まで追跡 |
| SNS-004 | 返信・訂正・炎上手順を作る | 運用手順 | 人間＋Codex | 未着手 | 停止、訂正、謝罪の責任者を明示 |
| ORCH-001 | モデルレジストリを実装する | automation | Codex | 未着手 | 実行前に公式Models APIで利用可否確認 |
| ORCH-002 | 生成と審査を別モデルにする | workflow | Codex | 未着手 | 自己承認なし、監査ログ保存 |
| ORCH-003 | 人間承認ゲートを作る | Discord/GitHub | Codex＋人間 | 未着手 | 初期30日間は承認なし公開不可 |

## P2: 30〜90日

| ID | タスク | 主な対象 | 担当 | 状態 | 完了条件 |
|---|---|---|---|---|---|
| CONTENT-001 | 記事ハブとパンくずを作る | `/news`または新規hub | Codex | 未着手 | クラスタ・内部リンク・構造化データ |
| CONTENT-002 | 写真カロリー計算クラスタを作る | 記事3本 | AI＋人間 | 未着手 | 各記事に独自実測または一次経験 |
| CONTENT-003 | PFC基礎クラスタを作る | 記事2本 | AI＋人間 | 未着手 | 一次資料、断定回避、推定注意 |
| CONTENT-004 | コンビニ・外食クラスタを作る | 記事3本 | AI＋人間 | 未着手 | 実測、更新日、商品情報確認 |
| LPO-001 | A8案件LPを1〜2本作る | 新規LP | 人間＋Codex | 未着手 | 広告表示、比較基準、CTA計測 |
| LPO-002 | CTAの1変数テストを回す | LP | Codex | 未着手 | 事前仮説、期間、停止条件 |
| ADS-010 | AdSense申請可否を判定する | コンテンツ・規約 | 人間 | 未着手 | ads.txt、ポリシー、十分な独自記事 |
| EC-001 | Amazon・楽天案件を選定する | EC affiliate | 人間 | 未着手 | 読者適合、条件、在庫・価格確認手順 |
| AUTO-001 | 低リスク投稿の予約自動化 | SNS workflow | Codex＋人間 | 保留 | 30日間品質事故0、計測欠損なし |
| SEO-020 | SEO回帰テストをCI化する | GitHub Actions | Codex | 未着手 | HTTP、canonical、title、robots、JSON-LD、CWV |

## 毎日の運用タスク

- 6:00: GA4、GSC、Vercel、A8、SNSの前日データ取得
- 6:30: Codexが異常検知と最大ボトルネックを選定
- 7:00: Discord朝報
- 7:15: 当日の改善仮説と投稿briefを1件ずつ作成
- 午前: SEOまたはLPOの変更を1件実行
- 午後: SNS原稿を最大2案生成し、別モデルで審査
- 公開前: 人間承認
- 翌朝: page_id、experiment_id、creative_id単位で結果確認

## 週次の判断

- 月曜: 検索クエリ、LP、SNSの獲得ファネル確認
- 水曜: 技術SEO、クロール、速度、計測欠損の確認
- 金曜: 収益、EPC、承認率、投稿品質事故の確認
- 日曜: 翌週の実験を最大3件に絞る

