// @display-only: needs Postgres (a pg `pool`) and the PSP SDK (`psp`)
import { randomUUID } from 'node:crypto';
import { requestHash } from './idempotency.js';
import { applyEvent } from './payment-state.js';
import { chargeEntries, validate } from './ledger.js';
import { retry } from './retry.js';

// POST /payments with an Idempotency-Key header, in three phases. No database transaction
// stays open while we wait on the PSP: at peak that would be ~1,200 open transactions.
export async function createPayment(pool, psp, { customerId, key, body }) {
  // Phase 1: claim the key and create the payment, atomically.
  const claim = await tx(pool, async (c) => {
    const hash = requestHash(body);
    const { rowCount } = await c.query(
      `INSERT INTO idempotency_keys (customer_id, key, request_hash) VALUES ($1, $2, $3)
       ON CONFLICT (customer_id, key) DO NOTHING`, [customerId, key, hash]);
    if (rowCount === 0) {
      // Someone owns this key. (A concurrent INSERT waited for their commit, then did nothing.)
      const { rows: [k] } = await c.query(
        `SELECT request_hash, status, response_code, response_body FROM idempotency_keys
         WHERE customer_id = $1 AND key = $2`, [customerId, key]);
      if (k.request_hash !== hash) return { reply: [422, { error: 'Idempotency-Key reused with a different request' }] };
      if (k.status === 'done') return { reply: [k.response_code, k.response_body] };       // replay
      return { reply: [409, { error: 'A request with this key is in progress' }] };        // stale rows: see the recovery job
    }
    const id = randomUUID();
    await c.query(
      `INSERT INTO payments (id, customer_id, order_id, merchant_id, amount, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'processing')`,                                     // created → processing, before the call
      [id, customerId, body.orderId, body.merchantId, body.amount, body.currency]);
    await c.query('UPDATE idempotency_keys SET payment_id = $3 WHERE customer_id = $1 AND key = $2', [customerId, key, id]);
    return { id };
  });
  if (claim.reply) return claim.reply;

  // Phase 2: call the PSP (a Stripe-style SDK) with OUR key, so no retry, ours or the recovery job's, can charge twice.
  let outcome;
  try {
    const intent = await retry(
      () => psp.paymentIntents.create(
        { amount: body.amount, currency: body.currency, payment_method: body.paymentMethod, confirm: true, metadata: { paymentId: claim.id } },
        { idempotencyKey: `pay_${claim.id}`, timeout: 10_000 }),
      { retries: 2, isRetryable: (e) => e.type === 'StripeConnectionError' || e.statusCode >= 500 });
    outcome = intent.status === 'succeeded' ? 'succeeded' : intent.status === 'requires_action' ? 'requires_action' : 'processing';
  } catch (err) {
    outcome = err.type === 'StripeCardError' ? 'failed' : 'unknown';                       // a timeout is NOT a decline
  }

  // Phase 3: record the outcome and the response under the key, in one transaction.
  return tx(pool, async (c) => {
    if (outcome !== 'processing') await applyOutcome(c, claim.id, outcome);
    const { rows: [p] } = await c.query('SELECT status FROM payments WHERE id = $1', [claim.id]);
    const code = p.status === 'succeeded' ? 201 : p.status === 'failed' ? 402 : 202;      // 202: poll GET /payments/:id
    const response = { id: claim.id, status: p.status === 'unknown' ? 'processing' : p.status };
    await c.query(
      `UPDATE idempotency_keys SET status = 'done', response_code = $3, response_body = $4
       WHERE customer_id = $1 AND key = $2`, [customerId, key, code, response]);
    return [code, response];
  });
}

/**
 * The one place a payment moves forward. The sync reply, the webhook and the recovery job all call it;
 * whichever comes first does the work, the others find the move illegal and return false.
 */
export async function applyOutcome(c, paymentId, to) {
  const { rows: [p] } = await c.query('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [paymentId]);
  const { applied } = applyEvent(p, to);
  if (!applied) return false;
  await c.query('UPDATE payments SET status = $2, version = version + 1, updated_at = now() WHERE id = $1', [paymentId, to]);
  if (to === 'succeeded') {
    // pg returns bigint as a string: convert before doing arithmetic on money.
    await postLedger(c, `${paymentId}:charge`, chargeEntries({ amount: Number(p.amount), currency: p.currency, merchantId: p.merchant_id }));
    await c.query(`INSERT INTO outbox (topic, key, payload) VALUES ('payment.succeeded', $1, $2)`,
      [paymentId, { paymentId, orderId: p.order_id, amount: Number(p.amount), currency: p.currency }]);
  }
  return true;
}

export async function postLedger(c, source, entries) {
  validate(entries);                                                                       // Σ = 0, one currency, integer cents
  const { rows: [t] } = await c.query(
    'INSERT INTO ledger_transactions (source) VALUES ($1) ON CONFLICT (source) DO NOTHING RETURNING id', [source]);
  if (!t) return false;                                                                    // already posted: belt and braces
  for (const e of entries)
    await c.query('INSERT INTO ledger_entries (transaction_id, account_id, amount, currency) VALUES ($1, $2, $3, $4)',
      [t.id, e.account, e.amount, e.currency]);
  return true;
}

export async function tx(pool, fn) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const out = await fn(c);
    await c.query('COMMIT');
    return out;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
