// A toy recursive resolver. Each server answers with either an address (and a TTL)
// or a referral: "I don't know, ask that server." Answers are cached until their TTL runs out.
export function makeResolver(servers, now = () => Date.now()) {
  const cache = new Map(); // name -> { ip, expires }
  return function resolve(name) {
    const hit = cache.get(name);
    if (hit && hit.expires > now()) return { ip: hit.ip, queries: 0 };
    let server = 'root';
    for (let queries = 1; queries <= 8; queries++) {
      const reply = servers[server](name);
      if (reply.ip) {
        cache.set(name, { ip: reply.ip, expires: now() + reply.ttl * 1000 });
        return { ip: reply.ip, queries };
      }
      server = reply.refer; // follow the referral
    }
    throw new Error('too many referrals');
  };
}
