import {pool} from './src/db/pool.js';
pool.query('SELECT * FROM saved_ideas').then(x => {
    console.log('Rows:', x.rows.length);
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});