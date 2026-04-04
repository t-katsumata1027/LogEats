const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function check() {
  try {
    const { rows } = await sql`
      SELECT COUNT(*) as total, 
             COUNT(short_id) as has_short_id,
             COUNT(share_id) as has_share_id
      FROM meal_logs;
    `;
    console.log('Summary:', rows[0]);
    
    const { rows: nullShortIds } = await sql`
      SELECT id, share_id FROM meal_logs WHERE short_id IS NULL AND share_id IS NOT NULL LIMIT 5;
    `;
    
    if (nullShortIds.length > 0) {
      console.log('Records with NULL short_id:', nullShortIds);
    } else {
      console.log('No NULL short_ids found for records with share_id.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

check();
