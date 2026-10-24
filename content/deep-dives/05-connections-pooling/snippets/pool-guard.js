// @display-only: needs the `pg` package and a running PostgreSQL
import pg from 'pg';

export const pool = new pg.Pool({
  max: 15,
  connectionTimeoutMillis: 2_000,                  // fail fast when the pool is dry
  statement_timeout: 5_000,                        // the server cancels any single query after 5 s
  idle_in_transaction_session_timeout: 10_000,     // the server kills a session that sits in a transaction for 10 s
});

// An idle client that errors must not crash the process
pool.on('error', err => console.error('idle client error', err.message));

// Log the three numbers that reveal exhaustion and leaks
setInterval(() => {
  const { totalCount, idleCount, waitingCount } = pool;
  if (waitingCount > 0 && idleCount === 0) {
    console.warn(`pool dry: ${totalCount} open, 0 idle, ${waitingCount} waiting`);   // alert on this
  }
}, 5_000).unref();

// And ask the server who is stuck in a transaction:
//   SELECT pid, now() - xact_start AS age, query FROM pg_stat_activity WHERE state = 'idle in transaction' ORDER BY age DESC;
