function eraseOverlapIntervals(intervals) {
  const sorted = [...intervals].sort((a, b) => a[1] - b[1]); // earliest end first
  let removed = 0;
  let lastEnd = -Infinity;                // end of the last interval we kept
  for (const [start, end] of sorted) {
    if (start >= lastEnd) lastEnd = end;  // fits after the last kept one: keep it
    else removed++;                       // clashes, and ends no earlier than the kept one: drop it
  }
  return removed;
}
