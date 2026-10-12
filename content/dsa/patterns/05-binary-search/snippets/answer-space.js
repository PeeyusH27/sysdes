// Template 4: binary search on the answer. The answer is a number in [lo, hi], and "does x work?"
// flips from false to true exactly once as x grows. Here: the smallest ship capacity that delivers
// every package, in order, within `days` days.
export function shipWithinDays(weights, days) {
  const daysNeeded = (cap) => {
    let used = 1;
    let load = 0;
    for (const w of weights) {
      if (load + w > cap) {   // this package doesn't fit today: start a new day
        used++;
        load = 0;
      }
      load += w;
    }
    return used;
  };
  let lo = Math.max(...weights);                // anything smaller can't carry the heaviest package
  let hi = weights.reduce((a, b) => a + b, 0);  // everything in one day always works
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (daysNeeded(mid) <= days) hi = mid;      // works: the answer is mid or smaller
    else lo = mid + 1;                          // too small: the answer is bigger
  }
  return lo;
}

// "Maximize the minimum": the largest gap such that k items (2 <= k <= positions.length) can sit at
// distinct positions with every two of them at least `gap` apart. Here "works" goes true...true, false...false,
// so search for the first gap that fails and step back by one.
export function maxMinDistance(positions, k) {
  const sorted = [...positions].sort((a, b) => a - b);
  const canPlace = (gap) => {
    let placed = 1;
    let last = sorted[0];
    for (const p of sorted) {
      if (p - last >= gap) {  // greedy: take the earliest position that is far enough
        placed++;
        last = p;
      }
    }
    return placed >= k;
  };
  let lo = 1;                                   // a gap of 1 always works
  let hi = sorted.at(-1) - sorted[0] + 1;       // wider than the whole span: always fails
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (!canPlace(mid)) hi = mid;               // first failing gap is mid or smaller
    else lo = mid + 1;
  }
  return lo - 1;                                // the last gap that works
}
