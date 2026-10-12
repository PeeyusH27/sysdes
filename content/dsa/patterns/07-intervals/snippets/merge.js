// Template 1: sort by start, then sweep. The last interval in `merged` is the group still being built;
// an interval that starts after its end can never be reached by anything later, so the group is final.
export function mergeIntervals(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of sorted) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end); // overlaps (or touches): stretch
    else merged.push([start, end]);                                   // a gap: start a new group
  }
  return merged;
}

// Total length covered by at least one interval: merge first, then nothing is counted twice.
export function coveredLength(intervals) {
  return mergeIntervals(intervals).reduce((sum, [s, e]) => sum + (e - s), 0);
}
