// @display-only: needs an Express app (`app`, `express`), a data access layer (`db`), `verifySignature` and `suppress`
// Delivery status from the provider (verify the signature over the raw body)
app.post('/webhooks/email', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!verifySignature(req.get('x-signature'), req.body)) return res.sendStatus(401);
  for (const ev of JSON.parse(req.body).events) {          // delivered | bounced | complained | opened
    await db.deliveries.update({ providerMsgId: ev.messageId }, { status: ev.type, updatedAt: ev.timestamp });
    if (ev.type === 'bounced' || ev.type === 'complained') await suppress(ev.email);   // stop emailing this address
  }
  res.sendStatus(200);
});
