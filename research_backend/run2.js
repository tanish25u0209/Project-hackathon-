import {pool} from './src/db/pool.js';
async function test() {
  const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log("Tables:", result.rows.map(r => r.table_name));
  
  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='research_sessions'");
  console.log("Columns:", cols.rows.map(r => r.column_name));
  
  process.exit(0);
}
test();
