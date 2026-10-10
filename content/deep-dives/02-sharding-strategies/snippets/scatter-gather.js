// @display-only: needs one pg pool per shard (`shards`)
// Scatter-gather: a query that can't use the shard key asks every shard, then merges, re-sorts and cuts
export async function topProducts(limit = 10) {
  const perShard = await Promise.all(shards.map(db =>
    db.query('SELECT id, name, sales FROM products ORDER BY sales DESC LIMIT $1', [limit])));
  return perShard.flatMap(r => r.rows).sort((a, b) => b.sales - a.sales).slice(0, limit);
}
// Latency = the slowest shard. If this query is frequent, maintain a precomputed global table instead.
