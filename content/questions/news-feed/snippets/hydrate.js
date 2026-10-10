// @display-only: needs redis (ioredis) and db
// ids → post bodies through the cache; deleted posts disappear lazily
export async function hydrate(ids) {
  if (!ids.length) return [];
  const cached = await Promise.all(ids.map(id => redis.get(`post:${id}`)));
  const missing = ids.filter((_, i) => !cached[i]);
  const fromDb = missing.length ? await db.posts.findMany(missing) : [];
  await Promise.all(fromDb.map(p => redis.set(`post:${p.id}`, JSON.stringify(p), 'EX', 3_600)));
  const byId = new Map([...cached.filter(Boolean).map(s => JSON.parse(s)), ...fromDb].map(p => [p.id, p]));
  return ids.map(id => byId.get(id)).filter(p => p && !p.deleted);
}
