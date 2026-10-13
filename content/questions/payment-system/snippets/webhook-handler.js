// @display-only: needs Postgres (a pg `pool`), Express and the PSP SDK (`psp`)
import { applyOutcome, tx } from './create-payment.js';

const STATUS_FOR = {
  'payment_intent.succeeded': 'succeeded',
  'payment_intent.payment_failed': 'failed',
  'payment_intent.requires_action': 'requires_action',
};
const INTENT_STATUS = { succeeded: 'succeeded', requires_action: 'requires_action', requires_payment_method: 'failed', canceled: 'failed' };

// POST /webhooks/psp. Deliveries are at-least-once, can arrive out of order, and can be forged.
// Mount it with express.raw({ type: 'application/json' }): the signature covers the exact bytes.
export async function pspWebhook(pool, psp, req, res) {
  let event;
  try {
    // HMAC-SHA256 over "timestamp.body" with our endpoint secret, compared in constant time.
    // The SDK also rejects timestamps older than 5 minutes, so a captured request can't be replayed.
    event = psp.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.PSP_WEBHOOK_SECRET);
  } catch {
    return res.status(400).send('Invalid signature');
  }

  await tx(pool, async (c) => {
    // Dedupe: the PSP's event id is the primary key, so a redelivery inserts nothing.
    const { rowCount } = await c.query(
      `INSERT INTO webhook_events (event_id, type, payload) VALUES ($1, $2, $3)
       ON CONFLICT (event_id) DO NOTHING`, [event.id, event.type, event]);
    if (rowCount === 0) return;                                              // already processed
    const to = STATUS_FOR[event.type];
    const paymentId = event.data.object.metadata?.paymentId;
    if (!to || !paymentId) return;                                           // recorded; nothing to do
    await applyOutcome(c, paymentId, to);                                    // forward-only: a late event is a no-op
  });

  // Answer fast, duplicates included: slow handlers cause redeliveries. If the transaction threw
  // (database down), the error becomes a 500 and the PSP simply delivers the event again later.
  res.sendStatus(200);
}

// Every minute: settle payments stuck in processing or unknown (a lost reply, a crash after the
// PSP call, a webhook that never came) by asking the PSP, then finish their idempotency keys.
export async function recoverStuckPayments(pool, psp) {
  const { rows } = await pool.query(
    `SELECT id, created_at FROM payments WHERE status IN ('processing', 'unknown')
     AND updated_at < now() - interval '1 minute' ORDER BY updated_at LIMIT 100`);
  for (const { id, created_at } of rows) {
    const [intent] = (await psp.paymentIntents.search({ query: `metadata['paymentId']:'${id}'` })).data;
    // No intent at all: the request never reached the PSP. Call it failed only once nothing can
    // still create one (we never call the PSP again for this payment, and a day has passed).
    const to = intent ? INTENT_STATUS[intent.status] : Date.now() - created_at.getTime() > 86_400_000 ? 'failed' : null;
    await tx(pool, async (c) => {
      if (to) await applyOutcome(c, id, to);
      const { rows: [p] } = await c.query('SELECT status FROM payments WHERE id = $1', [id]);
      const code = p.status === 'succeeded' ? 201 : p.status === 'failed' ? 402 : 202;
      await c.query(
        `UPDATE idempotency_keys SET status = 'done', response_code = $2, response_body = $3
         WHERE payment_id = $1 AND status = 'started'`, [id, code, { id, status: p.status === 'unknown' ? 'processing' : p.status }]);
    });
  }
}
