// Template 2a: sweep line. Every interval [start, end) becomes +1 at its start and -1 at its end.
// Sorted by time (ends before starts on ties), the running sum is how many intervals are open right now.
export function maxOverlap(intervals) {
  const events = [];
  for (const [start, end] of intervals) events.push([start, +1], [end, -1]);
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]); // at equal times, -1 sorts before +1
  let open = 0;
  let most = 0;
  for (const [, delta] of events) {
    open += delta;
    most = Math.max(most, open);
  }
  return most;
}
