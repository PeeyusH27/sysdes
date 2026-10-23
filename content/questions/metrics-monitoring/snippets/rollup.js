// Downsampling: keep fine detail for days, coarse detail for months. Each coarse bucket stores
// { min, max, sum, count } so average, peak and total can all be recovered. Rolling up rollups is just merging buckets.
export function rollup(points, bucketMs) {
  const buckets = new Map();
  for (const { t, v } of points) {
    const start = Math.floor(t / bucketMs) * bucketMs;
    const b = buckets.get(start) ?? { start, min: Infinity, max: -Infinity, sum: 0, count: 0 };
    b.min = Math.min(b.min, v);
    b.max = Math.max(b.max, v);
    b.sum += v;
    b.count++;
    buckets.set(start, b);
  }
  return [...buckets.values()].sort((a, b) => a.start - b.start);
}

// Merge small buckets into bigger ones (1 minute -> 1 hour). Exact for min, max, sum, count and therefore average.
export function merge(buckets, bucketMs) {
  const out = new Map();
  for (const b of buckets) {
    const start = Math.floor(b.start / bucketMs) * bucketMs;
    const m = out.get(start) ?? { start, min: Infinity, max: -Infinity, sum: 0, count: 0 };
    m.min = Math.min(m.min, b.min);
    m.max = Math.max(m.max, b.max);
    m.sum += b.sum;
    m.count += b.count;
    out.set(start, m);
  }
  return [...out.values()].sort((a, b) => a.start - b.start);
}

export const average = (b) => b.sum / b.count;

// Percentiles cannot be rolled up by averaging. Keep a histogram per bucket instead (counts per latency range) and add them.
export function histogram(values, bounds) {
  const counts = new Array(bounds.length + 1).fill(0);
  for (const v of values) counts[bounds.findIndex((b) => v <= b) === -1 ? bounds.length : bounds.findIndex((b) => v <= b)]++;
  return counts;
}
export const addHistograms = (a, b) => a.map((c, i) => c + b[i]);

// The upper bound of the bucket holding the q-th quantile (0.99 = p99).
export function quantile(counts, bounds, q) {
  const total = counts.reduce((x, y) => x + y, 0);
  let seen = 0;
  for (let i = 0; i < counts.length; i++) {
    seen += counts[i];
    if (seen >= q * total) return i < bounds.length ? bounds[i] : Infinity;
  }
  return Infinity;
}
