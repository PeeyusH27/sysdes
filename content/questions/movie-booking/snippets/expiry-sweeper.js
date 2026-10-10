// @display-only: needs a pg Pool (`pool`) and a Redis client (`redis`)
// Expired holds already count as free (see holdSeats); this keeps seat maps accurate
setInterval(async () => {
  const { rows } = await pool.query(
    `UPDATE seats SET status = 'available', held_by = NULL, held_until = NULL
     WHERE status = 'held' AND held_until < now()
     RETURNING show_id, seat_no`);
  for (const r of rows) await redis.publish(`show:${r.show_id}:seats`, JSON.stringify({ seats: [r.seat_no], status: 'available' }));
}, 30_000);
