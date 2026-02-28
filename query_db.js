import { sql } from "@vercel/postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  try {
    const { rows } = await sql`SELECT id, email, name FROM users ORDER BY id DESC LIMIT 5`;
    console.log("Latest users:", rows);
    const { rows: duplicateEmails } = await sql`SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1`;
    console.log("Duplicate emails:", duplicateEmails);
  } catch (err) {
    console.error(err);
  }
}

main();
