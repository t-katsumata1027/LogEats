const { sql } = require('@vercel/postgres');

async function migrate() {
    try {
        console.log('Adding line_user_id column...');
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(255) UNIQUE`;
        console.log('Successfully added line_user_id column');

        // Check columns explicitly
        const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `;
        console.log('Current columns in users table:', result.rows.map(row => row.column_name));

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit();
    }
}

migrate();
