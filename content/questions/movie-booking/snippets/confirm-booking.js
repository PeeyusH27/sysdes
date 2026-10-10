// @display-only: needs a pg Pool (`pool`) and an idempotent refundPayment(paymentId) from the payment client
// Called from the verified payment webhook (it may be retried, and it may be late)
export async function confirmBooking(pool, { showId, seats, userId, paymentId }) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows: [booking] } = await c.query(
      `INSERT INTO bookings (user_id, show_id, seats, payment_id, status) VALUES ($1, $2, $3, $4, 'confirmed')
       ON CONFLICT (payment_id) DO NOTHING RETURNING id`,
      [userId, showId, seats, paymentId]);
    if (!booking) { await c.query('ROLLBACK'); return { ok: true, duplicate: true }; }   // webhook retry
    const { rowCount } = await c.query(
      `UPDATE seats SET status = 'booked', booking_id = $1, held_until = NULL
       WHERE show_id = $2 AND seat_no = ANY($3) AND status = 'held' AND held_by = $4`,   // still ours, even if just expired
      [booking.id, showId, seats, userId]);
    if (rowCount !== seats.length) {
      await c.query('ROLLBACK');
      await refundPayment(paymentId);                                 // idempotent, keyed by paymentId
      return { ok: false, reason: 'Hold lost; payment refunded' };
    }
    await c.query('COMMIT');
    return { ok: true, bookingId: booking.id };
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
