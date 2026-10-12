// Template 2: interval scheduling. Keep the most non-overlapping intervals [start, end) by always taking
// the one that ends first among those that still fit. After k picks, no other choice of k intervals ends sooner.
export function maxNonOverlapping(intervals) {
  const sorted = [...intervals].sort((a, b) => a[1] - b[1]);
  let kept = 0;
  let lastEnd = -Infinity;
  for (const [start, end] of sorted) {
    if (start >= lastEnd) {   // fits after the last kept interval (touching is fine)
      kept++;
      lastEnd = end;
    }
  }
  return kept;
}
