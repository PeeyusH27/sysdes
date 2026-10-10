// @display-only: needs an Express `app`, a Redis client (`redis`) and a payment provider `charge` function
// Idempotent retries. The source let two concurrent requests with the same key both charge the card.
app.post('/payments', async (req, res) => {
  const idemKey = req.get('Idempotency-Key');
  if (!idemKey) return res.status(400).json({ error: 'Idempotency-Key header required' });
  const key = `idem:${req.user.id}:${idemKey}`;
  const claimed = await redis.set(key, 'pending', 'EX', 86_400, 'NX');     // only one request can claim the key
  if (!claimed) {
    const prev = await redis.get(key);
    return prev === 'pending'
      ? res.status(409).json({ error: 'Payment with this key is in progress' })
      : res.json(JSON.parse(prev));                                      // replay the stored result
  }
  try {
    const result = await charge(req.body, { idempotencyKey: idemKey });  // the payment provider dedupes too
    await redis.set(key, JSON.stringify(result), 'EX', 86_400);
    res.json(result);
  } catch (e) {
    await redis.del(key);                                                // let the client retry after a failure
    throw e;
  }
});
