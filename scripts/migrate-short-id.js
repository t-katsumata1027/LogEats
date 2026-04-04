require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');
const crypto = require('crypto');

function generateShortId(length = 8) {
  // Use a simple alphanumeric set (excluding confusing characters if needed, but 0-9a-z is fine)
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function migrate() {
  try {
    console.log('Adding short_id column to meal_logs table...');
    await sql`
      ALTER TABLE meal_logs 
      ADD COLUMN IF NOT EXISTS short_id VARCHAR(12) UNIQUE;
    `;
    console.log('Successfully added short_id column.');

    // Fill existing rows with random short IDs
    const { rows } = await sql`SELECT id FROM meal_logs WHERE short_id IS NULL`;
    console.log(`Found ${rows.length} rows to update.`);

    for (const row of rows) {
      const shortId = generateShortId();
      await sql`UPDATE meal_logs SET short_id = ${shortId} WHERE id = ${row.id}`;
    }
    
    console.log('Updated existing rows with short IDs.');
    
    // Make it NOT NULL for future rows (if we want to enforce it, but let's keep it nullable if we want to allow partial failures)
    // Actually, setting a default would be better but we'll handle it in the code for now.

  } catch (e) {
    console.error('Migration failed:', e);
  }
}

migrate();
