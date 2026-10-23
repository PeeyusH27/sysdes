// Anti-entropy with a Merkle tree. Two replicas of the same key range want to know which keys differ,
// without sending every key. Each builds a hash tree over the range; if the root hashes match they are identical,
// otherwise they walk down only the branches whose hashes differ.
import { hash32 } from './ring.js';

const combine = (a, b) => hash32(`${a}|${b}`);

// depth d gives 2^d leaves. A key goes into the leaf chosen by the top d bits of its hash, the same on every replica.
export function buildTree(entries, depth = 10) {
  const leaves = Array.from({ length: 2 ** depth }, () => []);
  for (const [k, v] of entries) leaves[hash32(k) >>> (32 - depth)].push(`${k}=${v}`);
  let level = leaves.map((items) => hash32(items.sort().join('\n')));
  const levels = [level];
  while (level.length > 1) {
    level = Array.from({ length: level.length / 2 }, (_, i) => combine(level[2 * i], level[2 * i + 1]));
    levels.unshift(level);                       // levels[0] is the root
  }
  return { depth, levels, leaves };
}

// Which leaves differ, and how many hash comparisons it took to find out.
export function diff(a, b) {
  let comparisons = 0;
  const bad = [];
  (function walk(level, i) {
    comparisons++;
    if (a.levels[level][i] === b.levels[level][i]) return;
    if (level === a.depth) { bad.push(i); return; }
    walk(level + 1, 2 * i);
    walk(level + 1, 2 * i + 1);
  })(0, 0);
  return { leaves: bad, comparisons };
}
