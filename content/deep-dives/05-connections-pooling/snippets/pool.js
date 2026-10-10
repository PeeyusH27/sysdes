// @display-only: needs the `pg` package and a running PostgreSQL
import pg from 'pg';
import { poolMaxPerInstance } from './pool-size.js';

// Postgres max_connections = 200, keep 20 for admin and migrations, 12 app instances
const poolMax = poolMaxPerInstance({ maxConnections: 200, reserved: 20, instances: 12 });   // 15. More instances? Add PgBouncer first.

export const pool = new pg.Pool({
  max: poolMax,
  idleTimeoutMillis: 30_000,          // close connections idle for 30 s
  connectionTimeoutMillis: 2_000,     // wait at most 2 s for a free connection, then fail fast
});

// A single query borrows a connection and returns it automatically
export const findUser = async id => (await pool.query('SELECT * FROM users WHERE id = $1', [id])).rows[0];

// A transaction must run every statement on ONE connection, and must always give it back
export async function transfer(from, to, cents) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [cents, from]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [cents, to]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();                 // a forgotten release leaks a connection: 15 leaks and this instance is stuck
  }
}
