// Each shard owns a contiguous range of ids. Range scans stay on one shard,
// but sequential keys (auto-increment ids, timestamps) send every new write to the last shard.
const ranges = [{ max: 1e6, db: 'db0' }, { max: 2e6, db: 'db1' }, { max: Infinity, db: 'db2' }];
export const shardFor = id => ranges.find(r => id < r.max).db;
