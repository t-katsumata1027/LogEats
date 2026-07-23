# LINE自己解決型アカウント連携：リリース実行計画のレビューと追加指示

## 判定

実行計画は概ね妥当である。ただし、現状のままでは秘密情報の受け渡し、本番デプロイ工程、LINE Consoleの確認事項に不備がある。

以下を反映してから実行に移ること。

## P0：接続URL・秘密情報をチャットで要求しない

計画中の「接続URLをお知らせいただく」は削除すること。

- `TEST_POSTGRES_URL`、`POSTGRES_URL`、LINE Channel Secret、Channel Access Tokenをチャット、指示書、Git、ログへ貼り付けさせない。
- ユーザー自身がローカルシェルまたはCI/CDのシークレットへ設定する。
- Antigravityが実行を支援する場合は、値を表示しない状態で環境変数が設定済みかだけを確認する。
- 実行結果の報告では、DB名、Exit code、秘匿情報を除いた出力のみ共有する。

隔離DBを作れない場合は、無償のローカルPostgreSQLまたは既存Docker環境を優先する。有料のDBサービスを新規契約しない。

## P0：本番マイグレーション前に明示的な承認を得る

本番DBへのマイグレーションは状態を変更する操作である。

以下の全条件を満たしても、自動では実行しないこと。

1. 実PostgreSQLの隔離DBテストが成功している。
2. ステージングまたは本番向け環境変数が設定済みである。
3. ユーザーから「本番DBマイグレーションを実行してよい」という明示承認がある。

承認後も、実行直前に対象DBが本番DBであることを確認し、接続URLの値は出力しないこと。

## P1：実行順序を以下へ修正する

元の計画には、マイグレーション後に必要な「本番コードのデプロイ」が明示されていない。次の順序へ修正すること。

1. 専用の隔離DBで制約・並行処理テストを成功させる。
2. 通常テスト、型チェック、ビルド、差分確認を実行する。
3. デプロイ先の環境変数を設定する。
4. LINE Developers ConsoleでWebhook URLを確認する。ただし、この時点では本番Webhookを新URLへ切り替えない。
5. ユーザーの明示承認後、本番DBマイグレーションを実行する。
6. 本番コードをデプロイする。
7. デプロイ先の `/api/webhooks/line` がHTTPSで200応答することを確認する。
8. LINE Developers ConsoleのWebhook URLを本番URLへ設定し、Webhook利用を有効化する。
9. テストアカウントで実機E2Eを行う。
10. 24時間の初期監視を実施する。

マイグレーションは追加的な変更であり、旧コードとの後方互換性があることを再確認する。問題が起きた場合は、DBの削除や手動ロールバックを行わず、先にアプリケーションデプロイを直前の安定版へ戻す判断をユーザーへ提示すること。

## P1：LINE Developers Consoleの確認事項を訂正する

「アカウント連携機能をONにする」というトグル前提の記述は削除すること。

Messaging APIのアカウント連携は、link token発行、nonce付きaccount-linking endpointへのリダイレクト、`accountLink` Webhookイベント受信により実現する。LINE公式の現行ドキュメントでは、専用の有効化トグルは前提とされていない。

確認する事項は以下に限定する。

- 正しいMessaging APIチャネルの `LINE_CHANNEL_SECRET` と `LINE_CHANNEL_ACCESS_TOKEN` を設定している。
- Webhook URLが `https://<公開ドメイン>/api/webhooks/line` である。
- Webhook利用が有効であり、Consoleの検証で成功する。
- 同一のLINE公式アカウントで別ツールがWebhookを使用していない、または単一Webhook URLの運用方針が合意済みである。
- LINE公式アカウントをテストアカウントが友だち追加している。

Messaging APIの連携フローと、リンクトークンが10分・1回限りであることは、LINE公式ドキュメントに従うこと。

## P1：E2E開始前の到達性・署名確認を追加する

実機E2Eの前に以下を行うこと。

1. デプロイ先の `/line/link` が匿名アクセスできることを確認する。
2. LINE ConsoleのWebhook URL検証が成功することを確認する。
3. 意図的な署名不正リクエストが401になることは自動テスト済みとして記録する。
4. 本番WebhookログにLINE user ID、nonce、link token、メールアドレス、例外本文が出ていないことを確認する。
5. 公式LINEのあいさつメッセージ・自動応答が、連携ボタンを含むWebhook返信を妨げないことを確認する。

## P2：完了報告の形式を明確化する

完了報告は「実施済み」と「未実施」を混在させない。

最低限、以下を表形式で報告すること。

| 項目 | 環境 | 結果 | 根拠 |
| --- | --- | --- | --- |
| 隔離DBテスト | テストDB | 成功 / 未実施 | Exit codeとマスク済み出力 |
| 本番DBマイグレーション | 本番 | 成功 / 未実施 | 実行時刻と結果 |
| 本番デプロイ | 本番 | 成功 / 未実施 | デプロイ識別子 |
| 新規連携E2E | 本番またはステージング | 成功 / 失敗 / 未実施 | テスト結果 |
| 移管E2E | 本番またはステージング | 成功 / 失敗 / 未実施 | テスト結果 |
| 解除・再連携E2E | 本番またはステージング | 成功 / 失敗 / 未実施 | テスト結果 |

## 公式参照

- [LINE Developers: User account linking](https://developers.line.biz/en/docs/messaging-api/linking-accounts/)
- [LINE Developers: Receive messages (webhook)](https://developers.line.biz/en/docs/messaging-api/receiving-messages/)

