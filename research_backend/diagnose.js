const config = require('./src/config');
const { Pool } = require('pg');
const Redis = require('ioredis');

async function test() {
    process.env.PGCONNECT_TIMEOUT = '2000'; // Short timeout

    console.log('--- Config check ---');
    console.log('Host:', config.db.host);

    console.log('\n--- Postgres ---');
    const pool = new Pool({ ...config.db, connectionTimeoutMillis: 2000 });
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT version()');
        console.log('✅ Connected:', res.rows[0].version.substring(0, 30) + '...');
        client.release();
    } catch (err) {
        console.log('❌ Failed:', err.message);
    } finally {
        await pool.end();
    }

    console.log('\n--- Redis ---');
    const redis = new Redis({ ...config.redis, lazyConnect: true, showFriendlyErrorStack: true, connectTimeout: 2000 });
    try {
        await redis.connect();
        console.log('✅ Connected');
        redis.disconnect();
    } catch (err) {
        console.log('❌ Failed:', err.message);
    }
}

test().catch(err => console.log('Script Error:', err.message));
