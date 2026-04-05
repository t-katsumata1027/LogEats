const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function getIds() {
  try {
    const daily = await sql`SELECT share_id FROM daily_shares ORDER BY created_at DESC LIMIT 1;`;
    const meal = await sql`SELECT share_id FROM meal_logs WHERE share_id IS NOT NULL ORDER BY logged_at DESC LIMIT 1;`;
    console.log('DAILY_ID:', daily.rows[0]?.share_id);
    console.log('MEAL_ID:', meal.rows[0]?.share_id);
  } catch (e) {
    console.error(e);
  }
}

getIds();
