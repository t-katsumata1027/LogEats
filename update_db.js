const { sql } = require('@vercel/postgres');

async function update() {
    try {
        const { rowCount } = await sql`
      UPDATE learned_foods 
      SET standard_weight_g = 15, unit_name = '大さじ1', calories = 668, protein = 1.5, fat = 73.6, carbs = 4.5
      WHERE name = 'マヨネーズ'
    `;
        console.log(`Updated ${rowCount} rows`);
    } catch (err) {
        console.error(err);
    }
}
update();
