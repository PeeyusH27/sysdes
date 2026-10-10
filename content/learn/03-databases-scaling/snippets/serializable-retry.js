// Postgres aborts conflicting transactions (40001) and deadlocks (40P01);
// the fix is to retry the whole transaction
export async function withSerializable(pool, work, attempts = 5) {
  for (let i = 1; ; i++) {
    const c = await pool.connect();
    try {
      await c.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      const result = await work(c);
      await c.query('COMMIT');
      return result;
    } catch (e) {
      await c.query('ROLLBACK').catch(() => {});
      if (!['40001', '40P01'].includes(e.code) || i === attempts) throw e;
      await new Promise(r => setTimeout(r, Math.random() * 20 * 2 ** i));     // jittered backoff
    } finally {
      c.release();
    }
  }
}
