# LINE自己解決型連携：リリース判定前の残作業

## 判定

通常テスト、型チェック、ビルドは成功している。

ただし、実PostgreSQLを使う隔離DBテストは未実行であるため、本番DBマイグレーションとデプロイはまだ実施しないこと。

---

## P1：隔離DBテストを実DBで完走させ、結果を報告する

現時点で確認できたのは以下のみ。

- 環境変数なしでは明示スキップすること
- `REQUIRE_ISOLATED_DB_TESTS=1` かつ設定不足時に非ゼロ終了すること

以下は未確認。

- 実PostgreSQLへの接続成功
- マイグレーション成功
- CASCADE / SET NULL / CHECK / インデックス検証
- 移管と解除の並行実行が5秒以内に完了すること
- 並行処理後のデータ整合性

専用の空DBを用意し、以下を実行すること。

```powershell
$env:ALLOW_ISOLATED_DB_TESTS="1"
$env:REQUIRE_ISOLATED_DB_TESTS="1"
$env:TEST_POSTGRES_URL="postgres://.../logeats_test_line_link_..."
npx tsx scripts/test-line-account-link-isolated-db.ts
```

### 合格条件

- Exit code 0
- 隔離DBテストの成功メッセージが出ること
- 5秒タイムアウト、デッドロック、UNIQUE制約違反が発生しないこと
- テストDB名が `logeats_test_` で始まること
- 本番DBの接続URLを使用していないこと

実行コマンド、DB名（接続情報は伏せる）、Exit code、出力全文を報告すること。

---

## P1：API Routeの失敗を構造化ログに統一する

対象：

- `src/lib/lineAccountLinkHandlers.ts`

現在の例外時ログは固定文字列の `console.error` であり、個人情報は出ないため安全性は満たしている。

ただし、要件である「連携開始・完了・移管・失敗・期限切れを個人情報なしの構造化ログで記録」に合わせ、開始API・解除APIのRouteレベル失敗も `logLineAccountLink()` を通すこと。

### 修正要件

- 生の例外、`error.message`、例外オブジェクトは引き続き出力しない。
- `console.error("[API_ERROR] ...")` の代わりに、または併用せずに、固定カテゴリの構造化ログを出す。
- `db.connect()` 失敗など、ドメイン関数に到達しない例外も構造化ログへ記録する。
- nonce、nonce hash、link token、LINE user ID、メールアドレス、任意の `details` は出力しない。

---

## P1：API例外経路の秘匿テストを追加する

対象：

- `scripts/test-line-account-link.ts`
- `src/lib/lineAccountLinkHandlers.ts`

現行テストは、認証なし401の依存性注入を正しく検証している。

一方で、開始・解除の内部処理が例外を送出した場合に、生の例外情報がログ・レスポンスへ出ないことは未検証である。

### 修正要件

- Handler factoryへ、テスト時に `startAccountLink`、`unlinkAccount`、必要ならDB接続処理を差し替えられる依存性を追加する。
- 意図的に以下のような秘匿値を含む例外を送出する。

```ts
throw new Error("secret-link-token@example.com")
```

- APIが500と固定の日本語エラー文言を返すことを検証する。
- コンソールおよび構造化ログに `secret-link-token@example.com` が含まれないことを検証する。
- 本番の `POST` / `DELETE` は従来どおり実際の認証・DB・ドメイン関数を利用すること。

---

## リリース直前の最終確認

隔離DBテスト成功後、以下を再実行すること。

```powershell
npx tsc --noEmit
npx tsx scripts/test-line-account-link.ts
npm run build
git diff --check
git status --short
```

その後、LINE Developers Consoleで以下を実機確認すること。

1. Webhook URLが `/api/webhooks/line` を指している
2. Webhook利用が有効
3. アカウント連携機能が有効
4. 未連携LINEユーザーが「連携」と送信し、ログイン後に連携できる
5. 既存連携済みLINEアカウントを別のLogEatsアカウントへ移管できる
6. 移管元の食事記録が残る
7. 設定画面の解除後、画像解析は行われるが食事記録は保存されない

---

## 追記：最終修正後の追加確認事項

### API例外経路テストを解除APIにも追加する

開始APIのドメイン関数が例外を送出した際の秘匿テストは実装済みである。
一方、以下の解除APIの例外経路は未検証のため追加すること。

- `getDbClientFn` が接続エラーを送出する場合
- `unlinkAccountFn` が例外を送出する場合
- `ROLLBACK` が失敗した場合でも、生の例外をログ・レスポンスへ出さないこと

各ケースで以下をアサートすること。

- HTTP 500 と固定の日本語エラー文言を返すこと
- 秘匿用の例外文字列、スタックトレース、LINE user ID、nonce、link tokenがレスポンスとログに含まれないこと
- `line_link_failed` と固定の `errorType` が構造化ログに出ること

テストで `console.log` / `console.error` を差し替える場合は、必ず `try` / `finally` で元に戻すこと。アサート失敗時に復元されない実装にしないこと。

### テスト結果の報告表現を正確にする

通常テストでは、意図した構造化ログ、署名不正テストの固定ログ、依存ライブラリ由来の `punycode` 非推奨警告が出力される。

そのため、結果報告で「コンソールノイズ0」とは記載しないこと。以下のように区別して報告すること。

- Clerk由来の認証DBエラー、例外スタックトレース、生の秘匿情報の出力は0件
- 期待される構造化ログと固定エラーログは出力される
- `punycode` 警告は依存ライブラリ由来であり、本機能の秘匿情報漏えいではない

### リリース判定

実PostgreSQLに対する隔離DBテストが成功するまでは、実装完了ではなく「リリース候補」と扱うこと。本番DBマイグレーションとデプロイは、隔離DBテストのExit code 0および成功出力を確認してから実施すること。
