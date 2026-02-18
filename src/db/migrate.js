'use strict';

const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');
const logger = require('../utils/logger');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Run all pending SQL migrations in order.
 * Tracks applied migrations in schema_migrations table.
 */
async function runMigrations() {
    const client = await pool.connect();

    try {
        // Ensure migrations table exists
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version     VARCHAR(20) PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

        // Get already-applied migrations
        const { rows } = await client.query('SELECT version FROM schema_migrations ORDER BY version');
        const applied = new Set(rows.map((r) => r.version));

        // Read migration files sorted by name
        const files = fs
            .readdirSync(MIGRATIONS_DIR)
            .filter((f) => f.endsWith('.sql'))
            .sort();

        for (const file of files) {
            const version = file.replace('.sql', '');

            if (applied.has(version)) {
                logger.info(`Migration ${version} already applied, skipping`);
                continue;
            }

            const sqlPath = path.join(MIGRATIONS_DIR, file);
            const sql = fs.readFileSync(sqlPath, 'utf8');

            logger.info(`Applying migration: ${version}`);
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('COMMIT');
                logger.info(`Migration ${version} applied successfully`);
            } catch (err) {
                await client.query('ROLLBACK');
                logger.error(`Migration ${version} failed`, { error: err.message });
                throw err;
            }
        }

        logger.info('All migrations complete');
    } finally {
        client.release();
        await pool.end();
    }
}

// Run when invoked directly: node src/db/migrate.js
if (require.main === module) {
    runMigrations().catch((err) => {
        logger.error('Migration runner failed', { error: err.message });
        process.exit(1);
    });
}

module.exports = { runMigrations };
