const { sql } = require('@vercel/postgres');

async function check() {
    try {
        const { rows } = await sql`SELECT * FROM learned_foods WHERE name LIKE '%マヨネーズ%'`;
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    }
}
check();
