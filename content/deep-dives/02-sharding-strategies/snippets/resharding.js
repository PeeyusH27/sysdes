// @display-only: needs clients for the old and the new shard (`oldShard`, `newShard`)
// Online resharding: never stop the world. The old shard stays the source of truth until reads flip.
export async function save(row) {
  await Promise.all([oldShard.write(row), newShard.write(row)]); // dual-write
}
// backfill in background, compare checksums, flip reads, delete old data
