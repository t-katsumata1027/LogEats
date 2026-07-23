# Phase 1 計測・Discord朝報セットアップ

更新日: 2026年7月23日

## 現在地

- Search Console所有権確認: 完了
- GA4とSearch Consoleのリンク: 完了
- `sitemap.xml`送信: 完了。監視中
- `product_events`移行と匿名・セッション・UTM計測: 本番DBマイグレーション完了
- Discord朝報環境変数 (Doppler): 登録・同期完了
- Discord朝報Cron API & バッチ処理: 実装および統合テスト完了


## 本番DB移行

`scripts/migrations/20260723_product_events.sql`は既存テーブルを削除・変更せず、
`product_events`と集計用インデックスだけを追加する。

Vercelの本番DB環境変数を取得できる環境で次を実行する。

```bash
npm run db:migrate:product-events
npm run db:migrate:cron-report-executions
```

完了確認:

```sql
SELECT event_type, COUNT(*)
FROM product_events
WHERE occurred_at >= CURRENT_DATE
GROUP BY event_type
ORDER BY COUNT(*) DESC;
```

## Discord朝報に必要な環境変数

| 変数 | 用途 | 公開可否 |
|---|---|---|
| `DISCORD_REPORT_WEBHOOK_URL` | 朝報送信先 | 秘密 |
| `CRON_SECRET` | 日次処理APIの認証 | 秘密 |
| `GA4_PROPERTY_ID` | GA4 Data APIの対象 | 非秘密 |
| `GSC_SITE_URL` | Search Consoleプロパティ | 非秘密 |
| `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` | GA4・GSC API認証 | 秘密 |
| `POSTGRES_URL` | プロダクトイベント集計 | 秘密 |

Googleサービスアカウントには、GA4プロパティの閲覧権限とSearch Consoleプロパティの
閲覧権限だけを付与する。編集・所有者権限は付与しない。

## 毎朝7時レポートの最初の指標

1. 獲得: ユーザー、セッション、参照元、UTM、検索クリック
2. 利用: 解析開始、成功、失敗、成功率、画像・テキスト別
3. 活性化: 登録、初回食事記録、LINE連携
4. 継続: D1・D7・D28、再訪ユーザー
5. 収益: A8表示、クリック、CTR、発生・承認・確定
6. 品質: APIエラー率、p95応答時間、クロール・サイトマップ異常

## 朝報の実行状態と再送方針

`cron_report_executions.report_date`を主キーとし、同じ対象日の通常朝報は最大1回だけ送信を試行する。
Discord WebhookはDBトランザクションの対象外であるため、配信漏れの自動回復より重複配信の防止を優先する。

| 状態 | 意味 | 自動再送 |
|---|---|---|
| `pending` | 集計または送信処理中 | しない |
| `pre_send_fail` | Discord送信開始前に失敗 | しない。原因確認後に手動判断 |
| `unknown_fail` | Discord送信開始後に結果が確定できない | しない。Discord到達状況を手動確認 |
| `sent` | Discordが成功応答を返し、DB更新も完了 | 不要 |

状態を手動で変更・削除して再送する場合は、Discord上の到達状況を先に確認する。

## Cron統合テスト

以下のテストは依存性をメモリ実装へ差し替えるため、本番DB、Google API、実Discord Webhookへアクセスしない。

```bash
npm run test:daily-report
```

未認証アクセス、並行3リクエスト、Google API失敗、Discord送信結果不明、送信前例外を検証する。

## 自動停止条件

- `robots.txt`、`sitemap.xml`または主要公開ページが5xx
- 解析成功率が前7日平均から10%以上悪化
- GA4・GSC・UTM・イベントIDのいずれかが欠損
- 同一日付のDiscord朝報が送信済み
- Google APIまたはDB認証に失敗

停止時は変更を自動公開せず、Discordへ失敗理由と再実行可否を通知する。
