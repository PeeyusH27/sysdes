// The event row commits atomically with the business row; a relay publishes it later.
// `pool` is a pg Pool, `publish(topic, payload, { id })` sends to Kafka or a queue.
export async function relayOnce(pool, publish, batch = 100) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows } = await c.query(
      `SELECT id, topic, payload FROM outbox WHERE published_at IS NULL
       ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED`, [batch]);         // several relays can run side by side
    for (const r of rows) await publish(r.topic, r.payload, { id: r.id });   // consumers dedupe by id
    if (rows.length) await c.query('UPDATE outbox SET published_at = now() WHERE id = ANY($1)', [rows.map((r) => r.id)]);
    await c.query('COMMIT');
    return rows.length;
  } catch (e) {
    await c.query('ROLLBACK');                                         // rows stay unpublished and are retried
    throw e;
  } finally {
    c.release();
  }
}
