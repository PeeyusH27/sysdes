// A vector clock is a map { nodeId: counter }. It answers one question about two versions of a value:
// did one happen before the other (keep the newer), or were they written without knowing about each other (keep both)?
export function increment(clock, node) {
  return { ...clock, [node]: (clock[node] ?? 0) + 1 };
}

// 'before'  : a is an ancestor of b (b already includes everything a knew)
// 'after'   : b is an ancestor of a
// 'equal'   : the same version
// 'concurrent': neither includes the other, a real conflict
export function compare(a, b) {
  let aAhead = false;
  let bAhead = false;
  for (const n of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[n] ?? 0;
    const y = b[n] ?? 0;
    if (x > y) aAhead = true;
    if (y > x) bAhead = true;
  }
  if (aAhead && bAhead) return 'concurrent';
  if (aAhead) return 'after';
  if (bAhead) return 'before';
  return 'equal';
}

// A client that read two concurrent versions and writes back a merged value sends the merge of both clocks.
export function merge(a, b) {
  const out = { ...a };
  for (const [n, v] of Object.entries(b)) out[n] = Math.max(out[n] ?? 0, v);
  return out;
}

// Given many versions { value, clock }, drop every version that some other version supersedes.
// What is left are the siblings the application must reconcile (often just one).
export function siblings(versions) {
  return versions.filter((v, i) => !versions.some((w, j) => {
    const c = compare(v.clock, w.clock);
    return c === 'before' || (c === 'equal' && j < i);        // also collapse exact duplicates
  }));
}
