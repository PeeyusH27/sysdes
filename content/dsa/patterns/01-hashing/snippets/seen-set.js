// Template 1: a Set of everything already passed. Answers "have I seen this before?" in O(1) on average,
// so the inner "search the earlier elements" loop of the brute force disappears.
export function firstRepeat(items) {
  const seen = new Set();
  for (const x of items) {
    if (seen.has(x)) return x;   // second sighting: the first value to repeat
    seen.add(x);
  }
  return null;                   // every value was distinct
}
