import pg from "pg";

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("POSTGRES_URL が設定されていません。");
  process.exitCode = 1;
} else {
  const client = new pg.Client({ connectionString });

  try {
    await client.connect();

    const { rows } = await client.query(
      `SELECT
        to_regclass($1) IS NOT NULL AS table_exists,
        EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE schemaname = $2
            AND tablename = $3
            AND indexname = $4
        ) AS index_exists`,
      [
        "public.line_account_link_requests",
        "public",
        "line_account_link_requests",
        "idx_line_account_link_requests_status_expires",
      ]
    );

    if (!rows[0]?.table_exists || !rows[0]?.index_exists) {
      throw new Error("必要なテーブルまたはインデックスが存在しません。");
    }

    console.log("LINEアカウント連携マイグレーションの本番DB検証に成功しました。");
  } catch {
    console.error("LINEアカウント連携マイグレーションの本番DB検証に失敗しました。");
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}
