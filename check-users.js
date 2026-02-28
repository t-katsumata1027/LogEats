const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const { rows } = await sql`SELECT id, name, email FROM users ORDER BY id DESC LIMIT 5`;
  console.log(rows);
}
main().catch(console.error);
