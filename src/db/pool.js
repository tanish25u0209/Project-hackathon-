'use strict';

const { Pool } = require('pg');
const config = require('../config');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────
// pg Pool singleton
// ─────────────────────────────────────────────
const pool = new Pool({
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    max: config.db.poolMax,
    idleTimeoutMillis: config.db.idleTimeoutMs,
    connectionTimeoutMillis: config.db.connectionTimeoutMs,
    ssl: config.db.ssl || false,
});

// Log pool errors — these are non-fatal but should be monitored
pool.on('error', (err) => {
    logger.error('Unexpected error on idle pg client', { error: err.message });
});

pool.on('connect', () => {
    logger.debug('New pg client connected to pool');
});

/**
 * Execute a single query. Acquires a client from the pool, runs the query, releases it.
 * @param {string} text - SQL query string
 * @param {Array} [params] - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
        logger.warn('Slow query detected', { query: text.slice(0, 100), duration });
    }

    return result;
}

/**
 * Get a dedicated client for transactions.
 * Caller is responsible for calling client.release() after use.
 * @returns {Promise<import('pg').PoolClient>}
 */
async function getClient() {
    return pool.connect();
}

/**
 * Execute a function within a transaction.
 * Automatically commits on success, rolls back on error.
 * @param {function(import('pg').PoolClient): Promise<any>} fn
 * @returns {Promise<any>}
 */
async function withTransaction(fn) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { pool, query, getClient, withTransaction };
