require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function migrate() {
  try {
    console.log('Adding share_id column to meal_logs table...');
    await sql`
      ALTER TABLE meal_logs 
      ADD COLUMN IF NOT EXISTS share_id UUID DEFAULT gen_random_uuid() UNIQUE;
    `;
    console.log('Successfully added share_id column.');
    
    // For existing rows, fill with UUID if not already (Postgres DEFAULT handles this for gen_random_uuid in most cases, 
    // but just in case we need to update existing ones)
    await sql`
      UPDATE meal_logs SET share_id = gen_random_uuid() WHERE share_id IS NULL;
    `;
    console.log('Updated existing rows with UUIDs.');
  } catch (e) {
    console.error('Migration failed:', e);
  }
}

migrate();
