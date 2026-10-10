// @display-only: needs a Redis client (`redis`), a queue client (`queue`) and `sendEmail`
// At-least-once delivery means duplicates. Claim → do the work → mark done.
// On failure, release the claim so the retry actually runs (the classic version marked "done" first,
// so a failed send was skipped as a "duplicate" on every retry and never delivered).
export async function handle(msg) {
  const doneKey = `done:${msg.id}`, lockKey = `processing:${msg.id}`;
  if (await redis.exists(doneKey)) return;                               // already delivered
  if (!(await redis.set(lockKey, 1, 'EX', 60, 'NX'))) return;            // another worker is on it
  try {
    await sendEmail(msg);                                                // pass msg.id to the provider as an idempotency key too
    await redis.set(doneKey, 1, 'EX', 7 * 86_400);                       // only now is it "done"
  } catch (err) {
    const attempts = msg.attempts ?? 0;
    if (attempts >= 4) await queue.publish('email.dlq', { ...msg, error: String(err) });   // 5th failure: park it
    else await queue.publish('email.retry', { ...msg, attempts: attempts + 1 }, { delayMs: 2 ** attempts * 1_000 });   // 1 s, 2 s, 4 s, 8 s
  } finally {
    await redis.del(lockKey);
  }
}
