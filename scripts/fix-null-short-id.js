const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

function generateShortId(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function fix() {
  try {
    const { rows } = await sql`SELECT id FROM meal_logs WHERE (short_id IS NULL OR short_id = '') AND share_id IS NOT NULL;`;
    console.log(`Found ${rows.length} records with missing short_id.`);
    
    for (const row of rows) {
      const shortId = generateShortId();
      await sql`UPDATE meal_logs SET short_id = ${shortId} WHERE id = ${row.id};`;
      console.log(`Updated ID ${row.id} with short_id ${shortId}`);
    }
    
    console.log('Finished updating missing short_id.');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

fix();
