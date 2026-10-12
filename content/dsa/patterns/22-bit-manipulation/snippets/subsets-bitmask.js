// Template 4: subsets as bitmasks. Bit i of mask says whether items[i] is in the subset, so
// counting mask from 0 to 2^n - 1 lists every subset exactly once. Keep n at 30 or less:
// 1 << 31 is already negative in JavaScript.
export function subsets(items) {
  const n = items.length;
  const out = [];
  for (let mask = 0; mask < 1 << n; mask++) {
    const subset = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(items[i]);
    }
    out.push(subset);
  }
  return out;
}

// Every submask of mask, from mask itself down to 0. (s - 1) & mask jumps to the next smaller
// number that only uses bits of mask.
export function submasks(mask) {
  const out = [];
  for (let s = mask; ; s = (s - 1) & mask) {
    out.push(s);
    if (s === 0) break;
  }
  return out;
}
