// Vector clocks: one counter per node, so you can tell "happened before" from "concurrent"
export const tick = (clock, node) => ({ ...clock, [node]: (clock[node] ?? 0) + 1 });

export function compare(a, b) {
  let aBehind = false, bBehind = false;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if ((a[k] ?? 0) < (b[k] ?? 0)) aBehind = true;
    if ((a[k] ?? 0) > (b[k] ?? 0)) bBehind = true;
  }
  if (aBehind && bBehind) return 'concurrent';     // a real conflict: keep both versions and merge
  if (aBehind) return 'before';                    // b already includes a: keep b
  if (bBehind) return 'after';
  return 'equal';
}
// compare({ a: 1 }, { a: 1, b: 1 }) → 'before' · compare({ a: 2 }, { a: 1, b: 1 }) → 'concurrent'
