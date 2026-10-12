function merge(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of sorted) {
    const last = merged.at(-1);
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end); // overlaps the group being built: stretch it if needed
    } else {
      merged.push([start, end]);        // a gap before this interval: it starts a new group
    }
  }
  return merged;
}
