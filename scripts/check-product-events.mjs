import { sql } from "@vercel/postgres";

async function checkProductEvents() {
  try {
    const { rows } = await sql`
      SELECT event_type, COUNT(*) as count
      FROM product_events
      WHERE occurred_at >= CURRENT_DATE
      GROUP BY event_type
      ORDER BY count DESC;
    `;
    console.log("product_events table query successful!");
    console.log("Result rows:", rows);
  } catch (error) {
    console.error("Query failed:", error);
    process.exitCode = 1;
  }
}

checkProductEvents();
