// @display-only: needs Redis (`redis`), a data access layer (`db`), circuit breakers (`breakers`) and provider clients
// Provider failover behind circuit breakers; permanent errors aren't retried
const PROVIDERS = { sms: [primarySms, backupSms], email: [primaryEmail, backupEmail], push: [pushService] };

export async function deliver(msg) {
  if (await redis.exists(`sent:${msg.id}`)) return 'duplicate';
  for (const provider of PROVIDERS[msg.ch]) {
    const breaker = breakers.get(provider.name);
    if (breaker.state === 'open') continue;                  // skip a provider that's currently failing
    try {
      const { providerMsgId } = await breaker.call(() => provider.send(msg));
      await redis.set(`sent:${msg.id}`, providerMsgId, 'EX', 7 * 86_400);
      await db.deliveries.upsert({ id: msg.id, provider: provider.name, providerMsgId, status: 'sent' });
      return 'sent';
    } catch (err) {
      if (err.permanent) return markFailed(msg, err);        // invalid number, unsubscribed: don't retry
    }
  }
  throw new Error('all providers failed');                   // the queue retries with backoff, then the DLQ
}
