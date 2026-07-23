# LINEアカウント連携：ローカルDocker隔離DB

## 構築済みの環境

LINEアカウント連携の隔離DBテスト専用に、ローカルDocker上で以下を用意した。

| 項目 | 値 |
| --- | --- |
| コンテナ | `logeats-test-pg` |
| PostgreSQL公開ポート | `localhost:5432` |
| 隔離DB | `logeats_test_line_link_verify` |
| 初期状態 | publicスキーマのテーブル0件 |

既存の `logeats_test_db` にはテーブルが存在していたため、隔離DBテストには使用しない。

## 実行方法

接続情報をチャットやドキュメントに記載しないこと。コンテナ環境変数に設定済みのパスワードをPowerShellの一時変数へ読み込み、テスト実行プロセスにだけ渡す。

```powershell
$dockerConfig = docker inspect logeats-test-pg | ConvertFrom-Json
$postgresPassword = (
  $dockerConfig[0].Config.Env |
  Where-Object { $_ -like 'POSTGRES_PASSWORD=*' } |
  ForEach-Object { ($_ -split '=', 2)[1] }
)

$escapedPassword = [uri]::EscapeDataString($postgresPassword)
$env:ALLOW_ISOLATED_DB_TESTS = '1'
$env:REQUIRE_ISOLATED_DB_TESTS = '1'
$env:TEST_POSTGRES_URL = "postgresql://postgres:${escapedPassword}@localhost:5432/logeats_test_line_link_verify"

npx tsx scripts/test-line-account-link-isolated-db.ts

Remove-Item Env:TEST_POSTGRES_URL -ErrorAction SilentlyContinue
Remove-Variable postgresPassword, escapedPassword, dockerConfig -ErrorAction SilentlyContinue
```

## 実行上の注意

- `TEST_POSTGRES_URL` の値を表示、コミット、チャット投稿しない。
- テストは対象DBへテーブル作成・削除・テストデータ投入を行う。必ず `logeats_test_line_link_verify` を使用する。
- Exit code 0と、スキップではない成功出力を確認する。
- 失敗した場合はDBを削除せず、マスク済みのエラー出力だけを報告する。
- 本番DB、開発共有DB、既存の `logeats_test_db` をこのコマンドに指定しない。

