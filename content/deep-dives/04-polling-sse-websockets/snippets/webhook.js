// @display-only: needs Express 5 (`app`, `express`) and a durable `queue` client
// Webhooks: verify the HMAC over the raw body, acknowledge fast, process later
import { verifyWebhook } from './webhook-verify.js';

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {   // raw: JSON parsing would change the bytes
  const ok = verifyWebhook({
    rawBody: req.body,
    timestamp: req.get('x-timestamp'),
    signature: req.get('x-signature'),
    secret: process.env.WEBHOOK_SECRET,
  });
  if (!ok) return res.sendStatus(401);
  await queue.publish('webhook', JSON.parse(req.body));       // durable before we ack; the consumer dedupes by event id
  res.sendStatus(200);                                        // if publish throws, the provider gets a 5xx and retries
});
