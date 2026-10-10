// @display-only: needs a Redis client (`redis`) and a data access layer (`db`)
const NOT_FOUND = '__nf__';
const RELEASE = "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end";
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function getProduct(id, attempt = 0) {
  const key = `p:${id}`;
  const hit = await redis.get(key);
  if (hit === NOT_FOUND) return null;                       // negative cache stops "penetration"
  if (hit) return JSON.parse(hit);

  const lockKey = `lock:${key}`, token = crypto.randomUUID();
  if (!(await redis.set(lockKey, token, 'PX', 5_000, 'NX'))) {
    if (attempt >= 20) return db.product(id);               // waited ~1 s: stop waiting, protect latency
    await sleep(50);
    return getProduct(id, attempt + 1);                     // someone else is rebuilding
  }
  try {
    const row = await db.product(id);
    const ttl = 300 + Math.floor(Math.random() * 60);       // jitter avoids synchronized expiry (avalanche)
    await redis.set(key, row ? JSON.stringify(row) : NOT_FOUND, 'EX', row ? ttl : 30);
    return row;
  } finally {
    await redis.eval(RELEASE, 1, lockKey, token);           // only delete the lock if it's still ours
  }
}
