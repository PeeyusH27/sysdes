function insert(intervals, newInterval) {
  const result = [];
  let [start, end] = newInterval;
  let i = 0;
  // 1. Intervals that end before the new one starts are untouched.
  while (i < intervals.length && intervals[i][1] < start) result.push(intervals[i++]);
  // 2. Intervals that start before the new one ends overlap it: absorb them.
  while (i < intervals.length && intervals[i][0] <= end) {
    start = Math.min(start, intervals[i][0]);
    end = Math.max(end, intervals[i][1]);
    i++;
  }
  result.push([start, end]);
  // 3. Everything that is left lies entirely after it.
  while (i < intervals.length) result.push(intervals[i++]);
  return result;
}
