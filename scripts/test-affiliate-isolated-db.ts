import { fork } from "node:child_process";
import path from "node:path";

async function main() {
  console.log("==========================================================");
  console.log("  隔離 PostgreSQL DB による完全受入 E2E テスト (親プロセス)  ");
  console.log("==========================================================");

  const allowTestFlag = process.env.ALLOW_ISOLATED_DB_TESTS;
  const testDbUrl = process.env.TEST_POSTGRES_URL;
  const prodDbUrl = process.env.POSTGRES_URL;

  // ガード 1: 明示的な許可フラグ要求
  if (allowTestFlag !== "1") {
    console.log("----------------------------------------------------------");
    console.log("⚠ 隔離PostgreSQLテストを実行するには ALLOW_ISOLATED_DB_TESTS=1 の設定が必要です。");
    console.log("  本テストスクリプトは構築完了・実行環境指定待ち（未実行）状態です。");
    console.log("----------------------------------------------------------");
    return;
  }

  // ガード 2: URL の存在チェック
  if (!testDbUrl) {
    console.log("----------------------------------------------------------");
    console.log("⚠ TEST_POSTGRES_URL が環境変数に設定されていないため、テストをスキップします。");
    console.log("  本テストスクリプトは構築完了・実行環境指定待ち（未実行）状態です。");
    console.log("----------------------------------------------------------");
    return;
  }

  // ガード 3: URL 文字列一致での本番拒否
  if (prodDbUrl && testDbUrl === prodDbUrl) {
    throw new Error(
      "【安全保護停止】TEST_POSTGRES_URL が POSTGRES_URL (本番環境DB) と同一です。実行を即時中断しました。"
    );
  }

  console.log("✓ セーフティチェック合格。隔離環境用子プロセスを起動します...");

  // 本番用の接続情報を継承せず、子プロセスには実行に必要な最小限の値だけを渡す。
  // DATABASE_URL や POSTGRES_URL_NON_POOLING などの別名接続設定も渡さない。
  const childEnv: NodeJS.ProcessEnv = {
    NODE_ENV: "test",
    POSTGRES_URL: testDbUrl,
    PATH: process.env.PATH,
    PATHEXT: process.env.PATHEXT,
    SystemRoot: process.env.SystemRoot,
    ComSpec: process.env.ComSpec,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
  };

  const runnerPath = path.resolve("scripts/isolated-db-runner.ts");

  await new Promise<void>((resolve, reject) => {
    const child = fork(runnerPath, [], {
      env: childEnv,
      execArgv: ["--import", "tsx"],
    });

    child.on("exit", (code) => {
      if (code === 0) {
        console.log("==========================================================");
        console.log("  隔離 PostgreSQL DB E2E テスト正常完了 (子プロセス成功)  ");
        console.log("==========================================================");
        resolve();
      } else {
        reject(new Error(`子プロセスが非ゼロステータス (${code}) で終了しました`));
      }
    });

    child.on("error", (err) => reject(err));
  });
}

main().catch((err) => {
  console.error("隔離 Postgres DB テスト親プロセスエラー:", err);
  process.exit(1);
});
