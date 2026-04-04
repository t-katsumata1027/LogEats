import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT COUNT(*) as total, 
             COUNT(short_id) as has_short_id,
             COUNT(share_id) as has_share_id
      FROM meal_logs;
    `;
    
    const { rows: nullShortIds } = await sql`
      SELECT id, share_id FROM meal_logs WHERE short_id IS NULL AND share_id IS NOT NULL LIMIT 10;
    `;

    return NextResponse.json({
      summary: rows[0],
      nullShortIds
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
