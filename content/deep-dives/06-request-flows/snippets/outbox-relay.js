// @display-only: needs a pg-promise `db` and a `queue` client
// Outbox relay: publish committed events, then mark them sent. Delivery is at least once, so consumers dedupe by id.
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function relayBatch(limit = 100) {
  return db.tx(async t => {
    const rows = await t.any(
      'SELECT id, topic, payload FROM outbox WHERE sent_at IS NULL ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED',   // several relays can run
      [limit],
    );
    for (const r of rows) await queue.publish(r.topic, { eventId: r.id, ...r.payload });
    if (rows.length) await t.none('UPDATE outbox SET sent_at = now() WHERE id IN ($1:csv)', [rows.map(r => r.id)]);
    return rows.length;                                     // a crash before this commit means a re-send, never a loss
  });
}

for (;;) {
  const sent = await relayBatch().catch(() => 0);
  if (sent === 0) await sleep(200);                         // idle: poll gently (or use CDC / LISTEN instead)
}
