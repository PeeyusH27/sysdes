// @display-only: needs a Redis client (`redis`) and a directory service (`directory`)
// A lookup table maps each tenant to a shard. The hot copy lives in Redis; the directory DB is the source of truth.
export async function shardForTenant(tenantId) {
  const shard = await redis.hget('shard-map', tenantId)
    ?? await directory.lookup(tenantId);
  return shard;
}
// Moving one huge tenant is a data copy plus one row update: directory.assign('acme', 'shard-7')
