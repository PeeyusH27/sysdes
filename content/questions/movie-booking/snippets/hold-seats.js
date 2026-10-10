// @display-only: needs a pg Pool (`pool`) and a Redis client (`redis`)
// Only an EXPIRED HOLD counts as free. `status = 'available' OR held_until < now()` would also match booked seats.
export async function holdSeats(pool, redis, { showId, seats, userId }) {
  const wanted = [...new Set(seats)];                               // dedupe so rowCount can match
  if (wanted.length === 0 || wanted.length > 10) throw new Error('Pick 1–10 seats');
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rowCount } = await c.query(
      `UPDATE seats SET status = 'held', held_by = $1, held_until = now() + interval '5 minutes'
       WHERE show_id = $2 AND seat_no = ANY($3)
         AND (status = 'available' OR (status = 'held' AND held_until < now()))`,
      [userId, showId, wanted]);
    if (rowCount !== wanted.length) {
      await c.query('ROLLBACK');                                     // all or nothing
      return { ok: false, reason: 'Some of those seats were just taken' };
    }
    await c.query('COMMIT');
    await redis.publish(`show:${showId}:seats`, JSON.stringify({ seats: wanted, status: 'held' }));
    return { ok: true, seats: wanted, expiresInSec: 300 };
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
