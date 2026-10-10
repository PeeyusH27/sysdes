// Last-writer-wins register: simple, but one of two concurrent writes silently disappears
export const mergeLWW = (a, b) => (b.ts > a.ts || (b.ts === a.ts && b.node > a.node) ? b : a);

// Grow-only counter (G-Counter): each node increments its own slot; merge takes the max per slot
export const increment = (c, node, by = 1) => ({ ...c, [node]: (c[node] ?? 0) + by });
export const merge = (a, b) =>
  Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => [k, Math.max(a[k] ?? 0, b[k] ?? 0)]));
export const value = (c) => Object.values(c).reduce((s, n) => s + n, 0);
// merge(increment({}, 'a'), increment(increment({}, 'b'), 'b')) → { a: 1, b: 2 }; value → 3
// merge is commutative, associative and idempotent, so replicas converge in any order, any number of times
