# LINE自己解決型アカウント連携：リリース実施手順

## 目的

LINE Messaging APIのアカウント連携を本番へ安全に投入する。

この手順では実装の追加修正を行わない。隔離DB検証、環境設定、実機E2E、本番マイグレーション、公開後確認を順番に実施する。

## 前提条件

- 通常テスト `scripts/test-line-account-link.ts` が12件すべて成功していること。
- 型チェック、プロダクションビルド、`git diff --check` が成功していること。
- 本番DBとは別の空のPostgreSQLデータベースを用意できること。
- テストDB名は必ず `logeats_test_` で始めること。
- 本番DBの接続文字列を `TEST_POSTGRES_URL` へ設定しないこと。

## 1. 隔離DBの実行検証

### 1-1. テストDBを準備する

以下の条件を満たす空のDBを準備する。

- 例：`logeats_test_line_link_verify`
- 本番DB・開発共有DB・個人利用DBを流用しない。
- 接続先ホスト、DB名、認証情報を確認する。

### 1-2. 必須モードで隔離DBテストを実行する

PowerShellで以下を実行する。接続URLを報告へ貼り付けないこと。

```powershell
$env:ALLOW_ISOLATED_DB_TESTS="1"
$env:REQUIRE_ISOLATED_DB_TESTS="1"
$env:TEST_POSTGRES_URL="postgres://.../logeats_test_line_link_verify"
npx tsx scripts/test-line-account-link-isolated-db.ts
```

### 1-3. 合格条件

- Exit codeが0であること。
- テスト対象DB名が `logeats_test_` で始まること。
- スキップではなく、実PostgreSQLに対する成功完了メッセージが出ること。
- 外部キー、`ON DELETE CASCADE`、`ON DELETE SET NULL`、CHECK制約、インデックス検証が成功すること。
- 並行した移管・解除テストが5秒以内に完了し、デッドロック・UNIQUE制約違反が発生しないこと。
- 旧ユーザーの `meal_logs` が変更されないこと。

失敗時は本番作業へ進まず、エラー内容・DB名・実行コマンド（接続情報は伏せる）を報告すること。

## 2. リリース候補の最終ローカル検証

隔離DBテスト成功後、以下を実行する。

```powershell
npx tsc --noEmit
npx tsx scripts/test-line-account-link.ts
npm run build
git diff --check
git status --short
```

確認事項：

- `tsconfig.tsbuildinfo` などの生成物をコミット対象に含めない。
- `git status --short` に表示されるのは今回の機能変更と本指示書のみであること。
- 秘密情報を含む `.env*` ファイルを追加・変更・コミットしていないこと。

## 3. デプロイ先の環境設定

ステージング環境を利用できる場合は、本番より先にステージングへ設定・検証する。

対象環境に以下の環境変数を設定する。

```ini
NEXT_PUBLIC_LINE_CONNECT_URL=https://lin.ee/...
NEXT_PUBLIC_LINE_FRIEND_URL=https://lin.ee/...
LINE_CHANNEL_SECRET=...
LINE_CHANNEL_ACCESS_TOKEN=...
POSTGRES_URL=...
```

確認事項：

- `NEXT_PUBLIC_LINE_CONNECT_URL` は公式LINEのトーク画面を開くURLであること。
- `LINE_CHANNEL_SECRET` と `LINE_CHANNEL_ACCESS_TOKEN` はMessaging APIチャネルの値であること。
- `POSTGRES_URL` は対象環境のDBであること。
- 値そのものをチケット、コミット、チャット、ログへ出力しないこと。

## 4. LINE Developers Consoleの設定確認

Messaging APIチャネルで以下を確認する。

1. Webhook URLが `https://<公開ドメイン>/api/webhooks/line` であること。
2. Webhook利用が有効であること。
3. アカウント連携機能が有効であること。
4. 応答メッセージやあいさつメッセージがWebhook処理と競合しないこと。
5. 公式LINEの友だち追加URL・トーク画面URLが環境変数と一致すること。

## 5. 本番DBマイグレーション

隔離DBテストと設定確認に合格した場合のみ実行する。

実行前に、シェルの `POSTGRES_URL` が本番DBを指すことを確認する。値は画面出力しないこと。

```powershell
node scripts/migrate-line-account-link-requests.mjs
```

完了後に確認すること。

- `line_account_link_requests` テーブルが作成されていること。
- `idx_line_account_link_requests_status_expires` インデックスが存在すること。
- 既存の `users.line_user_id` とUNIQUE制約が維持されていること。
- 既存ユーザーの食事記録を更新・削除していないこと。

マイグレーション失敗時は、再実行や手動修正の前にエラーを報告し、原因を確認すること。

## 6. デプロイ後のLINE実機E2E

テスト用のLINEアカウントと、異なる2つのLogEatsテストアカウントを使う。実利用ユーザーのアカウントでは試験しない。

### 6-1. 新規連携

1. 未連携のLINEアカウントから公式LINEへ「連携」と送信する。
2. Reply APIの連携ボタンが表示されることを確認する。
3. ボタンから `/line/link?linkToken=...` を開く。
4. 未ログインならLogEatsログイン後に同じ画面へ戻ることを確認する。
5. 注意事項を確認し、連携を開始する。
6. LINE側の本人確認後、連携完了のReplyが届くことを確認する。
7. 画像を送信し、解析結果が届き、LogEatsへ自動保存されることを確認する。

### 6-2. 連携移管

1. アカウントAに紐付いた同じLINEアカウントを、アカウントBから連携する。
2. 「今後の記録先のみ変更し、過去データは移動しない」注意事項が表示されることを確認する。
3. 連携完了後、LINE画像がアカウントBへ保存されることを確認する。
4. アカウントAの既存 `meal_logs` が残ることを確認する。

### 6-3. 連携解除と再連携

1. 設定画面から解除を実行し、確認操作が必要であることを確認する。
2. 解除後に画像を送信し、解析結果は届くが食事記録として保存されないことを確認する。
3. 再度「連携」を送信して連携する。
4. 再連携後の画像が再び保存されることを確認する。

## 7. 公開後の初期監視

公開後24時間は、個人情報を含まない構造化ログを確認する。

- `line_link_started`
- `line_link_completed`
- `line_link_transferred`
- `line_link_failed`
- `line_link_expired`
- `line_link_token_issue_failed`

確認対象は件数・固定エラーカテゴリ・処理時間のみとする。nonce、LINE user ID、link token、メールアドレス、例外本文をログへ追加しないこと。

## 完了報告に必ず含める内容

1. 隔離DBテストの成功出力とExit code（接続URLは伏せる）。
2. 本番マイグレーションの成功可否。
3. 上記E2Eの新規連携、移管、解除、再連携の結果。
4. 実施した環境（ステージングまたは本番）。
5. 発生したエラー、未実施項目、既知の制約。

