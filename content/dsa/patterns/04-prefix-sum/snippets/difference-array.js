// Template 4: difference array. To add `delta` to every index in [left, right], write +delta at left and
// -delta at right + 1: O(1) per update. One running sum at the end turns the differences into values.
export function applyRangeAdds(n, updates) {
  const diff = new Array(n + 1).fill(0);   // one spare slot so right + 1 never falls off
  for (const [left, right, delta] of updates) {
    diff[left] += delta;
    diff[right + 1] -= delta;
  }
  const out = new Array(n);
  let running = 0;
  for (let i = 0; i < n; i++) {
    running += diff[i];
    out[i] = running;
  }
  return out;
}
