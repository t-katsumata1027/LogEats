import { sql } from "@vercel/postgres";
import pkg from '@next/env';
const { loadEnvConfig } = pkg;
const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  try {
    await sql`ALTER TABLE users ADD COLUMN clerk_id VARCHAR(255) UNIQUE;`;
    console.log("Successfully added clerk_id column to users table.");
  } catch (e) {
    if (e.message.includes("already exists")) {
      console.log("Column clerk_id already exists.");
    } else {
      console.error(e);
    }
  }
}
main();
