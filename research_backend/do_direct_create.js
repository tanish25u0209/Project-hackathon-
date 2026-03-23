import { pool } from './src/db/pool.js';
import fs from 'fs';
import path from 'path';

async function createTable() {
    try {
        const sql = fs.readFileSync(path.join(process.cwd(), 'src/db/migrations/002_create_saved_ideas.sql'), 'utf8');
        console.log("Read SQL:");
        console.log(sql);
        
        await pool.query(sql);
        console.log("Table created successfully!");
    } catch (e) {
        console.error("Failed:", e);
    } finally {
        await pool.end();
        process.exit();
    }
}
createTable();
