import { sql } from "@vercel/postgres";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function inspectSchema() {
  console.log("=== DB スキーマ照合結果 ===");

  const { rows: columns } = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'cron_report_executions'
    ORDER BY ordinal_position;
  `;

  const { rows: pks } = await sql`
    SELECT a.attname
    FROM   pg_index i
    JOIN   pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE  i.indrelid = 'cron_report_executions'::regclass
    AND    i.indisprimary;
  `;

  console.log("Columns:", columns);
  console.log("Primary Key:", pks.map(r => r.attname));
}

inspectSchema().catch(console.error);
